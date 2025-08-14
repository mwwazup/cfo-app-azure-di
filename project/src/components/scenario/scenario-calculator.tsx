import { UserProvidedInputs, ScenarioClassification } from './scenario-classifier';
import { EnhancedSeasonalityAnalyzer, SeasonalAnalysis, SeasonalityFactors } from './enhanced-seasonality-analyzer';

export interface CalculationResult {
  oldRevenue: number;
  newRevenue: number;
  profitChange: number;
  monthlyImpact: number;
  annualImpact: number;
  breakEvenMonths?: number;
  roi?: number;
  recommendation: string;
  details: string[];
  seasonalAnalysis?: SeasonalAnalysis;
  monthlyBreakdown?: number[];
}

export class ScenarioCalculator {
  static calculateScenario(
    scenarioType: string,
    inputs: UserProvidedInputs,
    currentMonthlyRevenue: number = 50000,
    classification?: ScenarioClassification
  ): CalculationResult {
    
    // Calculate base scenario
    const baseResult = this.calculateBaseScenario(scenarioType, inputs, currentMonthlyRevenue);
    
    // Add seasonal analysis if seasonality context is provided
    if (classification?.hasSeasonalContext && classification.seasonality) {
      const seasonalAnalysis = EnhancedSeasonalityAnalyzer.analyzeSeasonalImpact(
        scenarioType,
        inputs,
        classification.seasonality,
        currentMonthlyRevenue
      );
      
      // Update the base result with seasonal insights
      baseResult.seasonalAnalysis = seasonalAnalysis;
      baseResult.monthlyBreakdown = seasonalAnalysis.monthlyImpacts;
      baseResult.annualImpact = seasonalAnalysis.totalAnnualImpact;
      baseResult.breakEvenMonths = seasonalAnalysis.breakEvenMonth >= 0 ? seasonalAnalysis.breakEvenMonth + 1 : undefined;
      
      // Enhance recommendation with seasonal insights
      baseResult.recommendation = this.enhanceRecommendationWithSeasonality(
        baseResult.recommendation,
        seasonalAnalysis,
        classification.seasonality
      );
      
      // Add seasonal details
      baseResult.details = [
        ...baseResult.details,
        ...seasonalAnalysis.seasonalRecommendations.slice(0, 2)
      ];
    }
    
    return baseResult;
  }

  private static calculateBaseScenario(
    scenarioType: string,
    inputs: UserProvidedInputs,
    currentMonthlyRevenue: number
  ): CalculationResult {
    switch (scenarioType) {
      case 'pricing':
        return this.calculatePricing(inputs, currentMonthlyRevenue);
      case 'membership':
        return this.calculateMembership(inputs, currentMonthlyRevenue);
      case 'hiring':
        return this.calculateHiring(inputs, currentMonthlyRevenue);
      case 'marketing':
        return this.calculateMarketing(inputs, currentMonthlyRevenue);
      case 'costCutting':
        return this.calculateCostCutting(inputs, currentMonthlyRevenue);
      case 'salesVolume':
        return this.calculateSalesVolume(inputs, currentMonthlyRevenue);
      default:
        return this.getDefaultResult();
    }
  }

  private static enhanceRecommendationWithSeasonality(
    baseRecommendation: string,
    seasonalAnalysis: SeasonalAnalysis,
    seasonality: SeasonalityFactors
  ): string {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
    
    let enhancement = baseRecommendation;
    
    if (seasonalAnalysis.breakEvenMonth >= 0) {
      enhancement += ` With your timing, expect to break even by ${monthNames[seasonalAnalysis.breakEvenMonth]}.`;
    }
    
    if (seasonalAnalysis.riskFactors.length > 0) {
      enhancement += ` Key consideration: ${seasonalAnalysis.riskFactors[0]}`;
    }
    
    if (seasonalAnalysis.opportunities.length > 0) {
      enhancement += ` Opportunity: ${seasonalAnalysis.opportunities[0]}`;
    }
    
    return enhancement;
  }

