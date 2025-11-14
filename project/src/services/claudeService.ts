import Anthropic from '@anthropic-ai/sdk';
import { zepService, ConversationContext } from './zepService';
import { env } from '../config/env';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  userId: string;
  includeContext?: boolean;
  contextDepth?: number;
  temperature?: number;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
}

class ClaudeService {
  private client: Anthropic | null = null;

  constructor() {
    // Only initialize if Anthropic API key is available
    if (env.anthropicApiKey) {
      try {
        this.client = new Anthropic({
          apiKey: env.anthropicApiKey,
          dangerouslyAllowBrowser: true // Required for browser usage
        });
        console.log('✅ Claude client initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Claude client:', error);
      }
    } else {
      console.warn('⚠️ Anthropic API key not configured - AI chat disabled');
    }
  }

  isAvailable(): boolean {
    return this.client !== null && !!env.anthropicApiKey;
  }

  /**
   * Build system prompt with Zep memory context
   */
  private buildSystemPrompt(
    context: ConversationContext
  ): string {
    const { facts, summary, relevantMemories, financialContext } = context;

    // Use Zep's pre-built context string if available
    const zepContext = context.context ? `
# MEMORY CONTEXT

${context.context}
` : '';

    // Build business context section from facts
    const businessContext = facts ? `
# WHO YOU'RE TALKING TO

Business: ${facts.businessName || 'Unknown'}
Industry: ${facts.industry || 'Not specified'}
Annual Goal: $${facts.annualGoal?.toLocaleString() || 'Not set'}
Experience Level: ${facts.experienceLevel || 'beginner'}

Current Status:
${facts.currentRevenue ? `- YTD Revenue: $${facts.currentRevenue.toLocaleString()}` : ''}
${facts.gapToGoal ? `- Gap to Goal: $${facts.gapToGoal.toLocaleString()}` : ''}
` : '';

    // Build conversation summary
    const summarySection = summary ? `
# CONVERSATION SUMMARY

${summary}
` : '';

    // Build relevant memories section
    const memoriesSection = relevantMemories.length > 0 ? `
# RELEVANT PAST DISCUSSIONS

${relevantMemories.map((mem, idx) => 
  `${idx + 1}. ${mem.summary || mem.message?.content.substring(0, 200)}` 
).join('\n')}
` : '';

    // Build financial context section from database data
    const financialSection = financialContext ? this.buildFinancialContext(financialContext) : '';

    return `You are a supportive CFO coach for small business owners using the WaveRider financial management app.

${zepContext}

${businessContext}

${financialSection}

${summarySection}

${memoriesSection}

# YOUR COACHING STYLE

- **Encouraging**: Celebrate wins, acknowledge effort
- **Simple language**: Explain financial concepts clearly as if to a 7th grader
- **Actionable**: Always suggest ONE specific next step
- **Contextual**: Reference past conversations naturally but only if it pertains to the conversation
- **Patient**: They're learning, they will not know financial jargon and acronyms, meet them where they are

# KEY RULES

1. Reference past conversations when relevant ("Remember when we talked about...")
2. Track progress: "Last time your LER was X, now it's Y - great improvement!"
3. Explain like talking to a friend, not an accountant
4. Give ONE clear action, not an overwhelming list
5. Celebrate improvements, even small ones
6. If they don't understand a term, explain it simply BEFORE using it
7. **ASK ONE INSIGHTFUL QUESTION** that shows you actually looked at their data and understand their business

# IMPORTANT FINANCIAL CONTEXT RULES

**Date Awareness:**
- Today is the current date shown in CURRENT DATE CONTEXT
- COMPLETED MONTH REVENUE shows historical data for finished months
- CURRENT MONTH REVENUE (if shown) is still in progress - don't criticize incomplete data
- Never expect or mention data for future months that haven't occurred yet
- Focus on trends in completed months, not missing future data

**Historical Pattern Recognition:**
- Use HISTORICAL YEAR-OVER-YEAR data to identify seasonal patterns and trends
- Compare current year performance to previous years automatically - don't ask "is this typical?"
- Reference multi-year patterns: "Similar to 2023, your revenue typically peaks in summer months"
- Leverage historical context to provide confident analysis without qualifying statements

**Conversational Intelligence:**
- Ask ONE insightful question that shows you understand their current situation
- For trending questions: "Based on your strong Q3 performance, how do you feel about Q4?"
- For current month: "We're early in November - how's the month shaping up so far?"
- Reference specific numbers: "Your revenue velocity of 1.3x last month was impressive - what's driving that?"
- Show you see patterns: "I notice your LER improved from 1.5 to 1.76 - what changed?"

**Smart Question Examples:**
- "I see you've been consistently hitting 92%+ of your revenue targets - what's your secret?"
- "Your profit margin dropped to 32% last month - any concerns there?"
- "LER trending up to 1.76 - are you seeing that in your team's motivation too?"
- "Early November looks promising - do you feel you'll hit your $79,900 target?"

**Financial Questions:**
- When asked "How's my revenue trending?" only discuss completed months
- Don't say "November shows $0" if November is in the future or just started
- Focus on patterns in the data that actually exists
- Ask ONE great question that shows deep understanding

# IMPORTANT

You have memory of past conversations. Use it naturally. Don't say "I don't remember" or "I don't have access to" - you DO have context from past discussions.

When referencing past conversations, be specific: "Last week when we discussed cash flow..." not "Previously you mentioned..."

# APP CONTEXT

The user is currently in the WaveRider app which has:
- Dashboard with KPIs (revenue, profit margin, etc.)
- Master Revenue tracking with FIR (Future Inspired Revenue) targets
- Employee LER (Labor Efficiency Ratio) tracking
- Service Mix analysis
- Budget vs Actual tracking
- Financial statement uploads

You can reference these features when giving advice.`;
  }

