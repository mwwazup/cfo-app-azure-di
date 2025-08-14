import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DollarSign, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../contexts/auth-context';
import { KPIRecord } from '../../services/kpiRecordsService';

interface MoneyBreakdownProps {
  kpi: KPIRecord;
}

interface RevenueData {
  actual_revenue: number;
  profit_margin: number;
  owner_draws?: number;
}

export function MoneyBreakdown({ kpi }: MoneyBreakdownProps) {
  const { user } = useAuth();
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenueData = async () => {
      if (!user?.id) return;
      
      try {
        const periodDate = new Date(kpi.period);
        const year = periodDate.getFullYear();
        const month = periodDate.getMonth() + 1;

        // First try to get data with owner_draws, fallback if column doesn't exist
        let data: RevenueData | null = null;
        let error: any = null;
        
        try {
          const result = await supabase
            .from('revenue_entries')
            .select('actual_revenue, profit_margin, owner_draws')
            .eq('user_id', user.id)
            .eq('year', year)
            .eq('month', month)
            .single();
          
          data = result.data;
          error = result.error;
        } catch (fallbackError) {
          // If owner_draws column doesn't exist, fallback to basic query
          console.log('Falling back to basic revenue query for MoneyBreakdown');
          const result = await supabase
            .from('revenue_entries')
            .select('actual_revenue, profit_margin')
            .eq('user_id', user.id)
            .eq('year', year)
            .eq('month', month)
            .single();
          
          const basicData = result.data as { actual_revenue: number; profit_margin: number };
          error = result.error;
          
          // Add owner_draws as 0 for backwards compatibility
          if (basicData) {
            data = {
              ...basicData,
              owner_draws: 0
            };
          }
        }

        if (error) {
          console.error('Error fetching revenue data:', error);
          return;
        }

        setRevenueData(data);
      } catch (error) {
        console.error('Error fetching revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, [user?.id, kpi.period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!revenueData) {
    return (
      <Card className="w-full">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">No revenue data available for breakdown</p>
        </CardContent>
      </Card>
    );
  }

  const revenue = revenueData.actual_revenue || 0;
  const profitMargin = revenueData.profit_margin || 0;
  const ownerDraws = revenueData.owner_draws || 0;
  const netProfit = revenue * (profitMargin / 100);
  const netProfitAfterDraws = kpi.kpi_value;
  const hasOwnerDrawsData = revenueData.hasOwnProperty('owner_draws') && revenueData.owner_draws !== undefined;

  const getStatusColor = () => {
    if (netProfitAfterDraws < 0) return 'text-red-600 bg-red-50 border-red-200';
    if (netProfitAfterDraws < netProfit * 0.1) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (netProfitAfterDraws < 0) return AlertTriangle;
    if (netProfitAfterDraws < netProfit * 0.1) return AlertTriangle;
    return CheckCircle;
  };

  const StatusIcon = getStatusIcon();

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" />
          Where Did the Money Go?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Revenue Flow */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">Revenue:</span>
              <span className="font-bold text-lg">{formatCurrency(revenue)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground ml-4">
                Net Profit ({profitMargin.toFixed(1)}%):
              </span>
              <span className="font-semibold">{formatCurrency(netProfit)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground ml-4">
                Owner Draw:
              </span>
              {hasOwnerDrawsData ? (
                <span className="font-semibold text-red-600">
                  -{formatCurrency(ownerDraws)}
                </span>
              ) : (
                <span className="font-semibold text-gray-500">
                  $0 (Apply migrations to track)
                </span>
              )}
            </div>
            
            <div className={`flex justify-between items-center py-3 px-4 rounded-lg border-2 ${getStatusColor()}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className="h-4 w-4" />
                <span className="font-bold">Leftover Cash:</span>
              </div>
              <span className="font-bold text-lg">{formatCurrency(netProfitAfterDraws)}</span>
            </div>
          </div>

          {/* Migration Notice */}
          {!hasOwnerDrawsData && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm font-medium text-yellow-800 mb-2">⚠️ Setup Required</div>
              <div className="text-sm text-yellow-700">
                To track owner draws and see the full "Where Did the Money Go?" breakdown, please apply the database migrations:
                <br />
                <code className="bg-yellow-100 px-2 py-1 rounded mt-2 inline-block">supabase db push</code>
              </div>
            </div>
          )}

          {/* Insight */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-2">💡 Key Insight</div>
            <div className="text-sm text-blue-700">
              {hasOwnerDrawsData ? (
                netProfitAfterDraws < 0 ? (
                  <>
                    You made {formatCurrency(netProfit)} profit, but took {formatCurrency(ownerDraws)} out for personal use. 
                    That leaves a <strong>{formatCurrency(Math.abs(netProfitAfterDraws))} shortfall</strong> that's eating into your business reserves.
                  </>
                ) : netProfitAfterDraws < netProfit * 0.1 ? (
                  <>
                    You made {formatCurrency(netProfit)} profit, but took {formatCurrency(ownerDraws)} out for personal use. 
                    That leaves just <strong>{formatCurrency(netProfitAfterDraws)}</strong> for taxes, reinvestment, or emergencies.
                  </>
                ) : (
                  <>
                    You made {formatCurrency(netProfit)} profit and took {formatCurrency(ownerDraws)} for personal use. 
                    That leaves <strong>{formatCurrency(netProfitAfterDraws)}</strong> - a healthy buffer for business growth and stability.
                  </>
                )
              ) : (
                <>
                  You made {formatCurrency(netProfit)} profit this month. Once you apply the database migrations, 
                  you'll be able to track owner draws and see exactly how much cash is left after paying yourself.
                </>
              )}
            </div>
          </div>

          {/* Action Recommendation */}
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm font-medium text-gray-800 mb-2">🎯 Rule of Thumb</div>
            <div className="text-sm text-gray-700">
              {hasOwnerDrawsData ? (
                netProfitAfterDraws < 0 ? (
                  'Only draw from what\'s left after saving for growth. Reduce personal draws or increase profit margin so the business can support your income.'
                ) : netProfitAfterDraws < netProfit * 0.1 ? (
                  'You\'re living close to the edge. Consider reducing draws slightly to build a stronger cash buffer for unexpected expenses.'
                ) : (
                  'Excellent financial discipline! Your business funds both your lifestyle and future growth. Consider reinvestment opportunities.'
                )
              ) : (
                'Apply the database migrations to start tracking owner draws and get personalized advice on sustainable draw levels.'
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
