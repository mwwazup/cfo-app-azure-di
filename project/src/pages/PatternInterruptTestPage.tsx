import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RefreshCw, Pause, Play } from 'lucide-react';
import { RockPaperScissors, MemoryGame } from '../components/games';

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
  { fontFamily: "'Georgia', serif", fontStyle: "italic" },
  { fontFamily: "'Trebuchet MS', sans-serif", letterSpacing: "0.05em" },
  { fontFamily: "'Palatino Linotype', serif", fontStyle: "italic" },
  { fontFamily: "'Brush Script MT', cursive", fontSize: "1.3em" },
];

const QuoteMarquee: React.FC = () => {
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
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [isPlaying]);

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

      {/* Progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-950">
        <div 
          className={`h-full bg-blue-400 ${isPlaying ? 'animate-progress' : ''}`}
          style={{ 
            animation: isPlaying ? 'progress 4s linear infinite' : 'none',
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

// Alternative: Horizontal scrolling marquee
const ScrollingMarquee: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);

  // Double the quotes for seamless loop
  const doubledQuotes = [...quotes, ...quotes];

  return (
    <div 
      className="relative overflow-hidden bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 rounded-lg py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        className={`flex whitespace-nowrap ${isPaused ? '' : 'animate-marquee'}`}
        style={{
          animation: isPaused ? 'none' : 'marquee 60s linear infinite',
        }}
      >
        {doubledQuotes.map((quote, index) => (
          <span 
            key={index} 
            className="mx-8 text-amber-100 text-lg"
            style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}
          >
            "{quote.text}" <span className="text-amber-300">— {quote.author}</span>
            <span className="mx-8 text-amber-500">•</span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
      `}</style>
    </div>
  );
};

// Compact single-line version
const CompactQuoteBar: React.FC = () => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
        setFadeState('in');
      }, 400);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentQuote = quotes[currentQuoteIndex];

  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-md px-4 py-2 flex items-center justify-center">
      <div 
        className={`text-center transition-all duration-400 ${
          fadeState === 'in' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span 
          className="text-slate-200 text-sm"
          style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}
        >
          "{currentQuote.text}"
        </span>
        <span className="text-slate-400 text-xs ml-2">
          — {currentQuote.author}
        </span>
      </div>
    </div>
  );
};

// Main test page component
const PatternInterruptTestPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Pattern Interrupt Test Page</h1>
        <p className="text-muted-foreground">Experimenting with quote generators and interactive elements</p>
      </div>

      {/* Style 1: Fade transition with controls */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Style 1: Fade Transition with Controls</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quotes fade in/out every 4 seconds. Different fonts for variety. Pause/play and skip controls.
          </p>
        </CardHeader>
        <CardContent>
          <QuoteMarquee />
        </CardContent>
      </Card>

      {/* Style 2: Horizontal scrolling marquee */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Style 2: Horizontal Scrolling Marquee</CardTitle>
          <p className="text-sm text-muted-foreground">
            Continuous horizontal scroll. Pauses on hover. Classic marquee style.
          </p>
        </CardHeader>
        <CardContent>
          <ScrollingMarquee />
        </CardContent>
      </Card>

      {/* Style 3: Compact single-line */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Style 3: Compact Single-Line Bar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Minimal footprint. Good for headers or between sections.
          </p>
        </CardHeader>
        <CardContent>
          <CompactQuoteBar />
        </CardContent>
      </Card>

      {/* Placement examples */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Example: Between Data Sections</CardTitle>
          <p className="text-sm text-muted-foreground">
            How it might look between two data-heavy sections
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fake data section 1 */}
          <div className="bg-background rounded-lg p-4 border">
            <h3 className="font-semibold mb-2">Revenue Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">$45,230</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">$389,450</p>
                <p className="text-xs text-muted-foreground">YTD</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">+12.4%</p>
                <p className="text-xs text-muted-foreground">Growth</p>
              </div>
            </div>
          </div>

          {/* Quote break */}
          <CompactQuoteBar />

          {/* Fake data section 2 */}
          <div className="bg-background rounded-lg p-4 border">
            <h3 className="font-semibold mb-2">Expense Breakdown</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-500">$28,100</p>
                <p className="text-xs text-muted-foreground">Operating</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">$8,500</p>
                <p className="text-xs text-muted-foreground">COGS</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-500">$5,200</p>
                <p className="text-xs text-muted-foreground">Owner Draws</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rock Paper Scissors Game */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Game: Rock Paper Scissors</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quick mental break. Best of 3 or 5. ~30 seconds to play.
          </p>
        </CardHeader>
        <CardContent>
          <RockPaperScissors bestOf={3} />
        </CardContent>
      </Card>

      {/* Memory Game */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Game: Memory Match</CardTitle>
          <p className="text-sm text-muted-foreground">
            Surf-themed memory game. 3 difficulty levels. 2-5 minutes to play.
          </p>
        </CardHeader>
        <CardContent>
          <MemoryGame initialDifficulty="easy" />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="bg-blue-950/30 border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg text-blue-300">Notes & Ideas</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-200 text-sm space-y-2">
          <p>• Style 1 is most prominent - good for dedicated sections or page headers</p>
          <p>• Style 2 (scrolling) is eye-catching but might be distracting for focused work</p>
          <p>• Style 3 (compact) is subtle - perfect for breaking up data sections</p>
          <p>• Rock Paper Scissors - quick 30-second mental break</p>
          <p>• Could add category filters (business, surf, motivational)</p>
          <p>• Could tie quotes to user performance (encouraging when struggling)</p>
          <p>• Could add user's own custom quotes</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatternInterruptTestPage;
