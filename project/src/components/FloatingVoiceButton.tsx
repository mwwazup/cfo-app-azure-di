import { useState } from 'react';
import { VoiceInput } from './VoiceInput';

export function FloatingVoiceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVoiceResult = async (text: string) => {
    if (!text.trim()) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      // Here you would typically call your API
      // const response = await fetch('/api/chat', { ... });
      
      // For now, just log the message
      console.log('Voice input:', text);
      
    } catch (err) {
      console.error('Error processing voice input:', err);
      setError('Failed to process voice input');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePanel = () => setIsOpen(!isOpen);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Voice Assistant</h3>
            <button 
              onClick={togglePanel}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <VoiceInput 
              onResult={handleVoiceResult}
              onError={setError}
            />
            
            {isProcessing && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Processing...</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="text-sm text-red-500 p-2 bg-red-50 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
      
      <button
        onClick={togglePanel}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
        } text-white transform hover:scale-105`}
        aria-label={isOpen ? 'Close voice assistant' : 'Open voice assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 20v4m-4 0h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
