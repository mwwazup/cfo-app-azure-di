import React, { useState, useMemo, useEffect } from 'react';
import { 
  RadialBarChart, 
  RadialBar, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TrendingDown, TrendingUp, Loader2, Calendar, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/auth-context';
import { formatCurrency } from '../../utils/formatters';

interface WhereDidTheMoneyGoProps {
  // Optional props for shared filter state
  selectedPeriod?: string;
  setSelectedPeriod?: (value: string) => void;
  filterYear?: number;
  setFilterYear?: (value: number) => void;
  filterMonth?: number | 'all' | 'ytd';
  setFilterMonth?: (value: number | 'all' | 'ytd') => void;
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
  isYTD?: boolean; // Flag to indicate YTD mode
}

function ChartCard({ title, value, percentage, color, trendDirection, trendValue, dateRange, documents, isYTD }: ChartCardProps) {
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
                const verbText = isYTD ? 'is' : 'was';
                const periodText = isYTD ? 'for the year to date' : 'for this period';
                return `Total Revenue ${verbText} ${valueText} ${periodText}, which represents 100% of total income. ${trendText}.`;
              } else if (title === 'Total Costs') {
                const verbText = isYTD ? 'are' : 'were';
                return `Total Expenses ${verbText} ${valueText} which equals ${percentageText}% of total revenue. ${trendText}.`;
              } else if (title === 'Net Profit') {
                const verbText = isYTD ? 'is' : 'was';
                return `Net Profit ${verbText} ${valueText} which equals ${percentageText}% of total revenue. Net Profit is Total Revenue minus Cost of Goods Sold minus Operating Expenses - this is how much money you have left before any owner distributions or taxes. ${trendText}.`;
              } else if (title === 'Cost of Goods') {
                const verbText = isYTD ? 'is' : 'was';
                return `Cost of Goods ${verbText} ${valueText} which equals ${percentageText}% of total revenue. ${trendText}.`;
              } else if (title === 'Operating Expenses') {
                const verbText = isYTD ? 'are' : 'were';
                return `Operating Expenses ${verbText} ${valueText} which equals ${percentageText}% of total revenue. ${trendText}.`;
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
                
                const verbText = isYTD ? 'are' : 'were';
                return `Owner Distributions ${verbText} ${valueText} which equals ${percentageText}% of total revenue. This represents money taken out of the business for personal use.${ytdText} ${trendText}.`;
              } else if (title === 'Cash Left for Growth') {
                const growthText = value >= 0 
                  ? `Cash Left for Growth is calculated as Net Profit minus Owner Distributions. After taking out owner distributions from the net profit, this is the true number you have for growth in the business - available for reinvestment, building reserves, paying taxes, and expanding operations.`
                  : `This negative amount indicates the business is operating at a loss after owner distributions, meaning more money was taken out than the business earned.`;
                return `Cash Left for Growth is ${valueText} which equals ${percentageText}% of total revenue. ${growthText} ${trendText}.`;
              }
              const verbText = isYTD ? 'is' : 'was';
              return `${title} ${verbText} ${valueText} (${percentageText}% of revenue). ${trendText}.`;
            })()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const WhereDidTheMoneyGo: React.FC<WhereDidTheMoneyGoProps> = (props) => {
  const { dbUserId } = useAuthContext();
  const currentDate = new Date();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  
  // Use props if provided, otherwise use local state
  const [localSelectedPeriod, setLocalSelectedPeriod] = useState<string>('current_month');
  const [localFilterYear, setLocalFilterYear] = useState<number>(currentDate.getFullYear());
  const [localFilterMonth, setLocalFilterMonth] = useState<number | 'all' | 'ytd'>(currentDate.getMonth() + 1);
  
  const selectedPeriod = props.selectedPeriod ?? localSelectedPeriod;
  const setSelectedPeriod = props.setSelectedPeriod ?? setLocalSelectedPeriod;
  const filterYear = props.filterYear ?? localFilterYear;
  const setFilterYear = props.setFilterYear ?? setLocalFilterYear;
  const filterMonth = props.filterMonth ?? localFilterMonth;
  const setFilterMonth = props.setFilterMonth ?? setLocalFilterMonth;
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

  // Fetch KPIs for selected document or aggregate for YTD
  useEffect(() => {
    if (!documents.length) {
      setKpis(null);
      return;
    }

    // For YTD, aggregate all documents in the filtered range
    if (filterMonth === 'ytd') {
      console.log('📊 YTD mode: aggregating all documents');
      const ytdDocuments = availableDocuments.map(d => d.document);
      
      if (ytdDocuments.length === 0) {
        setKpis(null);
        setKpisError(true);
        return;
      }
      
      // Aggregate all financial data
      let totalRevenue = 0;
      let totalCogs = 0;
      let totalOpex = 0;
      let totalOwnerDistributions = 0;
      
      ytdDocuments.forEach((doc, index) => {
        const revenue = doc.summary_metrics?.totalRevenue 
          || doc.summary_metrics?.revenue 
          || doc.raw_json?.revenue?.value
          || 0;
        
        const cogs = doc.summary_metrics?.cost_of_goods_sold 
          || doc.summary_metrics?.cogs 
          || doc.raw_json?.cost_of_goods_sold?.value
          || doc.raw_json?.cogs?.value
          || 0;
          
        // Try multiple field variations for operating expenses
        const opex = doc.summary_metrics?.operating_expenses 
          || doc.summary_metrics?.opex
          || doc.summary_metrics?.operatingExpenses
          || doc.raw_json?.operating_expenses?.value
          || doc.raw_json?.operatingExpenses?.value
          || doc.raw_json?.opex?.value
          || 0;
        
        // If we have total expenses but no breakdown, calculate opex as difference
        const totalExpensesFromDoc = doc.summary_metrics?.total_expenses 
          || doc.summary_metrics?.totalExpenses
          || doc.raw_json?.total_expenses?.value
          || doc.raw_json?.totalExpenses?.value
          || 0;
        
        // If we have total expenses but opex is 0, calculate it
        const finalOpex = (opex === 0 && totalExpensesFromDoc > 0 && cogs > 0) 
          ? totalExpensesFromDoc - cogs 
          : opex;
        
        const ownerDistRaw = doc.raw_json?.ownerDistributions;
        const ownerDist = (typeof ownerDistRaw === 'object' && ownerDistRaw?.value)
          ? ownerDistRaw.value
          : (typeof ownerDistRaw === 'number' ? ownerDistRaw : 0) ||
            doc.summary_metrics?.ownerDistributions || 0;
        
        console.log(`📄 Doc ${index + 1}:`, {
          period: `${doc.start_date} to ${doc.end_date}`,
          revenue,
          cogs,
          opex: opex,
          finalOpex: finalOpex,
          totalExpensesFromDoc,
          ownerDist,
          summary_metrics: doc.summary_metrics,
          raw_json_keys: doc.raw_json ? Object.keys(doc.raw_json) : []
        });
        
        totalRevenue += revenue;
        totalCogs += cogs;
        totalOpex += finalOpex; // Use finalOpex which includes calculated value
        totalOwnerDistributions += ownerDist;
      });
      
      const totalExpenses = totalCogs + totalOpex;
      const netProfit = totalRevenue - totalExpenses;
      
      console.log('📊 YTD Aggregated data:', { 
        totalRevenue, 
        totalCogs, 
        totalOpex, 
        totalExpenses, 
        netProfit,
        totalOwnerDistributions,
        documentCount: ytdDocuments.length 
      });
      
      setKpis({
        revenue_total: totalRevenue,
        cogs_total: totalCogs,
        opex_total: totalOpex,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        owner_distributions: totalOwnerDistributions,
        is_ytd: true
      });
      setKpisError(false);
      return;
    }
    
    // For single month, use selected document
    if (!selectedDocumentId) {
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
          net_profit: netProfit,
          is_ytd: false
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
  }, [selectedDocumentId, documents, filterMonth]);

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
          monthMatch: filterMonth === 'ytd' ? 'YTD mode' : (filterMonth === 'all' || docMonth === filterMonth)
        });
        
        // Filter by year
        if (docYear !== filterYear) return false;
        
        // YTD: include all months from Jan to current month
        if (filterMonth === 'ytd') {
          const currentMonth = new Date().getMonth() + 1;
          return docMonth <= currentMonth;
        }
        
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
      // For YTD, select the most recent document
      if (filterMonth === 'ytd') {
        console.log('🎯 YTD mode: selecting latest document');
        setSelectedDocumentId(availableDocuments[0].document.id);
        return;
      }
      
      // Check if current selection is in the filtered list
      const currentDocInList = selectedDocumentId 
        ? availableDocuments.find(doc => doc.document.id === selectedDocumentId)
        : null;
      
      if (!currentDocInList) {
        console.log('🎯 Auto-selecting latest document from filtered list:', availableDocuments[0]);
        setSelectedDocumentId(availableDocuments[0].document.id);
      }
    } else if (availableDocuments.length === 0 && selectedDocumentId) {
      // No documents match the filter, clear selection
      console.log('⚠️ No documents match filter, clearing selection');
      setSelectedDocumentId('');
    }
  }, [availableDocuments, documents, selectedDocumentId, filterMonth]);

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
    
    // Get owner distributions and date range
    const ownerDistributions = kpis.owner_distributions || 0;
    const cashLeft = netProfit - ownerDistributions; // Cash remaining after owner distributions
    const isYTD = kpis.is_ytd || false;

    // Define colors based on the dashboard palette
    const colors = {
      revenue: '#d0b568', // Gold for revenue
      cogs: '#124a6b', // Blue 700 for COGS
      expenses: '#124a6b', // Blue 700 for expenses
      totalExpenses: '#124a6b', // Blue 700 for total expenses
      ownerDistributions: '#124a6b', // Blue 700 for owner distributions
      cashLeft: cashLeft >= 0 ? '#124a6b' : '#EF4444' // Blue-700 if positive, red if negative
    };
    
    // Date range for display
    let dateRange;
    if (isYTD) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
      dateRange = `YTD ${currentYear} (Jan - ${currentMonth})`;
    } else {
      const selectedDoc = documents.find(doc => doc.id === selectedDocumentId);
      dateRange = selectedDoc ? 
        formatPeriodLabel(selectedDoc.start_date || '', selectedDoc.end_date || '') : 
        new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // Find previous period document for trend calculations (only for single month view)
    const selectedDoc = !isYTD ? documents.find(doc => doc.id === selectedDocumentId) : null;
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

    // Calculate Cash Left for Growth trend
    const previousCashLeft = previousNetProfit - previousOwnerDistributions;
    const cashLeftTrend = calculateTrend(cashLeft, previousCashLeft);

    // Create chart data array - ALWAYS 6 cards in specific order
    // Row 1: Total Revenue, Cost of Goods, Operating Expenses
    // Row 2: Net Profit, Owner Distributions, Cash Left for Growth
    const charts = [
      // ROW 1 - LEFT TO RIGHT
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
        title: 'Cost of Goods',
        value: cogsTotal,
        percentage: totalRevenue > 0 ? (cogsTotal / totalRevenue) * 100 : 0,
        color: colors.cogs,
        trendDirection: cogsTrend.direction,
        trendValue: cogsTrend.percentage,
        dateRange
      },
      {
        title: 'Operating Expenses',
        value: opexTotal,
        percentage: totalRevenue > 0 ? (opexTotal / totalRevenue) * 100 : 0,
        color: colors.expenses,
        trendDirection: opexTrend.direction,
        trendValue: opexTrend.percentage,
        dateRange
      },
      // ROW 2 - LEFT TO RIGHT
      {
        title: 'Net Profit',
        value: netProfit,
        percentage: totalRevenue > 0 ? Math.abs(netProfit / totalRevenue) * 100 : 0,
        color: colors.cashLeft,
        trendDirection: netProfitTrend.direction,
        trendValue: netProfitTrend.percentage,
        dateRange
      },
      {
        title: 'Owner Distributions',
        value: ownerDistributions,
        percentage: totalRevenue > 0 ? (ownerDistributions / totalRevenue) * 100 : 0,
        color: colors.ownerDistributions,
        trendDirection: ownerDistributionsTrend.direction,
        trendValue: ownerDistributionsTrend.percentage,
        dateRange
      },
      {
        title: 'Cash Left for Growth',
        value: cashLeft,
        percentage: totalRevenue > 0 ? Math.abs(cashLeft / totalRevenue) * 100 : 0,
        color: cashLeft >= 0 ? '#026b48ff' : '#EF4444', // Green if positive, red if negative
        trendDirection: cashLeftTrend.direction,
        trendValue: cashLeftTrend.percentage,
        dateRange
      }
    ];

    console.log('💰 Radial Chart Data:', { 
      current: { totalRevenue, totalExpenses, netProfit, ownerDistributions, cashLeft },
      previous: { revenue: previousRevenue, expenses: previousExpenses, netProfit: previousNetProfit, ownerDistributions: previousOwnerDistributions },
      trends: { revenueTrend, expensesTrend, netProfitTrend, ownerDistributionsTrend },
      charts,
      isYTD 
    });

    return { charts, hasData: totalRevenue > 0 || totalExpenses > 0, isYTD };
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
          <div className="flex flex-wrap items-center gap-4">
            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              <Select 
                value={selectedPeriod} 
                onValueChange={(value) => {
                  setSelectedPeriod(value);
                  const now = new Date();
                  const currentMonth = now.getMonth() + 1;
                  const currentYear = now.getFullYear();
                  
                  if (value === 'current_month') {
                    setFilterYear(currentYear);
                    setFilterMonth(currentMonth);
                  } else if (value === 'ytd') {
                    setFilterYear(currentYear);
                    setFilterMonth('ytd');
                  } else if (value.match(/^\d{4}-\d{2}$/)) {
                    // Specific month format: YYYY-MM
                    const [year, month] = value.split('-');
                    setFilterYear(Number(year));
                    setFilterMonth(Number(month));
                  }
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  {/* Recent months */}
                  {Array.from({ length: 11 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - (i + 1));
                    const monthValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    return (
                      <SelectItem key={monthValue} value={monthValue}>
                        {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {/* Clear Filter Button */}
            {(filterMonth !== currentDate.getMonth() + 1 || filterYear !== currentDate.getFullYear() || selectedPeriod !== 'current_month') && (
              <button
                onClick={() => {
                  setSelectedPeriod('current_month');
                  setFilterYear(currentDate.getFullYear());
                  setFilterMonth(currentDate.getMonth() + 1);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
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
                    isYTD={radialChartsData.isYTD}
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
                      isYTD={radialChartsData.isYTD}
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
