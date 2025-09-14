import { useState, useCallback } from 'react';
import { generateTTS } from '../components/GeminiTTS';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isProcessing?: boolean;
  error?: string;
}

export function useVoiceAssistant() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Add a message to the conversation
  const addMessage = useCallback((message: Omit<Message, 'timestamp'>) => {
    setConversation(prev => [...prev, { ...message, timestamp: Date.now() }]);
  }, []);

  // Process user input and get AI response
  const processUserInput = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isProcessing) return;

    // Add user message to conversation
    const timestamp = Date.now();
    const userMessage: Message = {
      role: 'user',
      content: userInput,
      timestamp,
    };

    // Add temporary processing message
    const processingMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: timestamp + 1,
      isProcessing: true,
    };

    setConversation(prev => [...prev, userMessage, processingMessage]);
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
          message: userInput,
          conversation: conversation
            .filter(msg => msg.role !== 'system')
            .slice(-4) // Send last 4 messages for context
            .map(({ role, content }) => ({ role, content }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      
      // Update the processing message with the AI response
      setConversation(prev => 
        prev.map(msg => 
          msg.timestamp === processingMessage.timestamp 
            ? { 
                ...msg, 
                content: data.response,
                isProcessing: false 
              } 
            : msg
        )
      );

      // Generate and play TTS for the response
      if (data.response) {
        await generateTTS({
          text: data.response,
          voiceName: 'Algenib',
          onSuccess: (audioUrl) => {
            const audio = new Audio(audioUrl);
            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => {
              setError('Failed to play audio');
              setIsSpeaking(false);
            };
            audio.play().catch(err => {
              console.error('Audio playback error:', err);
              setError('Could not play audio. Please check your audio settings.');
            });
          },
          onError: (error) => {
            console.error('TTS Error:', error);
            setError('Failed to generate speech');
          }
        });
      }

      return data.response;
    } catch (err) {
      console.error('Error processing user input:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      
      // Update the processing message with the error
      setConversation(prev => 
        prev.map(msg => 
          msg.timestamp === processingMessage.timestamp 
            ? { 
                ...msg, 
                content: 'Sorry, I encountered an error. Please try again.',
                isProcessing: false,
                error: errorMessage
              } 
            : msg
        )
      );
      
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [conversation, isProcessing]);

  // Clear the conversation
  const clearConversation = useCallback(() => {
    setConversation([]);
    setError(null);
  }, []);

  // Add a system message (e.g., welcome message)
  const addSystemMessage = useCallback((content: string) => {
    setConversation(prev => [...prev, {
      role: 'system',
      content,
      timestamp: Date.now()
    }]);
  }, []);

  return {
    conversation,
    isProcessing,
    isSpeaking,
    error,
    addMessage,
    processUserInput,
    clearConversation,
    addSystemMessage,
  };
}

export default useVoiceAssistant;
