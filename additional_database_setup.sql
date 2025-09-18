-- Additional Database Setup Script
-- This script adds the missing tables and functions identified from the errors

-- 1. Create kpi_records table with all expected columns
CREATE TABLE IF NOT EXISTS kpi_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period date NOT NULL,
  kpi_name text NOT NULL,
  kpi_value decimal(15,2),
  kpi_target decimal(15,2),
  goal_value decimal(15,2),
  variance_amount decimal(15,2),
  variance_percentage decimal(5,2),
  trend_vs_last_month decimal(5,4),
  kpi_category text DEFAULT 'revenue',
  action_suggestion text,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(user_id, period, kpi_name)
);

-- Enable RLS on kpi_records
ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view their own KPI records" ON kpi_records;
DROP POLICY IF EXISTS "Users can insert their own KPI records" ON kpi_records;
DROP POLICY IF EXISTS "Users can update their own KPI records" ON kpi_records;
DROP POLICY IF EXISTS "Users can delete their own KPI records" ON kpi_records;

-- Create policies for kpi_records
CREATE POLICY "Users can view their own KPI records"
  ON kpi_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own KPI records"
  ON kpi_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own KPI records"
  ON kpi_records
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own KPI records"
  ON kpi_records
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Create the create_profile_for_user function (matching frontend expectations)
CREATE OR REPLACE FUNCTION create_profile_for_user(
  input_user_id uuid,
  input_email text DEFAULT NULL,
  input_first_name text DEFAULT NULL,
  input_last_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_profile json;
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name, created_at, updated_at)
  VALUES (
    input_user_id,
    input_email,
    input_first_name,
    input_last_name,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(input_email, profiles.email),
    first_name = COALESCE(input_first_name, profiles.first_name),
    last_name = COALESCE(input_last_name, profiles.last_name),
    updated_at = now();
  
  -- Return the profile as JSON
  SELECT row_to_json(p) INTO result_profile
  FROM profiles p
  WHERE p.id = input_user_id;
  
  RETURN result_profile;
END;
$$;

-- 3. Create momentum_entries table (referenced in some migrations)
CREATE TABLE IF NOT EXISTS momentum_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  momentum_score integer CHECK (momentum_score >= 1 AND momentum_score <= 10),
  notes text,
  factors jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(user_id, date)
);

-- Enable RLS on momentum_entries
ALTER TABLE momentum_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view their own momentum entries" ON momentum_entries;
DROP POLICY IF EXISTS "Users can insert their own momentum entries" ON momentum_entries;
DROP POLICY IF EXISTS "Users can update their own momentum entries" ON momentum_entries;
DROP POLICY IF EXISTS "Users can delete their own momentum entries" ON momentum_entries;

-- Create policies for momentum_entries
CREATE POLICY "Users can view their own momentum entries"
  ON momentum_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own momentum entries"
  ON momentum_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own momentum entries"
  ON momentum_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own momentum entries"
  ON momentum_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create triggers for updated_at on new tables (drop first if they exist)
DROP TRIGGER IF EXISTS update_kpi_records_updated_at ON kpi_records;
DROP TRIGGER IF EXISTS update_momentum_entries_updated_at ON momentum_entries;

CREATE TRIGGER update_kpi_records_updated_at
  BEFORE UPDATE ON kpi_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_momentum_entries_updated_at
  BEFORE UPDATE ON momentum_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS kpi_records_user_id_idx ON kpi_records(user_id);
CREATE INDEX IF NOT EXISTS kpi_records_period_idx ON kpi_records(period DESC);
CREATE INDEX IF NOT EXISTS kpi_records_user_period_idx ON kpi_records(user_id, period);
CREATE INDEX IF NOT EXISTS momentum_entries_user_id_idx ON momentum_entries(user_id);
CREATE INDEX IF NOT EXISTS momentum_entries_date_idx ON momentum_entries(date DESC);
CREATE INDEX IF NOT EXISTS momentum_entries_user_date_idx ON momentum_entries(user_id, date);

-- 6. Grant permissions
GRANT ALL ON kpi_records TO authenticated;
GRANT ALL ON momentum_entries TO authenticated;

-- 7. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_profile_for_user(uuid, text, text, text) TO authenticated;

-- Success message
SELECT 'Additional database setup complete! Missing tables and functions added.' as status;
