import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEnv } from '../src/config/env';

test('production URL validation', async (t) => {
  await t.test('accepts HTTPS URLs', () => {
    assert.equal(validateEnv({
      NODE_ENV: 'production',
      AUTH_ISSUER: 'https://auth.example.com',
      AUTH_JWKS_URL: 'https://auth.example.com/jwks',
      AUTH_INTERNAL_URL: 'https://auth.internal.example.com',
      VMMS_API_BASE_URL: 'https://api.example.com/vmms',
    }).NODE_ENV, 'production');
  });

  await t.test('rejects HTTP URLs', () => {
    assert.throws(() => validateEnv({
      NODE_ENV: 'production',
      VMMS_API_BASE_URL: 'http://vmms-backend:3010/vmms',
    }), /VMMS_API_BASE_URL must use https in production/);
  });

  await t.test('rejects localhost even with HTTPS', () => {
    assert.throws(() => validateEnv({
      NODE_ENV: 'production',
      AUTH_JWKS_URL: 'https://localhost:3001/jwks',
    }), /AUTH_JWKS_URL must not point at localhost in production/);
  });

  await t.test('allows the internal auth URL to use HTTP in production', () => {
    assert.doesNotThrow(() => validateEnv({
      NODE_ENV: 'production',
      AUTH_INTERNAL_URL: 'http://auth-service:3001',
    }));
  });

  await t.test('allows local HTTP URLs in development', () => {
    assert.equal(validateEnv({
      NODE_ENV: 'development',
      VMMS_API_BASE_URL: 'http://vmms-backend:3010/vmms',
    }).NODE_ENV, 'development');
  });
});
