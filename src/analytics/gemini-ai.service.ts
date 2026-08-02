import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class GeminiAiService {
  /** AI insights cache to minimize Gemini API calls (free-tier quota is very limited) */
  private aiInsightsCache: { text: string; timestamp: number } | null = null;
  private readonly AI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  /** Shared in-flight promise — concurrent callers await the same Gemini call */
  private aiInsightsBuildPromise: Promise<string> | null = null;

  /** Work order AI insights cache */
  private workOrderAiCache: { text: string; timestamp: number } | null = null;
  private workOrderAiBuildPromise: Promise<string> | null = null;

  private getGeminiConfig() {
    const apiKey = process.env['GEMINI_API_KEY']?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Gemini API key is required for AI analytics. Set GEMINI_API_KEY in .env.',
      );
    }

    const apiBaseUrl = (
      process.env['GEMINI_API_URL']?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');

    const model = (process.env['GEMINI_MODEL']?.trim() || 'gemini-flash-latest').replace(
      /^models\//,
      '',
    );

    return { apiKey, apiBaseUrl, model };
  }

  async generateGeminiText(prompt: string, maxTokens = 350): Promise<string> {
    const { apiKey, apiBaseUrl, model } = this.getGeminiConfig();
    // Prioritize high-quota Flash Lite models (15 RPM / 500 RPD) over rate-limited models
    const modelCandidates = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite',
      model,
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
    ].filter((candidate, index, arr) => candidate && arr.indexOf(candidate) === index);

    let lastError: Error | null = null;

    for (const candidateModel of modelCandidates) {
      try {
        return await this.generateGeminiTextForModel(prompt, apiKey, apiBaseUrl, candidateModel, maxTokens);
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        console.warn(
          `[AnalyticsDataMart] Gemini model ${candidateModel} failed, trying next fallback model.`,
          details,
        );

        if (
          error instanceof HttpException &&
          error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
        ) {
          lastError = error;
          continue;
        }

        if (
          error instanceof ServiceUnavailableException &&
          details.includes('HTTP 404')
        ) {
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new ServiceUnavailableException(
      'Gemini API failed: no available model succeeded. Please verify your API key and account quota.',
    );
  }

  private async generateGeminiTextForModel(
    prompt: string,
    apiKey: string,
    apiBaseUrl: string,
    model: string,
    maxTokens = 350,
  ): Promise<string> {
    const contentRequestBody = JSON.stringify({
      model: `models/${model}`,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: maxTokens,
      },
    });

    const textRequestBody = JSON.stringify({
      model: `models/${model}`,
      prompt: { text: prompt },
      temperature: 0.2,
      maxOutputTokens: maxTokens,
    });

    const requestOptions = {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(120_000),
    } as const;

    const requests = [
      {
        endpoint: `${apiBaseUrl}/models/${encodeURIComponent(model)}:generateContent`,
        body: contentRequestBody,
      },
      {
        endpoint: `${apiBaseUrl}/models/${encodeURIComponent(model)}:generateText`,
        body: textRequestBody,
      },
    ];

    type GeminiAttempt = {
      endpoint: string;
      status: number;
      body: string;
      payload: any;
    };

    const errors: string[] = [];
    let successfulResponse: GeminiAttempt | null = null;
    let lastErrorResponse: GeminiAttempt | null = null;
    let preservedQuotaErrorResponse: GeminiAttempt | null = null;
    let allowFallback = true;

    const attemptRequest = async (request: { endpoint: string; body: string }) => {
      const response = await fetch(request.endpoint, { ...requestOptions, body: request.body });
      const responseText = await response.text();

      let parsed: any = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = null;
      }

      if (response.ok) {
        successfulResponse = {
          endpoint: request.endpoint,
          status: response.status,
          body: responseText,
          payload: parsed,
        };
        return true;
      }

      const errorAttempt: GeminiAttempt = {
        endpoint: request.endpoint,
        status: response.status,
        body: responseText,
        payload: parsed,
      };

      errors.push(`${request.endpoint} returned ${response.status}`);
      lastErrorResponse = errorAttempt;

      if (response.status === 429 || parsed?.error?.status === 'RESOURCE_EXHAUSTED') {
        preservedQuotaErrorResponse = errorAttempt;
        allowFallback = false;
      }

      if (response.status === 404) {
        return false;
      }

      return false;
    };

    for (const request of requests) {
      if (await attemptRequest(request)) {
        break;
      }
    }

    if (!successfulResponse && allowFallback && apiBaseUrl.includes('/v1beta')) {
      const fallbackUrl = apiBaseUrl.replace(/\/v1beta$/, '/v1beta2');
      for (const request of [
        {
          endpoint: `${fallbackUrl}/models/${encodeURIComponent(model)}:generateContent`,
          body: contentRequestBody,
        },
        {
          endpoint: `${fallbackUrl}/models/${encodeURIComponent(model)}:generateText`,
          body: textRequestBody,
        },
      ]) {
        if (await attemptRequest(request)) {
          break;
        }
      }
    }

    if (!successfulResponse && allowFallback && apiBaseUrl.includes('/v1beta2')) {
      const fallbackUrl = apiBaseUrl.replace(/\/v1beta2$/, '/v1beta');
      for (const request of [
        {
          endpoint: `${fallbackUrl}/models/${encodeURIComponent(model)}:generateContent`,
          body: contentRequestBody,
        },
        {
          endpoint: `${fallbackUrl}/models/${encodeURIComponent(model)}:generateText`,
          body: textRequestBody,
        },
      ]) {
        if (await attemptRequest(request)) {
          break;
        }
      }
    }

    if (!successfulResponse) {
      const errorResponse: GeminiAttempt | null = preservedQuotaErrorResponse ?? lastErrorResponse;
      if (errorResponse !== null) {
        const resolvedErrorResponse = errorResponse as GeminiAttempt;
        const rawErrorMessage = resolvedErrorResponse.payload?.error?.message ?? resolvedErrorResponse.body;
        const errorMessage = rawErrorMessage?.toString().trim() ||
          `HTTP ${resolvedErrorResponse.status} at ${resolvedErrorResponse.endpoint} returned no details`;
        if (
          resolvedErrorResponse.status === 429 ||
          resolvedErrorResponse.payload?.error?.status === 'RESOURCE_EXHAUSTED'
        ) {
          throw new HttpException(
            `Gemini quota exceeded: ${errorMessage}`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        throw new ServiceUnavailableException(
          `Gemini API failed: ${errorMessage}`,
        );
      }

      throw new ServiceUnavailableException(
        `Gemini API was unreachable. Check GEMINI_API_URL and network connectivity. Tried endpoints: ${errors.join(', ')}`,
      );
    }

    const successful = successfulResponse as GeminiAttempt;
    const payload = successful.payload;
    if (!payload) {
      throw new ServiceUnavailableException(
        `Gemini API returned non-JSON response (${successful.status}).`,
      );
    }

    const output = this.extractGeminiTextOutput(payload)?.trim();
    if (!output) {
      throw new ServiceUnavailableException(
        'Gemini API returned no output.',
      );
    }

    return output;
  }

  private extractGeminiTextOutput(payload: any): string | null {
    const candidate = payload?.candidates?.[0];
    if (!candidate) return null;

    if (typeof candidate.output === 'string' && candidate.output.trim()) {
      return candidate.output;
    }

    const content = candidate.content;
    if (!content) return null;

    if (typeof content === 'string' && content.trim()) {
      return content;
    }

    if (typeof content.text === 'string' && content.text.trim()) {
      return content.text;
    }

    if (typeof content.text?.text === 'string' && content.text.text.trim()) {
      return content.text.text;
    }

    if (Array.isArray(content.parts)) {
      return content.parts
        .map((part: any) => part?.text ?? (typeof part === 'string' ? part : ''))
        .filter((part: string) => typeof part === 'string' && part.length > 0)
        .join(' ')
        .trim() || null;
    }

    return null;
  }

  async getAiInsights(builder: () => Promise<string>): Promise<string> {
    const isFresh =
      this.aiInsightsCache &&
      Date.now() - this.aiInsightsCache.timestamp < this.AI_CACHE_TTL_MS;

    if (isFresh) {
      return this.aiInsightsCache!.text;
    }

    if (this.aiInsightsCache) {
      if (!this.aiInsightsBuildPromise) {
        this.aiInsightsBuildPromise = builder().then((text) => {
          this.aiInsightsCache = { text, timestamp: Date.now() };
          return text;
        }).finally(() => {
          this.aiInsightsBuildPromise = null;
        });
      }
      return this.aiInsightsCache.text;
    }

    if (!this.aiInsightsBuildPromise) {
      this.aiInsightsBuildPromise = builder().then((text) => {
        this.aiInsightsCache = { text, timestamp: Date.now() };
        return text;
      }).finally(() => {
        this.aiInsightsBuildPromise = null;
      });
    }
    return this.aiInsightsBuildPromise;
  }

  async getWorkOrderAiInsights(builder: () => Promise<string>): Promise<string> {
    const isFresh =
      this.workOrderAiCache &&
      Date.now() - this.workOrderAiCache.timestamp < this.AI_CACHE_TTL_MS;

    if (isFresh) return this.workOrderAiCache!.text;

    if (this.workOrderAiCache) {
      if (!this.workOrderAiBuildPromise) {
        this.workOrderAiBuildPromise = builder().then((text) => {
          this.workOrderAiCache = { text, timestamp: Date.now() };
          return text;
        }).finally(() => {
          this.workOrderAiBuildPromise = null;
        });
      }
      return this.workOrderAiCache.text;
    }

    if (!this.workOrderAiBuildPromise) {
      this.workOrderAiBuildPromise = builder().then((text) => {
        this.workOrderAiCache = { text, timestamp: Date.now() };
        return text;
      }).finally(() => {
        this.workOrderAiBuildPromise = null;
      });
    }
    return this.workOrderAiBuildPromise;
  }
}
