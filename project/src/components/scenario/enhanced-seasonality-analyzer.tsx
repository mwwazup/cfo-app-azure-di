import { UserProvidedInputs } from './scenario-classifier';

export interface SeasonalityFactors {
  startMonth: number;
  duration: number;
  seasonalPattern: 'steady' | 'seasonal' | 'holiday' | 'summer' | 'winter';
  rampUpMonths: number;
  peakMonths: number[];
  lowMonths: number[];
}

export interface SeasonalAnalysis {
  monthlyImpacts: number[];
  totalAnnualImpact: number;
  breakEvenMonth: number;
  seasonalRecommendations: string[];
  riskFactors: string[];
  opportunities: string[];
}

export class EnhancedSeasonalityAnalyzer {
  static analyzeSeasonalImpact(
    scenarioType: string,
    inputs: UserProvidedInputs,
    seasonality: SeasonalityFactors,
    currentMonthlyRevenue: number = 50000
  ): SeasonalAnalysis {
    
    const monthlyImpacts = new Array(12).fill(0);
    let totalAnnualImpact = 0;
    let breakEvenMonth = -1;
    const recommendations: string[] = [];
    const riskFactors: string[] = [];
    const opportunities: string[] = [];

    // Define seasonal multipliers for different business patterns
    const seasonalMultipliers = this.getSeasonalMultipliers(seasonality.seasonalPattern);
    
    // Calculate base monthly impact
    const baseMonthlyImpact = this.calculateBaseImpact(scenarioType, inputs, currentMonthlyRevenue);
    
    // Apply seasonal factors month by month
    for (let month = 0; month < 12; month++) {
      let monthlyImpact = 0;
      
      // Check if the scenario has started
      if (month >= seasonality.startMonth) {
        const monthsActive = month - seasonality.startMonth + 1;
        
        // Apply ramp-up factor
        let rampUpFactor = 1;
        if (monthsActive <= seasonality.rampUpMonths) {
          rampUpFactor = monthsActive / seasonality.rampUpMonths;
        }
        
        // Apply seasonal multiplier
        const seasonalMultiplier = seasonalMultipliers[month];
        
        // Calculate scenario-specific impact
        monthlyImpact = this.calculateScenarioSpecificImpact(
          scenarioType,
          inputs,
          baseMonthlyImpact,
          month,
          seasonality,
          rampUpFactor,
          seasonalMultiplier
        );
      }
      
      monthlyImpacts[month] = monthlyImpact;
      totalAnnualImpact += monthlyImpact;
      
      // Track break-even
      if (breakEvenMonth === -1 && monthlyImpact > 0) {
        breakEvenMonth = month;
      }
    }

    // Generate recommendations based on analysis
    this.generateSeasonalRecommendations(
      scenarioType,
      seasonality,
      monthlyImpacts,
      recommendations,
      riskFactors,
      opportunities
    );

    return {
      monthlyImpacts,
      totalAnnualImpact,
      breakEvenMonth,
      seasonalRecommendations: recommendations,
      riskFactors,
      opportunities
    };
  }

