// SAFE IMPLEMENTATION - Keeps existing functionality while adding new capabilities
import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Save, Trash2, Tag, Clock, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { useCoachingHistory } from '../../hooks/useCoachingHistory';
import { supabase } from '../../config/supabaseClient';
import '../../styles/sms-coach.css';

interface Message {
  id: string;
  type: 'user' | 'coach';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  tags: string[];
  createdAt: Date;
  saved: boolean;
}

// SAFE: Enhanced PERL coaching system with fallback to existing logic
const generateEnhancedPERLResponse = async (userInput: string, userId: string, conversationHistory: Message[]): Promise<string> => {
  try {
    // TRY: Use new Financial Intelligence System if available
    const useEnhancedSystem = await checkFinancialIntelligenceAvailable();
    
    if (useEnhancedSystem) {
      return await generateIntelligentResponse(userInput, userId, conversationHistory);
    } else {
      // FALLBACK: Use existing canned response system
      return await generateOriginalPERLResponse(userInput, userId);
    }
  } catch (error) {
    console.error('Error in enhanced PERL response:', error);
    // SAFE FALLBACK: Always fall back to original system if anything fails
    return await generateOriginalPERLResponse(userInput, userId);
  }
};

// NEW: Check if Financial Intelligence System is available
const checkFinancialIntelligenceAvailable = async (): Promise<boolean> => {
  try {
    // Check if required tables exist
    const { data, error } = await supabase
      .from('financial_insights')
      .select('id')
      .limit(1);
    
    // If no error, the table exists and system is available
    return !error;
  } catch (error) {
    // If any error, fall back to original system
    return false;
  }
};

// NEW: Intelligent response using Financial Intelligence (only if available)
const generateIntelligentResponse = async (userInput: string, userId: string, conversationHistory: Message[]): Promise<string> => {
  try {
    // Get user's financial context (with error handling)
    const userContext = await getUserFinancialContextSafe(userId);
    
    // Build conversation context (last 5 messages for memory)
    const recentContext = conversationHistory
      .slice(-5)
      .map(msg => `${msg.type}: ${msg.content}`)
      .join('\n');
    
    // Create personalized system prompt with user's actual data
    const systemPrompt = `You are a CFO coach using the PERL framework. 

USER'S FINANCIAL CONTEXT:
${userContext.summary}

RECENT CONVERSATION:
${recentContext}

PERL FRAMEWORK:
- Problem: Identify specific challenges
- Evaluate: Assess current situation with data
- Roadmap: Create actionable next steps  
- Learn: Suggest growth opportunities

Respond as a knowledgeable CFO coach. Use the user's actual financial data when relevant. Be specific, actionable, and personalized.`;

    // Call AI with full context (if API is available)
    const response = await callAISafe({
      systemPrompt,
      userMessage: userInput,
      model: 'claude-3-5-sonnet'
    });

    return response || await generateOriginalPERLResponse(userInput, userId);
    
  } catch (error) {
    console.error('Error generating intelligent response:', error);
    // Always fall back to original system
    return await generateOriginalPERLResponse(userInput, userId);
  }
};

// SAFE: Get user financial context with comprehensive error handling
const getUserFinancialContextSafe = async (userId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) return { summary: "No financial data available - new user" };

    // Try to get user's financial data with timeouts and error handling
    const [revenueData, documentsData] = await Promise.allSettled([
      fetch('/api/revenue/summary', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }).then(r => r.ok ? r.json() : null).catch(() => null),
      
      fetch('/api/financial/statements', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    // Build safe context summary
    let summary = "User's Financial Profile:\n";
    
    const revenue = revenueData.status === 'fulfilled' ? revenueData.value : null;
    const documents = documentsData.status === 'fulfilled' ? documentsData.value : null;
    
    if (revenue?.totalRevenue) {
      summary += `- Total Revenue: $${revenue.totalRevenue.toLocaleString()}\n`;
      summary += `- Monthly Average: $${(revenue.totalRevenue / 12).toLocaleString()}\n`;
    }
    
    if (documents?.length > 0) {
      summary += `- Has uploaded ${documents.length} financial documents\n`;
    }
    
    if (!revenue && !documents?.length) {
      summary += "- No financial data uploaded yet\n";
      summary += "- New user, needs guidance on getting started\n";
    }

    return { summary };
    
  } catch (error) {
    console.error('Error fetching user context:', error);
    return { summary: "Unable to retrieve financial context - using general coaching mode" };
  }
};

// SAFE: AI calling function with comprehensive error handling
const callAISafe = async ({ systemPrompt, userMessage, model = 'claude-3-5-sonnet' }) => {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        systemPrompt,
        userMessage
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`AI API returned ${response.status}`);
    }
    
    const data = await response.json();
    return data.response;
    
  } catch (error) {
    console.error('AI API Error:', error);
    return null; // Return null to trigger fallback
  }
};

