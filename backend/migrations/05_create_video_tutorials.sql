-- Video Tutorials System
-- Stores tutorial videos and links them to app pages/sections

-- Main video tutorials table
CREATE TABLE IF NOT EXISTS video_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_route TEXT NOT NULL, -- e.g., '/dashboard', '/revenue/master', '/employee-ler'
  section_key TEXT, -- Optional: specific section within page (e.g., 'kpi-cards', 'revenue-chart')
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL, -- Supabase Storage URL
  thumbnail_url TEXT, -- Optional thumbnail image
  duration_seconds INTEGER, -- Video length in seconds
  display_order INTEGER DEFAULT 0, -- Order for multiple videos on same page
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique videos per page/section
  UNIQUE(page_route, section_key)
);

-- User video progress tracking
CREATE TABLE IF NOT EXISTS user_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID
  video_id UUID NOT NULL REFERENCES video_tutorials(id) ON DELETE CASCADE,
  watched_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One progress record per user per video
  UNIQUE(user_id, video_id)
);

-- Indexes for performance
CREATE INDEX idx_video_tutorials_page ON video_tutorials(page_route);
CREATE INDEX idx_video_tutorials_active ON video_tutorials(is_active);
CREATE INDEX idx_user_video_progress_user ON user_video_progress(user_id);
CREATE INDEX idx_user_video_progress_video ON user_video_progress(video_id);

-- RLS Policies
ALTER TABLE video_tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_video_progress ENABLE ROW LEVEL SECURITY;

-- Everyone can read active tutorials
CREATE POLICY "Anyone can view active tutorials"
  ON video_tutorials FOR SELECT
  USING (is_active = true);

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
  ON user_video_progress FOR SELECT
  TO authenticated
  USING (user_id = public.get_clerk_user_id());

-- Users can insert/update their own progress
CREATE POLICY "Users can track own progress"
  ON user_video_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can update own progress"
  ON user_video_progress FOR UPDATE
  TO authenticated
  USING (user_id = public.get_clerk_user_id());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_tutorial_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_video_tutorials_timestamp
  BEFORE UPDATE ON video_tutorials
  FOR EACH ROW
  EXECUTE FUNCTION update_video_tutorial_timestamp();
