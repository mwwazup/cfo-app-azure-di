import { supabase } from '@/lib/supabaseClient';

export interface VideoTutorial {
  id: string;
  pageRoute: string;
  sectionKey?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  displayOrder: number;
  isActive: boolean;
}

export interface VideoProgress {
  videoId: string;
  watchedSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
}

/**
 * Get tutorial videos for a specific page
 */
export async function getPageTutorials(pageRoute: string): Promise<VideoTutorial[]> {
  const { data, error } = await supabase
    .from('video_tutorials')
    .select('*')
    .eq('page_route', pageRoute)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching page tutorials:', error);
    return [];
  }

  return data || [];
}

/**
 * Get tutorial for specific section within a page
 */
export async function getSectionTutorial(
  pageRoute: string,
  sectionKey: string
): Promise<VideoTutorial | null> {
  const { data, error } = await supabase
    .from('video_tutorials')
    .select('*')
    .eq('page_route', pageRoute)
    .eq('section_key', sectionKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching section tutorial:', error);
    return null;
  }

  return data;
}

/**
 * Get user's progress for a video
 */
export async function getVideoProgress(
  userId: string,
  videoId: string
): Promise<VideoProgress | null> {
  const { data, error } = await supabase
    .from('user_video_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // Not found is ok
    console.error('Error fetching video progress:', error);
    return null;
  }

  return data;
}

/**
 * Update user's video progress
 */
export async function updateVideoProgress(
  userId: string,
  videoId: string,
  watchedSeconds: number,
  completed: boolean
): Promise<void> {
  const { error } = await supabase
    .from('user_video_progress')
    .upsert({
      user_id: userId,
      video_id: videoId,
      watched_seconds: watchedSeconds,
      completed: completed,
      last_watched_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,video_id'
    });

  if (error) {
    console.error('Error updating video progress:', error);
  }
}

/**
 * Check if user has watched a video
 */
export async function hasWatchedVideo(
  userId: string,
  videoId: string
): Promise<boolean> {
  const progress = await getVideoProgress(userId, videoId);
  return progress?.completed || false;
}