  private static calculatePricing(inputs: UserProvidedInputs, currentRevenue: number): CalculationResult {
    const { currentPrice = 1000, newPrice = 1100, avgMonthlySales = 10, customerRetention = 95 } = inputs;
    
    const priceIncrease = (newPrice - currentPrice) / currentPrice;
    const retentionFactor = customerRetention / 100;
    
    const oldMonthlyRevenue = currentPrice * avgMonthlySales;
    const newMonthlyRevenue = newPrice * avgMonthlySales * retentionFactor;
    const monthlyImpact = newMonthlyRevenue - oldMonthlyRevenue;
    
    const recommendation = monthlyImpact > 0 
      ? "Smart move! Even with some customer loss, you'll increase revenue."
      : "Consider a smaller price increase or focus on value justification.";

    return {
      oldRevenue: oldMonthlyRevenue * 12,
      newRevenue: newMonthlyRevenue * 12,
      profitChange: (monthlyImpact / oldMonthlyRevenue) * 100,
      monthlyImpact,
      annualImpact: monthlyImpact * 12,
      recommendation,
      details: [
        `Price change: ${(priceIncrease * 100).toFixed(1)}%`,
        `Customer retention: ${customerRetention}%`,
        `Revenue per customer: $${newPrice.toLocaleString()}`
      ]
    };
  }

  private static calculateMembership(inputs: UserProvidedInputs, currentRevenue: number): CalculationResult {
    const { monthlyFee = 99, targetMembers = 100, churnRate = 5, acquisitionCost = 50 } = inputs;
    
    const effectiveMembers = targetMembers * (1 - churnRate / 100);
    const monthlyMembershipRevenue = monthlyFee * effectiveMembers;
    const acquisitionCosts = targetMembers * acquisitionCost;
    const netMonthlyImpact = monthlyMembershipRevenue - (acquisitionCosts / 12);
    
    const breakEvenMembers = Math.ceil(currentRevenue / (monthlyFee * 12));
    
    const recommendation = monthlyMembershipRevenue > currentRevenue * 0.3
      ? "Membership model could significantly boost recurring revenue!"
      : "Consider higher pricing or more members to make meaningful impact.";

    return {
      oldRevenue: currentRevenue * 12,
      newRevenue: (currentRevenue + monthlyMembershipRevenue) * 12,
      profitChange: (netMonthlyImpact / currentRevenue) * 100,
      monthlyImpact: netMonthlyImpact,
      annualImpact: netMonthlyImpact * 12,
      breakEvenMonths: Math.ceil(acquisitionCosts / monthlyMembershipRevenue),
      recommendation,
      details: [
        `Monthly recurring revenue: $${monthlyMembershipRevenue.toLocaleString()}`,
        `Effective members (after churn): ${Math.round(effectiveMembers)}`,
        `Break-even members needed: ${breakEvenMembers}`
      ]
    };
  }

  private static calculateHiring(inputs: UserProvidedInputs, currentRevenue: number): CalculationResult {
    const { hourlyRate = 20, hoursPerWeek = 20, productivityIncrease = 30, onboardingCost = 2000 } = inputs;
    
    const monthlyCost = hourlyRate * hoursPerWeek * 4.33;
    const annualCost = monthlyCost * 12 + onboardingCost;
    const productivityBoost = currentRevenue * (productivityIncrease / 100);
    const netMonthlyImpact = productivityBoost - monthlyCost;
    
    const breakEvenMonths = Math.ceil((onboardingCost + monthlyCost) / productivityBoost);
    
    const recommendation = netMonthlyImpact > 0
      ? "This hire should pay for itself through increased productivity!"
      : "Consider part-time or focus on higher-impact productivity gains.";

    return {
      oldRevenue: currentRevenue * 12,
      newRevenue: (currentRevenue + productivityBoost) * 12,
      profitChange: (netMonthlyImpact / currentRevenue) * 100,
      monthlyImpact: netMonthlyImpact,
      annualImpact: netMonthlyImpact * 12,
      breakEvenMonths,
      recommendation,
      details: [
        `Monthly cost: $${monthlyCost.toLocaleString()}`,
        `Annual cost (including onboarding): $${annualCost.toLocaleString()}`,
        `Expected productivity boost: ${productivityIncrease}%`
      ]
    };
  }

