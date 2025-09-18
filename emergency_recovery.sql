-- Emergency Database Recovery Script
-- Recreate essential tables that may be missing

-- 1. Ensure revenue_entries has the correct schema
-- Add missing columns if they don't exist

-- Add last_seeded_at column if missing
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS last_seeded_at timestamptz DEFAULT now();

-- Ensure all required columns exist
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS user_id text NOT NULL DEFAULT '';
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS year integer NOT NULL DEFAULT 0;
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS month integer NOT NULL DEFAULT 0;
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS actual_revenue numeric(15,2) DEFAULT 0;
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS desired_revenue numeric(15,2);
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS target_revenue numeric(15,2);
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS profit_margin numeric(5,2);
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure primary key exists (drop and recreate if needed)
DO $$ 
BEGIN
    -- Try to add primary key, ignore if it already exists
    BEGIN
        ALTER TABLE revenue_entries ADD CONSTRAINT revenue_entries_pkey PRIMARY KEY (id);
    EXCEPTION 
        WHEN duplicate_table THEN 
            -- Primary key already exists, do nothing
            NULL;
        WHEN others THEN
            -- Handle other potential issues
            RAISE NOTICE 'Could not add primary key: %', SQLERRM;
    END;
END $$;

-- Ensure unique constraint exists
DO $$ 
BEGIN
    -- Try to add unique constraint, ignore if it already exists
    BEGIN
        ALTER TABLE revenue_entries ADD CONSTRAINT revenue_entries_user_year_month_unique UNIQUE (user_id, year, month);
    EXCEPTION 
        WHEN duplicate_table THEN 
            -- Constraint already exists, do nothing
            NULL;
        WHEN others THEN
            -- Handle other potential issues
            RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
    END;
END $$;

-- 2. Create missing RAG tables
CREATE TABLE IF NOT EXISTS rag_ingest_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  table_name text NOT NULL,
  last_synced timestamptz DEFAULT now(),
  record_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create graph tables for RAG system
CREATE TABLE IF NOT EXISTS graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  label text NOT NULL,
  body text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_from timestamptz,
  valid_to timestamptz,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  src uuid NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  dst uuid NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  kind text NOT NULL,
  weight real DEFAULT 1.0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. Create user actions table
CREATE TABLE IF NOT EXISTS user_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  notes text,
  source_question text,
  source_answer text,
  created_at timestamptz DEFAULT now()
);

-- 5. Create voice conversations table
CREATE TABLE IF NOT EXISTS voice_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  duration_seconds integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Enable RLS on all tables
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_ingest_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_conversations ENABLE ROW LEVEL SECURITY;

-- 7. Create basic RLS policies (drop first to avoid conflicts)
-- Skip RLS policies for now to get tables created first
-- We'll add them later once we know the exact user_id column types

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_entries_user ON revenue_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_year ON revenue_entries(year);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_user_year ON revenue_entries(user_id, year);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_user ON graph_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_user ON graph_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_user ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_user ON voice_conversations(user_id);

-- 9. Grant permissions
GRANT ALL ON revenue_entries TO authenticated;
GRANT ALL ON rag_ingest_state TO authenticated;
GRANT ALL ON graph_nodes TO authenticated;
GRANT ALL ON graph_edges TO authenticated;
GRANT ALL ON user_actions TO authenticated;
GRANT ALL ON voice_conversations TO authenticated;
