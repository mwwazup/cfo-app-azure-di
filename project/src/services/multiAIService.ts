import { buildCoachingPrompt } from './aiPrompts';
import type {
  AIProvider,
  AICoachRequest,
  AICoachResponse,
  AIHealthStatus,
  ConversationMessage,
  FinancialContext
} from '../types/ai';

// Backend API URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Re-export types for convenience
export type {
  AIProvider,
  AICoachRequest,
  AICoachResponse,
  AIHealthStatus,
  ConversationMessage,
  FinancialContext
} from '../types/ai';

export const generateAICoachResponse = async ({
  userMessage,
  userId,
  financialContext,
  conversationHistory = [],
  provider = 'claude' // Default to Claude
}: AICoachRequest): Promise<string> => {
  try {
    console.log('🤖 AI Service called with:', { userMessage, provider, hasFinancialData: !!financialContext });
    
    // Build the coaching prompt with all context using imported function
    const prompt = buildCoachingPrompt(userMessage, financialContext, conversationHistory);
    console.log('📝 Generated prompt length:', prompt.length);

    // Call backend API instead of AI services directly
    const response = await fetch(`${BACKEND_URL}/api/ai/coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage: prompt,
        userId,
        financialContext,
        conversationHistory,
        provider,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Backend API error: ${errorData.detail || response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Response from ${data.provider}:`, data.response.substring(0, 100) + '...');
    
    return data.response;

  } catch (error) {
    console.error(`❌ AI Service Error:`, error);
    return "I'm experiencing some technical difficulties right now. Can you tell me more about what you'd like to discuss?";
  }
};

// Utility function to switch providers dynamically
export const switchAIProvider = (provider: AIProvider) => {
  console.log(`Switching to ${provider} for next response`);
  return provider;
};

// Health check for AI providers via backend
export const checkAIProviders = async (): Promise<AIHealthStatus> => {
  const status: AIHealthStatus = {
    status: 'unavailable',
    providers: {
      claude: { failures: 0, is_open: false, can_attempt: false },
      openai: { failures: 0, is_open: false, can_attempt: false }
    },
    timestamp: new Date().toISOString()
  };

  // Test Claude via backend
  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: 'test',
        userId: 'health-check',
        provider: 'claude',
        max_tokens: 10
      })
    });
    status.providers.claude.can_attempt = response.ok;
  } catch (error) {
    console.log('Claude unavailable:', error);
  }

  // Test OpenAI via backend
  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: 'test',
        userId: 'health-check',
        provider: 'openai',
        max_tokens: 10
      })
    });
    status.providers.openai.can_attempt = response.ok;
  } catch (error) {
    console.log('OpenAI unavailable:', error);
  }

  // Update overall status
  status.status = (status.providers.claude.can_attempt || status.providers.openai.can_attempt) 
    ? 'healthy' 
    : 'unavailable';

  return status;
};