  private static calculateMarketing(inputs: UserProvidedInputs, currentRevenue: number): CalculationResult {
    const { monthlySpend = 500, expectedROI = 300, conversionRate = 2, customerLifetimeValue = 15000 } = inputs;
    
    const monthlyReturn = monthlySpend * (expectedROI / 100);
    const netMonthlyImpact = monthlyReturn - monthlySpend;
    const requiredROI = (monthlySpend / currentRevenue) * 100;
    
    const recommendation = expectedROI > requiredROI * 2
      ? "Strong ROI potential! This marketing investment looks promising."
      : "Consider testing with smaller budget or improving conversion rates first.";

    return {
      oldRevenue: currentRevenue * 12,
      newRevenue: (currentRevenue + monthlyReturn) * 12,
      profitChange: (netMonthlyImpact / currentRevenue) * 100,
      monthlyImpact: netMonthlyImpact,
      annualImpact: netMonthlyImpact * 12,
      roi: expectedROI,
      recommendation,
      details: [
        `Monthly ad spend: $${monthlySpend.toLocaleString()}`,
        `Expected monthly return: $${monthlyReturn.toLocaleString()}`,
        `Required ROI for break-even: ${requiredROI.toFixed(1)}%`
      ]
    };
  }

  private static calculateCostCutting(inputs: UserProvidedInputs, currentRevenue: number): CalculationResult {
    const { currentCost = 200, proposedSavings = 150, impactOnRevenue = 0, implementationCost = 0 } = inputs;
    
    const revenueImpact = currentRevenue * (impactOnRevenue / 100);
    const netMonthlySavings = proposedSavings - revenueImpact;
    const netAnnualSavings = netMonthlySavings * 12 - implementationCost;
    
    const paybackMonths = implementationCost > 0 ? Math.ceil(implementationCost / netMonthlySavings) : 0;
    
    const recommendation = netMonthlySavings > 0
      ? "Cost cutting will improve your profit margins!"
      : "Consider the revenue impact - this might not be worth the savings.";

    return {
      oldRevenue: currentRevenue * 12,
      newRevenue: (currentRevenue - revenueImpact) * 12,
      profitChange: (netMonthlySavings / currentRevenue) * 100,
      monthlyImpact: netMonthlySavings,
      annualImpact: netAnnualSavings,
      breakEvenMonths: paybackMonths,
      recommendation,
      details: [
        `Monthly savings: $${proposedSavings.toLocaleString()}`,
        `Revenue impact: ${impactOnRevenue}% ($${revenueImpact.toLocaleString()}/month)`,
        `Net monthly benefit: $${netMonthlySavings.toLocaleString()}`
      ]
    };
  }

  private static calculateSalesVolume(inputs: UserProvidedInputs, currentRevenue: number): CalculationResult {
    const { currentJobsPerMonth = 8, additionalJobs = 3, avgJobValue = 2500, timeConstraint = 80 } = inputs;
    
    const additionalRevenue = additionalJobs * avgJobValue;
    const timeConstraintFactor = Math.min(1, timeConstraint / 100);
    const realizedAdditionalRevenue = additionalRevenue * timeConstraintFactor;
    
    const capacityUtilization = ((currentJobsPerMonth + additionalJobs) / (currentJobsPerMonth / (timeConstraint / 100))) * 100;
    
    const recommendation = capacityUtilization < 100
      ? "You have capacity for these additional jobs!"
      : "Consider hiring help or raising prices due to capacity constraints.";

    return {
      oldRevenue: currentRevenue * 12,
      newRevenue: (currentRevenue + realizedAdditionalRevenue) * 12,
      profitChange: (realizedAdditionalRevenue / currentRevenue) * 100,
      monthlyImpact: realizedAdditionalRevenue,
      annualImpact: realizedAdditionalRevenue * 12,
      recommendation,
      details: [
        `Additional jobs: ${additionalJobs}/month`,
        `Revenue per job: $${avgJobValue.toLocaleString()}`,
        `Capacity utilization: ${capacityUtilization.toFixed(1)}%`
      ]
    };
  }

  private static getDefaultResult(): CalculationResult {
    return {
      oldRevenue: 0,
      newRevenue: 0,
      profitChange: 0,
      monthlyImpact: 0,
      annualImpact: 0,
      recommendation: "Please provide more information to calculate the impact.",
      details: []
    };
  }
}