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
      const response = await generateAIResponse(message, conversation || [], user.id);
      
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

// Helper function to generate AI response using Gemini API
async function generateAIResponse(
  message: string, 
  conversation: ChatMessage[],
  userId: string
): Promise<string> {
  try {
    // Format the conversation for Gemini
    const contents = [
      {
        role: 'user',
        parts: [{
          text: 'You are a helpful financial assistant. Provide clear, concise, and accurate responses.'
        }]
      },
      {
        role: 'model',
        parts: [{
          text: 'I understand. I am a helpful financial assistant ready to provide clear and accurate responses.'
        }]
      },
      ...conversation.flatMap(msg => [
        {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }
      ]),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    // Call Gemini API directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      throw new Error('Failed to get response from Gemini');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 
           "I'm sorry, I couldn't generate a response. Please try again.";
    
  } catch (error) {
    console.error('Error in generateAIResponse:', error);
    return "I'm sorry, I encountered an error while processing your request. Please try rephrasing your question or try again later.";
  }
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

