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

// Helper function to generate AI response using Gemini API - DISABLED
async function generateAIResponse(
  _message: string, 
  _conversation: ChatMessage[]
): Promise<string> {
  // DISABLED: Gemini integration removed for stability
  // Return a placeholder response instead of calling Gemini API
  return "AI chat functionality is currently disabled. Please check back later.";
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

