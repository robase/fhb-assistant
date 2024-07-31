import type { Config } from 'drizzle-kit';
import 'dotenv/config'

if (!process.env.DB_URL) {
  throw new Error('DB_URL is missing');
}

export default {
  schema: './app/services/db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql', 
  dbCredentials: {
    url: process.env.DB_URL,
  },
  migrations: {
    prefix: 'timestamp'
  }
} satisfies Config;