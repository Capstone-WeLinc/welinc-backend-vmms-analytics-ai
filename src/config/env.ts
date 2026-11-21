export type Env = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  AUTH_ISSUER: string;
  AUTH_JWKS_URL: string;
  AUTH_INTERNAL_URL: string;
  VMMS_API_BASE_URL: string;
};

const PRODUCTION_URLS = [
  'AUTH_JWKS_URL',
  'AUTH_INTERNAL_URL',
  'VMMS_API_BASE_URL',
  'GEMINI_API_URL',
] as const;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function productionUrlProblem(value: string): string | null {
  if (!URL.canParse(value)) return null;
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') return 'must use https in production';
  if (LOCAL_HOSTS.has(parsed.hostname)) return 'must not point at localhost in production';
  return null;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const nodeEnv = raw.NODE_ENV ?? 'development';
  if (!['development', 'production', 'test'].includes(String(nodeEnv))) {
    throw new Error('Environment check failed: NODE_ENV must be development, production, or test');
  }

  if (nodeEnv === 'production') {
    for (const key of PRODUCTION_URLS) {
      const value = raw[key];
      if (typeof value !== 'string' || !value.trim()) continue;
      const problem = productionUrlProblem(value.trim());
      if (problem) throw new Error(`Environment check failed: ${key} ${problem}`);
    }
  }

  return { ...raw, NODE_ENV: nodeEnv } as Env;
}
