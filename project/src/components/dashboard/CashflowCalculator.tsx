import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  TrendingUp, 
  AlertTriangle, 
  Info,
  PieChart,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface COGSData {
  materials: number;
  directLabor: number;
  shipping: number;
  otherCogs: number;
}

interface ExpensesData {
  rent: number;
  utilities: number;
  insurance: number;
  marketing: number;
  adminSalaries: number;
  professionalFees: number;
  equipment: number;
  otherExpenses: number;
}

interface CashflowData {
  revenue: number;
  cogs: COGSData;
  operatingExpenses: ExpensesData;
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
    const totalCogs = Object.values(data.cogs).reduce((sum, val) => sum + val, 0);
    const totalExpenses = Object.values(data.operatingExpenses).reduce((sum, val) => sum + val, 0);
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
  const [showCOGSBreakdown, setShowCOGSBreakdown] = useState(false);
  const [showExpensesBreakdown, setShowExpensesBreakdown] = useState(false);
  
  const calculations = useCashflowCalculations(data);

  const handleCOGSChange = (field: keyof COGSData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setData(prev => ({
      ...prev,
      cogs: { ...prev.cogs, [field]: numValue }
    }));
  };

  const handleExpenseChange = (field: keyof ExpensesData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setData(prev => ({
      ...prev,
      operatingExpenses: { ...prev.operatingExpenses, [field]: numValue }
    }));
  };

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
          
