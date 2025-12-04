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
   * STREAMLINED: Only essential financial context to encourage conversation over comprehensiveness
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

1. The "DATA YOU DO NOT HAVE" section at the start defines what you know and don't know
2. If you're about to suggest something that requires data you don't have, ASK INSTEAD OF INVENTING
3. The coaching voice guidelines are your PRIMARY instructions for tone and style
4. All financial data below is provided for reference only - use it sparingly to inform, not to overwhelm
5. When explaining concepts, use natural conversational style, not technical jargon
6. REMEMBER: Less data = More questions. Ask before you prescribe.
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

    // Build Lighthouse section - MINIMAL data, let AI ask questions
    const lighthouseFromContext = financialContext?.lighthouse;
    let lighthouseSection = '';
    
    if (lighthousePlan || lighthouseFromContext) {
      // Keep it brief - AI should KNOW this but not RECITE it
      const targetYear = lighthousePlan?.targetYear || lighthouseFromContext?.goal?.target_year;
      const targetRevenue = lighthousePlan?.targetAnnualRevenue || lighthouseFromContext?.goal?.target_annual_revenue;
      const currentStep = lighthouseFromContext?.current_step_year || 1;
      const totalYears = lighthouseFromContext?.goal?.years_to_goal || lighthousePlan?.yearsToGoal || 1;
      const story = lighthouseFromContext?.goal?.story;
      
      // Get pending milestones (just the names)
      const pendingMilestones = lighthouseFromContext?.current_year_milestones
        ?.filter((m: any) => !m.completed)
        ?.map((m: any) => m.text) || [];
      
      lighthouseSection = `

# LIGHTHOUSE (Background Knowledge - DO NOT recite all of this)
Target: $${Math.round(targetRevenue || 0).toLocaleString()} by ${targetYear}
Position: Year ${currentStep} of ${totalYears}
${story ? `Their WHY: "${story}"` : ''}
${pendingMilestones.length > 0 ? `This year's focus: ${pendingMilestones.join(', ')}` : ''}

CRITICAL: You KNOW this information but should NOT dump it all at once.
- If they ask about their Lighthouse, give a SHORT summary and ask how they feel about it
- Reference their WHY sparingly - it's personal, not a talking point
- Focus on ONE thing at a time, then ask a question to continue the conversation
- Be a coach having a conversation, not a system reading a report`;
    }

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

    // Financial data from database (STREAMLINED VERSION - much less data)
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
   * STREAMLINED: Only the essential data to inform coaching, not overwhelm it
   * 
   * REMOVED:
   * - Year-over-year revenue (too much historical context)
   * - Employee LER section
   * - Services offered (unnecessary detail)
   * - Company settings (bonus thresholds, overhead %, etc.)
   * - Bonus rules (custom LER tiers)
   * 
   * KEPT MINIMAL:
   * - Current date (context)
   * - Last month revenue (reference point only)
   * - Current month (what's happening now)
   * - Top 1 KPI (current focus only)
   * - Next month target (immediate horizon)
   * - Employee names & pay rates (human context)
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

    // Last month revenue ONLY (not 3 months) - just a reference point
    if (financialContext.historical_revenue && financialContext.historical_revenue.length > 0) {
      const lastMonth = financialContext.historical_revenue.slice(0, 1);
      sections.push(`

# LAST MONTH REFERENCE

${lastMonth.map((entry: any) => 
  `${entry.month}/${entry.year}: $${entry.actual_revenue?.toLocaleString() || 0}`
).join('\n')}`);
    }

    // Current month (in progress)
    if (financialContext.current_month_revenue) {
      const current = financialContext.current_month_revenue;
      sections.push(`

# CURRENT MONTH (In Progress)
${current.month}/${current.year}: $${current.actual_revenue?.toLocaleString() || 0} (target: $${current.desired_revenue?.toLocaleString() || 0})`);
    }

    // Current KPI - JUST ONE (not 3) - the most important thing right now
    if (financialContext.current_kpis && financialContext.current_kpis.length > 0) {
      const topKpi = financialContext.current_kpis.slice(0, 1);
      sections.push(`

# CURRENT FOCUS

${topKpi.map((kpi: any) => 
  `${kpi.kpi_type}: ${kpi.kpi_value} (target: ${kpi.goal_value})`
).join('\n')}`);
    }

    // Upcoming target - NEXT MONTH ONLY (not 2 months)
    if (financialContext.upcoming_fir_targets && financialContext.upcoming_fir_targets.length > 0) {
      const nextTarget = financialContext.upcoming_fir_targets.slice(0, 1) as Array<{
        year: number;
        month: number;
        desired_revenue: number;
      }>;

      const lines = nextTarget.map((t) => {
        const date = new Date(t.year, t.month - 1, 15);
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return `${label}: $${Math.round(t.desired_revenue).toLocaleString()} target`;
      });

      sections.push(`

# NEXT TARGET

${lines.join('\n')}`);
    }

    // Employees with names and pay rates - KEEP THIS (human context is important)
    if (financialContext.employees && financialContext.employees.length > 0) {
      const employees = financialContext.employees as Array<{
        id: string;
        name: string;
        position: string;
        hourly_rate: number;
      }>;

      sections.push(`

# EMPLOYEES

${employees.map((emp) => 
  `- ${emp.name} (${emp.position}): $${emp.hourly_rate.toFixed(2)}/hr`
).join('\n')}`);
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
      temperature = 0.75
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
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
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
   * Temperature bumped to 0.75 for more conversational feel
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

    // CHANGED: Ask just "What does this mean?" not "What should I do?"
    // This triggers explanation mode, not problem-solving mode
    const prompt = `Explain this KPI briefly, like I'm a business owner:

KPI: ${kpiName}
Period: ${periodLabel || 'this period'}
Value: ${valueText}
Goal: ${goalText}
Status: ${status || 'unknown'}

What does this number mean?`;

    return this.chat(prompt, {
      userId,
      includeContext: true,
      contextDepth: 10,
      temperature: 0.75,
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