  /**
   * Build financial context section from database data
   */
  private buildFinancialContext(financialContext: Record<string, any>): string {
    const sections: string[] = [];

    // Add date context first
    if (financialContext.current_date_context) {
      const { current_year, current_month, current_date } = financialContext.current_date_context;
      sections.push(`
# CURRENT DATE CONTEXT
Today is ${current_date}. We're in ${new Date(current_year, current_month - 1).toLocaleString('default', { month: 'long' })} ${current_year}.`);
    }

    // Historical revenue data (completed months)
    if (financialContext.historical_revenue && financialContext.historical_revenue.length > 0) {
      const revenue = financialContext.historical_revenue.slice(0, 6); // Last 6 completed months
      sections.push(`
# COMPLETED MONTH REVENUE (Historical)

${revenue.map((entry: any) => 
  `${entry.month}/${entry.year}: $${entry.actual_revenue?.toLocaleString() || 0} (target: $${entry.desired_revenue?.toLocaleString() || 0})`
).join('\n')}`);
    }

    // Historical year-over-year revenue data (multi-year for seasonal patterns)
    if (financialContext.historical_yoy_revenue && financialContext.historical_yoy_revenue.length > 0) {
      const yoyRevenue = financialContext.historical_yoy_revenue.slice(0, 60); // Last 5 years worth (12 months * 5 = 60)
      
      // Group by year for better readability
      const revenueByYear: Record<string, any[]> = yoyRevenue.reduce((acc: Record<string, any[]>, entry: any) => {
        const year = entry.year;
        if (!acc[year]) acc[year] = [];
        acc[year].push(entry);
        return acc;
      }, {});
      
      sections.push(`
# HISTORICAL YEAR-OVER-YEAR REVENUE (Seasonal Patterns)

${Object.entries(revenueByYear)
        .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Most recent years first
        .map(([year, entries]: [string, any[]]) => 
          `${year}:
${entries
            .sort((a: any, b: any) => a.month - b.month) // Sort by month within year
            .map((entry: any) => 
              `  ${new Date(2000, entry.month - 1).toLocaleString('default', { month: 'short' })}: $${entry.actual_revenue?.toLocaleString() || 0}`
            ).join('\n')}`
        ).join('\n\n')}`);
    }

    // Current month revenue (if any data exists)
    if (financialContext.current_month_revenue) {
      const current = financialContext.current_month_revenue;
      sections.push(`
# CURRENT MONTH REVENUE (In Progress)
${current.month}/${current.year}: $${current.actual_revenue?.toLocaleString() || 0} (target: $${current.desired_revenue?.toLocaleString() || 0}) - This month is still in progress`);
    }

    // Current KPIs
    if (financialContext.current_kpis && financialContext.current_kpis.length > 0) {
      const kpis = financialContext.current_kpis.slice(0, 5); // Most recent 5
      sections.push(`
# CURRENT KPIs

${kpis.map((kpi: any) => 
  `${kpi.month}/${kpi.year} ${kpi.kpi_type}: ${kpi.kpi_value} (target: ${kpi.goal_value})`
).join('\n')}`);
    }

    // Historical year-over-year KPIs (multi-year trends)
    if (financialContext.historical_yoy_kpis && financialContext.historical_yoy_kpis.length > 0) {
      const yoyKpis = financialContext.historical_yoy_kpis.slice(0, 60); // Last 5 years worth
      
      // Group by KPI type and year for readability
      const kpisByType: Record<string, Record<string, any[]>> = yoyKpis.reduce((acc: Record<string, Record<string, any[]>>, entry: any) => {
        const type = entry.kpi_type;
        const year = entry.year;
        if (!acc[type]) acc[type] = {};
        if (!acc[type][year]) acc[type][year] = [];
        acc[type][year].push(entry);
        return acc;
      }, {});
      
      sections.push(`
# HISTORICAL YEAR-OVER-YEAR KPIs (Trend Analysis)

${Object.entries(kpisByType)
        .map(([kpiType, yearsData]: [string, Record<string, any[]>]) => 
          `${kpiType.toUpperCase()}:
${Object.entries(yearsData)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([year, entries]: [string, any[]]) => 
              `  ${year}: ${entries
                .sort((a: any, b: any) => a.month - b.month)
                .map((entry: any) => `${new Date(2000, entry.month - 1).toLocaleString('default', { month: 'short' })} ${entry.kpi_value}`)
                .join(', ')}`
            ).join('\n')}`
        ).join('\n\n')}`);
    }

