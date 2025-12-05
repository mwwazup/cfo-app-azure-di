import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { RefreshCw, Pause, Play } from 'lucide-react';

// Collection of motivational and business quotes
const quotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Revenue is vanity, profit is sanity, cash is king.", author: "Business Proverb" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The sea, once it casts its spell, holds one in its net of wonder forever.", author: "Jacques Cousteau" },
  { text: "You can't stop the waves, but you can learn to surf.", author: "Jon Kabat-Zinn" },
  { text: "Life is like the ocean. It can be calm or still, and rough or rigid, but in the end, it is always beautiful.", author: "Unknown" },
  { text: "The entrepreneur always searches for change, responds to it, and exploits it as an opportunity.", author: "Peter Drucker" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The wave does not need to die to become water. She is already water.", author: "Thich Nhat Hanh" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Ride the wave of change or be crushed by it.", author: "Unknown" },
  { text: "Cash flow is the lifeblood of your business.", author: "Richard Branson" },
  { text: "A business that makes nothing but money is a poor business.", author: "Henry Ford" },
];

// Different font styles for variety
const fontStyles = [
  { fontFamily: "'Carattere', cursive", fontWeight: 400, fontStyle: "normal", fontSize: "1.5em" },
  { fontFamily: "'Trebuchet MS', sans-serif", letterSpacing: "0.05em" },
  { fontFamily: "'Palatino Linotype', serif", fontStyle: "italic" },
  { fontFamily: "'Brush Script MT', cursive", fontSize: "1.3em" },
];

interface QuoteMarqueeProps {
  intervalMs?: number;
  showControls?: boolean;
}

const QuoteMarquee: React.FC<QuoteMarqueeProps> = ({ 
  intervalMs = 5000,
  showControls = true 
}) => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Start fade out
      setFadeState('out');
      
      // After fade out, change quote and fade in
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
        setFadeState('in');
      }, 500); // Half second for fade out
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, intervalMs]);

  const currentQuote = quotes[currentQuoteIndex];
  const currentFont = fontStyles[currentQuoteIndex % fontStyles.length];

  const handleNext = () => {
    setFadeState('out');
    setTimeout(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
      setFadeState('in');
    }, 300);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-lg p-6 min-h-[120px]">
      {/* Animated wave background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-blue-400 to-transparent animate-pulse" />
      </div>
      
      {/* Quote content */}
      <div 
        className={`relative z-10 text-center transition-all duration-500 ${
          fadeState === 'in' ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4'
        }`}
      >
        <p 
          className="text-white text-xl md:text-2xl mb-3 leading-relaxed"
          style={currentFont}
        >
          "{currentQuote.text}"
        </p>
        <p className="text-blue-200 text-sm font-light tracking-widest uppercase">
          — {currentQuote.author}
        </p>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="absolute bottom-2 right-2 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-950">
        <div 
          className={`h-full bg-blue-400 ${isPlaying ? 'animate-progress' : ''}`}
          style={{ 
            animation: isPlaying ? `progress ${intervalMs}ms linear infinite` : 'none',
            width: isPlaying ? '100%' : '0%'
          }}
        />
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default QuoteMarquee;
