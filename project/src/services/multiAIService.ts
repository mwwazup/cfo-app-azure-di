import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { buildCoachingPrompt } from './aiPrompts';

// AI Provider Configuration
type AIProvider = 'claude' | 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export interface AICoachRequest {
  userMessage: string;
  userId: string;
  financialContext?: any;
  conversationHistory?: any[];
  provider?: AIProvider; // Allow provider selection
}

export const generateAICoachResponse = async ({
  userMessage,
  userId,
  financialContext,
  conversationHistory = [],
  provider = 'claude' // Default to Claude
}: AICoachRequest): Promise<string> => {
  try {
    console.log('🤖 AI Service called with:', { userMessage, provider, hasFinancialData: !!financialContext });
    
    // Check if API keys are available
    const hasClaudeKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY;
    const hasOpenAIKey = !!import.meta.env.VITE_OPENAI_API_KEY;
    console.log('🔑 API Keys available:', { claude: hasClaudeKey, openai: hasOpenAIKey });
    console.log('🔍 Debug env vars:', { 
      claudeKey: import.meta.env.VITE_ANTHROPIC_API_KEY ? 'Found' : 'Missing',
      openaiKey: import.meta.env.VITE_OPENAI_API_KEY ? 'Found' : 'Missing',
      claudeKeyLength: import.meta.env.VITE_ANTHROPIC_API_KEY?.length || 0,
      openaiKeyLength: import.meta.env.VITE_OPENAI_API_KEY?.length || 0,
      allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
    });
    
    if (!hasClaudeKey && !hasOpenAIKey) {
      throw new Error('No AI API keys found in environment variables');
    }
    
    // Build the coaching prompt with all context using imported function
    const prompt = buildCoachingPrompt(userMessage, financialContext, conversationHistory);
    console.log('📝 Generated prompt length:', prompt.length);

    // Route to appropriate AI provider
    if (provider === 'claude' && hasClaudeKey) {
      console.log('🎯 Using Claude for response');
      return await generateClaudeResponse(prompt);
    } else if (hasOpenAIKey) {
      console.log('🎯 Using OpenAI for response');
      return await generateOpenAIResponse(prompt);
    } else {
      throw new Error(`No API key available for provider: ${provider}`);
    }

  } catch (error) {
    console.error(`❌ ${provider} AI Service Error:`, error);
    
    // Fallback to other provider if one fails
    try {
      const fallbackProvider = provider === 'claude' ? 'openai' : 'claude';
      const hasClaudeKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY;
      const hasOpenAIKey = !!import.meta.env.VITE_OPENAI_API_KEY;
      
      if (fallbackProvider === 'claude' && hasClaudeKey) {
        console.log(`🔄 Falling back to Claude`);
        const fallbackPrompt = buildCoachingPrompt(userMessage, financialContext, conversationHistory);
        return await generateClaudeResponse(fallbackPrompt);
      } else if (fallbackProvider === 'openai' && hasOpenAIKey) {
        console.log(`🔄 Falling back to OpenAI`);
        const fallbackPrompt = buildCoachingPrompt(userMessage, financialContext, conversationHistory);
        return await generateOpenAIResponse(fallbackPrompt);
      } else {
        throw new Error('No fallback provider available');
      }
    } catch (fallbackError) {
      console.error('❌ All AI providers failed:', fallbackError);
      return "I'm experiencing some technical difficulties right now. Can you tell me more about what you'd like to discuss?";
    }
  }
};

// Claude (Anthropic) Implementation
const generateClaudeResponse = async (prompt: string): Promise<string> => {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514", // Latest Claude model
    max_tokens: 1024,
    temperature: 0.7,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return message.content[0].type === 'text' 
    ? message.content[0].text 
    : "I had trouble generating a response. Can you try again?";
};

// OpenAI Implementation
const generateOpenAIResponse = async (prompt: string): Promise<string> => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4", // or "gpt-4-turbo" for faster responses
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 500
  });

  return completion.choices[0].message.content || 
    "I had trouble generating a response. Can you try again?";
};

// Utility function to switch providers dynamically
export const switchAIProvider = (provider: AIProvider) => {
  console.log(`Switching to ${provider} for next response`);
  return provider;
};

// Health check for AI providers
export const checkAIProviders = async () => {
  const status = {
    claude: false,
    openai: false
  };

  // Check Claude availability
  try {
    if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
      await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "test" }]
      });
      status.claude = true;
    }
  } catch (error) {
    console.log('Claude unavailable:', error);
  }

  // Check OpenAI availability
  try {
    if (import.meta.env.VITE_OPENAI_API_KEY) {
      await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 10
      });
      status.openai = true;
    }
  } catch (error) {
    console.log('OpenAI unavailable:', error);
  }

  return status;
};
