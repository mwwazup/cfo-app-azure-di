/*
  # Create momentum entries table

  1. New Tables
    - `momentum_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `month` (text, format: YYYY-MM)
      - `section` (text, momentum tracker section key)
      - `content` (text, user's response)
      - `is_draft` (boolean, whether entry is saved as draft)
      - `feeling` (text, optional mood/feeling)
      - `impact_score` (integer, optional impact rating)
      - `tags` (text[], optional tags)
      - `additional_content` (text, optional extra content)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `momentum_entries` table
    - Add policies for users to manage their own momentum entries

  3. Indexes
    - Add indexes for performance on user_id, month, section
*/

CREATE TABLE IF NOT EXISTS momentum_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month text NOT NULL, -- Format: YYYY-MM
  section text NOT NULL, -- Section key from momentum tracker
  content text NOT NULL DEFAULT '',
  is_draft boolean DEFAULT false,
  feeling text,
  impact_score integer CHECK (impact_score >= 1 AND impact_score <= 10),
  tags text[] DEFAULT '{}',
  additional_content text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure one entry per user/month/section combination
  UNIQUE(user_id, month, section)
);

-- Enable Row Level Security
ALTER TABLE momentum_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS momentum_entries_user_id_idx ON momentum_entries(user_id);
CREATE INDEX IF NOT EXISTS momentum_entries_month_idx ON momentum_entries(month DESC);
CREATE INDEX IF NOT EXISTS momentum_entries_section_idx ON momentum_entries(section);
CREATE INDEX IF NOT EXISTS momentum_entries_user_month_idx ON momentum_entries(user_id, month);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_momentum_entries_updated_at
  BEFORE UPDATE ON momentum_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
