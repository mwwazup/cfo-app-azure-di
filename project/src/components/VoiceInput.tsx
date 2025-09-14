import { useEffect, useRef, useState } from 'react';

interface VoiceInputProps {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  continuous?: boolean;
  lang?: string;
}

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const resultRef = useRef('');

  useEffect(() => {
    // @ts-ignore - webkitSpeechRecognition is available in Chrome
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    
    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');
      
      resultRef.current = transcript;
    };

    recognitionRef.current.onerror = (event) => {
      setError(`Error occurred in recognition: ${event.error}`);
      stopListening();
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    
    resultRef.current = '';
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      setError('Error starting speech recognition');
      setIsListening(false);
    }
  };

  const stopListening = (): string => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    return resultRef.current;
  };

  return {
    isListening,
    error,
    startListening,
    stopListening,
    transcript: resultRef.current,
  };
}

export function VoiceInput({
  onResult,
  onError,
  onStart,
  onStop,
  continuous = true,
  lang = 'en-US',
}: VoiceInputProps) {
  const { isListening, error, startListening, stopListening } = useVoiceRecognition();

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const toggleListening = () => {
    if (isListening) {
      const finalTranscript = stopListening();
      onResult(finalTranscript);
      if (onStop) onStop();
    } else {
      startListening();
      if (onStart) onStart();
    }
  };

  return (
    <button
      onClick={toggleListening}
      className={`p-3 rounded-full ${
        isListening 
          ? 'bg-red-500 animate-pulse' 
          : 'bg-blue-600 hover:bg-blue-700'
      } text-white transition-colors`}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
    >
      {isListening ? (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect width="12" height="20" x="6" y="2" rx="6" ry="6" />
          <path d="M12 18v4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
