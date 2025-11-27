import Anthropic from '@anthropic-ai/sdk';
import { zepService, ConversationContext } from './zepService';
import { env } from '../config/env';
import { getLighthousePlan, LighthousePlan } from './bigFigGoalService';
import coachingVoiceContent from '../../../WAVERIDER_AI_COACHING_VOICE.md?raw';

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
   * Load the WaveRider coaching voice from markdown file
   */
  private loadCoachingVoice(): string {
    return coachingVoiceContent;
  }

  /**
   * Build system prompt with Zep memory context and user data
   * CRITICAL: Coaching voice comes FIRST to establish tone before data
   */
  private buildSystemPrompt(
    context: ConversationContext,
    lighthousePlan?: LighthousePlan | null
  ): string {
    const { facts, summary, relevantMemories, financialContext } = context;

    // Load the complete coaching voice from markdown FIRST
    const coachingVoice = this.loadCoachingVoice();

    // Add explicit override instruction
    const overrideInstruction = `

# CRITICAL INSTRUCTION
The coaching voice guidelines above are your PRIMARY instructions for how to respond.
All the data context below is provided for reference, but your tone, style, and response structure must follow the coaching voice guidelines exactly.
When explaining concepts like "Revenue Velocity", use the natural conversational style from the coaching voice, not technical definitions.
`;

    // Zep's pre-built context string
    const zepContext = context.context ? `

# MEMORY CONTEXT

${context.context}
` : '';

    // Business facts
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

    const lighthouseSection = lighthousePlan ? `

# LIGHTHOUSE GOAL SNAPSHOT

Current annual revenue (approx): $${Math.round(lighthousePlan.currentAnnualRevenue).toLocaleString()}
Lighthouse target: $${Math.round(lighthousePlan.targetAnnualRevenue).toLocaleString()} per year by ${new Date(lighthousePlan.targetYear, lighthousePlan.targetMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (about ${lighthousePlan.yearsToGoal} year${lighthousePlan.yearsToGoal !== 1 ? 's' : ''} from now)
Average additional revenue needed: $${Math.round(lighthousePlan.requiredAnnualIncrease).toLocaleString()} per year (~$${Math.round(lighthousePlan.requiredMonthlyIncrease).toLocaleString()} per month)
` : '';

    // Conversation summary
    const summarySection = summary ? `

# CONVERSATION SUMMARY

${summary}
` : '';

    // Relevant past discussions
    const memoriesSection = relevantMemories.length > 0 ? `

# RELEVANT PAST DISCUSSIONS

${relevantMemories.map((mem, idx) => 
  `${idx + 1}. ${mem.summary || mem.message?.content.substring(0, 200)}` 
).join('\n')}
` : '';

    // Financial data from database (condensed version)
    const financialSection = financialContext ? this.buildFinancialContext(financialContext) : '';

    // App features
    const appContext = `

# APP FEATURES AVAILABLE

The user is in the WaveRider app which has:
- Dashboard with KPIs (revenue, profit margin, velocity, etc.)
- Master Revenue tracking with FIR (Future Inspired Revenue) targets
- Employee LER (Labor Efficiency Ratio) tracking
- Service Mix analysis
- Budget vs Actual tracking
- Financial statement uploads

Reference these features naturally when relevant.`;

    // NEW ORDER: Coaching voice FIRST, then data
    return `${coachingVoice}

${overrideInstruction}

${zepContext}

${businessContext}

${lighthouseSection}

${summarySection}

${memoriesSection}

${financialSection}

${appContext}`;
  }

  /**
   * Build financial context section from database data
   * CONDENSED VERSION - Less data to prevent prompt from being too long
   */
  private buildFinancialContext(financialContext: Record<string, any>): string {
    const sections: string[] = [];

    // Current date
    if (financialContext.current_date_context) {
      const { current_year, current_month, current_date } = financialContext.current_date_context;
      sections.push(`

# CURRENT DATE
Today is ${current_date}. We're in ${new Date(current_year, current_month - 1).toLocaleString('default', { month: 'long' })} ${current_year}.`);
    }

    // Historical revenue - REDUCED from 6 to 3 months
    if (financialContext.historical_revenue && financialContext.historical_revenue.length > 0) {
      const revenue = financialContext.historical_revenue.slice(0, 3);
      sections.push(`

# RECENT MONTHS REVENUE

${revenue.map((entry: any) => 
  `${entry.month}/${entry.year}: $${entry.actual_revenue?.toLocaleString() || 0} (target: $${entry.desired_revenue?.toLocaleString() || 0})`
).join('\n')}`);
    }

    // Year-over-year revenue - REDUCED from 5 years to 2 years
    if (financialContext.historical_yoy_revenue && financialContext.historical_yoy_revenue.length > 0) {
      const yoyRevenue = financialContext.historical_yoy_revenue.slice(0, 24); // 2 years = 24 months
      
      const revenueByYear: Record<string, any[]> = yoyRevenue.reduce((acc: Record<string, any[]>, entry: any) => {
        const year = entry.year;
        if (!acc[year]) acc[year] = [];
        acc[year].push(entry);
        return acc;
      }, {});
      
      sections.push(`

# YEAR-OVER-YEAR REVENUE (Last 2 Years)

${Object.entries(revenueByYear)
        .sort(([a], [b]) => parseInt(b) - parseInt(a))
        .map(([year, entries]: [string, any[]]) => 
          `${year}: ${entries
            .sort((a: any, b: any) => a.month - b.month)
            .map((entry: any) => 
              `${new Date(2000, entry.month - 1).toLocaleString('default', { month: 'short' })} $${entry.actual_revenue?.toLocaleString() || 0}`
            ).join(', ')}`
        ).join('\n')}`);
    }

    // Current month (in progress)
    if (financialContext.current_month_revenue) {
      const current = financialContext.current_month_revenue;
      sections.push(`

# CURRENT MONTH (In Progress)
${current.month}/${current.year}: $${current.actual_revenue?.toLocaleString() || 0} (target: $${current.desired_revenue?.toLocaleString() || 0})`);
    }

    // Current KPIs - REDUCED from 5 to 3
    if (financialContext.current_kpis && financialContext.current_kpis.length > 0) {
      const kpis = financialContext.current_kpis.slice(0, 3);
      sections.push(`

# CURRENT KPIs

${kpis.map((kpi: any) => 
  `${kpi.month}/${kpi.year} ${kpi.kpi_type}: ${kpi.kpi_value} (target: ${kpi.goal_value})`
).join('\n')}`);
    }

    // REMOVED: Year-over-year KPIs section entirely to save space
    // Only include current KPIs, not historical trends

    // Employee LER - REDUCED from 3 to 2 entries
    if (financialContext.recent_ler && financialContext.recent_ler.length > 0) {
      const lerData = financialContext.recent_ler.slice(0, 2);
      sections.push(`

# EMPLOYEE PERFORMANCE

${lerData.map((ler: any) => 
  `${ler.work_date}: LER ${ler.ler}`
).join('\n')}`);
    }

    // REMOVED: Historical year-over-year LER section to save space
    // Only show recent LER, not historical patterns

    // Top services - REDUCED from showing all to top 5
    if (financialContext.top_services_last_90_days && financialContext.top_services_last_90_days.length > 0) {
      const services = financialContext.top_services_last_90_days.slice(0, 5) as Array<{
        service_id: string;
        service_name?: string;
        service_category?: string | null;
        total_revenue: number;
        appointment_count: number;
      }>;

      const lines = services.map((svc, index) => {
        const name = svc.service_name || 'Unknown Service';
        return `${index + 1}. ${name} – $${Math.round(svc.total_revenue).toLocaleString()} (${svc.appointment_count} jobs)`;
      });

      sections.push(`

# TOP SERVICES (Last 90 Days)

${lines.join('\n')}`);
    }

    // Upcoming FIR targets (next 2 months only)
    if (financialContext.upcoming_fir_targets && financialContext.upcoming_fir_targets.length > 0) {
      const targets = financialContext.upcoming_fir_targets.slice(0, 2) as Array<{
        year: number;
        month: number;
        desired_revenue: number;
      }>;

      const lines = targets.map((t) => {
        const date = new Date(t.year, t.month - 1, 15);
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return `${label}: $${Math.round(t.desired_revenue).toLocaleString()} target`;
      });

      sections.push(`

# UPCOMING TARGETS

${lines.join('\n')}`);
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
      // Get conversation context from Zep
      const context = includeContext && zepService.isAvailable()
        ? await zepService.getConversationContext(userId, message)
        : { context: '', recentMessages: [], relevantMemories: [], facts: {} };

      let lighthousePlan: LighthousePlan | null = null;
      if (includeContext) {
        try {
          lighthousePlan = await getLighthousePlan(userId);
        } catch (err) {
          console.error('Error fetching Lighthouse plan for AI context:', err);
        }
      }

      // Build system prompt (coaching voice comes first)
      const systemPrompt = this.buildSystemPrompt(context, lighthousePlan);

      // Get recent message history
      const conversationHistory: ChatMessage[] = context.recentMessages
        .slice(-contextDepth * 2)
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      // Call Claude
      const response = await this.client!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }
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

      // Save exchange to Zep
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
   * Explain a specific KPI
   * Simplified - let the coaching voice handle all the tone/structure
   */
  async explainKPI(options: {
    userId: string;
    kpiName: string;
    kpiValue: number;
    goalValue?: number | null;
    status?: string | null;
    periodLabel?: string;
  }): Promise<string> {
    if (!this.isAvailable()) {
      return "The AI coach isn't configured right now.";
    }

    const { userId, kpiName, kpiValue, goalValue, status, periodLabel } = options;

    // Format the values based on KPI type
    const lowerName = (kpiName || '').toLowerCase();
    
    const isPercentageKpi =
      lowerName.includes('velocity') ||
      lowerName.includes('contribution') ||
      lowerName.includes('margin') ||
      lowerName.includes('rate') ||
      lowerName.includes('growth');

    const isCurrencyKpi =
      !isPercentageKpi &&
      (lowerName.includes('revenue') ||
        lowerName.includes('profit') ||
        lowerName.includes('gap'));

    let valueText: string;
    let goalText: string;

    if (isPercentageKpi) {
      const asPercent = Math.abs(kpiValue) < 1 ? kpiValue * 100 : kpiValue;
      valueText = `${Math.round(asPercent)}%`;
      
      if (goalValue !== undefined && goalValue !== null) {
        const goalPercent = Math.abs(goalValue) < 1 ? goalValue * 100 : goalValue;
        goalText = `${Math.round(goalPercent)}%`;
      } else {
        goalText = 'not set';
      }
    } else if (isCurrencyKpi) {
      valueText = `$${Math.round(kpiValue).toLocaleString()}`;
      goalText = goalValue !== undefined && goalValue !== null
        ? `$${Math.round(goalValue).toLocaleString()}`
        : 'not set';
    } else {
      valueText = Math.round(kpiValue).toLocaleString();
      goalText = goalValue !== undefined && goalValue !== null
        ? Math.round(goalValue).toLocaleString()
        : 'not set';
    }

    // Simple prompt - let coaching voice handle everything
    const prompt = `Explain this KPI to me as a problem-solving question:

KPI: ${kpiName}
Period: ${periodLabel || 'this period'}
Value: ${valueText}
Goal: ${goalText}
Status: ${status || 'unknown'}

What does this mean for my business and what should I do about it?`;

    return this.chat(prompt, {
      userId,
      includeContext: true,
      contextDepth: 10,
      temperature: 0.5,
    });
  }

  /**
   * Generate insight without explicit user message
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

      // Save as system-generated insight
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