import React, { useState } from 'react';
import { Button } from '../ui/button';
import { RotateCcw } from 'lucide-react';

type Choice = 'rock' | 'paper' | 'scissors' | null;
type Result = 'win' | 'lose' | 'tie' | null;

const choices: { id: Choice; emoji: string; label: string }[] = [
  { id: 'rock', emoji: '🪨', label: 'Rock' },
  { id: 'paper', emoji: '📄', label: 'Paper' },
  { id: 'scissors', emoji: '✂️', label: 'Scissors' },
];

const getComputerChoice = (): Choice => {
  const options: Choice[] = ['rock', 'paper', 'scissors'];
  return options[Math.floor(Math.random() * 3)];
};

const determineWinner = (player: Choice, computer: Choice): Result => {
  if (!player || !computer) return null;
  if (player === computer) return 'tie';
  if (
    (player === 'rock' && computer === 'scissors') ||
    (player === 'paper' && computer === 'rock') ||
    (player === 'scissors' && computer === 'paper')
  ) {
    return 'win';
  }
  return 'lose';
};

interface RockPaperScissorsProps {
  bestOf?: 3 | 5;
  onClose?: () => void;
}

const RockPaperScissors: React.FC<RockPaperScissorsProps> = ({ bestOf = 3, onClose }) => {
  const [playerChoice, setPlayerChoice] = useState<Choice>(null);
  const [computerChoice, setComputerChoice] = useState<Choice>(null);
  const [result, setResult] = useState<Result>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [computerScore, setComputerScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const winsNeeded = Math.ceil(bestOf / 2);

  const handleChoice = (choice: Choice) => {
    if (isAnimating || gameOver) return;

    setIsAnimating(true);
    setPlayerChoice(choice);
    setComputerChoice(null);
    setResult(null);

    // Animate computer "thinking"
    let count = 0;
    const animationInterval = setInterval(() => {
      setComputerChoice(choices[count % 3].id);
      count++;
    }, 100);

    // Reveal result after animation
    setTimeout(() => {
      clearInterval(animationInterval);
      const computer = getComputerChoice();
      setComputerChoice(computer);
      const roundResult = determineWinner(choice, computer);
      setResult(roundResult);

      // Update scores
      if (roundResult === 'win') {
        const newScore = playerScore + 1;
        setPlayerScore(newScore);
        if (newScore >= winsNeeded) {
          setGameOver(true);
        }
      } else if (roundResult === 'lose') {
        const newScore = computerScore + 1;
        setComputerScore(newScore);
        if (newScore >= winsNeeded) {
          setGameOver(true);
        }
      }

      setIsAnimating(false);
    }, 800);
  };

  const resetGame = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult(null);
    setPlayerScore(0);
    setComputerScore(0);
    setGameOver(false);
  };

  const getChoiceEmoji = (choice: Choice) => {
    return choices.find(c => c.id === choice)?.emoji || '❓';
  };

  const getResultMessage = () => {
    if (gameOver) {
      return playerScore >= winsNeeded ? '🎉 You Won the Match!' : '😔 Computer Wins';
    }
    if (!result) return 'Choose your weapon!';
    if (result === 'win') return '✓ You win this round!';
    if (result === 'lose') return '✗ Computer wins this round';
    return '⟳ Tie - Go again!';
  };

  const getResultColor = () => {
    if (gameOver) {
      return playerScore >= winsNeeded ? 'text-green-400' : 'text-red-400';
    }
    if (result === 'win') return 'text-green-400';
    if (result === 'lose') return 'text-red-400';
    if (result === 'tie') return 'text-yellow-400';
    return 'text-slate-300';
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-lg p-6 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Rock Paper Scissors</h3>
        <p className="text-xs text-slate-400">Best of {bestOf}</p>
      </div>

      {/* Scoreboard */}
      <div className="flex justify-center items-center gap-6 mb-6">
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide">You</p>
          <p className="text-3xl font-bold text-blue-400">{playerScore}</p>
        </div>
        <div className="text-slate-600 text-2xl">vs</div>
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide">CPU</p>
          <p className="text-3xl font-bold text-red-400">{computerScore}</p>
        </div>
      </div>

      {/* Battle Area */}
      <div className="flex justify-center items-center gap-8 mb-6 min-h-[80px]">
        <div className={`text-5xl transition-all duration-200 ${isAnimating ? 'animate-bounce' : ''}`}>
          {playerChoice ? getChoiceEmoji(playerChoice) : '🤔'}
        </div>
        <div className="text-slate-600 text-xl">vs</div>
        <div className={`text-5xl transition-all duration-200 ${isAnimating ? 'animate-bounce' : ''}`}>
          {computerChoice ? getChoiceEmoji(computerChoice) : '🤖'}
        </div>
      </div>

      {/* Result Message */}
      <p className={`text-center font-medium mb-6 ${getResultColor()}`}>
        {getResultMessage()}
      </p>

      {/* Choice Buttons */}
      {!gameOver ? (
        <div className="flex justify-center gap-3">
          {choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice.id)}
              disabled={isAnimating}
              className={`
                w-16 h-16 rounded-xl text-3xl
                bg-slate-700 hover:bg-slate-600 
                border-2 border-slate-600 hover:border-blue-500
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${playerChoice === choice.id ? 'border-blue-500 bg-slate-600' : ''}
              `}
              title={choice.label}
            >
              {choice.emoji}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex justify-center">
          <Button
            onClick={resetGame}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
        </div>
      )}

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

export default RockPaperScissors;
