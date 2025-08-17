import React, { useState, useEffect, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { FinancialDocument, FinancialMetric } from '../../models/FinancialStatement';
import { AzureDocumentService } from '../../services/azureDocumentService';

ChartJS.register(ArcElement, Tooltip, Legend);

interface WhereDidTheMoneyGoProps {
  documents: FinancialDocument[];
}


interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

export const WhereDidTheMoneyGo: React.FC<WhereDidTheMoneyGoProps> = ({ documents }) => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [documentMetrics, setDocumentMetrics] = useState<Record<string, FinancialMetric[]>>({});

  // Load financial metrics for all documents and auto-select most recent
  useEffect(() => {
    const loadMetrics = async () => {
      const metricsMap: Record<string, FinancialMetric[]> = {};
      
      for (const doc of documents) {
        if (doc.id) {
          try {
            const metrics = await AzureDocumentService.getFinancialMetrics(doc.id);
            if (metrics && metrics.length > 0) {
              metricsMap[doc.id] = metrics;
              console.log(`📊 Loaded ${metrics.length} metrics for document ${doc.id}:`, metrics);
            }
          } catch (error) {
            console.error(`Error loading metrics for document ${doc.id}:`, error);
          }
        }
      }
      
      setDocumentMetrics(metricsMap);
      
      // Auto-select the most recent document if none selected
      if (!selectedDocumentId && documents.length > 0) {
        const sortedDocs = documents
          .filter(doc => doc.start_date)
          .sort((a, b) => new Date(b.start_date!).getTime() - new Date(a.start_date!).getTime());
        if (sortedDocs.length > 0) {
          setSelectedDocumentId(sortedDocs[0].id!);
        }
      }
    };

    if (documents.length > 0) {
      loadMetrics();
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
    console.log('🔍 Building available documents list from:', documents);
    const result = documents
      .filter(doc => {
        console.log(`🔍 Document ${doc.id}: type=${doc.document_type}, start_date=${doc.start_date}, end_date=${doc.end_date}`);
        // Only include P&L documents that have proper date ranges
        return doc.document_type === 'pnl' && doc.start_date && doc.end_date;
      })
      .map(doc => {
        const label = `P&L - ${formatPeriodLabel(doc.start_date!, doc.end_date!)}`;
        console.log(`🔍 Created label for ${doc.id}: ${label}`);
        return {
          id: doc.id!,
          label,
          start_date: doc.start_date!,
          end_date: doc.end_date!,
          document: doc
        };
      })
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    
    console.log('🔍 Final available documents:', result);
    return result;
  }, [documents]);

  // Filter documents based on selected document (single document view)
  const filteredDocuments = useMemo(() => {
    // Only work with P&L documents
    const pnlDocuments = documents.filter(doc => doc.document_type === 'pnl');
    
    // Always show single document view
    if (selectedDocumentId) {
      const selectedDoc = pnlDocuments.find(doc => doc.id === selectedDocumentId);
      return selectedDoc ? [selectedDoc] : [];
    }

    // If no document selected, return empty (will be auto-selected by useEffect)
    return [];
  }, [documents, selectedDocumentId]);

  // Aggregate financial data from documents using real Supabase metrics
  const financialData = useMemo((): { revenue: number; expenses: ExpenseCategory[] } => {
    const aggregatedExpenses: Record<string, number> = {};
    let totalRevenue = 0;

    console.log(`🔍 FILTERED DOCUMENTS (${filteredDocuments.length}):`, filteredDocuments.map(d => ({
      id: d.id,
      period: `${d.start_date} to ${d.end_date}`,
      type: d.document_type
    })));

    filteredDocuments.forEach(doc => {
      console.log(`🔍 Processing document ${doc.id} (${doc.start_date} to ${doc.end_date}):`, doc);
      
      // Use actual metrics from Supabase instead of summary_metrics
      const metrics = doc.id ? documentMetrics[doc.id] : [];
      console.log(`📊 Document metrics from Supabase:`, metrics);
      
      if (metrics && metrics.length > 0) {
        metrics.forEach(metric => {
          console.log(`🔍 Processing metric: "${metric.label}" with value:`, metric.value);
          const numValue = typeof metric.value === 'number' ? metric.value : parseFloat(String(metric.value)) || 0;
          
          const lowerLabel = metric.label.toLowerCase();
          console.log(`🔍 Lowercase label: "${lowerLabel}"`);
          
          // Only match "Total Revenue" exactly - not "Net Income" 
          if (lowerLabel === 'total revenue') {
            console.log(`💰 REVENUE MATCH: "${metric.label}" -> ${numValue} (from doc ${doc.id})`);
            totalRevenue = Math.abs(numValue); // Use assignment, not addition for single document
          }
          // Categorize expenses
          else if (lowerLabel.includes('cost of goods') || lowerLabel.includes('cogs') || 
                   lowerLabel.includes('cost of sales') || lowerLabel.includes('direct costs')) {
            console.log(`📊 EXPENSE MATCH (COGS): "${metric.label}" -> ${numValue}`);
            aggregatedExpenses['Cost of Goods Sold'] = (aggregatedExpenses['Cost of Goods Sold'] || 0) + Math.abs(numValue);
          } else if (lowerLabel.includes('operating expense') || lowerLabel.includes('operating costs')) {
            console.log(`📊 EXPENSE MATCH (Operating): "${metric.label}" -> ${numValue}`);
            aggregatedExpenses['Operating Expenses'] = (aggregatedExpenses['Operating Expenses'] || 0) + Math.abs(numValue);
          } else if (lowerLabel.includes('marketing') || lowerLabel.includes('advertising') || 
                     lowerLabel.includes('promotion') || lowerLabel.includes('sales expense')) {
            console.log(`📊 EXPENSE MATCH (Marketing): "${metric.label}" -> ${numValue}`);
            aggregatedExpenses['Marketing & Advertising'] = (aggregatedExpenses['Marketing & Advertising'] || 0) + Math.abs(numValue);
          } else if (lowerLabel.includes('salary') || lowerLabel.includes('payroll') || 
                     lowerLabel.includes('wages') || lowerLabel.includes('compensation') || 
                     lowerLabel.includes('benefits') || lowerLabel.includes('employee')) {
            console.log(`📊 EXPENSE MATCH (Payroll): "${metric.label}" -> ${numValue}`);
            aggregatedExpenses['Payroll & Benefits'] = (aggregatedExpenses['Payroll & Benefits'] || 0) + Math.abs(numValue);
          } else if (lowerLabel.includes('rent') || lowerLabel.includes('utilities') || 
                     lowerLabel.includes('office') || lowerLabel.includes('facilities') || 
                     lowerLabel.includes('lease') || lowerLabel.includes('building')) {
            console.log(`📊 EXPENSE MATCH (Facilities): "${metric.label}" -> ${numValue}`);
            aggregatedExpenses['Facilities & Utilities'] = (aggregatedExpenses['Facilities & Utilities'] || 0) + Math.abs(numValue);
          } else if (lowerLabel.includes('expense') && !lowerLabel.includes('operating')) {
            console.log(`📊 EXPENSE MATCH (Other): "${metric.label}" -> ${numValue}`);
            aggregatedExpenses['Other Expenses'] = (aggregatedExpenses['Other Expenses'] || 0) + Math.abs(numValue);
          } else {
            console.log(`❌ NO MATCH for metric: "${metric.label}" (${lowerLabel})`);
          }
        });
      }
    });

    console.log(`💰 Final calculated revenue: ${totalRevenue}`);
    console.log(`📊 Final aggregated expenses:`, aggregatedExpenses);


    // Return empty data if no documents are available
    if (Object.keys(aggregatedExpenses).length === 0 && totalRevenue === 0) {
      console.log('⚠️ No financial data found, returning empty result');
      return {
        revenue: 0,
        expenses: []
      };
    }

    // Convert expenses to array with colors
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280', '#ec4899', '#14b8a6'];
    const expenses = Object.entries(aggregatedExpenses)
      .filter(([_, value]) => value > 0)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }));

    return { revenue: totalRevenue, expenses };
  }, [filteredDocuments, documentMetrics]);

  const totalExpenses = financialData.expenses.reduce((sum, category) => sum + category.value, 0);

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
                <SelectItem key={doc.document.id} value={doc.document.id!}>
                  {doc.document.source || 'Untitled Document'} ({formatPeriodLabel(doc.start_date, doc.end_date)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {financialData.expenses.length > 0 || financialData.revenue > 0 ? (
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
                    const percentage = ((category.value / totalExpenses) * 100).toFixed(1);
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
              {filteredDocuments.length === 0 
                ? "No documents match the selected time period. Try selecting a different period or upload financial documents."
                : "No financial metrics found in the selected documents. Ensure documents contain revenue and expense data."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
