-- Create storage bucket for tutorial videos
-- Run this AFTER running 05_create_video_tutorials.sql

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-videos', 'tutorial-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to videos
CREATE POLICY "Public video access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tutorial-videos');

-- Allow authenticated users to upload videos
-- (In production, you may want to restrict this to admin users only)
CREATE POLICY "Authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tutorial-videos');

-- Optional: Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tutorial-videos');
