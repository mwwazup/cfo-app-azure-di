import React, { useState, useMemo, useEffect } from 'react';
import { 
  RadialBarChart, 
  RadialBar, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TrendingDown, TrendingUp, Loader2, Calendar, Filter } from 'lucide-react';
import { useAuthContext } from '../../contexts/auth-context';
import { formatCurrency } from '../../utils/formatters';

interface WhereDidTheMoneyGoProps {
  // No props needed - component fetches its own data
}


interface ChartCardProps {
  title: string;
  value: number;
  percentage: number;
  color: string;
  trendDirection: 'up' | 'down' | 'neutral';
  trendValue: number;
  dateRange: string;
  documents?: any[]; // Optional documents array for YTD calculations
}

function ChartCard({ title, value, percentage, color, trendDirection, trendValue, dateRange, documents }: ChartCardProps) {
  // Create chart data - using percentage for the radial fill
  const chartData = [
    { 
      name: title, 
      value: 100, // Always use 100 as the data value since we control the arc with endAngle
      fill: color 
    }
  ];

  // Calculate endAngle based on percentage (0% = 0°, 100% = 360°)
  // Cap the percentage at 100% to prevent over-rotation
  const cappedPercentage = Math.min(Math.abs(percentage), 100);
  const dynamicEndAngle = (cappedPercentage / 100) * 360;

  // Determine trend icon and color
  const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trendDirection === 'up' ? 'text-green-400' : 
                     trendDirection === 'down' ? 'text-red-400' : 'text-muted';

  return (
    <Card className="flex flex-col h-full bg-background"> {/*card background color */}
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-lg font-bold text-accent mb-2">{title}</CardTitle>
        <p className="text-md text-muted-foreground mb-8 italic">{dateRange}</p>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        <div className="relative mx-auto aspect-square max-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={chartData}
              endAngle={dynamicEndAngle}
              innerRadius="80%"
              outerRadius="111%"
            >
              {/* Muted circle rendered first (underneath) as background track */}
              <circle
                cx="50%"
                cy="50%"
                r="42.5%"
                fill="none"
                stroke="rgb(156 163 175)"
                strokeWidth="5%"
                opacity={0.1}
              />
              <RadialBar 
                dataKey="value" 
                cornerRadius={6}
                fill={color}
              />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(value)}
            </span>
            <span className="text-md font-medium text-white">
              {cappedPercentage.toFixed(1)}%
            </span>
            {trendDirection !== 'neutral' && trendValue > 0 ? (
              <div className="flex items-center gap-1">
                <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                <span className={`text-lg font-bold ${trendColor}`}>
                  {trendDirection === 'up' ? '+' : ''}{trendValue.toFixed(1)}%
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-md text-muted-foreground">
                  No trend data
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Summary text underneath the chart */}
        <div className="mt-4 px-2">
          <p className="text-sm text-[#d5b274] leading-relaxed text-center">
            {(() => {
              const valueText = formatCurrency(value);
              const percentageText = percentage.toFixed(1);
              const trendText = trendDirection !== 'neutral' && trendValue > 0
                ? `This is a ${trendValue.toFixed(1)}% ${trendDirection === 'up' ? 'increase' : 'decrease'} from the previous period`
                : 'No previous period data available for comparison';
              
              if (title === 'Total Revenue') {
                return `Total Revenue was ${valueText} which represents 100% of total income. ${trendText}.`;
              } else if (title === 'Total Costs') {
                return `Total Expenses were ${valueText} which equals ${percentageText}% of total revenue. ${trendText}.`;
              } else if (title === 'Net Profit') {
                return `Net Profit was ${valueText} which equals ${percentageText}% of total revenue. Net Profit is Total Revenue minus Cost of Goods Sold minus Operating Expenses - this is how much money you have left before any owner distributions. ${trendText}.`;
              } else if (title === 'Cost of Goods') {
                return `Cost of Goods was ${valueText} which equals ${percentageText}% of total revenue. ${trendText}.`;
              } else if (title === 'Operating Expenses') {
                return `Operating Expenses were ${valueText} which equals ${percentageText}% of total revenue. ${trendText}.`;
              } else if (title === 'Owner Distributions') {
                // Calculate year-to-date owner distributions
                const currentYear = new Date().getFullYear();
                let ytdOwnerDistributions = 0;
                
                if (documents && documents.length > 0) {
                  ytdOwnerDistributions = documents
                    .filter(doc => {
                      const docYear = doc.start_date ? new Date(doc.start_date).getFullYear() : currentYear;
                      return docYear === currentYear;
                    })
                    .reduce((total, doc) => {
                      const ownerDistRaw = doc.raw_json?.ownerDistributions;
                      const ownerDist = (typeof ownerDistRaw === 'object' && ownerDistRaw?.value)
                        ? ownerDistRaw.value
                        : (typeof ownerDistRaw === 'number' ? ownerDistRaw : 0) ||
                          doc.summary_metrics?.ownerDistributions || 0;
                      return total + ownerDist;
                    }, 0);
                }
                
                const ytdText = ytdOwnerDistributions > 0 
                  ? ` For calendar year ${currentYear}, you have taken ${formatCurrency(ytdOwnerDistributions)} in total owner distributions.`
                  : '';
                
                return `Owner Distributions were ${valueText} which equals ${percentageText}% of total revenue. This represents money taken out of the business for personal use.${ytdText} ${trendText}.`;
              } else if (title === 'Cash Left for Growth') {
                const growthText = value >= 0 
                  ? `Cash Left for Growth is calculated as Net Profit minus Owner Distributions. After taking out owner distributions from the net profit, this is the true number you have for growth in the business - available for reinvestment, building reserves, and expanding operations.`
                  : `This negative amount indicates the business is operating at a loss after owner distributions, meaning more money was taken out than the business earned.`;
                return `Cash Left for Growth is ${valueText} which equals ${percentageText}% of total revenue. ${growthText} ${trendText}.`;
              }
              return `${title} was ${valueText} (${percentageText}% of revenue). ${trendText}.`;
            })()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const WhereDidTheMoneyGo: React.FC<WhereDidTheMoneyGoProps> = () => {
  const { dbUserId } = useAuthContext();
  const currentDate = new Date();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('latest');
  const [filterYear, setFilterYear] = useState<number>(currentDate.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all'); // Default to 'all' to show all documents
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<Error | null>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [kpisLoading] = useState(false);
  const [kpisError, setKpisError] = useState(false);

  // Fetch documents using the same endpoint as manual P&L form
  useEffect(() => {
    const loadDocuments = async () => {
      if (!dbUserId) return;
      
      try {
        setDocsLoading(true);
        console.log('🔄 Loading documents from API for WhereDidTheMoneyGo...');
        const response = await fetch(`http://localhost:5180/api/financial-documents?userId=${encodeURIComponent(dbUserId)}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📄 WhereDidTheMoneyGo API Response:', result);
        
        const documentsData = result.data || [];
        console.log('📋 Raw documents from API:', documentsData);
        
        // Transform documents to flatten analysis_result data (same as FinancialStatements component)
        const transformedDocuments = documentsData.map((doc: any) => {
          if (doc.analysis_result) {
            // Extract data from analysis_result and flatten it
            return {
              ...doc,
              start_date: doc.analysis_result.start_date || doc.start_date,
              end_date: doc.analysis_result.end_date || doc.end_date,
              summary_metrics: doc.analysis_result.summary_metrics || doc.summary_metrics,
              raw_json: doc.analysis_result.raw_json || {},
              // Keep the original analysis_result for reference
              _original_analysis_result: doc.analysis_result
            };
          }
          return doc;
        });
        
        console.log('📋 Transformed documents for dropdown:', transformedDocuments);
        setDocuments(transformedDocuments);
        setDocsError(null);
        console.log('✅ Documents loaded successfully for dropdown:', documentsData.length);
        
      } catch (error) {
        console.error('❌ Error loading documents for dropdown:', error);
        setDocsError(error as Error);
        setDocuments([]);
      } finally {
        setDocsLoading(false);
      }
    };

    loadDocuments();
  }, [dbUserId]);

  // Fetch KPIs for selected document (simplified for now)
  useEffect(() => {
    if (!selectedDocumentId || !documents.length) {
      setKpis(null);
      return;
    }

    const selectedDoc = documents.find(doc => doc.id === selectedDocumentId);
    if (selectedDoc) {
      console.log('📊 Selected document for KPIs:', selectedDoc);
      
      // Extract revenue using same logic as FinancialStatements component
      const revenue = selectedDoc.summary_metrics?.totalRevenue 
        ? selectedDoc.summary_metrics.totalRevenue
        : selectedDoc.summary_metrics?.revenue 
          ? selectedDoc.summary_metrics.revenue
          : selectedDoc.raw_json?.revenue?.value
            ? selectedDoc.raw_json.revenue.value
            : 0;
      
      // Extract all available financial data from summary_metrics and raw_json
      console.log('📊 Available summary_metrics:', selectedDoc.summary_metrics);
      console.log('📊 Available raw_json:', selectedDoc.raw_json);
      
      // Try multiple field variations for expenses
      const cogs = selectedDoc.summary_metrics?.cost_of_goods_sold 
        || selectedDoc.summary_metrics?.cogs 
        || selectedDoc.raw_json?.cost_of_goods_sold?.value
        || selectedDoc.raw_json?.cogs?.value
        || 0;
        
      const opex = selectedDoc.summary_metrics?.operating_expenses 
        || selectedDoc.summary_metrics?.opex
        || selectedDoc.summary_metrics?.expenses
        || selectedDoc.raw_json?.operating_expenses?.value
        || selectedDoc.raw_json?.expenses?.value
        || 0;
        
      // Also try to get net profit to calculate expenses if needed
      const netProfit = selectedDoc.summary_metrics?.netProfit 
        || selectedDoc.summary_metrics?.net_profit
        || selectedDoc.summary_metrics?.net_income
        || selectedDoc.raw_json?.netProfit?.value
        || selectedDoc.raw_json?.net_profit?.value
        || 0;
      
      // If we don't have expense breakdown but have revenue and net profit, calculate total expenses
      let totalExpenses = cogs + opex;
      if (totalExpenses === 0 && revenue > 0 && netProfit >= 0) {
        totalExpenses = revenue - netProfit;
        console.log('📊 Calculated total expenses from revenue - net profit:', totalExpenses);
      }
      
      if (revenue > 0 || totalExpenses > 0) {
        console.log('📊 Using financial data:', { revenue, cogs, opex, netProfit, totalExpenses });
        setKpis({
          revenue_total: revenue,
          cogs_total: cogs,
          opex_total: opex,
          total_expenses: totalExpenses,
          net_profit: netProfit
        });
        setKpisError(false);
      } else {
        console.log('⚠️ No financial data found for selected doc');
        setKpis(null);
        setKpisError(true);
      }
    } else {
      setKpis(null);
      setKpisError(true);
    }
  }, [selectedDocumentId, documents]);

  // Helper function to format period labels
  const formatPeriodLabel = (startDate: string, endDate: string): string => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    if (start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  // Get available document periods for selection - include all document types
  const availableDocuments = useMemo(() => {
    if (!documents || documents.length === 0) return [];
    
    // Filter for P&L documents only
    const pnlDocuments = documents.filter(doc => doc.document_type === 'pnl');
    
    return pnlDocuments
      .filter(doc => {
        // Check for dates in main doc or analysis_result
        const hasStartDate = doc.start_date || (doc.analysis_result && doc.analysis_result.start_date);
        const hasEndDate = doc.end_date || (doc.analysis_result && doc.analysis_result.end_date);
        if (!hasStartDate || !hasEndDate) return false;
        
        // Apply year and month filters
        const startDate = doc.start_date || (doc.analysis_result && doc.analysis_result.start_date);
        // Add T00:00:00 to avoid timezone issues
        const docDate = new Date(startDate + 'T00:00:00');
        const docYear = docDate.getFullYear();
        const docMonth = docDate.getMonth() + 1;
        
        console.log('📅 Document filter check:', {
          docId: doc.id,
          startDate,
          docYear,
          docMonth,
          filterYear,
          filterMonth,
          yearMatch: docYear === filterYear,
          monthMatch: filterMonth === 'all' || docMonth === filterMonth
        });
        
        // Filter by year
        if (docYear !== filterYear) return false;
        
        // Filter by month if not 'all'
        if (filterMonth !== 'all' && docMonth !== filterMonth) return false;
        
        return true;
      })
      .map(doc => {
        // Get dates from main doc or analysis_result
        const startDate = doc.start_date || (doc.analysis_result && doc.analysis_result.start_date) || '';
        const endDate = doc.end_date || (doc.analysis_result && doc.analysis_result.end_date) || '';
        
        return {
          id: doc.id,
          label: `P&L - ${formatPeriodLabel(startDate, endDate)}`,
          start_date: startDate,
          end_date: endDate,
          document: doc
        };
      })
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }, [documents, filterYear, filterMonth]);

  // Auto-select the most recent P&L document when documents load or filters change
  useEffect(() => {
    if (documents && documents.length > 0 && availableDocuments.length > 0) {
      // Check if current selection is in the filtered list
      const currentDocInList = selectedDocumentId 
        ? availableDocuments.find(doc => doc.document.id === selectedDocumentId)
        : null;
      
      if (!currentDocInList) {
        console.log('🎯 Auto-selecting latest document from filtered list:', availableDocuments[0]);
        setSelectedDocumentId(availableDocuments[0].document.id);
        setSelectedPeriod('latest');
      }
    } else if (availableDocuments.length === 0 && selectedDocumentId) {
      // No documents match the filter, clear selection
      console.log('⚠️ No documents match filter, clearing selection');
      setSelectedDocumentId('');
      setSelectedPeriod('latest');
    }
  }, [availableDocuments, documents, selectedDocumentId]);

  // Helper function to find previous period document
  const findPreviousPeriodDocument = (currentDoc: any) => {
    if (!currentDoc || !currentDoc.start_date) return null;
    
    const currentStartDate = new Date(currentDoc.start_date);
    
    // Look for documents from previous periods
    const previousDocs = documents.filter(doc => {
      if (!doc.start_date || doc.id === currentDoc.id) return false;
      
      const docStartDate = new Date(doc.start_date);
      return docStartDate < currentStartDate;
    });
    
    if (previousDocs.length === 0) return null;
    
    // Sort by start_date descending and get the most recent previous document
    return previousDocs.sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    )[0];
  };

  // Helper function to calculate trend percentage
  const calculateTrend = (currentValue: number, previousValue: number): { percentage: number; direction: 'up' | 'down' | 'neutral' } => {
    if (previousValue === 0) {
      return { percentage: 0, direction: 'neutral' };
    }
    
    const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    
    if (Math.abs(change) < 0.1) {
      return { percentage: 0, direction: 'neutral' };
    }
    
    return {
      percentage: Math.abs(change),
      direction: change >= 0 ? 'up' : 'down'
    };
  };

  // Process KPIs into radial chart data using memoization with guards
  const radialChartsData = useMemo(() => {
    // Guard: only process if we have KPIs and a selected document
    if (!kpis || !selectedDocumentId) {
      return null;
    }

    // Use precomputed KPIs from server
    const totalRevenue = kpis.revenue_total || 0;
    const cogsTotal = kpis.cogs_total || 0;
    const opexTotal = kpis.opex_total || 0;
    const totalExpenses = kpis.total_expenses || (cogsTotal + opexTotal);
    const netProfit = kpis.net_profit || (totalRevenue - totalExpenses);
    
    // Get current period for date range and extract owner distributions
    const selectedDoc = documents.find(doc => doc.id === selectedDocumentId);
    const ownerDistributionsRaw = selectedDoc?.raw_json?.ownerDistributions;
    const ownerDistributions = (typeof ownerDistributionsRaw === 'object' && ownerDistributionsRaw?.value)
                              ? ownerDistributionsRaw.value
                              : (typeof ownerDistributionsRaw === 'number' ? ownerDistributionsRaw : 0) ||
                                selectedDoc?.summary_metrics?.ownerDistributions || 
                                0;
    
    const cashLeft = netProfit - ownerDistributions; // Cash remaining after owner distributions

    // Define colors based on the dashboard palette
    const colors = {
      revenue: '#d0b568', // Gold for revenue
      cogs: '#124a6b', // Blue 700 for COGS
      expenses: '#124a6b', // Blue 700 for expenses
      totalExpenses: '#124a6b', // Blue 700 for total expenses
      ownerDistributions: '#124a6b', // Blue 700 for owner distributions
      cashLeft: cashLeft >= 0 ? '#124a6b' : '#EF4444' // Blue-700 if positive, red if negative
    };
    const dateRange = selectedDoc ? 
      formatPeriodLabel(selectedDoc.start_date || '', selectedDoc.end_date || '') : 
      new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Find previous period document for trend calculations
    const previousDoc = selectedDoc ? findPreviousPeriodDocument(selectedDoc) : null;
    let previousRevenue = 0;
    let previousExpenses = 0;
    let previousCogs = 0;
    let previousOpex = 0;
    let previousNetProfit = 0;
    let previousOwnerDistributions = 0;

    if (previousDoc) {
      // Extract previous period data using same logic as current
      const prevSummaryMetrics = previousDoc.summary_metrics || {};
      const prevRawJson = previousDoc.raw_json || {};
      
      previousRevenue = prevSummaryMetrics.totalRevenue 
        || prevSummaryMetrics.revenue 
        || prevRawJson.revenue?.value 
        || 0;
        
      previousCogs = prevSummaryMetrics.cost_of_goods_sold 
        || prevSummaryMetrics.cogs 
        || prevRawJson.cost_of_goods_sold?.value
        || 0;
        
      previousOpex = prevSummaryMetrics.operating_expenses 
        || prevSummaryMetrics.opex
        || prevRawJson.operating_expenses?.value
        || 0;
        
      const prevOwnerDistributionsRaw = prevRawJson.ownerDistributions;
      previousOwnerDistributions = (typeof prevOwnerDistributionsRaw === 'object' && prevOwnerDistributionsRaw?.value)
                                  ? prevOwnerDistributionsRaw.value
                                  : (typeof prevOwnerDistributionsRaw === 'number' ? prevOwnerDistributionsRaw : 0) ||
                                    prevSummaryMetrics.ownerDistributions || 
                                    0;
      
      previousExpenses = previousCogs + previousOpex;
      previousNetProfit = previousRevenue - previousExpenses;
      
      console.log('📊 Previous period data:', {
        document: formatPeriodLabel(previousDoc.start_date || '', previousDoc.end_date || ''),
        revenue: previousRevenue,
        expenses: previousExpenses,
        netProfit: previousNetProfit,
        ownerDistributions: previousOwnerDistributions
      });
    }

    // Calculate trends
    const revenueTrend = calculateTrend(totalRevenue, previousRevenue);
    const expensesTrend = calculateTrend(totalExpenses, previousExpenses);
    const netProfitTrend = calculateTrend(netProfit, previousNetProfit);
    const cogsTrend = calculateTrend(cogsTotal, previousCogs);
    const opexTrend = calculateTrend(opexTotal, previousOpex);
    const ownerDistributionsTrend = calculateTrend(ownerDistributions, previousOwnerDistributions);

    // Create chart data array with real trend calculations
    const charts = [
      {
        title: 'Total Revenue',
        value: totalRevenue,
        percentage: 100, // Revenue is always 100% as the base
        color: colors.revenue,
        trendDirection: revenueTrend.direction,
        trendValue: revenueTrend.percentage,
        dateRange
      },
      {
        title: 'Total Expenses',
        value: totalExpenses,
        percentage: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
        color: colors.totalExpenses,
        trendDirection: expensesTrend.direction,
        trendValue: expensesTrend.percentage,
        dateRange
      },
      {
        title: 'Net Profit',
        value: netProfit,
        percentage: totalRevenue > 0 ? Math.abs(netProfit / totalRevenue) * 100 : 0,
        color: colors.cashLeft,
        trendDirection: netProfitTrend.direction,
        trendValue: netProfitTrend.percentage,
        dateRange
      }
    ];

    // Second row charts in specific order: [Cost of Goods] [Owner Distributions] [Cash Left]
    
    // 1. Cost of Goods (first in second row)
    if (cogsTotal > 0) {
      charts.push({
        title: 'Cost of Goods',
        value: cogsTotal,
        percentage: totalRevenue > 0 ? (cogsTotal / totalRevenue) * 100 : 0,
        color: colors.cogs,
        trendDirection: cogsTrend.direction,
        trendValue: cogsTrend.percentage,
        dateRange
      });
    }

    // 2. Owner Distributions (second in second row)
    if (ownerDistributions > 0) {
      charts.push({
        title: 'Owner Distributions',
        value: ownerDistributions,
        percentage: totalRevenue > 0 ? (ownerDistributions / totalRevenue) * 100 : 0,
        color: colors.ownerDistributions,
        trendDirection: ownerDistributionsTrend.direction,
        trendValue: ownerDistributionsTrend.percentage,
        dateRange
      });
    }

    // 3. Cash Left for Growth (third in second row)
    const previousCashLeft = previousNetProfit - previousOwnerDistributions;
    const cashLeftTrend = calculateTrend(cashLeft, previousCashLeft);
    
    charts.push({
      title: 'Cash Left for Growth',
      value: cashLeft,
      percentage: totalRevenue > 0 ? Math.abs(cashLeft / totalRevenue) * 100 : 0,
      color: cashLeft >= 0 ? '#026b48ff' : '#EF4444', // Green if positive, red if negative
      trendDirection: cashLeftTrend.direction,
      trendValue: cashLeftTrend.percentage,
      dateRange
    });

    // Additional charts go to third row if needed
    if (opexTotal > 0) {
      charts.push({
        title: 'Operating Expenses',
        value: opexTotal,
        percentage: totalRevenue > 0 ? (opexTotal / totalRevenue) * 100 : 0,
        color: colors.expenses,
        trendDirection: opexTrend.direction,
        trendValue: opexTrend.percentage,
        dateRange
      });
    }

    console.log('💰 Radial Chart Data:', { 
      current: { totalRevenue, totalExpenses, netProfit, ownerDistributions, cashLeft },
      previous: { revenue: previousRevenue, expenses: previousExpenses, netProfit: previousNetProfit, ownerDistributions: previousOwnerDistributions },
      trends: { revenueTrend, expensesTrend, netProfitTrend, ownerDistributionsTrend },
      charts 
    });

    return { charts, hasData: totalRevenue > 0 || totalExpenses > 0 };
  }, [kpis, selectedDocumentId, documents]);



  // Loading state
  if (docsLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5 text-accent" />
            <CardTitle className="text-xl font-semibold">Where Did The Money Go?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading documents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (docsError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5 text-accent" />
            <CardTitle className="text-xl font-semibold">Where Did The Money Go?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Error loading documents</p>
            <p className="text-sm">{docsError.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if ((!documents || documents.length === 0) && !docsLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5 text-accent" />
            <CardTitle className="text-xl font-semibold">Where Did The Money Go?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Upload to start</p>
            <p className="text-sm">Upload financial documents to see expense breakdowns and analysis.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5 text-accent" />
            <CardTitle className="text-xl font-semibold">Where Did The Money Go?</CardTitle>
          </div>
        </div>
        
        {/* Period Filter and Active Viewing Display */}
        <div className="mt-4 space-y-4">
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-card border border-border rounded-lg">
            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              <Select 
                value={filterYear.toString()} 
                onValueChange={(value) => {
                  setFilterYear(Number(value));
                  setSelectedPeriod('latest');
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-accent" />
              <Select 
                value={filterMonth.toString()} 
                onValueChange={(value) => {
                  setFilterMonth(value === 'all' ? 'all' : Number(value));
                  setSelectedPeriod('latest');
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Document Selector */}
            <div className="flex items-center gap-2">
              <Select 
                value={selectedPeriod} 
                onValueChange={(value) => {
                  setSelectedPeriod(value);
                  if (value === 'latest' && availableDocuments.length > 0) {
                    setSelectedDocumentId(availableDocuments[0].document.id);
                  } else if (value && value !== 'latest') {
                    // Value is the document ID
                    setSelectedDocumentId(value);
                  }
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest Available</SelectItem>
                  {availableDocuments.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No documents for selected period
                    </SelectItem>
                  ) : (
                    availableDocuments.map((doc) => {
                      return (
                        <SelectItem key={doc.document.id} value={doc.document.id}>
                          {formatPeriodLabel(doc.start_date, doc.end_date)}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">P&L documents only</span>
            </div>
          </div>

          {/* Active Viewing Display */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Viewing:</span>
            <div className="px-3 py-1 bg-accent/20 rounded-full text-xs font-medium text-accent">
              {filterYear}
            </div>
            <div className="px-3 py-1 bg-accent/20 rounded-full text-xs font-medium text-accent">
              {filterMonth === 'all' 
                ? 'All Months' 
                : (['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][typeof filterMonth === 'number' ? filterMonth - 1 : 0] || 'Unknown')
              }
            </div>
            {selectedDocumentId && (() => {
              const selectedDoc = documents.find(doc => doc.id === selectedDocumentId);
              if (selectedDoc) {
                const startDate = selectedDoc.start_date || selectedDoc.analysis_result?.start_date || '';
                const endDate = selectedDoc.end_date || selectedDoc.analysis_result?.end_date || '';
                if (startDate && endDate) {
                  return (
                    <div className="px-3 py-1 bg-accent/20 rounded-full text-xs font-medium text-accent">
                      P&L - {formatPeriodLabel(startDate, endDate)}
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {kpisLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading financial data...</span>
          </div>
        ) : kpisError ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Error loading financial data</p>
            <p className="text-sm">Please try selecting a different document.</p>
          </div>
        ) : radialChartsData?.hasData ? (
          <div className="space-y-6">
            {/* Radial Charts - Same as Dashboard */}
            <div className="w-full">
              {/* First row - 3 charts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {radialChartsData.charts.slice(0, 3).map((chart, index) => (
                  <ChartCard
                    key={index}
                    title={chart.title}
                    value={chart.value}
                    percentage={chart.percentage}
                    color={chart.color}
                    trendDirection={chart.trendDirection}
                    trendValue={chart.trendValue}
                    dateRange={chart.dateRange}
                    documents={documents}
                  />
                ))}
              </div>
              
              {/* Second row - Additional charts if available */}
              {radialChartsData.charts.length > 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {radialChartsData.charts.slice(3).map((chart, index) => (
                    <ChartCard
                      key={index + 3}
                      title={chart.title}
                      value={chart.value}
                      percentage={chart.percentage}
                      color={chart.color}
                      trendDirection={chart.trendDirection}
                      trendValue={chart.trendValue}
                      dateRange={chart.dateRange}
                      documents={documents}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No financial data available</p>
            <p className="text-sm">
              No financial metrics found in the selected document. Ensure the document contains revenue and expense data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