// PRESERVED: Original PERL response system (unchanged)
const generateOriginalPERLResponse = async (userInput: string, userId: string): Promise<string> => {
  const input = userInput.toLowerCase();
  
  // Detect financial data queries
  const isFinancialQuery = input.includes('revenue') || input.includes('income') || input.includes('profit') || 
                          input.includes('expense') || input.includes('cost') || input.includes('sales') ||
                          input.includes('total') || input.includes('2024') || input.includes('2023') ||
                          input.includes('financial') || input.includes('money') || input.includes('cash');
  
  if (isFinancialQuery) {
    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (token) {
        // Fetch financial statements
        const response = await fetch('/api/financial/statements', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const statements = await response.json();
          
          if (statements.length > 0) {
            // Analyze the query and extract relevant data
            const analysisResult = analyzeFinancialQuery(userInput, statements);
            return `Based on your financial data, ${analysisResult}. 

**PERL Analysis:**
- **Problem**: ${analysisResult.includes('no data') ? 'Missing financial data for accurate analysis' : 'Understanding your financial position'}
- **Evaluate**: Let's assess what this means for your business health
- **Roadmap**: What actions should you take based on these numbers?
- **Learn**: What insights can we extract to improve future performance?

What specific aspect would you like to explore further?`;
          } else {
            return `I'd love to help you analyze your 2024 revenue, but I don't see any financial statements uploaded yet.

**PERL Approach:**
- **Problem**: No financial data available for analysis
- **Evaluate**: We need your financial statements to provide accurate insights
- **Roadmap**: Upload your financial statements (income statements, P&L, etc.) to get started
- **Learn**: Once uploaded, I can help you understand trends, identify opportunities, and make data-driven decisions

Would you like me to guide you through uploading your financial documents?`;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  }
  
  // Continue with original PERL coaching logic for non-financial queries
  // Problem-focused responses
  if (input.includes('problem') || input.includes('stuck') || input.includes('challenge') || input.includes('issue')) {
    const problemResponses = [
      "Let's identify the core problem. What specifically is blocking your progress right now? Is it a resource constraint, a skill gap, or something else?",
      "I hear you're facing a challenge. Can you break this down into smaller, more specific issues? Sometimes the real problem is hidden beneath the surface.",
      "Problems often have multiple layers. What's the immediate issue, and what might be the underlying cause? Let's dig deeper.",
      "When did you first notice this problem? Understanding the timeline can help us identify what changed and why."
    ];
    return problemResponses[Math.floor(Math.random() * problemResponses.length)];
  }
  
  // Evaluate-focused responses
  if (input.includes('where am i') || input.includes('evaluate') || input.includes('assess') || input.includes('current')) {
    const evaluateResponses = [
      "Let's take an honest look at where you stand. On a scale of 1-10, how would you rate your current progress toward your main business goal?",
      "Evaluation requires data. What metrics are you currently tracking, and what story do they tell about your business?",
      "Sometimes we're closer than we think, sometimes further. What evidence do you have of your current position - both positive and concerning?",
      "Let's assess your resources: time, money, skills, and support. Which of these is your strongest asset right now, and which needs attention?"
    ];
    return evaluateResponses[Math.floor(Math.random() * evaluateResponses.length)];
  }
  
  // Roadmap-focused responses
  if (input.includes('next') || input.includes('roadmap') || input.includes('plan') || input.includes('move') || input.includes('action')) {
    const roadmapResponses = [
      "Great question! Let's create a clear path forward. What's the single most important outcome you need to achieve in the next 30 days?",
      "Your roadmap should have clear milestones. If you could only accomplish 3 things this quarter, what would move the needle most?",
      "Let's prioritize your next moves. What action, if taken today, would have the biggest positive impact on your business?",
      "Every roadmap needs checkpoints. How will you measure progress, and what will you do if you get off track?"
    ];
    return roadmapResponses[Math.floor(Math.random() * roadmapResponses.length)];
  }
  
  // Learn-focused responses
  if (input.includes('learn') || input.includes('grow') || input.includes('skill') || input.includes('improve') || input.includes('development')) {
    const learnResponses = [
      "Growth mindset is key! What's one skill that, if you developed it, would significantly impact your business success?",
      "Learning never stops in business. What's the last thing you learned that changed how you operate? What's next on your learning list?",
      "The best entrepreneurs are continuous learners. What area of your business do you feel least confident about? That might be your biggest growth opportunity.",
      "Level up by learning from others. Who in your industry do you admire, and what specific skills or approaches could you learn from them?"
    ];
    return learnResponses[Math.floor(Math.random() * learnResponses.length)];
  }
  
  // General PERL framework responses
  const generalResponses = [
    "Welcome to PERL coaching! Let's start with the fundamentals: What's the biggest challenge holding your business back right now? (Problem)",
    "I'm here to guide you through the PERL framework. Would you like to explore a specific Problem, Evaluate your current situation, create a Roadmap, or focus on Learning and growth?",
    "Every successful business owner needs clarity. Let's use PERL to break down your situation: Problem → Evaluate → Roadmap → Learn. Where would you like to start?",
    "The PERL framework helps transform friction into growth. What aspect of your business feels most challenging or unclear right now?",
    "Let's turn your business challenges into opportunities. Using PERL, we can identify problems, evaluate honestly, create roadmaps, and accelerate learning. What's on your mind?"
  ];
  
  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
};

// Helper function to analyze financial queries and extract insights
const analyzeFinancialQuery = (query: string, statements: any[]): string => {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('revenue') || queryLower.includes('income') || queryLower.includes('sales')) {
    if (queryLower.includes('2024')) {
      // Try to find 2024 revenue data
      const revenueData = statements.find(s => s.statement_type === 'income_statement' && 
                                         s.upload_date.includes('2024'));
      if (revenueData) {
        return "I found your 2024 income statement. Let me analyze your revenue performance";
      } else {
        return "I don't see a 2024 income statement uploaded yet. To get your exact revenue figures, please upload your 2024 income statement or P&L";
      }
    }
  }
  
  if (queryLower.includes('total') && queryLower.includes('2024')) {
    return "I can see you have financial data uploaded. For precise 2024 totals, I need to analyze your complete financial statements";
  }
  
  return "I can help analyze your financial data once you provide more specific information about what metrics you'd like to review";
};

// Export the safe component (rest of component code would be identical to original)
export function SMSCoachPageSafe() {
  // ... rest of your existing component code, but using generateEnhancedPERLResponse instead
}
