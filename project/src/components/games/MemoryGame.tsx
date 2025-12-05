import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { RotateCcw, Trophy } from 'lucide-react';

// Surf/ocean themed icons using emoji
const iconSet = [
  { id: 'wave', emoji: '🌊', label: 'Wave' },
  { id: 'surfboard', emoji: '🏄', label: 'Surfer' },
  { id: 'fish', emoji: '🐠', label: 'Fish' },
  { id: 'shell', emoji: '🐚', label: 'Shell' },
  { id: 'dolphin', emoji: '🐬', label: 'Dolphin' },
  { id: 'sun', emoji: '☀️', label: 'Sun' },
  { id: 'palm', emoji: '🌴', label: 'Palm' },
  { id: 'anchor', emoji: '⚓', label: 'Anchor' },
  { id: 'boat', emoji: '⛵', label: 'Boat' },
  { id: 'octopus', emoji: '🐙', label: 'Octopus' },
  { id: 'crab', emoji: '🦀', label: 'Crab' },
  { id: 'whale', emoji: '🐋', label: 'Whale' },
  { id: 'starfish', emoji: '⭐', label: 'Starfish' },
  { id: 'turtle', emoji: '🐢', label: 'Turtle' },
  { id: 'coral', emoji: '🪸', label: 'Coral' },
  { id: 'shark', emoji: '🦈', label: 'Shark' },
  { id: 'jellyfish', emoji: '🪼', label: 'Jellyfish' },
  { id: 'lighthouse', emoji: '🏠', label: 'Lighthouse' },
];

interface Card {
  id: number;
  iconId: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const difficultySettings: Record<Difficulty, { pairs: number; cols: number }> = {
  easy: { pairs: 6, cols: 4 },      // 4x3 grid = 12 cards
  medium: { pairs: 8, cols: 4 },    // 4x4 grid = 16 cards
  hard: { pairs: 12, cols: 6 },     // 6x4 grid = 24 cards
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const createCards = (pairs: number): Card[] => {
  const selectedIcons = shuffleArray(iconSet).slice(0, pairs);
  const cards: Card[] = [];
  
  selectedIcons.forEach((icon, index) => {
    // Create two cards for each icon (the pair)
    cards.push({
      id: index * 2,
      iconId: icon.id,
      emoji: icon.emoji,
      isFlipped: false,
      isMatched: false,
    });
    cards.push({
      id: index * 2 + 1,
      iconId: icon.id,
      emoji: icon.emoji,
      isFlipped: false,
      isMatched: false,
    });
  });
  
  return shuffleArray(cards);
};

interface MemoryGameProps {
  initialDifficulty?: Difficulty;
  onClose?: () => void;
}

const MemoryGame: React.FC<MemoryGameProps> = ({ initialDifficulty = 'easy', onClose }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const settings = difficultySettings[difficulty];

  // Initialize game
  useEffect(() => {
    resetGame();
  }, [difficulty]);

  // Timer
  useEffect(() => {
    if (startTime && !gameWon) {
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [startTime, gameWon]);

  const resetGame = () => {
    setCards(createCards(settings.pairs));
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setIsLocked(false);
    setGameWon(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  const handleCardClick = (cardId: number) => {
    if (isLocked) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    
    // Start timer on first click
    if (!startTime) {
      setStartTime(Date.now());
    }

    // Flip the card
    const newCards = cards.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    // Check for match when two cards are flipped
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setIsLocked(true);

      const [firstId, secondId] = newFlipped;
      const firstCard = newCards.find(c => c.id === firstId);
      const secondCard = newCards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.iconId === secondCard.iconId) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isMatched: true } 
              : c
          ));
          setMatches(m => {
            const newMatches = m + 1;
            if (newMatches === settings.pairs) {
              setGameWon(true);
            }
            return newMatches;
          });
          setFlippedCards([]);
          setIsLocked(false);
        }, 500);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isFlipped: false } 
              : c
          ));
          setFlippedCards([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStarRating = (): number => {
    const optimalMoves = settings.pairs;
    const ratio = moves / optimalMoves;
    if (ratio <= 1.5) return 3;
    if (ratio <= 2.5) return 2;
    return 1;
  };

  return (
    <div className="bg-gradient-to-br from-cyan-900 via-blue-900 to-slate-900 rounded-lg p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Memory Match</h3>
        
        {/* Difficulty selector */}
        <div className="flex justify-center gap-2 mb-3">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1 text-xs rounded-full transition-all ${
                difficulty === d
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 text-sm">
          <div>
            <span className="text-slate-400">Moves: </span>
            <span className="text-cyan-300 font-semibold">{moves}</span>
          </div>
          <div>
            <span className="text-slate-400">Matches: </span>
            <span className="text-cyan-300 font-semibold">{matches}/{settings.pairs}</span>
          </div>
          <div>
            <span className="text-slate-400">Time: </span>
            <span className="text-cyan-300 font-semibold">{formatTime(elapsedTime)}</span>
          </div>
        </div>
      </div>

      {/* Game board */}
      {!gameWon ? (
        <div 
          className="grid gap-2 mb-4"
          style={{ 
            gridTemplateColumns: `repeat(${settings.cols}, minmax(0, 1fr))` 
          }}
        >
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.isFlipped || card.isMatched || isLocked}
              className={`
                aspect-square rounded-lg text-2xl
                transition-all duration-300 transform
                ${card.isFlipped || card.isMatched
                  ? 'bg-cyan-600 rotate-0 scale-100'
                  : 'bg-slate-700 hover:bg-slate-600 hover:scale-105'
                }
                ${card.isMatched ? 'bg-green-600 opacity-80' : ''}
                disabled:cursor-default
                border-2 ${card.isMatched ? 'border-green-400' : card.isFlipped ? 'border-cyan-400' : 'border-slate-600'}
              `}
              style={{
                perspective: '1000px',
              }}
            >
              <span 
                className={`
                  block transition-all duration-300
                  ${card.isFlipped || card.isMatched ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
                `}
              >
                {card.emoji}
              </span>
              {!card.isFlipped && !card.isMatched && (
                <span className="text-slate-500 text-lg">?</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* Win screen */
        <div className="text-center py-8">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h4 className="text-2xl font-bold text-white mb-2">You Won!</h4>
          <p className="text-cyan-300 mb-1">
            Completed in {moves} moves
          </p>
          <p className="text-cyan-300 mb-4">
            Time: {formatTime(elapsedTime)}
          </p>
          <div className="text-3xl mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < getStarRating() ? 'text-yellow-400' : 'text-slate-600'}>
                ★
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reset button */}
      <div className="flex justify-center">
        <Button
          onClick={resetGame}
          variant="outline"
          className="bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {gameWon ? 'Play Again' : 'Reset'}
        </Button>
      </div>

      {/* Close button if provided */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 text-sm"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default MemoryGame;
