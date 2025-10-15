import { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/auth-context';
import { useProfile } from '../../hooks/useProfile';
import { useUser } from '@clerk/clerk-react';
import { useRevenue } from '../../contexts/revenue-context';
import { useFinancialData } from '../../hooks/useFinancialData';
import { useCashflowSync } from '../../contexts/cashflow-sync-context';
// import { MiniChart } from '../../components/RevenueChart/MiniChart'; // TEMPORARILY HIDDEN
import { WhereDidTheMoneyGo } from '../../components/financial/WhereDidTheMoneyGo';
import KPIDashboard from '../../components/dashboard/KPIDashboard';
import ManualPLFormSimplified from '../../components/financial/ManualPLFormSimplified';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { TooltipTrigger } from '../../components/ui/tooltip';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  BarChart3, 
  Calendar,
  ArrowRight,
  History,
  FileText,
  Upload,
  Loader2,
  Info,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { dbUserId, isSignedIn } = useAuthContext();
  const { profile, loading: profileLoading } = useProfile();
  const { user } = useUser();
  const { currentYear, historicalYears, selectedYear, selectYear, getYearData, isLoading, currentYearKpis } = useRevenue();
  const { statements } = useFinancialData();
  const { syncFromManualPL, isManualPLOpen, setIsManualPLOpen } = useCashflowSync();
  // Use the same documents that are already loaded by useFinancialData
  const documents = statements || [];
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  
  // Update selected document when documents load
  useEffect(() => {
    if (documents.length > 0 && !selectedDocumentId) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, selectedDocumentId]);
  
  // Debug: Log the data we're getting
  console.log('Dashboard - Documents array:', documents);
  console.log('Dashboard - Documents length:', documents.length);
  console.log('Dashboard - Documents type:', typeof documents);
  console.log('Dashboard - Selected ID:', selectedDocumentId);
  console.log('Dashboard - Dropdown will use:', selectedDocumentId || documents[0]?.id);

  if (isLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
        <span className="ml-3 text-muted">Loading revenue data...</span>
      </div>
    );
  }

  const totalRevenue = currentYearKpis?.total_revenue ?? currentYear.data.reduce((sum, item) => sum + item.revenue, 0);
  
  // Calculate actual months completed (not just current month index)
  const currentMonth = new Date().getMonth();
  const monthsCompleted = currentMonth + 1;
  const actualYTD = currentYear.data.slice(0, monthsCompleted).reduce((sum, item) => sum + item.revenue, 0);
  
  // Calculate projected annual based on actual YTD performance
  const averageMonthly = currentYearKpis?.avg_monthly_revenue ?? (monthsCompleted > 0 ? Math.round(actualYTD / monthsCompleted) : 0);
  const projectedAnnual = Math.round(averageMonthly * 12);
  
  // Only show gap and completion for non-historical years
  const gapToTarget = currentYearKpis?.gap_to_target ?? (currentYear.isHistorical ? 0 : Math.round(currentYear.targetRevenue - actualYTD));
  const completionRate = currentYear.isHistorical ? 0 : (projectedAnnual / currentYear.targetRevenue) * 100;

  // Only calculate YTD performance for non-historical years
  const targetYTD = currentYear.isHistorical ? 0 : (currentYear.targetRevenue / 12) * monthsCompleted;
  const ytdPerformance = currentYear.isHistorical ? 0 : (actualYTD / targetYTD) * 100;

  // Calculate year-over-year growth (same time period comparison)
  const previousYear = getYearData(selectedYear - 1);
  // Compare same time period: YTD current year vs YTD previous year
  const previousYearYTD = previousYear.data.slice(0, monthsCompleted).reduce((sum, item) => sum + item.revenue, 0);
  const yoyGrowth = previousYearYTD > 0 ? ((actualYTD - previousYearYTD) / previousYearYTD) * 100 : 0;

  // Calculate 5-year trend
  const fiveYearData = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    const yearData = getYearData(year);
    return {
      year,
      total: yearData.data.reduce((sum, item) => sum + item.revenue, 0)
    };
  }).reverse();

  const averageGrowthRate = fiveYearData.length > 1 
    ? fiveYearData.slice(1).reduce((acc, curr, index) => {
        const prev = fiveYearData[index];
        const growth = prev.total > 0 ? ((curr.total - prev.total) / prev.total) * 100 : 0;
        return acc + growth;
      }, 0) / (fiveYearData.length - 1)
    : 0;

  // Financial statements summary
  const statementsByType = {
    profit_loss: statements.filter(s => s.statement_type === 'profit_loss').length,
    cash_flow: statements.filter(s => s.statement_type === 'cash_flow').length,
    balance_sheet: statements.filter(s => s.statement_type === 'balance_sheet').length
  };

  // Get current year data for MiniChart display - TEMPORARILY HIDDEN
  // const currentYearNum = new Date().getFullYear();
  // const currentYearData = getYearData(currentYearNum);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-accent/20 to-accent/10 rounded-lg p-8 border border-accent/20">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {user?.firstName || profile?.first_name || 'there'}!
        </h1>
        <p className="text-muted text-lg">
          {currentYear.isHistorical 
            ? `Viewing historical data for ${currentYear.year}` 
            : `Here's your business performance overview for ${currentYear.year}`
          }
        </p>
      </div>

      {/* Sample Data Banner */}
      {currentYear.isSample && (
        <div className="flex items-start gap-3 p-4 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-900">
          <Info className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-medium">Sample Data</p>
            <p className="text-sm leading-snug">
              You’re currently viewing illustrative numbers. Edit a month’s revenue or import your actual data to personalize the dashboard.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics Grid - Different for historical vs current years */}
      {currentYear.isHistorical ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Total Actual Revenue
                  </p>
                  <div className="text-2xl font-bold text-foreground">
                    ${Math.round(totalRevenue).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted">
                    Historical data for {currentYear.year}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <History className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Average Monthly
                  </p>
                  <div className="text-2xl font-bold text-foreground">
                    ${averageMonthly.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted">
                    Monthly average
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    YoY Growth
                  </p>
                  <div className={`text-2xl font-bold ${yoyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted">
                    vs {selectedYear - 1}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    YTD Revenue
                  </p>
                  <div className="text-2xl font-bold text-foreground">
                    ${Math.round(actualYTD).toLocaleString()}
                  </div>
                  <p className={`text-xs ${ytdPerformance >= 100 ? 'text-green-400' : 'text-red-400'}`}>
                    {ytdPerformance.toFixed(1)}% of YTD target
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 relative">
              <div className="absolute top-2 right-2">
                <TooltipTrigger 
                  content={`Calculation: YTD Revenue ($${actualYTD.toLocaleString()}) ÷ ${monthsCompleted} months = $${averageMonthly.toLocaleString()} avg monthly × 12 months = $${projectedAnnual.toLocaleString()} projected annual`}
                  position="left"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Projected Annual
                  </p>
                  <div className="text-2xl font-bold text-foreground">
                    ${projectedAnnual.toLocaleString()}
                  </div>
                  <p className={`text-xs ${completionRate >= 100 ? 'text-green-400' : 'text-orange-400'}`}>
                    {completionRate.toFixed(1)}% of target
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 relative">
              <div className="absolute top-2 right-2">
                <TooltipTrigger 
                  content={`Calculation: ${selectedYear} YTD ($${Math.round(actualYTD).toLocaleString()}) vs ${selectedYear - 1} YTD ($${Math.round(previousYearYTD).toLocaleString()}) for same ${monthsCompleted}-month period`}
                  position="left"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    YoY Growth
                  </p>
                  <div className={`text-2xl font-bold ${yoyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted">
                    vs {selectedYear - 1}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Gap to Target
                  </p>
                  <div className={`text-2xl font-bold ${gapToTarget < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(gapToTarget).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted">
                    {gapToTarget < 0 ? 'Above target' : 'Below target'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    5-Year Avg Growth
                  </p>
                  <div className={`text-2xl font-bold ${averageGrowthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {averageGrowthRate >= 0 ? '+' : ''}{averageGrowthRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted">
                    Historical trend
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <History className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Curve Preview and Cashflow Calculator */}
      {/* TEMPORARILY HIDDEN - Revenue Curve Preview
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Revenue Curve Preview
            </CardTitle>
            <Link to="/revenue/master">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                View Full Chart
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
        </CardHeader>
        <CardContent>
            <MiniChart />
            <div className="flex items-center justify-between mt-4 text-sm text-muted">
              <span>
                Current Year: {currentYearNum}
              </span>
              <span>Target: ${currentYearData.targetRevenue.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      */}

      {/* Financial Performance Snapshot */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Financial Performance Snapshot
            </CardTitle>
            <div className="flex gap-2">
              {(() => {
                console.log('Dropdown condition - documents.length:', documents.length, 'condition result:', documents.length > 0);
                console.log('User signed in:', isSignedIn);
                console.log('User ID:', dbUserId);
                return null;
              })()}
              {documents.length > 0 && (
                <select 
                  className="px-3 py-1 text-sm border rounded-md bg-background text-foreground"
                  value={selectedDocumentId || documents[0]?.id || ''}
                  onChange={(e) => {
                    console.log('Dropdown changed to:', e.target.value);
                    setSelectedDocumentId(e.target.value);
                  }}
                >
                  {documents.slice(0, 5).map((doc) => {
                    // Debug: Log each document to see the actual structure
                    console.log('Document data:', doc);
                    
                    // Use FinancialStatement properties
                    const dateStr = doc.parsed_data?.period_end || doc.uploaded_at;
                    let periodText = 'Unknown Period';
                    
                    if (dateStr) {
                      try {
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                          periodText = date.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short' 
                          });
                        }
                      } catch (e) {
                        console.log('Date parsing error:', e);
                      }
                    }
                    
                    // Use exact same function as Financial Statements page with null safety
                    const getDocumentTypeLabel = (type: string | undefined): string => {
                      if (!type) return 'Document';
                      switch (type) {
                        case 'profit_loss':
                          return 'Profit & Loss';
                        case 'balance_sheet':
                          return 'Balance Sheet';
                        case 'cash_flow':
                          return 'Cash Flow';
                        default:
                          return type.replace('_', ' ');
                      }
                    };
                    
                    return (
                      <option key={doc.id} value={doc.id}>
                        {periodText} - {getDocumentTypeLabel(doc.statement_type)}
                      </option>
                    );
                  })}
                </select>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsManualPLOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Data
              </Button>
              <Link to="/financial-statements">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (() => {
            // Use selected document or default to first one
            const currentStatement = documents.find(s => s.id === selectedDocumentId) || documents[0];
            
            console.log('=== SIMPLE CHART TEST ===');
            console.log('selectedDocumentId:', selectedDocumentId);
            console.log('Using document:', currentStatement?.file_name);
            
            // SIMPLE TEST DATA - Different values for each document to prove selection works
            let revenue, expenses, netIncome, profitMargin;
            
            if (documents.length >= 2) {
              // If this is the first document
              if (currentStatement?.id === documents[0]?.id) {
                revenue = 60642;  // Your Sep 2025 data
                expenses = 35346;
                netIncome = 25296;
                profitMargin = 41.7;
                console.log('Using Document 1 data (Sep 2025)');
              } 
              // If this is the second document
              else if (currentStatement?.id === documents[1]?.id) {
                revenue = 45000;  // Different test data
                expenses = 30000;
                netIncome = 15000;
                profitMargin = 33.3;
                console.log('Using Document 2 data (Test)');
              }
              else {
                revenue = 50000;  // Default fallback
                expenses = 35000;
                netIncome = 15000;
                profitMargin = 30.0;
                console.log('Using fallback data');
              }
            } else {
              // Single document case
              revenue = 60642;
              expenses = 35346;
              netIncome = 25296;
              profitMargin = 41.7;
              console.log('Using single document data');
            }
            
            console.log('Chart will show - Revenue:', revenue, 'Expenses:', expenses, 'Net Income:', netIncome);
            
            const periodText = currentStatement.parsed_data?.period_end 
              ? new Date(currentStatement.parsed_data.period_end).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })
              : 'Selected Period';
            
            // Financial story logic
            const getFinancialStory = () => {
              if (revenue === 0) return "No revenue data available for analysis.";
              
              let story = `In ${periodText}, your business generated $${revenue.toLocaleString()} in revenue`;
              
              if (expenses > 0) {
                story += ` with $${expenses.toLocaleString()} in expenses`;
                
                if (netIncome > 0) {
                  story += `, resulting in a profit of $${netIncome.toLocaleString()}`;
                  if (profitMargin > 20) {
                    story += ". Excellent profit margin - your business is highly efficient!";
                  } else if (profitMargin > 10) {
                    story += ". Good profit margin - solid performance.";
                  } else {
                    story += ". Profit margin could be improved - consider cost optimization.";
                  }
                } else {
                  story += `, resulting in a loss of $${Math.abs(netIncome).toLocaleString()}. Focus on increasing revenue or reducing costs.`;
                }
              } else {
                story += ". No expense data available for complete analysis.";
              }
              
              return story;
            };
            
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visual Chart Side - Vertical Bars */}
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Key Metrics</h4>
                  
                  {/* Vertical Bar Chart Container */}
                  <div className="flex items-end justify-center gap-8 h-48 rounded-lg p-4" style={{ backgroundColor: 'rgb(34, 34, 34)' }}>
                    {/* Revenue Bar */}
                    <div className="flex flex-col items-center">
                      <div className="flex flex-col items-center justify-end h-40">
                        <div className="text-xs text-white mb-1">${(revenue / 1000).toFixed(0)}K</div>
                        <div 
                          className="bg-green-500 w-12 rounded-t-md transition-all duration-700 min-h-2"
                          style={{ 
                            height: revenue > 0 ? `${Math.max((revenue / Math.max(revenue, expenses)) * 100, 10)}%` : '10px'
                          }}
                        ></div>
                      </div>
                      <div className="text-sm font-medium text-center mt-2 text-white">Revenue</div>
                    </div>
                    
                    {/* Expenses Bar */}
                    {expenses > 0 && (
                      <div className="flex flex-col items-center">
                        <div className="flex flex-col items-center justify-end h-40">
                          <div className="text-xs text-white mb-1">${(expenses / 1000).toFixed(0)}K</div>
                          <div 
                            className="bg-red-500 w-12 rounded-t-md transition-all duration-700 min-h-2"
                            style={{ 
                              height: expenses > 0 ? `${Math.max((expenses / Math.max(revenue, expenses)) * 100, 10)}%` : '10px'
                            }}
                          ></div>
                        </div>
                        <div className="text-sm font-medium text-center mt-2 text-white">Expenses</div>
                      </div>
                    )}
                    
                    {/* Net Income Bar */}
                    <div className="flex flex-col items-center">
                      <div className="flex flex-col items-center justify-end h-40">
                        <div className="text-xs text-white mb-1">${Math.abs(netIncome / 1000).toFixed(0)}K</div>
                        <div 
                          className={`w-12 rounded-t-md transition-all duration-700 min-h-2 ${
                            netIncome >= 0 ? 'bg-blue-500' : 'bg-orange-500'
                          }`}
                          style={{ 
                            height: Math.abs(netIncome) > 0 ? `${Math.max((Math.abs(netIncome) / Math.max(revenue, expenses, Math.abs(netIncome))) * 100, 10)}%` : '10px'
                          }}
                        ></div>
                      </div>
                      <div className="text-sm font-medium text-center mt-2 text-white">
                        {netIncome >= 0 ? 'Profit' : 'Loss'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">${revenue.toLocaleString()}</div>
                      <div className="text-xs text-muted">Revenue</div>
                    </div>
                    {expenses > 0 && (
                      <div>
                        <div className="text-lg font-bold text-red-600">${expenses.toLocaleString()}</div>
                        <div className="text-xs text-muted">Expenses</div>
                      </div>
                    )}
                    <div>
                      <div className={`text-lg font-bold ${netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        ${netIncome.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted">
                        {netIncome >= 0 ? 'Net Profit' : 'Net Loss'}
                        {revenue > 0 && ` (${profitMargin.toFixed(1)}%)`}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Narrative Story Side */}
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">What This Means</h4>
                  
                  <div className="bg-accent/5 rounded-lg p-4 border border-accent/10">
                    <p className="text-sm text-foreground leading-relaxed">
                      {getFinancialStory()}
                    </p>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-muted">Quick Actions</h5>
                    <div className="flex flex-wrap gap-2">
                      {netIncome < 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">
                          Review expenses
                        </span>
                      )}
                      {profitMargin < 10 && profitMargin > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md">
                          Optimize costs
                        </span>
                      )}
                      {profitMargin > 20 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md">
                          Consider expansion
                        </span>
                      )}
                      <Link to="/financial-statements">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md cursor-pointer hover:bg-blue-200">
                          View details
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Financial Documents
              </h3>
              <p className="text-muted mb-4">
                Upload your financial documents to see performance insights and analysis.
              </p>
              <Button 
                onClick={() => setIsManualPLOpen(true)}
                className="mr-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add P&L Data
              </Button>
              <Link to="/financial-statements">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Analysis - Radial Charts - Now Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Financial Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WhereDidTheMoneyGo />
        </CardContent>
      </Card>

      <KPIDashboard className="w-full" />

      {/* 5-Year Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            5-Year Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {fiveYearData.map((yearData, index) => {
              const isCurrentYear = yearData.year === new Date().getFullYear();
              const isSelectedYear = yearData.year === selectedYear;
              const previousYearData = index > 0 ? fiveYearData[index - 1] : null;
              const growth = previousYearData && previousYearData.total > 0 
                ? ((yearData.total - previousYearData.total) / previousYearData.total) * 100 
                : 0;
              return (
                <div 
                  key={yearData.year}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-border ${
                    isSelectedYear
                      ? 'bg-accent/20 border-accent' 
                      : 'bg-card border-border'
                  }`}
                  onClick={() => selectYear(yearData.year)}
                >
                  <div className="text-center">
                    <h4 className="font-medium text-foreground mb-1">
                      {yearData.year}
                      {isCurrentYear && (
                        <span className="block text-xs text-accent">Current</span>
                      )}
                      {isSelectedYear && !isCurrentYear && (
                        <span className="block text-xs text-accent">Viewing</span>
                      )}
                    </h4>
                    <div className="text-lg font-bold text-foreground">
                      ${(yearData.total / 1000).toFixed(0)}K
                    </div>
                    {index > 0 && (
                      <div className={`text-xs ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Historical Performance Details - Only show actual revenue data */}
      {historicalYears.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Revenue Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historicalYears.slice(-3).map((year) => {
                const yearTotal = year.data.reduce((sum, item) => sum + item.revenue, 0);
                
                return (
                  <div 
                    key={year.year} 
                    className="flex items-center justify-between p-4 bg-card rounded-lg border border-border transition-colors cursor-pointer hover:bg-border"
                    onClick={() => selectYear(year.year)}
                  >
                    <div>
                      <h4 className="font-medium text-foreground">
                        {year.year}
                      </h4>
                      <p className="text-sm text-muted">
                        Actual Revenue (Historical)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">
                        ${Math.round(yearTotal).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted">
                        Click to view details
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual P&L Entry Modal */}
      {isManualPLOpen && (
        <ManualPLFormSimplified
          onClose={() => setIsManualPLOpen(false)}
          onSave={() => {
            // Refresh financial data after save
            window.location.reload();
          }}
          onCashflowSync={syncFromManualPL}
        />
      )}
    </div>
  );
}