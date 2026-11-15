export type Env = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  AUTH_ISSUER: string;
  AUTH_JWKS_URL: string;
  AUTH_INTERNAL_URL: string;
  VMMS_API_BASE_URL: string;
};
