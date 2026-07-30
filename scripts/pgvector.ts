import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

export const EMBEDDING_DIMENSIONS = 1536;
export const SOURCE_TYPES = {
  schedule: 'MAINTENANCE_SCHEDULE',
  template: 'CHECKLIST_TEMPLATE',
} as const;

export interface EmbeddingSource {
  scheduleId: string | null;
  templateId: string | null;
  sourceType: (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];
  content: string;
}

interface GeminiEmbeddingsResponse {
  embeddings?: Array<{ values?: number[] }>;
  error?: { code?: number; message?: string; status?: string };
}

export async function enablePgvector(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "maintenance_embeddings" (
      "id" UUID PRIMARY KEY,
      "scheduleId" UUID REFERENCES "maintenance_schedules"("id") ON DELETE CASCADE,
      "templateId" UUID REFERENCES "checklist_templates"("id") ON DELETE CASCADE,
      "sourceType" VARCHAR(32) NOT NULL,
      "content" TEXT NOT NULL,
      "embedding" VECTOR(1536) NOT NULL,
      "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "maintenance_embeddings_source_check" CHECK (
        ("sourceType" = 'MAINTENANCE_SCHEDULE' AND "scheduleId" IS NOT NULL AND "templateId" IS NULL)
        OR
        ("sourceType" = 'CHECKLIST_TEMPLATE' AND "scheduleId" IS NULL AND "templateId" IS NOT NULL)
      )
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "maintenance_embeddings_schedule_key" ON "maintenance_embeddings"("scheduleId") WHERE "scheduleId" IS NOT NULL`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "maintenance_embeddings_template_key" ON "maintenance_embeddings"("templateId") WHERE "templateId" IS NOT NULL`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "maintenance_embeddings_source_idx" ON "maintenance_embeddings"("sourceType")`,
  );
}

export async function generateEmbeddings(
  inputs: readonly string[],
): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const apiKey = process.env['GEMINI_API_KEY']?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to generate embeddings.');
  }

  const apiBaseUrl = (
    process.env['GEMINI_API_URL']?.trim() ||
    'https://generativelanguage.googleapis.com/v1beta'
  ).replace(/\/+$/, '');
  const model = (
    process.env['EMBEDDING_MODEL']?.trim() || 'gemini-embedding-001'
  ).replace(/^models\//, '');
  const endpoint = `${apiBaseUrl}/models/${encodeURIComponent(model)}:batchEmbedContents`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: inputs.map((input) => ({
        model: `models/${model}`,
        content: { parts: [{ text: input }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const responseBody = await response.text();
  let payload: GeminiEmbeddingsResponse;
  try {
    payload = JSON.parse(responseBody) as GeminiEmbeddingsResponse;
  } catch {
    throw new Error(
      `Gemini Embeddings API returned a non-JSON response (${response.status}).`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `Gemini Embeddings API returned ${response.status}: ${payload.error?.message ?? response.statusText}`,
    );
  }

  const embeddings = (payload.embeddings ?? []).map(
    (embedding) => embedding.values ?? [],
  );
  if (embeddings.length !== inputs.length) {
    throw new Error(
      `Gemini Embeddings API returned ${embeddings.length} vectors for ${inputs.length} inputs.`,
    );
  }
  return embeddings.map((embedding, index) => {
    if (
      embedding.length !== EMBEDDING_DIMENSIONS ||
      embedding.some((value) => !Number.isFinite(value))
    ) {
      throw new Error(
        `Embedding ${index} is not a valid ${EMBEDDING_DIMENSIONS}-dimension vector.`,
      );
    }
    // gemini-embedding-001 requires L2 normalization when requesting fewer
    // than its native 3072 dimensions. Normalization is also safe for models
    // that already return unit-length vectors.
    const magnitude = Math.sqrt(
      embedding.reduce((sum, value) => sum + value * value, 0),
    );
    if (!Number.isFinite(magnitude) || magnitude === 0) {
      throw new Error(`Embedding ${index} has an invalid zero magnitude.`);
    }
    return embedding.map((value) => value / magnitude);
  });
}

function vectorLiteral(embedding: readonly number[]): string {
  return `[${embedding.join(',')}]`;
}

export async function replaceEmbeddings(
  prisma: PrismaClient,
  sources: readonly EmbeddingSource[],
  embeddings: readonly number[][],
): Promise<void> {
  if (sources.length !== embeddings.length) {
    throw new Error('Embedding source and vector counts do not match.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM "maintenance_embeddings"');
    const batchSize = 50;
    for (let start = 0; start < sources.length; start += batchSize) {
      const sourceBatch = sources.slice(start, start + batchSize);
      const embeddingBatch = embeddings.slice(start, start + batchSize);
      const values: unknown[] = [];
      const rows = sourceBatch.map((source, index) => {
        const offset = values.length;
        values.push(
          randomUUID(),
          source.scheduleId,
          source.templateId,
          source.sourceType,
          source.content,
          vectorLiteral(embeddingBatch[index]),
        );
        return `($${offset + 1}::uuid, $${offset + 2}::uuid, $${offset + 3}::uuid, $${offset + 4}, $${offset + 5}, $${offset + 6}::vector)`;
      });
      await tx.$executeRawUnsafe(
        `INSERT INTO "maintenance_embeddings" ("id", "scheduleId", "templateId", "sourceType", "content", "embedding") VALUES ${rows.join(', ')}`,
        ...values,
      );
    }
  });
}

export async function embeddingCount(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "maintenance_embeddings"
  `;
  return Number(rows[0]?.count ?? 0);
}
