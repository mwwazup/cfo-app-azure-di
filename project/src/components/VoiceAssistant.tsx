import { useState, useCallback } from 'react';
import { VoiceInput } from './VoiceInput';
import GeminiTTS from './GeminiTTS';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  // Stop any currently playing audio when component unmounts or when closing
  const stopCurrentAudio = useCallback(() => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      setIsSpeaking(false);
    }
  }, [activeAudio]);

  // Handle voice input results
  const handleVoiceResult = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message to conversation
    const userMessage: Message = { 
      role: 'user', 
      content: text,
      timestamp: Date.now()
    };
    
    setConversation(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setError(null);
    
    try {
      // Call your AI service here
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-inczgmmgpnabtxciezio-auth-token')}`
        },
        body: JSON.stringify({ 
          message: text, 
          conversation: conversation.slice(-4) // Send last 4 messages for context
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }
      
      const data = await response.json();
      const aiMessage: Message = { 
        role: 'assistant', 
        content: data.response,
        timestamp: Date.now()
      };
      
      setConversation(prev => [...prev, aiMessage]);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [conversation]);

  // Handle audio element mount
  const handleAudioMount = useCallback((audio: HTMLAudioElement) => {
    setActiveAudio(audio);
    
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => setIsSpeaking(false);
    audio.onerror = (event: Event | string) => {
      console.error('Audio playback error:', event);
      setError('Failed to play audio');
      setIsSpeaking(false);
    };
    audio.onpause = () => setIsSpeaking(false);
    
    return () => {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.onpause = null;
    };
  }, []);

  // Toggle the assistant panel
  const togglePanel = useCallback(() => {
    if (isOpen) {
      stopCurrentAudio();
    }
    setIsOpen(!isOpen);
  }, [isOpen, stopCurrentAudio]);

  // Get the latest AI response
  const latestAIReply = conversation
    .filter(msg => msg.role === 'assistant')
    .pop()?.content || '';

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Conversation Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden flex flex-col" style={{ height: '500px' }}>
          {/* Header */}
          <div className="p-4 bg-gray-900 flex justify-between items-center">
            <h3 className="font-medium text-white">Voice Assistant</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <button 
                onClick={togglePanel}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {conversation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-gray-400">
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p>Click the mic and ask me anything!</p>
                  <p className="text-sm mt-2">Try: "What can you help me with?"</p>
                </div>
              </div>
            ) : (
              conversation.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            
            {isProcessing && (
              <div className="flex items-center justify-start p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="text-red-400 text-sm p-2 bg-red-900/20 rounded">
                {error}
              </div>
            )}
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex items-center space-x-2">
              <VoiceInput 
                onResult={handleVoiceResult}
                onError={setError}
                onStart={() => setError(null)}
              />
              <div className="text-xs text-gray-400 flex-1">
                {isProcessing ? 'Processing...' : 'Click to speak'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Action Button */}
      <button
        onClick={togglePanel}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
          isOpen 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white transition-all transform hover:scale-105`}
        aria-label={isOpen ? 'Close voice assistant' : 'Open voice assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 106 0V4a3 3 0 00-3-3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 20v4m-4 0h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      
      {/* TTS Output - Hidden but functional */}
      <GeminiTTS 
        text={latestAIReply} 
        autoPlay={true}
        onPlay={() => setIsSpeaking(true)}
        onEnd={() => setIsSpeaking(false)}
        onError={(err) => setError(`Audio error: ${err}`)}
      />
    </div>
  );
}

export default VoiceAssistant;
