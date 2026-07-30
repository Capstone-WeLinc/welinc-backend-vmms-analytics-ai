import { PrismaConfig } from '@prisma/client/runtime';
import 'dotenv/config';

const config: PrismaConfig = {
  adapter: process.env.DATABASE_URL,
  url: process.env.DATABASE_URL,
};

export default config;
