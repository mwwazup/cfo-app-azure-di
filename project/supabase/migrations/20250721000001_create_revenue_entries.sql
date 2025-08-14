/*
  # Create revenue entries table

  1. New Tables
    - `revenue_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `year` (integer)
      - `month` (integer, 1-12)
      - `actual_revenue` (decimal)
      - `desired_revenue` (decimal, nullable)
      - `target_revenue` (decimal, nullable) 
      - `profit_margin` (decimal, nullable)
      - `is_locked` (boolean)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `revenue_entries` table
    - Add policies for users to manage their own revenue entries

  3. Indexes
    - Add indexes for performance on user_id, year, month
*/

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

-- Enable Row Level Security
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS revenue_entries_user_id_idx ON revenue_entries(user_id);
CREATE INDEX IF NOT EXISTS revenue_entries_year_idx ON revenue_entries(year);
CREATE INDEX IF NOT EXISTS revenue_entries_user_year_idx ON revenue_entries(user_id, year);
CREATE INDEX IF NOT EXISTS revenue_entries_user_year_month_idx ON revenue_entries(user_id, year, month);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_revenue_entries_updated_at
  BEFORE UPDATE ON revenue_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
