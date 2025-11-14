import { useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { claudeService } from '../services/claudeService';
import { zepService } from '../services/zepService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseZepChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  loadHistory: () => Promise<void>;
}

export function useZepChat(): UseZepChatReturn {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!message.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Add user message to UI immediately
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get AI response with Zep context (if available)
      // Pass user info for Zep user creation (per Zep docs: firstName/lastName important)
      const response = await claudeService.chat(message, {
        userId: user.id,
        includeContext: true,
        userEmail: user.primaryEmailAddress?.emailAddress,
        userFirstName: user.firstName || undefined,
        userLastName: user.lastName || undefined
      });

      // Add AI response to UI
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error('Chat error:', err);
      setError('Sorry, I had trouble processing that. Please try again.');
      
      // Remove the user message since we failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const history = await zepService.getRecentMemory(user.id, 20);
      if (history && history.length > 0) {
        const formattedMessages: Message[] = history.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at || Date.now())
        }));
        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  }, [user]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    loadHistory
  };
}
