import React, { useEffect, useState, useRef } from 'react';

interface RevenueWaveAnimationProps {
  height?: number;
}

export function RevenueWaveAnimation({ height = 140 }: RevenueWaveAnimationProps) {
  const [mounted, setMounted] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      setAnimationFrame(prev => {
        const newFrame = prev + 1;
        drawWave(ctx, canvas, newFrame);
        return newFrame;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mounted]);

  const drawWave = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frame: number) => {
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 164, 255, 0.7)');
    gradient.addColorStop(0.5, 'rgba(0, 122, 204, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 91, 150, 0.5)');

    const waveOffset = (frame / (60 * 12)) * width; // ~12 seconds per pass

    // Fill wave
    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let x = 0; x <= width; x++) {
      const progress = (x - waveOffset) / width;

      // Smooth bell-curve envelope
      const envelope = Math.exp(-8 * Math.pow(progress - 0.5, 2));

      // One single sine crest modulated by the envelope
      const sine = Math.sin(progress * Math.PI);
      const y = (height * 0.6) - envelope * sine * (height * 0.4);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      const progress = (x - waveOffset) / width;
      const envelope = Math.exp(-8 * Math.pow(progress - 0.5, 2));
      const sine = Math.sin(progress * Math.PI);
      const y = (height * 0.6) - envelope * sine * (height * 0.4);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = 'rgba(0, 122, 204, 1)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  if (!mounted) return null;

  return (
    <div
      className="relative w-full bg-gray-800 rounded-lg border-2 border-gray-600 shadow-sm overflow-hidden"
      style={{ height: `${height}px` }}
    >
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={height}
        className="absolute top-0 left-0"
        style={{ width: '100%', height: `${height}px` }}
      />

      <div className="absolute top-2 left-3 text-xs font-medium text-gray-300">
        Analyzing Revenue Patterns
      </div>

      <div className="absolute bottom-2 right-3 flex items-center gap-1">
        <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
        <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
}