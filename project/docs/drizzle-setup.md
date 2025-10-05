# Drizzle + Supabase Setup

## Required Environment Variables
- **`SUPABASE_DATABASE_URL`**: Full Postgres connection string from Supabase (Service Role key). Example:
  ```
  SUPABASE_DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres?sslmode=require
  ```
- **`SUPABASE_SERVICE_ROLE_KEY`** or **`VITE_SUPABASE_SERVICE_ROLE_KEY`**: Service Role key used by the backend. Keep this value outside the bundled frontend when possible.

Add these to `project/.env` (backend scripts) and `project/.env.local` for Vite if you need client access. Do **not** commit these files.

## Installation Commands
```bash
npm install
npm install drizzle-orm drizzle-kit postgres
```

## Drizzle Commands
- **Generate SQL from schema:** `npm run drizzle:generate`
- **Apply migrations to database:** `npm run drizzle:migrate`
- **Push schema directly (DDL):** `npm run drizzle:push`

## File Overview
- `drizzle.config.ts` – Drizzle Kit configuration
- `src/db/schema.ts` – Postgres schema in Drizzle
- `src/config/drizzleClient.ts` – Database client for server-side usage
- `drizzle/migrations/` – Generated SQL migrations

## Usage Tips
1. Verify that `SUPABASE_DATABASE_URL` is present before running Drizzle commands.
2. Run `npm install` again after removing the invalid `@types/next` dependency (already handled) to install new packages.
3. Update backend services (e.g., `server.js`, Supabase admin scripts) to import `db` from `src/config/drizzleClient.ts` when you are ready to replace direct Supabase queries with Drizzle.
4. Keep Supabase client (`supabaseClient.ts`) for browser code; Drizzle is intended for server-side scripts and APIs.
