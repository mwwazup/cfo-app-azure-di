import { useState } from 'react';
import { MasterChart } from '../../components/RevenueChart/MasterChart';
import { useRevenue } from '../../contexts/revenue-context';
import { Info, History, ChevronDown, ChevronUp, TrendingUp, DollarSign, TrendingDown } from 'lucide-react';
import { RevenueImportWizard } from '../../components/RevenueImport/RevenueImportWizard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function MasterRevenuePage() {
  const { currentYear, historicalYears, selectedYear, selectYear, getYearData } = useRevenue();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isPerformanceCollapsed, setIsPerformanceCollapsed] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const toggleYearExpansion = (year: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  const shouldShowImport = currentYear.isSample || currentYear.data.every(d => d.revenue === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-gray-100">
            Master Revenue Curve
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your actual monthly and desired future growth revenue and let's ride your wave to close your gap!
          </p>
        </div>
      </div>

      {/* Sample Data Banner */}
      {currentYear.isSample && (() => {
        const remaining = currentYear.data.filter(d => d.isSample).length;
        return (
          <div className="flex items-start gap-3 p-4 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-900">
            <Info className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Sample Data</p>
              {remaining === 12 ? (
                <p className="text-sm leading-snug">
                  You’re currently viewing illustrative numbers. Edit a month’s revenue or import your actual data to personalize the dashboard.
                </p>
              ) : (
                <p className="text-sm leading-snug">
                  {remaining} of 12 months still contain sample data. Keep editing or importing until all months are updated and this banner will disappear.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {shouldShowImport && (
        <div>
          <button
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:bg-accent/90"
            onClick={() => setWizardOpen(true)}
          >
            Import Revenue
          </button>
        </div>
      )}

      <MasterChart />

      {/* 5-Year Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            5-Year Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {(() => {
              const fiveYearData = Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                const yearData = getYearData(year);
                return {
                  year,
                  total: yearData.data.reduce((sum, item) => sum + item.revenue, 0)
                };
              }).reverse();

              return fiveYearData.map((yearData, index) => {
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
              });
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Historical Financial Performance Snapshot */}
      {historicalYears.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Historical Financial Performance
              </CardTitle>
              <button
                onClick={() => setIsPerformanceCollapsed(!isPerformanceCollapsed)}
                className="p-1 hover:bg-accent/10 rounded transition-colors"
                aria-label={isPerformanceCollapsed ? "Expand" : "Collapse"}
              >
                {isPerformanceCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-muted" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted" />
                )}
              </button>
            </div>
          </CardHeader>
          {!isPerformanceCollapsed && (
            <CardContent>
              <div className="space-y-6">
                {historicalYears.slice(-3).reverse().map((year) => {
                  const yearTotal = year.data.reduce((sum, item) => sum + item.revenue, 0);
                  
                  // Calculate financial metrics (using placeholder percentages for demo)
                  // In production, these would come from actual financial data
                  const grossRevenue = yearTotal;
                  const cogs = Math.round(yearTotal * 0.35); // 35% COGS (placeholder)
                  const grossProfit = grossRevenue - cogs;
                  const expenses = Math.round(yearTotal * 0.25); // 25% expenses (placeholder)
                  const netProfit = grossProfit - expenses;
                  const profitMargin = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : '0.0';
                  
                  const isExpanded = expandedYears.has(year.year);
                  
                  return (
                    <div 
                      key={year.year} 
                      className="bg-card rounded-lg border border-border transition-colors"
                    >
                      {/* Year Header - Always Visible */}
                      <div 
                        className="p-6 cursor-pointer hover:bg-accent/5 transition-colors"
                        onClick={() => selectYear(year.year)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-foreground flex items-center gap-2">
                              {year.year}
                              <span className="text-xs font-normal text-muted px-2 py-1 bg-accent/10 rounded">
                                Historical
                              </span>
                            </h4>
                            <p className="text-sm text-muted mt-1">
                              Click to view detailed revenue curve
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${
                                parseFloat(profitMargin) >= 20 ? 'text-green-500' : 
                                parseFloat(profitMargin) >= 10 ? 'text-yellow-500' : 
                                'text-red-500'
                              }`}>
                                {profitMargin}%
                              </div>
                              <p className="text-xs text-muted">Profit Margin</p>
                            </div>
                            <button
                              onClick={(e) => toggleYearExpansion(year.year, e)}
                              className="p-2 hover:bg-accent/10 rounded transition-colors"
                              aria-label={isExpanded ? "Collapse details" : "Expand details"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Financial Metrics Grid - Collapsible */}
                      {isExpanded && (
                        <div className="px-6 pb-6 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Gross Revenue */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-muted text-xs">
                                <DollarSign className="h-3 w-3" />
                                <span>Gross Revenue</span>
                              </div>
                              <div className="text-lg font-bold text-foreground">
                                ${(grossRevenue / 1000).toFixed(0)}K
                              </div>
                              <div className="text-xs text-muted">
                                ${grossRevenue.toLocaleString()}
                              </div>
                            </div>

                            {/* COGS */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-muted text-xs">
                                <TrendingDown className="h-3 w-3" />
                                <span>COGS</span>
                              </div>
                              <div className="text-lg font-bold text-orange-500">
                                ${(cogs / 1000).toFixed(0)}K
                              </div>
                              <div className="text-xs text-muted">
                                {((cogs / grossRevenue) * 100).toFixed(0)}% of revenue
                              </div>
                            </div>

                            {/* Operating Expenses */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-muted text-xs">
                                <TrendingDown className="h-3 w-3" />
                                <span>Expenses</span>
                              </div>
                              <div className="text-lg font-bold text-red-500">
                                ${(expenses / 1000).toFixed(0)}K
                              </div>
                              <div className="text-xs text-muted">
                                {((expenses / grossRevenue) * 100).toFixed(0)}% of revenue
                              </div>
                            </div>

                            {/* Net Profit */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-muted text-xs">
                                <TrendingUp className="h-3 w-3" />
                                <span>Net Profit</span>
                              </div>
                              <div className={`text-lg font-bold ${
                                netProfit >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                ${Math.abs(netProfit / 1000).toFixed(0)}K
                              </div>
                              <div className="text-xs text-muted">
                                {netProfit >= 0 ? 'Profitable' : 'Loss'}
                              </div>
                            </div>
                          </div>

                          {/* Performance Bar */}
                          <div className="pt-4 border-t border-border">
                            <div className="flex items-center justify-between text-xs text-muted mb-2">
                              <span>Financial Breakdown</span>
                              <span>100%</span>
                            </div>
                            <div className="flex h-3 rounded-full overflow-hidden bg-gray-700">
                              <div 
                                className="bg-green-500" 
                                style={{ width: `${((grossProfit - expenses) / grossRevenue * 100).toFixed(1)}%` }}
                                title={`Net Profit: ${profitMargin}%`}
                              />
                              <div 
                                className="bg-red-500" 
                                style={{ width: `${(expenses / grossRevenue * 100).toFixed(1)}%` }}
                                title={`Expenses: ${(expenses / grossRevenue * 100).toFixed(1)}%`}
                              />
                              <div 
                                className="bg-orange-500" 
                                style={{ width: `${(cogs / grossRevenue * 100).toFixed(1)}%` }}
                                title={`COGS: ${(cogs / grossRevenue * 100).toFixed(1)}%`}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-2 text-xs">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                  <span className="text-muted">Profit</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  <span className="text-muted">Expenses</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                  <span className="text-muted">COGS</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <RevenueImportWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}