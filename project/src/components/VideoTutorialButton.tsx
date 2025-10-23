import React, { useState, useEffect } from 'react';
import { Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@clerk/clerk-react';
import {
  getPageTutorials,
  getSectionTutorial,
  updateVideoProgress,
  hasWatchedVideo,
  type VideoTutorial,
} from '@/services/videoTutorialService';

interface VideoTutorialButtonProps {
  pageRoute: string;
  sectionKey?: string;
  autoPlay?: boolean; // Auto-play for first-time users
  buttonVariant?: 'default' | 'outline' | 'ghost';
  buttonSize?: 'sm' | 'default' | 'lg';
  buttonText?: string;
}

export function VideoTutorialButton({
  pageRoute,
  sectionKey,
  autoPlay = false,
  buttonVariant = 'outline',
  buttonSize = 'sm',
  buttonText = 'Watch Tutorial',
}: VideoTutorialButtonProps) {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [video, setVideo] = useState<VideoTutorial | null>(null);
  const [hasWatched, setHasWatched] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideo();
  }, [pageRoute, sectionKey, userId]);

  async function loadVideo() {
    setLoading(true);
    
    // Get video for this page/section
    const videoData = sectionKey
      ? await getSectionTutorial(pageRoute, sectionKey)
      : (await getPageTutorials(pageRoute))[0]; // Get first video if no section

    if (videoData) {
      setVideo(videoData);

      // Check if user has watched it
      if (userId) {
        const watched = await hasWatchedVideo(userId, videoData.id);
        setHasWatched(watched);

        // Auto-play if enabled and not watched
        if (autoPlay && !watched) {
          setOpen(true);
        }
      }
    }

    setLoading(false);
  }

  function handleVideoEnd() {
    if (userId && video) {
      updateVideoProgress(userId, video.id, video.durationSeconds || 0, true);
      setHasWatched(true);
    }
  }

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const videoElement = e.currentTarget;
    if (userId && video) {
      // Update progress every 5 seconds
      if (Math.floor(videoElement.currentTime) % 5 === 0) {
        updateVideoProgress(
          userId,
          video.id,
          Math.floor(videoElement.currentTime),
          false
        );
      }
    }
  }

  if (loading || !video) {
    return null;
  }

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Play className="h-4 w-4" />
        {buttonText}
        {hasWatched && <span className="text-xs opacity-60">✓</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{video.title}</DialogTitle>
            {video.description && (
              <DialogDescription>{video.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={video.videoUrl}
              controls
              autoPlay
              className="w-full h-full"
              onEnded={handleVideoEnd}
              onTimeUpdate={handleTimeUpdate}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
