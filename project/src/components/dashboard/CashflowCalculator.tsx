import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  TrendingUp, 
  AlertTriangle, 
  Info,
  PieChart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import RadialCashflowCharts from './RadialCashflowCharts';

interface CashflowData {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  ownerDistributions: number;
  taxes: number;
}

interface Calculations {
  totalCogs: number;
  totalExpenses: number;
  grossProfit: number;
  netBeforeOwnerPay: number;
  cashLeftInBusiness: number;
  grossProfitMargin: number;
  netBeforeOwnerMargin: number;
  ownerDistributionRate: number;
  cashLeftMargin: number;
}

// Shared hook for calculations
export function useCashflowCalculations(data: CashflowData): Calculations {
  return useMemo(() => {
    const totalCogs = data.cogs;
    const totalExpenses = data.operatingExpenses;
    const grossProfit = data.revenue - totalCogs;
    const netBeforeOwnerPay = grossProfit - totalExpenses - data.taxes;
    const cashLeftInBusiness = netBeforeOwnerPay - data.ownerDistributions;
    
    const grossProfitMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0;
    const netBeforeOwnerMargin = data.revenue > 0 ? (netBeforeOwnerPay / data.revenue) * 100 : 0;
    const ownerDistributionRate = data.revenue > 0 ? (data.ownerDistributions / data.revenue) * 100 : 0;
    const cashLeftMargin = data.revenue > 0 ? (cashLeftInBusiness / data.revenue) * 100 : 0;

    return {
      totalCogs,
      totalExpenses,
      grossProfit,
      netBeforeOwnerPay,
      cashLeftInBusiness,
      grossProfitMargin,
      netBeforeOwnerMargin,
      ownerDistributionRate,
      cashLeftMargin,
    };
  }, [data]);
}

// Shared formatting functions
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (percentage: number) => {
  return `${percentage.toFixed(1)}%`;
};

// Main Calculator Inputs Card - matches height with Revenue Curve Preview
export function CashflowInputs({ data, setData }: { 
  data: CashflowData; 
  setData: React.Dispatch<React.SetStateAction<CashflowData>> 
}) {
  const calculations = useCashflowCalculations(data);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Business Cash Flow Calculator
        </CardTitle>
        <p className="text-sm text-muted">
          Understand where your money really goes and solve the "I'm profitable but broke" mystery
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Primary Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Monthly Revenue</label>
            <Input
              type="number"
              value={data.revenue}
              onChange={(e) => setData(prev => ({ ...prev, revenue: parseFloat(e.target.value) || 0 }))}
              className="text-right"
            />
          </div>
          
          {/* COGS */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cost of Goods Sold</label>
            <Input
              type="number"
              value={data.cogs}
              onChange={(e) => setData(prev => ({ ...prev, cogs: parseFloat(e.target.value) || 0 }))}
              className="text-right"
            />
          </div>
          
          {/* Operating Expenses */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Operating Expenses</label>
            <Input
              type="number"
              value={data.operatingExpenses}
              onChange={(e) => setData(prev => ({ ...prev, operatingExpenses: parseFloat(e.target.value) || 0 }))}
              className="text-right"
            />
          </div>
          
          {/* Owner Distributions - Primary Focus */}
          <div className="space-y-2 bg-accent/10 p-3 rounded-lg border border-accent/20">
            <label className="text-sm font-medium text-accent">Owner Distributions</label>
            <Input
              type="number"
              value={data.ownerDistributions}
              onChange={(e) => setData(prev => ({ ...prev, ownerDistributions: parseFloat(e.target.value) || 0 }))}
              className="text-right border-accent/30"
            />
            <p className="text-xs text-accent/80">Money you take home to live on</p>
          </div>
        </div>

        {/* Taxes Input */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Taxes</label>
            <Input
              type="number"
              value={data.taxes}
              onChange={(e) => setData(prev => ({ ...prev, taxes: parseFloat(e.target.value) || 0 }))}
              className="text-right"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Full-Width Visualization Component
export function CashflowVisualization({ data }: { data: CashflowData }) {
  const calculations = useCashflowCalculations(data);

  return (
    <div className="space-y-6">
      {/* Full-Width Sankey Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Money Flow Visualization
          </CardTitle>
          <p className="text-sm text-muted">
            See exactly where your revenue goes and how much is left for business growth
          </p>
        </CardHeader>
        
        <CardContent>
          <RadialCashflowCharts data={data} calculations={calculations} />
        </CardContent>
      </Card>

      {/* Reality Check Box - Primary Business Insight */}
      <Card className="bg-accent/10 border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-accent mt-0.5" />
            <div className="space-y-3">
              <h4 className="text-xl font-semibold text-accent">The "I'm Profitable But Broke" Reality Check</h4>
              <div className="text-sm text-foreground space-y-2">
                <p>• Your business shows <strong>{formatPercentage(calculations.netBeforeOwnerMargin)} profit margin</strong> BEFORE you pay yourself</p>
                <p>• You take <strong>{formatPercentage(calculations.ownerDistributionRate)} of revenue</strong> ({formatCurrency(data.ownerDistributions)}) to live on</p>
                <p>• This leaves only <strong>{formatPercentage(calculations.cashLeftMargin)}</strong> ({formatCurrency(calculations.cashLeftInBusiness)}) in the business for growth, emergencies, and equipment</p>
              </div>
              
              {calculations.cashLeftMargin < 5 && (
                <div className="p-4 bg-red-900/20 rounded border border-red-800">
                  <p className="text-sm text-red-200">
                    <strong>⚠️ Warning:</strong> You have less than 5% left for business growth. This explains why you feel cash-strapped despite being "profitable."
                  </p>
                </div>
              )}
              
              {calculations.cashLeftMargin >= 5 && calculations.cashLeftMargin < 15 && (
                <div className="p-4 bg-yellow-900/20 rounded border border-yellow-800">
                  <p className="text-sm text-yellow-200">
                    <strong>⚠️ Caution:</strong> You have {formatPercentage(calculations.cashLeftMargin)} for growth. This is workable but tight for scaling your business.
                  </p>
                </div>
              )}
              
              {calculations.cashLeftMargin >= 15 && (
                <div className="p-4 bg-green-900/20 rounded border border-green-800">
                  <p className="text-sm text-green-200">
                    <strong>✅ Good:</strong> You have {formatPercentage(calculations.cashLeftMargin)} left for business growth and investments.
                  </p>
                </div>
              )}

              <div className="bg-card p-4 rounded-lg border border-border">
                <h5 className="font-medium text-accent mb-2">The Spouse's Question: "Can we pay bills this month?"</h5>
                <p className="text-sm text-foreground">
                  <strong>Answer:</strong> You're taking <strong>{formatCurrency(data.ownerDistributions)}</strong> home from the business this month.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component that manages state and combines both parts
export function CashflowCalculator() {
  const [data, setData] = useState<CashflowData>({
    revenue: 100000,
    cogs: 20000,
    operatingExpenses: 30000,
    ownerDistributions: 24000,
    taxes: 4800,
  });

  return (
    <div className="space-y-6">
      <CashflowInputs data={data} setData={setData} />
      <CashflowVisualization data={data} />
    </div>
  );
}

export default CashflowCalculator;
