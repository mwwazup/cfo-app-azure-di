import { EnhancedSeasonalityAnalyzer, SeasonalityFactors } from './enhanced-seasonality-analyzer';

export interface ScenarioClassification {
  scenarioType: 'pricing' | 'membership' | 'hiring' | 'marketing' | 'costCutting' | 'salesVolume' | 'unknown';
  requiredInputs: string[];
  missingInputs: string[];
  askUser: string;
  confidence: number;
  seasonality?: SeasonalityFactors;
  hasSeasonalContext: boolean;
  responseType: 'quick_ridr' | 'detailed_calculation'; // New field to distinguish response types
}

export interface UserProvidedInputs {
  currentPrice?: number;
  newPrice?: number;
  avgMonthlySales?: number;
  customerRetention?: number;
  monthlyFee?: number;
  targetMembers?: number;
  churnRate?: number;
  acquisitionCost?: number;
  hourlyRate?: number;
  hoursPerWeek?: number;
  productivityIncrease?: number;
  onboardingCost?: number;
  monthlySpend?: number;
  expectedROI?: number;
  conversionRate?: number;
  customerLifetimeValue?: number;
  currentCost?: number;
  proposedSavings?: number;
  impactOnRevenue?: number;
  implementationCost?: number;
  currentJobsPerMonth?: number;
  additionalJobs?: number;
  avgJobValue?: number;
  timeConstraint?: number;
}

export class ScenarioClassifier {
  static classifyUserInput(userInput: string, userProvidedInputs: UserProvidedInputs = {}): ScenarioClassification {
    const input = userInput.toLowerCase();
    
    // Extract seasonality information from the input
    const seasonality = EnhancedSeasonalityAnalyzer.extractSeasonalityFromInput(input);
    const hasSeasonalContext = this.detectSeasonalContext(input);
    
    // Determine if this is a quick RIDR question or detailed calculation request
    const responseType = this.determineResponseType(input, userProvidedInputs);
    
    // Pricing scenario detection
    if (this.isPricingScenario(input)) {
      return this.buildPricingClassification(userProvidedInputs, seasonality, hasSeasonalContext, responseType);
    }
    
    // Membership scenario detection
    if (this.isMembershipScenario(input)) {
      return this.buildMembershipClassification(userProvidedInputs, seasonality, hasSeasonalContext, responseType);
    }
    
    // Hiring scenario detection
    if (this.isHiringScenario(input)) {
      return this.buildHiringClassification(userProvidedInputs, seasonality, hasSeasonalContext, responseType);
    }
    
    // Marketing scenario detection
    if (this.isMarketingScenario(input)) {
      return this.buildMarketingClassification(userProvidedInputs, seasonality, hasSeasonalContext, responseType);
    }
    
    // Cost cutting scenario detection
    if (this.isCostCuttingScenario(input)) {
      return this.buildCostCuttingClassification(userProvidedInputs, seasonality, hasSeasonalContext, responseType);
    }
    
    // Sales volume scenario detection
    if (this.isSalesVolumeScenario(input)) {
      return this.buildSalesVolumeClassification(userProvidedInputs, seasonality, hasSeasonalContext, responseType);
    }
    
    // Unknown scenario
    return {
      scenarioType: 'unknown',
      requiredInputs: [],
      missingInputs: [],
      askUser: "I'm not sure what scenario you'd like to explore. Try asking about pricing changes, hiring team members, marketing investments, membership models, cost cutting, or increasing sales volume. You can also include timing like 'starting in May' or 'for the remainder of the year'.",
      confidence: 0,
      hasSeasonalContext: false,
      responseType: 'quick_ridr'
    };
  }

  private static determineResponseType(input: string, userProvidedInputs: UserProvidedInputs): 'quick_ridr' | 'detailed_calculation' {
    // Check if the input contains specific numbers or if user has already provided inputs
    const hasSpecificNumbers = /\$[\d,]+|\d+%|\d+\s*(hour|dollar|month|week|year)/i.test(input);
    const hasProvidedInputs = Object.keys(userProvidedInputs).length > 0;
    
    // If user has specific numbers or has already provided inputs, they want detailed calculation
    if (hasSpecificNumbers || hasProvidedInputs) {
      return 'detailed_calculation';
    }
    
    // Check for general/exploratory language that suggests quick RIDR response
    const quickRidrKeywords = [
      'what if', 'should i', 'thinking about', 'considering', 'wondering',
      'good idea', 'worth it', 'makes sense', 'advice', 'thoughts'
    ];
    
    if (quickRidrKeywords.some(keyword => input.includes(keyword))) {
      return 'quick_ridr';
    }
    
    // Default to detailed calculation for specific scenarios
    return 'detailed_calculation';
  }

  private static detectSeasonalContext(input: string): boolean {
    const seasonalKeywords = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
      'spring', 'summer', 'fall', 'autumn', 'winter',
      'holiday', 'christmas', 'thanksgiving', 'seasonal',
      'remainder of the year', 'rest of year', 'starting in', 'beginning in',
      'through', 'until', 'for the next', 'during', 'peak season', 'off season'
    ];
    
