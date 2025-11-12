import { useEffect, useRef, useState } from 'react';

// Functions base (prod or local)
const FUNCTIONS_BASE: string =
  // @ts-ignore
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_URL) ||
  // @ts-ignore
  (typeof window !== "undefined" && (window as any).__SUPABASE_FUNCTIONS_URL__) ||
  "http://localhost:54321/functions/v1";

// Simple SHA-256 for cache keys
async function sha256(text: string) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

interface GeminiTTSProps {
  text: string;
  autoPlay?: boolean;
  voiceName?: string;
  onPlay?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function useTTSCache() {
  const getCachedAudio = async (text: string, voiceName: string) => {
    const hash = await sha256(`${voiceName}|${text}`);
    const cacheKey = `tts:${hash}`;
    return sessionStorage.getItem(cacheKey);
  };

  const cacheAudio = async (text: string, voiceName: string, audioUrl: string) => {
    const hash = await sha256(`${voiceName}|${text}`);
    const cacheKey = `tts:${hash}`;
    sessionStorage.setItem(cacheKey, audioUrl);
  };

  return { getCachedAudio, cacheAudio };
}

export async function generateTTS({
  text,
  voiceName = 'Algenib',
  onProgress,
  onSuccess,
  onError,
}: {
  text: string;
  voiceName?: string;
  onProgress?: (status: string) => void;
  onSuccess: (audioUrl: string) => void;
  onError: (error: string) => void;
}) {
  // Get Supabase project ID from environment variable
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || '';
  const authTokenKey = `sb-${projectId}-auth-token`;
  
  const session = JSON.parse(localStorage.getItem(authTokenKey) || '{}');
  const accessToken = session?.access_token;

  if (!accessToken) {
    onError("Not authenticated. Please log in.");
    return;
  }

  let attempt = 0, max = 4, delay = 500;
  
  while (attempt < max) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      onProgress?.(attempt > 0 ? `Attempt ${attempt + 1} of ${max}...` : 'Generating speech...');
      
      const response = await fetch(`${FUNCTIONS_BASE}/gemini-tts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ text, voiceName }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        onSuccess(url);
        return url;
      }
      
      if (response.status === 429 || response.status === 503) {
        const retryAfter = response.headers.get('Retry-After') || '30';
        const waitTime = parseInt(retryAfter, 10) * 1000 || delay;
        
        if (attempt === max - 1) {
          onError(`Still rate limited. Please try again later.`);
          return null;
        }
        
        await new Promise(res => setTimeout(res, waitTime));
        delay *= 2;
        attempt++;
        continue;
      }
      
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (attempt === max - 1) {
        onError(error.message || 'Failed to generate speech');
        return null;
      }
      
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
      attempt++;
    }
  }
  
  return null;
}

export default function GeminiTTS({ 
  text, 
  autoPlay = true, 
  voiceName = 'Algenib',
  onPlay,
  onEnd,
  onError
}: GeminiTTSProps) {
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { getCachedAudio, cacheAudio } = useTTSCache();

  useEffect(() => {
    if (!text) return;
    
    const processText = async () => {
      setIsLoading(true);
      
      try {
        // Check cache first
        const cachedUrl = await getCachedAudio(text, voiceName);
        
        if (cachedUrl) {
          setAudioUrl(cachedUrl);
          if (audioRef.current) {
            audioRef.current.src = cachedUrl;
            if (autoPlay) {
              await audioRef.current.play().catch(e => {
                onError?.(`Playback error: ${e.message}`);
              });
            }
          }
          return;
        }
        
        // Generate new TTS if not in cache
        await generateTTS({
          text,
          voiceName,
          onProgress: (status) => onError?.(status),
          onSuccess: async (url) => {
            setAudioUrl(url);
            await cacheAudio(text, voiceName, url);
            if (audioRef.current) {
              audioRef.current.src = url;
              if (autoPlay) {
                await audioRef.current.play().catch(e => {
                  onError?.(`Playback error: ${e.message}`);
                });
              }
            }
          },
          onError: (error) => {
            onError?.(error);
          },
        });
        
      } catch (error: any) {
        onError?.(error.message || 'Failed to process text');
      } finally {
        setIsLoading(false);
      }
    };
    
    processText();
    
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [text, voiceName, autoPlay]);

  return (
    <div className="hidden">
      <audio
        ref={audioRef}
        onPlay={onPlay}
        onEnded={onEnd}
        onError={(e) => {
          onError?.('Audio playback error');
          console.error('Audio error:', e);
        }}
      />
    </div>
  );
}
