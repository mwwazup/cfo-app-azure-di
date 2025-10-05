import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.VITE_SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'Missing database URL. Set SUPABASE_DATABASE_URL (server) or VITE_SUPABASE_DATABASE_URL (client build).'
  );
}

const client = postgres(databaseUrl, {
  ssl: 'require',
  max: 1
});

export const db = drizzle(client, { schema });
