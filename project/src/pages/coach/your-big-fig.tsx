import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useRevenue } from '../../contexts/revenue-context';
import { useCoachingHistory } from '../../hooks/useCoachingHistory';
import { RevenueWaveAnimation } from '../../components/animations/RevenueWaveAnimation';
import { ScenarioClassifier, ScenarioClassification, UserProvidedInputs } from '../../components/scenario/scenario-classifier';
import { ScenarioInputBuilder, getAllFieldsForScenario, getMissingFieldsForScenario } from '../../components/scenario/scenario-input-builder';
import { ScenarioCalculator, CalculationResult } from '../../components/scenario/scenario-calculator';
import { ScenarioImpactChart } from '../../components/RevenueChart/ScenarioImpactChart';
import { RiderAvatar } from '../../components/coach/RiderAvatar';
import { RiderResponseCard } from '../../components/coach/RiderResponseCard';
import { DynamicScenarioFlow } from '../../components/scenario/dynamic-scenario-flow';
import { useRevenueScenarios } from '../../hooks/useRevenueScenarios';
import { CoachingMoment, CreateCoachingMomentData } from '../../models/CoachingMoment';
import { 
  Heart, 
  Target, 
  Lightbulb, 
  TrendingUp, 
  MessageCircle, 
  Save, 
  Calendar,
  DollarSign,
  ArrowRight,
  Sparkles,
  Trophy,
  Zap,
  AlertCircle,
  CheckCircle,
  Settings,
  BarChart3,
  Brain,
  Activity,
  Clock,
  TrendingDown,
  Send,
  Bot,
  User,
  Trash2,
  RefreshCw,
  Loader2
} from 'lucide-react';