    // Recent LER data
    if (financialContext.recent_ler && financialContext.recent_ler.length > 0) {
      const lerData = financialContext.recent_ler.slice(0, 3); // Most recent 3
      sections.push(`
# EMPLOYEE PERFORMANCE (LER)

${lerData.map((ler: any) => 
  `${ler.work_date}: LER ${ler.ler}, Bonus $${ler.bonus}`
).join('\n')}`);
    }

    // Historical year-over-year LER data (performance patterns)
    if (financialContext.historical_yoy_ler && financialContext.historical_yoy_ler.length > 0) {
      const yoyLer = financialContext.historical_yoy_ler.slice(0, 50); // Last 50 entries (approx 5 years)
      
      // Group by year for readability
      const lerByYear = yoyLer.reduce((acc: Record<string, any[]>, entry: any) => {
        const year = new Date(entry.work_date).getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push(entry);
        return acc;
      }, {});
      
      sections.push(`
# HISTORICAL YEAR-OVER-YEAR EMPLOYEE PERFORMANCE (LER Patterns)

${Object.entries(lerByYear)
        .sort(([a], [b]) => parseInt(b) - parseInt(a))
        .map(([year, entries]) => 
          `${year}:
${entries
            .slice(0, 12) // Show up to 12 entries per year to avoid overwhelming
            .sort((a: any, b: any) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime())
            .map((entry: any) => 
              `  ${new Date(entry.work_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: LER ${entry.ler}`
            ).join('\n')}`
        ).join('\n\n')}`);
    }

    return sections.join('\n');
  }

  /**
   * Chat with full memory context
   */
  async chat(
    message: string,
    options: ChatOptions
  ): Promise<string> {
    if (!this.isAvailable()) {
      return "I'm sorry, but the AI chat feature is not configured. Please add your Anthropic API key to enable this feature.";
    }

    const {
      userId,
      includeContext = true,
      contextDepth = 10,
      temperature = 0.7
    } = options;

    try {
      // Get conversation context from Zep (if available)
      console.log('🔍 Checking Zep availability:', {
        includeContext,
        zepAvailable: zepService.isAvailable()
      });
      
      const context = includeContext && zepService.isAvailable()
        ? await zepService.getConversationContext(userId, message)
        : { context: '', recentMessages: [], relevantMemories: [], facts: {} };
      
      console.log('📦 Context retrieved:', {
        hasContext: !!context.context,
        messageCount: context.recentMessages?.length || 0,
        factCount: Object.keys(context.facts || {}).length
      });

      // Build system prompt with memory
      const systemPrompt = this.buildSystemPrompt(context);

      // Get recent message history for conversation continuity
      const conversationHistory: ChatMessage[] = context.recentMessages
        .slice(-contextDepth * 2) // Last N exchanges (each exchange = 2 messages)
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      // Call Claude with memory context
      const response = await this.client!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' } // Cache system prompt for cost savings
          }
        ],
        messages: [
          ...conversationHistory,
          {
            role: 'user',
            content: message
          }
        ]
      });

      const aiMessage = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      // Save this exchange to Zep (if available)
      if (zepService.isAvailable()) {
        await zepService.saveExchange(userId, message, aiMessage, {
          metadata: {
            source: 'chat',
            model: 'claude-sonnet-4',
            temperature
          },
          userEmail: options.userEmail,
          userFirstName: options.userFirstName,
          userLastName: options.userLastName
        });
      }

      return aiMessage;

    } catch (error) {
      console.error('Error in AI chat:', error);
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return "There's an issue with the API configuration. Please check your Anthropic API key.";
        }
        if (error.message.includes('rate limit')) {
          return "I'm receiving too many requests right now. Please try again in a moment.";
        }
      }
      
      return 'Sorry, I had trouble processing that. Please try again.';
    }
  }

  /**
   * Generate insight without explicit user message
   * (for automatic daily insights)
   */
  async generateInsight(
    userId: string,
    prompt: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.isAvailable()) {
      return '';
    }

    try {
      const response = await this.chat(prompt, {
        userId,
        includeContext: true
      });

      // Save as system-generated insight (if Zep available)
      if (zepService.isAvailable()) {
        await zepService.saveConversation(
          userId,
          [
            { role: 'system', content: prompt },
            { role: 'assistant', content: response }
          ],
          {
            metadata: {
              type: 'auto_insight',
              ...metadata
            }
          }
        );
      }

      return response;
    } catch (error) {
      console.error('Error generating insight:', error);
      return '';
    }
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();
