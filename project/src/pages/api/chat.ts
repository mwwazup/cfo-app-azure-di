import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '../../config/env';

// Initialize Supabase client
const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

// Define types for the request and response
type MessageRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  role: MessageRole;
  content: string;
}

interface ChatRequest {
  message: string;
  conversation: ChatMessage[];
}

// Response types for the chat API
interface ChatResponseSuccess {
  response: string;
}

interface ChatErrorResponse {
  error: string;
  details?: string;
}

export async function POST(req: NextRequest): Promise<Response> {

  try {
    // Check for authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid token' } as ChatErrorResponse,
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Authentication error:', userError?.message || 'No user found');
      return NextResponse.json(
        { error: 'Invalid or expired token' } as ChatErrorResponse,
        { status: 401 }
      );
    }

    // Parse request body
    let body: ChatRequest;
    try {
      body = await req.json();
      if (!body) {
        return NextResponse.json(
          { error: 'Request body is required' } as ChatErrorResponse,
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' } as ChatErrorResponse,
        { status: 400 }
      );
    }

    const { message, conversation } = body as Partial<ChatRequest>;
    
    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' } as ChatErrorResponse,
        { status: 400 }
      );
    }

    try {
      // Generate AI response
      const response = await generateAIResponse(message, conversation || []);
      
      // Log the interaction for analytics
      await logInteraction({
        userId: user.id,
        userMessage: message,
        aiResponse: response,
        metadata: {
          model: 'gemini-pro',
          conversationLength: conversation?.length || 0,
        },
      });

      return NextResponse.json({ response } as ChatResponseSuccess);
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      return NextResponse.json({ 
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as ChatErrorResponse, { status: 500 });
    }
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as ChatErrorResponse, { status: 500 });
  }
}

// Enhanced AI response using Financial Intelligence System
async function generateAIResponse(
  message: string, 
  conversation: ChatMessage[]
): Promise<string> {
  try {
    // Import AI libraries
    const Anthropic = require('@anthropic-ai/sdk');
    const OpenAI = require('openai');

    // Initialize AI clients
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build conversation context from chat history
    const recentContext = conversation
      .slice(-5)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Create system prompt for financial coaching
    const systemPrompt = `You are a CFO coach using the PERL framework. 

RECENT CONVERSATION:
${recentContext}

PERL FRAMEWORK:
- Problem: Identify specific challenges
- Evaluate: Assess current situation with data
- Roadmap: Create actionable next steps  
- Learn: Suggest growth opportunities

Respond as a knowledgeable CFO coach. Be specific, actionable, and personalized. Keep responses concise but valuable.`;

    let response;

    // Try Claude first (better for financial reasoning)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const claudeResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `${systemPrompt}\n\nUser: ${message}`
            }
          ]
        });
        response = claudeResponse.content[0].text;
      } catch (claudeError) {
        console.error('Claude API error:', claudeError);
        // Fall back to OpenAI
        if (process.env.OPENAI_API_KEY) {
          const openaiResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            max_tokens: 1000
          });
          response = openaiResponse.choices[0].message.content;
        } else {
          throw new Error('No AI service available');
        }
      }
    } else if (process.env.OPENAI_API_KEY) {
      // Use OpenAI if Claude not available
      const openaiResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 1000
      });
      response = openaiResponse.choices[0].message.content;
    } else {
      throw new Error('No AI API keys configured');
    }

    return response || "I'm having trouble generating a response right now. Please try again.";

  } catch (error) {
    console.error('AI generation error:', error);
    // Fallback to basic PERL response
    return generateFallbackPERLResponse(message);
  }
}

// Fallback PERL response for when AI is unavailable
function generateFallbackPERLResponse(message: string): string {
  const input = message.toLowerCase();
  
  if (input.includes('problem') || input.includes('challenge') || input.includes('issue')) {
    return "Let's identify the core problem. What specifically is blocking your progress right now? Breaking it down into smaller, specific issues often reveals the path forward.";
  }
  
  if (input.includes('evaluate') || input.includes('assess') || input.includes('current')) {
    return "Let's take an honest look at where you stand. What metrics are you currently tracking, and what story do they tell about your business performance?";
  }
  
  if (input.includes('plan') || input.includes('roadmap') || input.includes('next')) {
    return "Great question! Let's create a clear path forward. What's the single most important outcome you need to achieve in the next 30 days?";
  }
  
  if (input.includes('learn') || input.includes('grow') || input.includes('improve')) {
    return "Growth mindset is key! What's one skill that, if you developed it, would significantly impact your business success?";
  }
  
  return "I'm here to guide you through the PERL framework. Would you like to explore a specific Problem, Evaluate your current situation, create a Roadmap, or focus on Learning and growth?";
}

// Helper function to log interactions
async function logInteraction(interaction: {
  userId: string;
  userMessage: string;
  aiResponse: string;
  metadata: Record<string, any>;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('chat_interactions')
      .insert([{
        user_id: interaction.userId,
        user_message: interaction.userMessage,
        ai_response: interaction.aiResponse,
        metadata: interaction.metadata,
        created_at: new Date().toISOString(),
      }]);

    if (error) {
      console.error('Error logging interaction:', error);
      // Don't throw, as we don't want to fail the main request
    }
  } catch (error) {
    console.error('Failed to log interaction:', error);
    // Swallow the error to not affect the main request
  }
}

