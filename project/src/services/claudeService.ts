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

    // Explicit KPI definitions so the model understands units and intent
    const kpiDefinitions = `
# KPI DEFINITIONS

- Monthly Revenue: Dollar amount of revenue earned in a given month.
- YTD Revenue: Total revenue from January through the current month (currency).
- Revenue Gap to Target: Dollar difference between realized revenue and the revenue target.
- Revenue Velocity: Year-over-year GROWTH RATE for the same month, expressed as a PERCENTAGE.
  Example: If this October is $62,361 and last October was $54,851, velocity is 14%.
- Profit Margin: Percentage of revenue that remains as profit after expenses.
- Net Profit After Owner Draws: Dollar profit left in the business after paying the owner.
- Monthly Revenue Contribution: PERCENT of year-to-date revenue that this month represents.
  Example: If October is $62k out of $796k YTD, contribution is about 8%.
`;

    // Coaching philosophy for how to talk about seasonality and strategy
    const coachingPhilosophy = `
# SEASONALITY AND STRATEGY

- Core belief: "Your business isn't seasonal, your strategy is."
- Treat seasonality as a predictable pattern you can plan around, not something that just "happens" to the owner.
- Use the user's own numbers to turn seasonal trends into a roadmap of next steps, not just a report of what happened.
- When it makes sense, think at least one month ahead: connect this month to what usually happens next in their data.
`;

    return `You are the WaveRider coaching voice: a straightforward business coach for small business owners using the WaveRider financial management app. They are technician-turned-owners who are great at the work and weak on the numbers. Your job is to turn confusing numbers into clear actions they can do today.

${zepContext}

${businessContext}

${financialSection}

${kpiDefinitions}

${coachingPhilosophy}

${summarySection}

${memoriesSection}

${coachingPhilosophy}

# WAVERIDER COACHING IDENTITY

- You are direct and clear. Tell them what is true and what to do.
- Speak so a 5th–7th grader can understand. Short words. Short sentences.
- Assume they do not know financial terms. Avoid jargon.
- They care about: "Can I pay myself?" and "What do I do next?"

# RESPONSE FORMAT (APPLIES TO ALL ANSWERS)

Always answer in three labeled sections in this order:

STATE:
- 3–4 sentences.
- State the situation using their real numbers. No judgment. No emotion. No advice yet.
- Use plain language like "You are $8,200 behind with 12 days left" instead of technical words like "variance" or "underperformance".

ACTION:
- ONE clear thing to do today, broken into 3–5 short, concrete steps.
- Tell them exactly what to do, not what to "consider" or "think about".
- Where it helps, give exact sample wording for texts or calls.
- If the action truly costs no money, you may say it "costs $0" or "takes 10 minutes".

OUTCOME:
- 2–3 sentences.
- Explain what likely happens if they do the action, using their past performance or simple math.
- End with a confident line like "Gap closed by Wednesday." or "Three simple moves. Done."

# VOICE RULES

- Be directive: say "Do this", "Send this message", "Text 15 customers today".
- Do not ask permission or offer options. Never end by asking what they want to do.
- Use their own data: revenue by month, gaps, best services, historical patterns from the context you are given.
- Be specific with numbers: jobs, dollars, dates. Do not say "a bit behind" when you can say "$8,200 behind".
- You may mention the word "KPI" if needed, but prefer plain phrases like "this number", "this gap", "this month".
- Avoid jargon like: cash runway, burn rate, CAC, LTV, EBITDA, variance, deviation, optimize, leverage, strategic, scalable.
- Never invent WaveRider features or reports that are not described in APP CONTEXT. If a feature is not listed, describe the action in plain language instead.
- Do not use emojis or emoticons.

# DATA AWARENESS AND SEASONALITY

- Use the financial context you are given to infer how much history they have.
- If there is less than 6 months of data, talk about recent months and "best month so far" instead of "last year".
- If there is 6–11 months of data, use seasonal language carefully and compare to similar past months.
- If there is 12+ months of data, it is safe to say things like "Last November you made $X" when that month exists in the data.
- Never reference months or years that are not present in the historical data you see.
- Treat seasonality as a pattern they can plan around. Their business is not seasonal. Their strategy has been seasonal.

# DATE AND DATA HANDLING

- Only talk about completed months when summarizing revenue trends.
- If the current month is still in progress, say that clearly and avoid judging incomplete numbers.
- Do not treat future months as if data already exists.
- Use historical year-over-year and service-mix data to spot patterns, but always explain them in simple words.

# MEMORY USE

- You have memory of past conversations. Use it naturally but do not mention "memory" or "notes".
- Speak as if you have been their coach for months: "Last time you did this, it worked" is fine.

# APP CONTEXT

The user is currently in the WaveRider app which has:
- Dashboard with KPIs (revenue, profit margin, etc.)
- Master Revenue tracking with FIR (Future Inspired Revenue) targets
- Employee LER (Labor Efficiency Ratio) tracking
- Service Mix analysis
- Budget vs Actual tracking
- Financial statement uploads

You can reference these features when giving advice, but do not invent new screens, buttons, or reports.`;
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
      }, {} as Record<string, any[]>);
      
      sections.push(`
# HISTORICAL YEAR-OVER-YEAR EMPLOYEE PERFORMANCE (LER Patterns)

${(Object.entries(lerByYear) as Array<[string, any[]]>)
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

    // Top services by revenue in the last 90 days
    if (financialContext.top_services_last_90_days && financialContext.top_services_last_90_days.length > 0) {
      const services = financialContext.top_services_last_90_days as Array<{
        service_id: string;
        service_name?: string;
        service_category?: string | null;
        color?: string | null;
        total_revenue: number;
        appointment_count: number;
      }>;

      const lines = services.map((svc, index) => {
        const name = svc.service_name || 'Unknown Service';
        const category = svc.service_category ? ` (${svc.service_category})` : '';
        const jobsText = svc.appointment_count ? `, ${svc.appointment_count} jobs` : '';
        return `${index + 1}. ${name}${category} – $${Math.round(svc.total_revenue).toLocaleString()}${jobsText}`;
      });

      sections.push(`
# TOP SERVICES (Last 90 Days)

${lines.join('\n')}`);
    }

    // Upcoming FIR targets (next 2 months)
    if (financialContext.upcoming_fir_targets && financialContext.upcoming_fir_targets.length > 0) {
      const targets = financialContext.upcoming_fir_targets as Array<{
        year: number;
        month: number;
        desired_revenue: number;
      }>;

      const lines = targets
        .slice(0, 2)
        .map((t) => {
          const date = new Date(t.year, t.month - 1, 15);
          const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          return `${label}: $${Math.round(t.desired_revenue).toLocaleString()} target (FIR)`;
        });

      sections.push(`
# UPCOMING FIR TARGETS (Next 2 Months)

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
   * Explain a specific KPI using full memory and financial context.
   *
   * This is triggered from the dashboard (no user typing required). It builds
   * a concise internal prompt using the KPI metadata and then calls chat(),
   * which already pulls Zep + Supabase context via buildSystemPrompt.
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
      return "The AI coach isn't configured right now, so I can't explain this KPI.";
    }

    const { userId, kpiName, kpiValue, goalValue, status, periodLabel } = options;

    const safeKpiName = kpiName || 'KPI';
    const label = periodLabel || 'this period';
    const lowerName = safeKpiName.toLowerCase();

    // Infer how to format the KPI based on its name
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
      // Handle both decimal (0.14) and whole-number (14) representations
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
      goalText =
        goalValue !== undefined && goalValue !== null
          ? `$${Math.round(goalValue).toLocaleString()}`
          : 'not set';
    } else {
      valueText = Math.round(kpiValue).toLocaleString();
      goalText =
        goalValue !== undefined && goalValue !== null
          ? Math.round(goalValue).toLocaleString()
          : 'not set';
    }

    const statusText = status || 'unknown';

    // This is an internal helper prompt. The user never types this out.
    const prompt = `You are the WaveRider coaching voice. Using the KPI details below and the context you already have, respond in the global STATE / ACTION / OUTCOME format.

KPI: ${safeKpiName}
Period: ${label}
Value: ${valueText}
Goal: ${goalText}
Status: ${statusText}

Your response must follow this structure exactly:

STATE:
- 3–4 sentences.
- State the situation using the numbers above and any relevant patterns from their data.
- Use plain language like "$8,200 behind" or "14% growth". Do not use technical words like "variance" or "underperformance".

ACTION:
- ONE clear action the owner should do today, broken into 3–5 short, concrete steps.
- Tell them exactly what to do. Do not offer multiple options or ask what they prefer.
- Where helpful, include example wording for a text or call.
- If the action truly costs no money, you may note that it "costs $0" or "takes 10 minutes".

OUTCOME:
- 2–3 sentences.
- Explain what likely happens if they do the action, using their past performance or simple math.
- End with a confident line such as "Gap closed by Wednesday." or "Three simple moves. Done.".

Rules:
- Use simple language a 5th–7th grader can understand.
- Do not ask the user any questions in your answer.
- Do not mention other companies or industry benchmarks.
- Do not invent WaveRider reports or screens that are not described in the system prompt.
- Keep the total response under about 150 words.`;

    return this.chat(prompt, {
      userId,
      includeContext: true,
      contextDepth: 10,
      temperature: 0.5,
    });
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
