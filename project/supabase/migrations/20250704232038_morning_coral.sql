/*
  # Create coaching moments table

  1. New Tables
    - `coaching_moments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `question` (text)
      - `response` (text)
      - `impact` (jsonb, nullable - for CalculationResult)
      - `date` (timestamptz)
      - `title` (text)
      - `scenario_type` (text, nullable)
      - `response_type` (text)
      - `ridr_response` (jsonb, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `coaching_moments` table
    - Add policies for users to manage their own coaching moments
*/

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

-- Enable Row Level Security
ALTER TABLE coaching_moments ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS coaching_moments_user_id_idx ON coaching_moments(user_id);
CREATE INDEX IF NOT EXISTS coaching_moments_date_idx ON coaching_moments(date DESC);
CREATE INDEX IF NOT EXISTS coaching_moments_scenario_type_idx ON coaching_moments(scenario_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_coaching_moments_updated_at
  BEFORE UPDATE ON coaching_moments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();