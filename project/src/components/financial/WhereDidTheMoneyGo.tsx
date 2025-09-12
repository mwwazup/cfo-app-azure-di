import React, { useState, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { useDocumentsMeta, useSelectedDocument } from '../../hooks/useDocuments';

ChartJS.register(ArcElement, Tooltip, Legend);

interface WhereDidTheMoneyGoProps {
  // No props needed - component fetches its own data
}


interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

export const WhereDidTheMoneyGo: React.FC<WhereDidTheMoneyGoProps> = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  
  // Fetch documents metadata
  const { data: documents, isLoading: docsLoading, error: docsError } = useDocumentsMeta();
  
  // Fetch selected document data
  const { kpis, isLoading: kpisLoading, isError: kpisError } = useSelectedDocument(selectedDocumentId);

  // Auto-select the most recent document when documents load
  React.useEffect(() => {
    if (!selectedDocumentId && documents && documents.length > 0) {
      const sortedDocs = documents
        .filter(doc => doc.start_date)
        .sort((a, b) => new Date(b.start_date!).getTime() - new Date(a.start_date!).getTime());
      if (sortedDocs.length > 0) {
        setSelectedDocumentId(sortedDocs[0].id);
      }
    }
  }, [documents, selectedDocumentId]);

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

  // Get available document periods for selection
  const availableDocuments = useMemo(() => {
    if (!documents) return [];
    
    return documents
      .filter(doc => doc.document_type === 'pnl' && doc.start_date && doc.end_date)
      .map(doc => ({
        id: doc.id,
        label: `P&L - ${formatPeriodLabel(doc.start_date!, doc.end_date!)}`,
        start_date: doc.start_date!,
        end_date: doc.end_date!,
        document: doc
      }))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }, [documents]);


  // Process KPIs into chart data using memoization with guards
  const financialData = useMemo((): { revenue: number; expenses: ExpenseCategory[] } => {
    // Guard: only process if we have KPIs and a selected document
    if (!kpis || !selectedDocumentId) {
      return { revenue: 0, expenses: [] };
    }

    // Use precomputed KPIs from server
    const totalRevenue = kpis.revenue_total || 0;
    const cogsTotal = kpis.cogs_total || 0;
    const opexTotal = kpis.opex_total || 0;

    // Create expense categories from KPI totals
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280'];
    const expenses: ExpenseCategory[] = [];

    if (cogsTotal > 0) {
      expenses.push({
        name: 'Cost of Goods Sold',
        value: cogsTotal,
        color: colors[0]
      });
    }

    if (opexTotal > 0) {
      expenses.push({
        name: 'Operating Expenses',
        value: opexTotal,
        color: colors[1]
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('💰 Revenue:', totalRevenue, 'COGS:', cogsTotal, 'OpEx:', opexTotal);
    }

    return { revenue: totalRevenue, expenses };
  }, [kpis, selectedDocumentId]);

  const totalExpenses = useMemo(() => 
    financialData.expenses.reduce((sum, category) => sum + category.value, 0),
    [financialData.expenses]
  );

  const chartData = {
    labels: financialData.expenses.map(item => item.name),
    datasets: [
      {
        data: financialData.expenses.map(item => item.value),
        backgroundColor: financialData.expenses.map(item => item.color),
        borderColor: financialData.expenses.map(item => item.color),
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed;
            const percentage = ((value / totalExpenses) * 100).toFixed(1);
            return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };


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
  if (!documents || documents.length === 0) {
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
        
        {/* Document Selector */}
        <div className="mt-4">
          <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select document" />
            </SelectTrigger>
            <SelectContent>
              {availableDocuments.map((doc) => (
                <SelectItem key={doc.document.id} value={doc.document.id}>
                  {doc.document.source || 'Untitled Document'} ({formatPeriodLabel(doc.start_date, doc.end_date)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        ) : financialData.expenses.length > 0 || financialData.revenue > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2">
              <div className="h-80 w-full">
                <Pie data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Summary Stats */}
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Total Revenue</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(financialData.revenue)}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Top Categories
                </h4>
                {financialData.expenses
                  .sort((a: ExpenseCategory, b: ExpenseCategory) => b.value - a.value)
                  .slice(0, 5)
                  .map((category: ExpenseCategory) => {
                    const percentage = totalExpenses > 0 ? ((category.value / totalExpenses) * 100).toFixed(1) : '0';
                    return (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-foreground">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatCurrency(category.value)}</div>
                          <div className="text-xs text-muted-foreground">{percentage}%</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
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