          {/* COGS Total with Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Cost of Goods Sold</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCOGSBreakdown(!showCOGSBreakdown)}
                className="h-6 px-2"
              >
                {showCOGSBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
            <Input
              type="number"
              value={calculations.totalCogs}
              readOnly
              className="text-right bg-muted"
            />
            <p className="text-xs text-muted">Materials, labor, shipping</p>
          </div>
          
          {/* Operating Expenses Total with Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Operating Expenses</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExpensesBreakdown(!showExpensesBreakdown)}
                className="h-6 px-2"
              >
                {showExpensesBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
            <Input
              type="number"
              value={calculations.totalExpenses}
              readOnly
              className="text-right bg-muted"
            />
            <p className="text-xs text-muted">Rent, utilities, marketing</p>
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

        {/* COGS Breakdown */}
        {showCOGSBreakdown && (
          <div className="bg-red-900/10 p-4 rounded-lg border border-red-800/20">
            <h4 className="text-sm font-medium text-foreground mb-3">Cost of Goods Sold Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted block">Materials/Inventory</label>
                <Input
                  type="number"
                  value={data.cogs.materials}
                  onChange={(e) => handleCOGSChange('materials', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Direct Labor</label>
                <Input
                  type="number"
                  value={data.cogs.directLabor}
                  onChange={(e) => handleCOGSChange('directLabor', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Shipping/Freight</label>
                <Input
                  type="number"
                  value={data.cogs.shipping}
                  onChange={(e) => handleCOGSChange('shipping', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Other COGS</label>
                <Input
                  type="number"
                  value={data.cogs.otherCogs}
                  onChange={(e) => handleCOGSChange('otherCogs', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Operating Expenses Breakdown */}
        {showExpensesBreakdown && (
          <div className="bg-orange-900/10 p-4 rounded-lg border border-orange-800/20">
            <h4 className="text-sm font-medium text-foreground mb-3">Operating Expenses Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted block">Rent/Lease</label>
                <Input
                  type="number"
                  value={data.operatingExpenses.rent}
                  onChange={(e) => handleExpenseChange('rent', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Utilities</label>
                <Input
                  type="number"
                  value={data.operatingExpenses.utilities}
                  onChange={(e) => handleExpenseChange('utilities', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Insurance</label>
                <Input
                  type="number"
                  value={data.operatingExpenses.insurance}
                  onChange={(e) => handleExpenseChange('insurance', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Marketing</label>
                <Input
                  type="number"
                  value={data.operatingExpenses.marketing}
                  onChange={(e) => handleExpenseChange('marketing', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Admin Salaries</label>
                <Input
                  type="number"
                  value={data.operatingExpenses.adminSalaries}
                  onChange={(e) => handleExpenseChange('adminSalaries', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Professional Fees</label>
                <Input
                  type="number"
                  value={data.operatingExpenses.professionalFees}
                  onChange={(e) => handleExpenseChange('professionalFees', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Equipment</label>
                <Input
                  type="number"
                  value={data.operatingExpenses.equipment}
                  onChange={(e) => handleExpenseChange('equipment', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted block">Other Expenses</label>
                <Input
                  type="number"
                  value={data.operatingExpenses.otherExpenses}
                  onChange={(e) => handleExpenseChange('otherExpenses', e.target.value)}
                  className="text-right text-sm"
                />
              </div>
            </div>
          </div>
        )}

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
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
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
          {/* CSS-based Sankey Flow */}
          <div className="space-y-4">
            {/* Revenue */}
            <div className="flex items-center justify-between p-4 bg-green-900/20 rounded-lg border border-green-800/30">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-lg font-semibold text-green-400">Total Revenue</span>
              </div>
              <span className="text-xl font-bold text-green-400">{formatCurrency(data.revenue)}</span>
            </div>
            
            {/* Flow to COGS */}
            <div className="ml-8 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted" />
                <div className="flex-1 h-2 bg-red-500/30 rounded relative">
                  <div 
                    className="h-full bg-red-500 rounded transition-all duration-500"
                    style={{ width: `${(calculations.totalCogs / data.revenue) * 100}%` }}
                  ></div>
                </div>
                <span className="text-red-400 font-medium">-{formatCurrency(calculations.totalCogs)} COGS</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded border border-blue-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="font-semibold text-blue-400">Gross Profit</span>
                </div>
                <span className="text-lg font-bold text-blue-400">
                  {formatCurrency(calculations.grossProfit)} ({formatPercentage(calculations.grossProfitMargin)})
                </span>
              </div>
            </div>

            {/* Flow to Operating Expenses */}
            <div className="ml-8 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted" />
                <div className="flex-1 h-2 bg-orange-500/30 rounded relative">
                  <div 
                    className="h-full bg-orange-500 rounded transition-all duration-500"
                    style={{ width: `${(calculations.totalExpenses / data.revenue) * 100}%` }}
                  ></div>
                </div>
                <span className="text-orange-400 font-medium">-{formatCurrency(calculations.totalExpenses)} OpEx</span>
              </div>
              
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted" />
                <div className="flex-1 h-2 bg-gray-500/30 rounded relative">
                  <div 
                    className="h-full bg-gray-500 rounded transition-all duration-500"
                    style={{ width: `${(data.taxes / data.revenue) * 100}%` }}
                  ></div>
                </div>
                <span className="text-gray-400 font-medium">-{formatCurrency(data.taxes)} Taxes</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded border border-purple-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="font-semibold text-purple-400">Net Before Owner Pay</span>
                </div>
                <span className="text-lg font-bold text-purple-400">
                  {formatCurrency(calculations.netBeforeOwnerPay)} ({formatPercentage(calculations.netBeforeOwnerMargin)})
                </span>
              </div>
            </div>

            {/* The Critical Split - Owner Distributions */}
            <div className="ml-8 bg-accent/10 p-4 rounded-lg border border-accent/20">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted" />
                  <div className="flex-1 h-3 bg-pink-500/30 rounded relative">
                    <div 
                      className="h-full bg-pink-500 rounded transition-all duration-500"
                      style={{ width: `${(data.ownerDistributions / data.revenue) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-pink-400 font-medium">
                    -{formatCurrency(data.ownerDistributions)} Owner Distributions ({formatPercentage(calculations.ownerDistributionRate)})
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg border-2 border-accent/30 bg-accent/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded ${calculations.cashLeftInBusiness > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-lg font-semibold text-accent">Cash Left in Business</span>
                  </div>
                  <span className={`text-2xl font-bold ${calculations.cashLeftInBusiness > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(calculations.cashLeftInBusiness)} ({formatPercentage(calculations.cashLeftMargin)})
                  </span>
                </div>
              </div>
            </div>
          </div>
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

      {/* Action Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
          className="flex items-center gap-2"
        >
          <Info className="h-4 w-4" />
          {showDetailedBreakdown ? 'Hide' : 'Show'} Technician-Business-Owner Context
        </Button>
      </div>

      {/* Detailed Breakdown for Technician-Turned-Business-Owner */}
      {showDetailedBreakdown && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-semibold text-foreground mb-4">For Your Technician-Turned-Business-Owner Context:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h5 className="font-medium text-accent">What This Means:</h5>
                <ul className="text-sm text-muted space-y-2">
                  <li>• Traditional P&L shows {formatPercentage(calculations.netBeforeOwnerMargin)} "profit"</li>
                  <li>• But you need {formatCurrency(data.ownerDistributions)} to live on</li>
                  <li>• Real business profit is only {formatPercentage(calculations.cashLeftMargin)}</li>
                  <li>• That {formatPercentage(calculations.cashLeftMargin)} is ALL you have for growth</li>
                  <li>• This explains why your bank account doesn't match your "profit"</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h5 className="font-medium text-accent">Action Steps:</h5>
                <ul className="text-sm text-muted space-y-2">
                  <li>• Track owner distributions separately from business expenses</li>
                  <li>• Set a target for cash left in business (10-20% is healthy)</li>
                  <li>• Either increase revenue or reduce personal distributions</li>
                  <li>• Plan equipment purchases from business cash only</li>
                  <li>• Consider if you're paying yourself too much too early</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-800/30">
              <h5 className="font-medium text-blue-400 mb-2">Key Insight for Small Business Owners:</h5>
              <p className="text-sm text-blue-200">
                The biggest difference between a struggling business and a growing business isn't revenue - it's how much cash is left in the business after the owner pays themselves. 
                Most technician-turned-business-owners take too much out too early, leaving nothing for growth, emergencies, or opportunities.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main component that manages state and combines both parts
export function CashflowCalculator() {
  const [data, setData] = useState<CashflowData>({
    revenue: 100000,
    cogs: {
      materials: 20000,
      directLabor: 15000,
      shipping: 2000,
      otherCogs: 3000,
    },
    operatingExpenses: {
      rent: 8000,
      utilities: 1500,
      insurance: 1200,
      marketing: 4000,
      adminSalaries: 6000,
      professionalFees: 800,
      equipment: 1000,
      otherExpenses: 2500,
    },
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
