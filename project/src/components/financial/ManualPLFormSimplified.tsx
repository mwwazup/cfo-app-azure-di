import React, { useState, useEffect } from 'react';
import { DollarSign, Save, X, Calculator } from 'lucide-react';
import { useAuthContext } from '../../contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ManualPLFormProps {
  onClose: () => void;
  onSave: () => void;
  onCashflowSync?: (data: CashflowSyncData) => void;
}

interface CashflowSyncData {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  ownerDistributions: number;
  taxes: number;
}

interface PLFormData {
  // Period Information
  startDate: string;
  endDate: string;
  
  // Simplified fields matching Business Cash Flow Calculator
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  ownerDistributions: number;
  taxes: number;
}

export const ManualPLFormSimplified: React.FC<ManualPLFormProps> = ({ 
  onClose, 
  onSave, 
  onCashflowSync 
}) => {
  const { dbUserId } = useAuthContext();
  const [formData, setFormData] = useState<PLFormData>({
    startDate: '',
    endDate: '',
    revenue: 0,
    cogs: 0,
    operatingExpenses: 0,
    ownerDistributions: 0,
    taxes: 0,
  });
  
  const [isSaving, setIsSaving] = useState(false);

  // Sync with cashflow calculator when form data changes
  useEffect(() => {
    if (onCashflowSync) {
      onCashflowSync({
        revenue: formData.revenue,
        cogs: formData.cogs,
        operatingExpenses: formData.operatingExpenses,
        ownerDistributions: formData.ownerDistributions,
        taxes: formData.taxes,
      });
    }
  }, [formData, onCashflowSync]);

  const handleInputChange = (field: keyof PLFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (field.includes('Date') ? value : parseFloat(value) || 0) : value
    }));
  };

  const calculateGrossProfit = () => {
    return formData.revenue - formData.cogs;
  };

  const calculateNetIncome = () => {
    return calculateGrossProfit() - formData.operatingExpenses - formData.taxes;
  };

  const calculateCashAfterOwnerPay = () => {
    return calculateNetIncome() - formData.ownerDistributions;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUserId) return;

    setIsSaving(true);
    
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5180';
      const response = await fetch(`${API_BASE_URL}/api/financial-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: dbUserId,
          document_type: 'pnl',
          start_date: formData.startDate,
          end_date: formData.endDate,
          raw_json: {
            revenue: { value: formData.revenue, confidence: 1.0, boundingBox: [] },
            cogs: { value: formData.cogs, confidence: 1.0, boundingBox: [] },
            operatingExpenses: { value: formData.operatingExpenses, confidence: 1.0, boundingBox: [] },
            ownerDistributions: { value: formData.ownerDistributions, confidence: 1.0, boundingBox: [] },
            taxes: { value: formData.taxes, confidence: 1.0, boundingBox: [] },
          },
          summary_metrics: {
            totalRevenue: formData.revenue,
            totalExpenses: formData.cogs + formData.operatingExpenses + formData.taxes,
            netProfit: calculateNetIncome(),
            grossProfit: calculateGrossProfit(),
            cashAfterOwnerPay: calculateCashAfterOwnerPay()
          },
          confidence_score: 1.0,
          status: 'approved',
          source: 'manual_entry',
          filename: `manual_pnl_${Date.now()}.json`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ P&L document saved successfully:', result.data?.id);
      
      onSave();
      onClose();
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      notification.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        P&L statement saved successfully!
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving P&L statement:', error);
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      notification.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Error saving P&L statement. Please try again.
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-accent" />
              Manual P&L Entry
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-muted-foreground mt-2">
            Enter your P&L data using the same fields as the Business Cash Flow Calculator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Period Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Period Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="text-foreground"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Data - Matching Business Cash Flow Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Financial Data (Matches Business Cash Flow Calculator)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Monthly Revenue */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Monthly Revenue</label>
                  <Input
                    type="number"
                    value={formData.revenue}
                    onChange={(e) => handleInputChange('revenue', e.target.value)}
                    className="text-right text-foreground"
                    placeholder="0"
                  />
                </div>
                
                {/* Cost of Goods Sold */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Cost of Goods Sold</label>
                  <Input
                    type="number"
                    value={formData.cogs}
                    onChange={(e) => handleInputChange('cogs', e.target.value)}
                    className="text-right text-foreground"
                    placeholder="0"
                  />
                </div>
                
                {/* Operating Expenses */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Operating Expenses</label>
                  <Input
                    type="number"
                    value={formData.operatingExpenses}
                    onChange={(e) => handleInputChange('operatingExpenses', e.target.value)}
                    className="text-right text-foreground"
                    placeholder="0"
                  />
                </div>
                
                {/* Owner Distributions - Highlighted */}
                <div className="space-y-2 bg-accent/10 p-3 rounded-lg border border-accent/20">
                  <label className="text-sm font-medium text-accent">Owner Distributions</label>
                  <Input
                    type="number"
                    value={formData.ownerDistributions}
                    onChange={(e) => handleInputChange('ownerDistributions', e.target.value)}
                    className="text-right text-foreground border-accent/30"
                    placeholder="0"
                  />
                  <p className="text-xs text-accent/80">Money you take home to live on</p>
                </div>
                
                {/* Taxes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Taxes</label>
                  <Input
                    type="number"
                    value={formData.taxes}
                    onChange={(e) => handleInputChange('taxes', e.target.value)}
                    className="text-right text-foreground"
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Gross Profit:</span>
                  <span className={calculateGrossProfit() >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                    {formatCurrency(calculateGrossProfit())}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Net Income (Before Owner Pay):</span>
                  <span className={calculateNetIncome() >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                    {formatCurrency(calculateNetIncome())}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-bold text-foreground">Cash Left in Business:</span>
                  <span className={calculateCashAfterOwnerPay() >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                    {formatCurrency(calculateCashAfterOwnerPay())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-border">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save P&L Statement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualPLFormSimplified;
