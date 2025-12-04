import { useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

// Types of celebrations
export type CelebrationType = 
  | 'monthly-target-hit'
  | 'beat-last-month'
  | 'milestone-complete'
  | 'new-lighthouse-year'
  | 'lighthouse-setup'
  | 'ytd-beats-last-year'
  | 'streak-3-months'
  | 'first-100k';

// Storage key for tracking what's been celebrated this session
const CELEBRATED_KEY = 'waverider_celebrated';

// Get celebrated items from session storage
const getCelebrated = (): Set<string> => {
  try {
    const stored = sessionStorage.getItem(CELEBRATED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

// Save celebrated item to session storage
const markCelebrated = (key: string) => {
  try {
    const celebrated = getCelebrated();
    celebrated.add(key);
    sessionStorage.setItem(CELEBRATED_KEY, JSON.stringify([...celebrated]));
  } catch {
    // Ignore storage errors
  }
};

// Check if already celebrated this session
const hasCelebrated = (key: string): boolean => {
  return getCelebrated().has(key);
};

export function useCelebration() {
  // Fire confetti with different styles based on celebration type
  const fireConfetti = useCallback((type: CelebrationType) => {
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    switch (type) {
      case 'new-lighthouse-year':
      case 'first-100k':
        // Big celebration - multiple bursts
        const duration = 3000;
        const end = Date.now() + duration;
        
        const frame = () => {
          confetti({
            ...defaults,
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ['#eab308', '#fbbf24', '#fcd34d'], // Gold colors
          });
          confetti({
            ...defaults,
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ['#eab308', '#fbbf24', '#fcd34d'],
          });
          
          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
        break;

      case 'monthly-target-hit':
      case 'beat-last-month':
        // Medium celebration - single burst from center
        confetti({
          ...defaults,
          particleCount: 100,
          spread: 70,
          origin: { x: 0.5, y: 0.6 },
          colors: ['#22c55e', '#4ade80', '#86efac', '#eab308'], // Green + gold
        });
        break;

      case 'milestone-complete':
        // Targeted burst - from the lighthouse card area
        confetti({
          ...defaults,
          particleCount: 50,
          spread: 60,
          origin: { x: 0.5, y: 0.3 },
          colors: ['#eab308', '#fbbf24', '#ffffff'],
        });
        break;

      case 'ytd-beats-last-year':
      case 'streak-3-months':
        // Side bursts
        confetti({
          ...defaults,
          particleCount: 40,
          angle: 60,
          spread: 45,
          origin: { x: 0, y: 0.6 },
        });
        confetti({
          ...defaults,
          particleCount: 40,
          angle: 120,
          spread: 45,
          origin: { x: 1, y: 0.6 },
        });
        break;

      default:
        // Default celebration
        confetti({
          ...defaults,
          particleCount: 80,
          spread: 60,
        });
    }
  }, []);

  // Trigger celebration if not already celebrated this session
  const celebrate = useCallback((type: CelebrationType, uniqueKey?: string) => {
    const key = uniqueKey || type;
    
    if (!hasCelebrated(key)) {
      markCelebrated(key);
      // Small delay to let the page render first
      setTimeout(() => {
        fireConfetti(type);
      }, 500);
      return true;
    }
    return false;
  }, [fireConfetti]);

  // Force celebration (ignores session check)
  const forceCelebrate = useCallback((type: CelebrationType) => {
    fireConfetti(type);
  }, [fireConfetti]);

  // Reset celebrations (for testing)
  const resetCelebrations = useCallback(() => {
    sessionStorage.removeItem(CELEBRATED_KEY);
  }, []);

  return {
    celebrate,
    forceCelebrate,
    resetCelebrations,
  };
}

// Hook to check celebration conditions and trigger automatically
export function useDashboardCelebrations(data: {
  hitMonthlyTarget: boolean;
  beatLastMonth: boolean;
  ytdBeatsLastYear: boolean;
  currentMonth: number;
  currentYear: number;
}) {
  const { celebrate } = useCelebration();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only check once per mount
    if (hasChecked.current) return;
    hasChecked.current = true;

    const { hitMonthlyTarget, beatLastMonth, ytdBeatsLastYear, currentMonth, currentYear } = data;

    // Check conditions and celebrate (only first matching one to avoid confetti overload)
    if (hitMonthlyTarget) {
      celebrate('monthly-target-hit', `monthly-target-${currentYear}-${currentMonth}`);
    } else if (beatLastMonth) {
      celebrate('beat-last-month', `beat-last-month-${currentYear}-${currentMonth}`);
    } else if (ytdBeatsLastYear) {
      celebrate('ytd-beats-last-year', `ytd-beats-${currentYear}`);
    }
  }, [data, celebrate]);
}
