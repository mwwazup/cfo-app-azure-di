DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = ''r'' AND c.relname = ''__drizzle_marker'' AND n.nspname = ''public''
  ) THEN
    CREATE TABLE "__drizzle_marker" (
      "id" integer PRIMARY KEY DEFAULT 1 NOT NULL
    );
  END IF;
END $$;