export function YourBigFigPage() {
  const { currentYear } = useRevenue();
  const { 
    coachingHistory, 
    loading: historyLoading, 
    error: historyError, 
    addCoachingMoment, 
    deleteCoachingMoment,
    refreshHistory 
  } = useCoachingHistory();
  const {
    scenarios,
    currentReport,
    loading: scenariosLoading,
    error: scenariosError,
    refreshData: refreshScenarios
  } = useRevenueScenarios();
  
  const [activeTab, setActiveTab] = useState<'coach' | 'scenarios' | 'history'>('coach');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate current month revenue for context
  const currentMonth = new Date().getMonth();
  const currentMonthRevenue = currentYear.data[currentMonth]?.revenue || 0;
  const totalRevenue = currentYear.data.reduce((sum, item) => sum + item.revenue, 0);
  const averageMonthly = Math.round(totalRevenue / 12);

  const handleQuickQuestion = async (question: string) => {
    if (!question.trim()) return;

    setIsProcessing(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate a RIDR response based on the question
    const ridrResponse = generateRIDRResponse(question);
    
    const momentData: CreateCoachingMomentData = {
      question,
      response: `Based on your current revenue of $${averageMonthly.toLocaleString()}/month, here's my analysis using the RIDR framework.`,
      title: `Quick Coaching: ${question.slice(0, 50)}${question.length > 50 ? '...' : ''}`,
      response_type: 'quick_ridr',
      ridr_response: ridrResponse
    };

    const result = await addCoachingMoment(momentData);
    
    if (!result.success) {
      console.error('Failed to save coaching moment:', result.error);
      // You could show a toast notification here
    }

    setCurrentQuestion('');
    setIsProcessing(false);
  };

  const generateRIDRResponse = (question: string): CreateCoachingMomentData['ridr_response'] => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('price') || lowerQuestion.includes('pricing')) {
      return {
        results: `Your current average monthly revenue is $${averageMonthly.toLocaleString()}. Price changes directly impact your bottom line and customer retention.`,
        insight: "Pricing is both an art and a science. Small increases (5-10%) typically have minimal customer loss but significant profit impact.",
        direction: "Test price increases with new customers first. Monitor customer feedback and retention rates closely.",
        repeat: "Review pricing quarterly. Track customer acquisition cost vs. lifetime value to optimize your pricing strategy."
      };
    }
    
    if (lowerQuestion.includes('hire') || lowerQuestion.includes('staff') || lowerQuestion.includes('employee')) {
      return {
        results: `With $${averageMonthly.toLocaleString()}/month revenue, you need to ensure new hires generate more value than they cost.`,
        insight: "The best time to hire is when you're consistently turning away work or working excessive hours yourself.",
        direction: "Calculate the revenue potential of additional capacity. Hire when the math clearly supports it, not just when you're busy.",
        repeat: "Review staffing needs monthly. Track revenue per employee and adjust team size based on sustainable workload."
      };
    }
    
    if (lowerQuestion.includes('market') || lowerQuestion.includes('advertis') || lowerQuestion.includes('lead')) {
      return {
        results: `Your current revenue suggests you have some marketing foundation. Focus on what's already working before trying new channels.`,
        insight: "Most successful businesses get 80% of their leads from 2-3 sources. Identify and double down on your best channels.",
        direction: "Track your cost per lead and conversion rates. Invest more in channels with the best ROI, not just the newest trends.",
        repeat: "Review marketing performance monthly. Test one new channel at a time while maintaining your proven lead sources."
      };
    }

    // Default response
    return {
      results: `Based on your current performance of $${averageMonthly.toLocaleString()}/month, you're in a position to make strategic decisions.`,
      insight: "Every business decision should be viewed through the lens of long-term sustainability and growth, not just immediate results.",
      direction: "Focus on the fundamentals: consistent revenue, controlled expenses, and systems that work without you.",
      repeat: "Regular review and adjustment is key. What got you here won't necessarily get you to the next level."
    };
  };

  const handleScenarioComplete = async (scenarioType: string, inputs: UserProvidedInputs, result: CalculationResult) => {
    const momentData: CreateCoachingMomentData = {
      question: `Scenario Analysis: ${scenarioType}`,
      response: result.recommendation,
      impact: result,
      title: `${scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)} Analysis`,
      scenario_type: scenarioType,
      response_type: 'detailed_calculation'
    };

    const saveResult = await addCoachingMoment(momentData);
    
    if (!saveResult.success) {
      console.error('Failed to save scenario result:', saveResult.error);
      // You could show a toast notification here
    }
  };

  const handleDeleteMoment = async (momentId: string) => {
    if (window.confirm('Are you sure you want to delete this coaching moment?')) {
      await deleteCoachingMoment(momentId);
    }
  };

  const quickQuestions = [
    "Should I raise my prices?",
    "When should I hire someone?",
    "How much should I spend on marketing?",
    "What's my biggest opportunity for growth?",
    "How do I increase my profit margin?"
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
            <Heart className="h-6 w-6 text-background" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Your Big FIG</h1>
        </div>
        <p className="text-xl text-muted max-w-3xl mx-auto">
          Your AI-powered CFO coach that understands your business. Ask questions, run scenarios, 
          and get personalized guidance using the RIDR framework.
        </p>
      </div>

      {/* Current Business Context */}
      <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                ${averageMonthly.toLocaleString()}
              </div>
              <div className="text-sm text-muted">Avg Monthly Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                ${Math.round(totalRevenue).toLocaleString()}
              </div>
              <div className="text-sm text-muted">YTD Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {currentYear.profitMargin}%
              </div>
              <div className="text-sm text-muted">Target Profit Margin</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                ${Math.round(currentYear.targetRevenue).toLocaleString()}
              </div>
              <div className="text-sm text-muted">Annual Target</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {historyError && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-5 w-5" />
              <span>Error loading coaching history: {historyError}</span>
              <Button variant="ghost" size="sm" onClick={refreshHistory}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenarios Error Display */}
      {scenariosError && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-5 w-5" />
              <span>Error loading scenarios: {scenariosError}</span>
              <Button variant="ghost" size="sm" onClick={refreshScenarios}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-1 bg-gray-800 rounded-lg p-1">
            {[
              { id: 'coach', label: 'AI Coach Chat', icon: MessageCircle },
              { id: 'scenarios', label: `Scenario Analysis (${scenarios.length})`, icon: BarChart3 },
              { id: 'history', label: `Coaching History (${coachingHistory.length})`, icon: Clock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent text-background shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Tab Content */}
      {activeTab === 'coach' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted text-sm">
                Get instant RIDR framework analysis for common business questions:
              </p>
              
              <div className="space-y-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleQuickQuestion(question)}
                    disabled={isProcessing}
                    className="w-full text-left justify-start h-auto py-3 px-4"
                  >
                    <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{question}</span>
                  </Button>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask your own question..."
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleQuickQuestion(currentQuestion)}
                    disabled={isProcessing}
                  />
                  <Button 
                    onClick={() => handleQuickQuestion(currentQuestion)}
                    disabled={!currentQuestion.trim() || isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Wave Animation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Revenue Wave Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueWaveAnimation height={200} />
              <div className="mt-4 text-center">
                <p className="text-sm text-muted">
                  Your revenue patterns help inform AI coaching recommendations
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          {/* Current Revenue Report Info */}
          {currentReport && (
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Current Revenue Baseline</h3>
                    <p className="text-sm text-muted">
                      Scenarios will be compared against your current revenue data
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent">
                      ${currentReport.total_revenue?.toLocaleString() || 'N/A'}
                    </div>
                    <div className="text-sm text-muted">Total Revenue</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DynamicScenarioFlow 
            onScenarioComplete={handleScenarioComplete}
            currentMonthlyRevenue={averageMonthly}
          />

          {/* Scenario History */}
          {scenarios.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Scenarios ({scenarios.length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={refreshScenarios}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scenarios.slice(0, 5).map((scenario) => (
                    <div key={scenario.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-2">
                            {scenario.question_text || 'Scenario Analysis'}
                          </h4>
                          <p className="text-sm text-muted mb-2">
                            {scenario.generated_answer}
                          </p>
                          {scenario.delta_payload && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {scenario.delta_payload.monthly_impact && (
                                <div>
                                  <span className="text-muted">Monthly Impact:</span>
                                  <div className={`font-medium ${scenario.delta_payload.monthly_impact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${Math.abs(scenario.delta_payload.monthly_impact).toLocaleString()}
                                  </div>
                                </div>
                              )}
                              {scenario.delta_payload.annual_impact && (
                                <div>
                                  <span className="text-muted">Annual Impact:</span>
                                  <div className={`font-medium ${scenario.delta_payload.annual_impact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${Math.abs(scenario.delta_payload.annual_impact).toLocaleString()}
                                  </div>
                                </div>
                              )}
                              {scenario.delta_payload.profit_change && (
                                <div>
                                  <span className="text-muted">Profit Change:</span>
                                  <div className={`font-medium ${scenario.delta_payload.profit_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {scenario.delta_payload.profit_change >= 0 ? '+' : ''}{scenario.delta_payload.profit_change.toFixed(1)}%
                                  </div>
                                </div>
                              )}
                              {scenario.delta_payload.break_even_months && (
                                <div>
                                  <span className="text-muted">Break Even:</span>
                                  <div className="font-medium text-foreground">
                                    {scenario.delta_payload.break_even_months} months
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(scenario.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {scenarios.length > 5 && (
                    <div className="text-center">
                      <Button variant="outline" size="sm">
                        View All {scenarios.length} Scenarios
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {historyLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
                  <p className="text-muted">Loading your coaching history...</p>
                </div>
              </CardContent>
            </Card>
          ) : coachingHistory.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Coaching History Yet
                  </h3>
                  <p className="text-muted">
                    Start asking questions or running scenarios to build your coaching history.
                  </p>
                  <Button 
                    onClick={() => setActiveTab('coach')} 
                    className="mt-4"
                  >
                    Start Coaching Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">
                  Your Coaching History ({coachingHistory.length} sessions)
                </h3>
                <Button variant="outline" size="sm" onClick={refreshHistory}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {coachingHistory.map((moment) => (
                <Card key={moment.id} className="border-l-4 border-l-accent">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{moment.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <Calendar className="h-4 w-4" />
                          {new Date(moment.date).toLocaleDateString()}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMoment(moment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-accent" />
                        <span className="font-medium text-foreground">Your Question:</span>
                      </div>
                      <p className="text-muted">{moment.question}</p>
                    </div>

                    {moment.ridr_response && (
                      <RiderResponseCard
                        results={moment.ridr_response.results}
                        insight={moment.ridr_response.insight}
                        direction={moment.ridr_response.direction}
                        repeat={moment.ridr_response.repeat}
                      />
                    )}

                    {moment.impact && (
                      <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                        <h4 className="font-medium text-foreground mb-2">Financial Impact:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted">Monthly Impact</div>
                            <div className={`font-bold ${moment.impact.monthlyImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${Math.abs(moment.impact.monthlyImpact).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted">Annual Impact</div>
                            <div className={`font-bold ${moment.impact.annualImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${Math.abs(moment.impact.annualImpact).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted">Profit Change</div>
                            <div className={`font-bold ${moment.impact.profitChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {moment.impact.profitChange >= 0 ? '+' : ''}{moment.impact.profitChange.toFixed(1)}%
                            </div>
                          </div>
                          {moment.impact.breakEvenMonths && (
                            <div>
                              <div className="text-muted">Break Even</div>
                              <div className="font-bold text-foreground">
                                {moment.impact.breakEvenMonths} months
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <Card className="bg-gradient-to-r from-accent/20 to-accent/10 border-accent/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6 text-accent" />
              <h3 className="text-xl font-bold text-foreground">Ready to Grow Your Business?</h3>
            </div>
            <p className="text-muted max-w-2xl mx-auto">
              Your Big FIG coach is here to help you make data-driven decisions. 
              Ask questions, run scenarios, and build momentum toward your goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => setActiveTab('coach')} className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Start Coaching Session
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('scenarios')} className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Run Scenario Analysis
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}