-- Idempotent baseline for WaveRider

-- __baseline_marker
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = '__baseline_marker' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "__baseline_marker" (
      "id" integer PRIMARY KEY DEFAULT 1 NOT NULL
    );
  END IF;
END $$;

-- coaching_moments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'coaching_moments' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "coaching_moments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "question" text NOT NULL,
      "response" text NOT NULL,
      "impact" jsonb,
      "date" timestamp with time zone DEFAULT now() NOT NULL,
      "title" text NOT NULL,
      "scenario_type" text,
      "response_type" text DEFAULT 'quick_ridr' NOT NULL,
      "ridr_response" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- document_kpis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'document_kpis' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "document_kpis" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "document_id" uuid NOT NULL,
      "gross_profit" numeric(15, 2),
      "gross_margin" numeric(5, 2),
      "net_profit" numeric(15, 2),
      "net_margin" numeric(5, 2),
      "total_revenue" numeric(15, 2),
      "total_expenses" numeric(15, 2),
      "operating_expenses" numeric(15, 2),
      "cogs" numeric(15, 2),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- document_metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'document_metrics' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "document_metrics" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "document_id" uuid NOT NULL,
      "metric_type" text NOT NULL,
      "metric_key" text NOT NULL,
      "label" text NOT NULL,
      "value" numeric(15, 2) DEFAULT '0' NOT NULL,
      "confidence" numeric(5, 4),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- financial_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'financial_documents' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "financial_documents" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "document_type" text NOT NULL,
      "start_date" date,
      "end_date" date,
      "status" text DEFAULT 'uploaded' NOT NULL,
      "source" text,
      "filename" text,
      "original_filename" text,
      "file_size" integer,
      "mime_type" text,
      "analysis_result" jsonb,
      "raw_json" jsonb,
      "summary_metrics" jsonb,
      "confidence_score" numeric(3, 2),
      "uploaded_at" timestamp with time zone DEFAULT now(),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- kpi_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'kpi_records' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "kpi_records" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "period" date NOT NULL,
      "kpi_name" text NOT NULL,
      "kpi_value" numeric(15, 2),
      "kpi_target" numeric(15, 2),
      "goal_value" numeric(15, 2),
      "variance_amount" numeric(15, 2),
      "variance_percentage" numeric(5, 2),
      "trend_vs_last_month" numeric(5, 4),
      "kpi_category" text DEFAULT 'revenue',
      "action_suggestion" text,
      "status" text DEFAULT 'active',
      "notes" text,
      "plain_explanation" text,
      "display_format" text DEFAULT 'number',
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- momentum_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'momentum_entries' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "momentum_entries" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "date" date NOT NULL,
      "momentum_score" integer,
      "notes" text,
      "factors" jsonb DEFAULT '[]'::jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'profiles' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "profiles" (
      "id" uuid PRIMARY KEY NOT NULL,
      "first_name" text,
      "last_name" text,
      "email" text,
      "avatar_url" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- revenue_data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'revenue_data' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "revenue_data" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "date" date NOT NULL,
      "actual_revenue" numeric(15, 2),
      "desired_revenue" numeric(15, 2),
      "profit_margin" numeric(5, 2),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- revenue_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'revenue_entries' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "revenue_entries" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "year" integer NOT NULL,
      "month" integer NOT NULL,
      "actual_revenue" numeric(15, 2) DEFAULT '0' NOT NULL,
      "desired_revenue" numeric(15, 2),
      "target_revenue" numeric(15, 2),
      "profit_margin" numeric(5, 2),
      "owner_draws" numeric(15, 2),
      "is_locked" boolean DEFAULT false,
      "notes" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- revenue_kpis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'revenue_kpis' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE "revenue_kpis" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "year" integer NOT NULL,
      "month" integer,
      "total_revenue" numeric(15, 2),
      "target_revenue" numeric(15, 2),
      "variance_amount" numeric(15, 2),
      "variance_percentage" numeric(5, 2),
      "growth_rate" numeric(5, 2),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- FKs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coaching_moments_user_id_profiles_id_fk') THEN
    ALTER TABLE "coaching_moments"
      ADD CONSTRAINT "coaching_moments_user_id_profiles_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_kpis_document_id_financial_documents_id_fk') THEN
    ALTER TABLE "document_kpis"
      ADD CONSTRAINT "document_kpis_document_id_financial_documents_id_fk"
      FOREIGN KEY ("document_id") REFERENCES "public"."financial_documents"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_metrics_document_id_financial_documents_id_fk') THEN
    ALTER TABLE "document_metrics"
      ADD CONSTRAINT "document_metrics_document_id_financial_documents_id_fk"
      FOREIGN KEY ("document_id") REFERENCES "public"."financial_documents"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_documents_user_id_profiles_id_fk') THEN
    ALTER TABLE "financial_documents"
      ADD CONSTRAINT "financial_documents_user_id_profiles_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kpi_records_user_id_profiles_id_fk') THEN
    ALTER TABLE "kpi_records"
      ADD CONSTRAINT "kpi_records_user_id_profiles_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'momentum_entries_user_id_profiles_id_fk') THEN
    ALTER TABLE "momentum_entries"
      ADD CONSTRAINT "momentum_entries_user_id_profiles_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revenue_data_user_id_profiles_id_fk') THEN
    ALTER TABLE "revenue_data"
      ADD CONSTRAINT "revenue_data_user_id_profiles_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revenue_entries_user_id_profiles_id_fk') THEN
    ALTER TABLE "revenue_entries"
      ADD CONSTRAINT "revenue_entries_user_id_profiles_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revenue_kpis_user_id_profiles_id_fk') THEN
    ALTER TABLE "revenue_kpis"
      ADD CONSTRAINT "revenue_kpis_user_id_profiles_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- INDEXES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_coaching_moments_user' AND relkind = 'i') THEN
    CREATE INDEX "idx_coaching_moments_user" ON "coaching_moments" USING btree ("user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_coaching_moments_date' AND relkind = 'i') THEN
    CREATE INDEX "idx_coaching_moments_date" ON "coaching_moments" USING btree ("date");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_document_kpis_doc' AND relkind = 'i') THEN
    CREATE INDEX "idx_document_kpis_doc" ON "document_kpis" USING btree ("document_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_document_metrics_doc' AND relkind = 'i') THEN
    CREATE INDEX "idx_document_metrics_doc" ON "document_metrics" USING btree ("document_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_financial_documents_user' AND relkind = 'i') THEN
    CREATE INDEX "idx_financial_documents_user" ON "financial_documents" USING btree ("user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_financial_documents_type' AND relkind = 'i') THEN
    CREATE INDEX "idx_financial_documents_type" ON "financial_documents" USING btree ("document_type");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_kpi_records_user_period_name' AND relkind = 'i') THEN
    CREATE UNIQUE INDEX "uq_kpi_records_user_period_name" ON "kpi_records" USING btree ("user_id","period","kpi_name");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_kpi_records_user' AND relkind = 'i') THEN
    CREATE INDEX "idx_kpi_records_user" ON "kpi_records" USING btree ("user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_kpi_records_period' AND relkind = 'i') THEN
    CREATE INDEX "idx_kpi_records_period" ON "kpi_records" USING btree ("period");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_momentum_entries_user_date' AND relkind = 'i') THEN
    CREATE UNIQUE INDEX "uq_momentum_entries_user_date" ON "momentum_entries" USING btree ("user_id","date");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_momentum_entries_user' AND relkind = 'i') THEN
    CREATE INDEX "idx_momentum_entries_user" ON "momentum_entries" USING btree ("user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_profiles_email' AND relkind = 'i') THEN
    CREATE INDEX "idx_profiles_email" ON "profiles" USING btree ("email");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_revenue_data_user_date' AND relkind = 'i') THEN
    CREATE UNIQUE INDEX "uq_revenue_data_user_date" ON "revenue_data" USING btree ("user_id","date");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_revenue_data_user' AND relkind = 'i') THEN
    CREATE INDEX "idx_revenue_data_user" ON "revenue_data" USING btree ("user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_revenue_data_date' AND relkind = 'i') THEN
    CREATE INDEX "idx_revenue_data_date" ON "revenue_data" USING btree ("date");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_revenue_entries_user_year_month' AND relkind = 'i') THEN
    CREATE UNIQUE INDEX "uq_revenue_entries_user_year_month" ON "revenue_entries" USING btree ("user_id","year","month");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_revenue_entries_user' AND relkind = 'i') THEN
    CREATE INDEX "idx_revenue_entries_user" ON "revenue_entries" USING btree ("user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_revenue_entries_period' AND relkind = 'i') THEN
    CREATE INDEX "idx_revenue_entries_period" ON "revenue_entries" USING btree ("year","month");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_revenue_kpis_user_year_month' AND relkind = 'i') THEN
    CREATE UNIQUE INDEX "uq_revenue_kpis_user_year_month" ON "revenue_kpis" USING btree ("user_id","year","month");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_revenue_kpis_user' AND relkind = 'i') THEN
    CREATE INDEX "idx_revenue_kpis_user" ON "revenue_kpis" USING btree ("user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_revenue_kpis_period' AND relkind = 'i') THEN
    CREATE INDEX "idx_revenue_kpis_period" ON "revenue_kpis" USING btree ("year","month");
  END IF;
END $$;