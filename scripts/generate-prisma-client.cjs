const { spawnSync } = require('node:child_process');

const env = { ...process.env };
if (!env.DATABASE_URL) {
  env.DATABASE_URL =
    'postgresql://build:build@localhost:5432/build?schema=public';
}

const result = spawnSync('npx', ['prisma', 'generate'], {
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error('Failed to generate Prisma Client:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