  private static getSeasonalMultipliers(pattern: string): number[] {
    switch (pattern) {
      case 'seasonal':
        // Higher in spring/summer, lower in winter
        return [0.7, 0.8, 1.1, 1.2, 1.3, 1.4, 1.3, 1.2, 1.1, 0.9, 0.8, 0.7];
      
      case 'holiday':
        // Peaks around holidays
        return [0.8, 0.9, 1.0, 1.1, 1.2, 1.0, 0.9, 0.9, 1.0, 1.1, 1.4, 1.5];
      
      case 'summer':
        // Summer peak business
        return [0.8, 0.9, 1.0, 1.1, 1.3, 1.4, 1.5, 1.4, 1.2, 1.0, 0.9, 0.8];
      
      case 'winter':
        // Winter peak business
        return [1.3, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3];
      
      case 'steady':
      default:
        // Consistent throughout year
        return [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    }
  }

  private static calculateBaseImpact(
    scenarioType: string,
    inputs: UserProvidedInputs,
    currentMonthlyRevenue: number
  ): number {
    switch (scenarioType) {
      case 'pricing':
        const { currentPrice = 1000, newPrice = 1100, avgMonthlySales = 10 } = inputs;
        return (newPrice - currentPrice) * avgMonthlySales;
      
      case 'membership':
        const { monthlyFee = 99, targetMembers = 100 } = inputs;
        return monthlyFee * targetMembers;
      
      case 'hiring':
        const { hourlyRate = 20, hoursPerWeek = 20, productivityIncrease = 30 } = inputs;
        const monthlyCost = hourlyRate * hoursPerWeek * 4.33;
        const productivityBoost = currentMonthlyRevenue * (productivityIncrease / 100);
        return productivityBoost - monthlyCost;
      
      case 'marketing':
        const { monthlySpend = 500, expectedROI = 300 } = inputs;
        return (monthlySpend * (expectedROI / 100)) - monthlySpend;
      
      case 'salesVolume':
        const { additionalJobs = 3, avgJobValue = 2500 } = inputs;
        return additionalJobs * avgJobValue;
      
      case 'costCutting':
        const { proposedSavings = 150 } = inputs;
        return proposedSavings;
      
      default:
        return 0;
    }
  }

  private static calculateScenarioSpecificImpact(
    scenarioType: string,
    inputs: UserProvidedInputs,
    baseImpact: number,
    month: number,
    seasonality: SeasonalityFactors,
    rampUpFactor: number,
    seasonalMultiplier: number
  ): number {
    let impact = baseImpact * rampUpFactor * seasonalMultiplier;

    // Apply scenario-specific seasonal adjustments
    switch (scenarioType) {
      case 'membership':
        // Memberships typically have churn in January and growth in September
        if (month === 0) impact *= 0.7; // January churn
        if (month === 8) impact *= 1.3; // September growth
        break;
      
      case 'hiring':
        // Productivity gains may be lower during holiday months
        if (month === 11 || month === 0) impact *= 0.8;
        break;
      
      case 'marketing':
        // Marketing effectiveness varies by season
        const { conversionRate = 2 } = inputs;
        if (seasonality.seasonalPattern === 'holiday' && (month === 10 || month === 11)) {
          impact *= 1.5; // Higher conversion during holiday season
        }
        break;
      
      case 'salesVolume':
        // Additional capacity constraints during peak seasons
        if (seasonalMultiplier > 1.2) {
          impact *= 0.9; // Capacity constraints reduce effectiveness
        }
        break;
    }

    return Math.round(impact);
  }

  private static generateSeasonalRecommendations(
    scenarioType: string,
    seasonality: SeasonalityFactors,
    monthlyImpacts: number[],
    recommendations: string[],
    riskFactors: string[],
    opportunities: string[]
  ): void {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonthName = monthNames[seasonality.startMonth];
    
    // Find peak and low months
    const maxImpact = Math.max(...monthlyImpacts);
    const minImpact = Math.min(...monthlyImpacts.filter(impact => impact > 0));
    const peakMonth = monthlyImpacts.indexOf(maxImpact);
    const lowMonth = monthlyImpacts.indexOf(minImpact);

    // General timing recommendations
    recommendations.push(`Starting in ${startMonthName} aligns with your business seasonality.`);
    
    if (peakMonth !== -1) {
      recommendations.push(`Peak impact expected in ${monthNames[peakMonth]} ($${maxImpact.toLocaleString()}).`);
    }

    // Scenario-specific recommendations
    switch (scenarioType) {
      case 'membership':
        recommendations.push('Consider launching before your peak season to maximize member acquisition.');
        if (seasonality.startMonth >= 9) {
          opportunities.push('September-November launches typically see higher retention rates.');
        }
        if (seasonality.startMonth === 0) {
          riskFactors.push('January launches face higher churn due to post-holiday budget constraints.');
        }
        break;

      case 'hiring':
        recommendations.push('Allow 2-3 months for full productivity gains from new hires.');
        if (seasonality.startMonth >= 10) {
          riskFactors.push('Holiday season hiring may delay onboarding and training.');
        }
        opportunities.push('Hire before your busy season to have trained staff ready.');
        break;

      case 'pricing':
        if (seasonality.seasonalPattern === 'seasonal') {
          recommendations.push('Implement price changes during off-peak months to minimize customer loss.');
          opportunities.push('Peak season pricing power allows for higher increases.');
        }
        break;

      case 'marketing':
        recommendations.push('Budget more heavily during months with higher conversion rates.');
        if (seasonality.seasonalPattern === 'holiday') {
          opportunities.push('Holiday season marketing typically delivers 2-3x better ROI.');
        }
        break;

      case 'salesVolume':
        if (maxImpact > minImpact * 1.5) {
          riskFactors.push('Capacity constraints during peak months may limit growth.');
          recommendations.push('Consider hiring temporary help during peak months.');
        }
        break;
    }

    // Cash flow considerations
    const cumulativeImpact = monthlyImpacts.reduce((acc, impact, index) => {
      acc.push((acc[index - 1] || 0) + impact);
      return acc;
    }, [] as number[]);

    const negativeMonths = cumulativeImpact.filter(impact => impact < 0).length;
    if (negativeMonths > 3) {
      riskFactors.push('Extended negative cash flow period - ensure adequate reserves.');
    }

    // Seasonal optimization opportunities
    if (seasonality.seasonalPattern !== 'steady') {
      opportunities.push('Adjust strategy based on seasonal patterns for maximum impact.');
      opportunities.push('Plan marketing and operations around your peak months.');
    }
  }

  // Helper method to extract seasonality from user input
  static extractSeasonalityFromInput(userInput: string): SeasonalityFactors {
    const input = userInput.toLowerCase();
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    let startMonth = 0; // Default to January
    let seasonalPattern: 'steady' | 'seasonal' | 'holiday' | 'summer' | 'winter' = 'steady';
    let duration = 12;
    let rampUpMonths = 2;

    // Extract start month
    monthNames.forEach((month, index) => {
      if (input.includes(month)) startMonth = index;
    });
    monthAbbr.forEach((month, index) => {
      if (input.includes(month)) startMonth = index;
    });

    // Detect seasonal patterns
    if (input.includes('holiday') || input.includes('christmas') || input.includes('thanksgiving')) {
      seasonalPattern = 'holiday';
    } else if (input.includes('summer') || input.includes('vacation')) {
      seasonalPattern = 'summer';
    } else if (input.includes('winter') || input.includes('heating') || input.includes('snow')) {
      seasonalPattern = 'winter';
    } else if (input.includes('seasonal') || input.includes('spring') || input.includes('fall')) {
      seasonalPattern = 'seasonal';
    }

    // Extract duration hints
    if (input.includes('remainder of the year') || input.includes('rest of year')) {
      duration = 12 - startMonth;
    } else if (input.includes('quarter')) {
      duration = 3;
    } else if (input.includes('6 month') || input.includes('half year')) {
      duration = 6;
    }

    // Extract ramp-up hints
    if (input.includes('immediately') || input.includes('right away')) {
      rampUpMonths = 0;
    } else if (input.includes('gradually') || input.includes('slowly')) {
      rampUpMonths = 4;
    }

    return {
      startMonth,
      duration,
      seasonalPattern,
      rampUpMonths,
      peakMonths: this.getPeakMonths(seasonalPattern),
      lowMonths: this.getLowMonths(seasonalPattern)
    };
  }

  private static getPeakMonths(pattern: string): number[] {
    switch (pattern) {
      case 'holiday': return [10, 11]; // Nov, Dec
      case 'summer': return [5, 6, 7]; // Jun, Jul, Aug
      case 'winter': return [0, 1, 11]; // Jan, Feb, Dec
      case 'seasonal': return [3, 4, 5]; // Apr, May, Jun
      default: return [];
    }
  }

  private static getLowMonths(pattern: string): number[] {
    switch (pattern) {
      case 'holiday': return [1, 2]; // Feb, Mar
      case 'summer': return [0, 1, 11]; // Jan, Feb, Dec
      case 'winter': return [5, 6, 7]; // Jun, Jul, Aug
      case 'seasonal': return [0, 1, 11]; // Jan, Feb, Dec
      default: return [];
    }
  }
}