    return seasonalKeywords.some(keyword => input.includes(keyword));
  }

  private static isPricingScenario(input: string): boolean {
    const pricingKeywords = ['price', 'pricing', 'cost', 'charge', 'fee', 'rate', 'discount', 'increase', 'raise', 'lower'];
    return pricingKeywords.some(keyword => input.includes(keyword));
  }

  private static isMembershipScenario(input: string): boolean {
    const membershipKeywords = ['membership', 'subscription', 'recurring', 'monthly', 'member', 'subscribe'];
    return membershipKeywords.some(keyword => input.includes(keyword));
  }

  private static isHiringScenario(input: string): boolean {
    const hiringKeywords = ['hire', 'hiring', 'employee', 'staff', 'team', 'assistant', 'help', 'worker'];
    return hiringKeywords.some(keyword => input.includes(keyword));
  }

  private static isMarketingScenario(input: string): boolean {
    const marketingKeywords = ['marketing', 'ads', 'advertising', 'promotion', 'campaign', 'spend', 'roi'];
    return marketingKeywords.some(keyword => input.includes(keyword));
  }

  private static isCostCuttingScenario(input: string): boolean {
    const costCuttingKeywords = ['cut', 'reduce', 'save', 'cancel', 'eliminate', 'expense', 'cost'];
    return costCuttingKeywords.some(keyword => input.includes(keyword)) && 
           (input.includes('cut') || input.includes('reduce') || input.includes('save'));
  }

  private static isSalesVolumeScenario(input: string): boolean {
    const salesKeywords = ['sales', 'volume', 'jobs', 'clients', 'customers', 'more', 'increase', 'additional'];
    return salesKeywords.some(keyword => input.includes(keyword)) && 
           (input.includes('more') || input.includes('increase') || input.includes('additional'));
  }

  private static buildPricingClassification(
    inputs: UserProvidedInputs, 
    seasonality: SeasonalityFactors, 
    hasSeasonalContext: boolean,
    responseType: 'quick_ridr' | 'detailed_calculation'
  ): ScenarioClassification {
    const required = responseType === 'detailed_calculation' ? ['currentPrice', 'newPrice', 'avgMonthlySales'] : [];
    const missing = required.filter(field => !inputs[field as keyof UserProvidedInputs]);
    
    let askUser = '';
    if (responseType === 'detailed_calculation') {
      if (missing.includes('currentPrice') && missing.includes('newPrice')) {
        askUser = hasSeasonalContext 
          ? 'What is your current price and what new price are you considering? I\'ll factor in the seasonal timing you mentioned.'
          : 'What is your current price and what new price are you considering?';
      } else if (missing.includes('currentPrice')) {
        askUser = 'What is your current price?';
      } else if (missing.includes('newPrice')) {
        askUser = 'What new price are you thinking about?';
      } else if (missing.includes('avgMonthlySales')) {
        askUser = 'How many sales do you typically make per month?';
      }
    }

    return {
      scenarioType: 'pricing',
      requiredInputs: required,
      missingInputs: missing,
      askUser,
      confidence: 0.9,
      seasonality: hasSeasonalContext ? seasonality : undefined,
      hasSeasonalContext,
      responseType
    };
  }

  private static buildMembershipClassification(
    inputs: UserProvidedInputs, 
    seasonality: SeasonalityFactors, 
    hasSeasonalContext: boolean,
    responseType: 'quick_ridr' | 'detailed_calculation'
  ): ScenarioClassification {
    const required = responseType === 'detailed_calculation' ? ['monthlyFee', 'targetMembers'] : [];
    const missing = required.filter(field => !inputs[field as keyof UserProvidedInputs]);
    
    let askUser = '';
    if (responseType === 'detailed_calculation') {
      if (missing.includes('monthlyFee') && missing.includes('targetMembers')) {
        askUser = hasSeasonalContext
          ? 'What monthly fee are you considering and how many members do you want to target? I\'ll analyze the seasonal impact of your timing.'
          : 'What monthly fee are you considering and how many members do you want to target?';
      } else if (missing.includes('monthlyFee')) {
        askUser = 'What monthly membership fee are you thinking about?';
      } else if (missing.includes('targetMembers')) {
        askUser = 'How many members are you targeting?';
      }
    }

    return {
      scenarioType: 'membership',
      requiredInputs: required,
      missingInputs: missing,
      askUser,
      confidence: 0.85,
      seasonality: hasSeasonalContext ? seasonality : undefined,
      hasSeasonalContext,
      responseType
    };
  }

  private static buildHiringClassification(
    inputs: UserProvidedInputs, 
    seasonality: SeasonalityFactors, 
    hasSeasonalContext: boolean,
    responseType: 'quick_ridr' | 'detailed_calculation'
  ): ScenarioClassification {
    const required = responseType === 'detailed_calculation' ? ['hourlyRate', 'hoursPerWeek'] : [];
    const missing = required.filter(field => !inputs[field as keyof UserProvidedInputs]);
    
    let askUser = '';
    if (responseType === 'detailed_calculation') {
      if (missing.includes('hourlyRate') && missing.includes('hoursPerWeek')) {
        askUser = hasSeasonalContext
          ? 'What hourly rate are you considering and how many hours per week would they work? I\'ll factor in the seasonal timing and training period.'
          : 'What hourly rate are you considering and how many hours per week would they work?';
      } else if (missing.includes('hourlyRate')) {
        askUser = 'What hourly rate are you thinking about paying?';
      } else if (missing.includes('hoursPerWeek')) {
        askUser = 'How many hours per week would this person work?';
      }
    }

    return {
      scenarioType: 'hiring',
      requiredInputs: required,
      missingInputs: missing,
      askUser,
      confidence: 0.8,
      seasonality: hasSeasonalContext ? seasonality : undefined,
      hasSeasonalContext,
      responseType
    };
  }

  private static buildMarketingClassification(
    inputs: UserProvidedInputs, 
    seasonality: SeasonalityFactors, 
    hasSeasonalContext: boolean,
    responseType: 'quick_ridr' | 'detailed_calculation'
  ): ScenarioClassification {
    const required = responseType === 'detailed_calculation' ? ['monthlySpend', 'expectedROI'] : [];
    const missing = required.filter(field => !inputs[field as keyof UserProvidedInputs]);
    
    let askUser = '';
    if (responseType === 'detailed_calculation') {
      if (missing.includes('monthlySpend') && missing.includes('expectedROI')) {
        askUser = hasSeasonalContext
          ? 'How much would you spend monthly on marketing and what ROI do you expect? I\'ll analyze how seasonal timing affects your results.'
          : 'How much would you spend monthly on marketing and what ROI do you expect?';
      } else if (missing.includes('monthlySpend')) {
        askUser = 'How much are you planning to spend monthly on marketing?';
      } else if (missing.includes('expectedROI')) {
        askUser = 'What return on investment (ROI) do you expect from your marketing spend?';
      }
    }

    return {
      scenarioType: 'marketing',
      requiredInputs: required,
      missingInputs: missing,
      askUser,
      confidence: 0.8,
      seasonality: hasSeasonalContext ? seasonality : undefined,
      hasSeasonalContext,
      responseType
    };
  }

  private static buildCostCuttingClassification(
    inputs: UserProvidedInputs, 
    seasonality: SeasonalityFactors, 
    hasSeasonalContext: boolean,
    responseType: 'quick_ridr' | 'detailed_calculation'
  ): ScenarioClassification {
    const required = responseType === 'detailed_calculation' ? ['currentCost', 'proposedSavings'] : [];
    const missing = required.filter(field => !inputs[field as keyof UserProvidedInputs]);
    
    let askUser = '';
    if (responseType === 'detailed_calculation') {
      if (missing.includes('currentCost') && missing.includes('proposedSavings')) {
        askUser = hasSeasonalContext
          ? 'What is the current monthly cost and how much do you want to save? I\'ll consider the seasonal timing of these changes.'
          : 'What is the current monthly cost and how much do you want to save?';
      } else if (missing.includes('currentCost')) {
        askUser = 'What is the current monthly cost of this expense?';
      } else if (missing.includes('proposedSavings')) {
        askUser = 'How much money would you save per month?';
      }
    }

    return {
      scenarioType: 'costCutting',
      requiredInputs: required,
      missingInputs: missing,
      askUser,
      confidence: 0.75,
      seasonality: hasSeasonalContext ? seasonality : undefined,
      hasSeasonalContext,
      responseType
    };
  }

  private static buildSalesVolumeClassification(
    inputs: UserProvidedInputs, 
    seasonality: SeasonalityFactors, 
    hasSeasonalContext: boolean,
    responseType: 'quick_ridr' | 'detailed_calculation'
  ): ScenarioClassification {
    const required = responseType === 'detailed_calculation' ? ['additionalJobs', 'avgJobValue'] : [];
    const missing = required.filter(field => !inputs[field as keyof UserProvidedInputs]);
    
    let askUser = '';
    if (responseType === 'detailed_calculation') {
      if (missing.includes('additionalJobs') && missing.includes('avgJobValue')) {
        askUser = hasSeasonalContext
          ? 'How many additional jobs per month and what is the average value per job? I\'ll analyze how seasonal demand affects your capacity.'
          : 'How many additional jobs per month and what is the average value per job?';
      } else if (missing.includes('additionalJobs')) {
        askUser = 'How many additional jobs per month are you considering?';
      } else if (missing.includes('avgJobValue')) {
        askUser = 'What is the average value of each job or project?';
      }
    }

    return {
      scenarioType: 'salesVolume',
      requiredInputs: required,
      missingInputs: missing,
      askUser,
      confidence: 0.8,
      seasonality: hasSeasonalContext ? seasonality : undefined,
      hasSeasonalContext,
      responseType
    };
  }
}