-- Fresh Database Setup Script for Big Fig CFO
-- This script creates all essential tables for the application

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create profiles table (for user data)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name text,
  last_name text,
  email text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Create revenue_entries table
CREATE TABLE IF NOT EXISTS revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  actual_revenue decimal(15,2) DEFAULT 0,
  desired_revenue decimal(15,2),
  target_revenue decimal(15,2),
  profit_margin decimal(5,2),
  is_locked boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure one entry per user/year/month combination
  UNIQUE(user_id, year, month)
);

-- Enable RLS on revenue_entries
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for revenue_entries
CREATE POLICY "Users can view their own revenue entries"
  ON revenue_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own revenue entries"
  ON revenue_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenue entries"
  ON revenue_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenue entries"
  ON revenue_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create coaching_moments table
CREATE TABLE IF NOT EXISTS coaching_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  response text NOT NULL,
  impact jsonb,
  date timestamptz DEFAULT now() NOT NULL,
  title text NOT NULL,
  scenario_type text,
  response_type text DEFAULT 'quick_ridr' NOT NULL,
  ridr_response jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on coaching_moments
ALTER TABLE coaching_moments ENABLE ROW LEVEL SECURITY;

-- Create policies for coaching_moments
CREATE POLICY "Users can view their own coaching moments"
  ON coaching_moments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coaching moments"
  ON coaching_moments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching moments"
  ON coaching_moments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coaching moments"
  ON coaching_moments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Create revenue_kpis table
CREATE TABLE IF NOT EXISTS revenue_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer CHECK (month >= 1 AND month <= 12),
  total_revenue decimal(15,2) DEFAULT 0,
  target_revenue decimal(15,2),
  variance_amount decimal(15,2),
  variance_percentage decimal(5,2),
  growth_rate decimal(5,2),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(user_id, year, month)
);

-- Enable RLS on revenue_kpis
ALTER TABLE revenue_kpis ENABLE ROW LEVEL SECURITY;

-- Create policies for revenue_kpis
CREATE POLICY "Users can view their own revenue KPIs"
  ON revenue_kpis
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own revenue KPIs"
  ON revenue_kpis
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenue KPIs"
  ON revenue_kpis
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenue KPIs"
  ON revenue_kpis
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Create financial_documents table
CREATE TABLE IF NOT EXISTS financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  document_type text,
  status text DEFAULT 'uploaded' NOT NULL,
  analysis_result jsonb,
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  analyzed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on financial_documents
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for financial_documents
CREATE POLICY "Users can view their own financial documents"
  ON financial_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial documents"
  ON financial_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial documents"
  ON financial_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial documents"
  ON financial_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_entries_updated_at
  BEFORE UPDATE ON revenue_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_moments_updated_at
  BEFORE UPDATE ON coaching_moments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_kpis_updated_at
  BEFORE UPDATE ON revenue_kpis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_documents_updated_at
  BEFORE UPDATE ON financial_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS revenue_entries_user_id_idx ON revenue_entries(user_id);
CREATE INDEX IF NOT EXISTS revenue_entries_year_idx ON revenue_entries(year);
CREATE INDEX IF NOT EXISTS revenue_entries_user_year_idx ON revenue_entries(user_id, year);
CREATE INDEX IF NOT EXISTS revenue_entries_user_year_month_idx ON revenue_entries(user_id, year, month);
CREATE INDEX IF NOT EXISTS coaching_moments_user_id_idx ON coaching_moments(user_id);
CREATE INDEX IF NOT EXISTS coaching_moments_date_idx ON coaching_moments(date DESC);
CREATE INDEX IF NOT EXISTS revenue_kpis_user_id_idx ON revenue_kpis(user_id);
CREATE INDEX IF NOT EXISTS revenue_kpis_user_year_idx ON revenue_kpis(user_id, year);
CREATE INDEX IF NOT EXISTS financial_documents_user_id_idx ON financial_documents(user_id);
CREATE INDEX IF NOT EXISTS financial_documents_uploaded_at_idx ON financial_documents(uploaded_at DESC);

-- 10. Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON revenue_entries TO authenticated;
GRANT ALL ON coaching_moments TO authenticated;
GRANT ALL ON revenue_kpis TO authenticated;
GRANT ALL ON financial_documents TO authenticated;

-- Success message
SELECT 'Database setup complete! All essential tables created.' as status;
