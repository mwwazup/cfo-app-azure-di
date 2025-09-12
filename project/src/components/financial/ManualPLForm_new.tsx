import React, { useState } from 'react';
import { DollarSign, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { AzureDocumentService } from '../../services/azureDocumentService';
import type { FinancialDocument, FinancialMetric } from '../../models/FinancialStatement';

interface ManualPLFormProps {
  onClose: () => void;
  onSave: () => void;
}

interface PLFormData {
  // Period Information
  startDate: string;
  endDate: string;
  
  // Revenue Section
  revenue: number;
  otherIncome: number;
  
  // Cost of Goods Sold
  cogs: number;
  
  // Operating Expenses
  rent: number;
  salaries: number;
  marketing: number;
  utilities: number;
  insurance: number;
  professionalFees: number;
  travel: number;
  mealsEntertainment: number;
}

export const ManualPLForm: React.FC<ManualPLFormProps> = ({ onClose, onSave }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<PLFormData>({
    startDate: '',
    endDate: '',
    revenue: 0,
    otherIncome: 0,
    cogs: 0,
    rent: 0,
    salaries: 0,
    marketing: 0,
    utilities: 0,
    insurance: 0,
    professionalFees: 0,
    travel: 0,
    mealsEntertainment: 0
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: keyof PLFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (field.includes('Date') ? value : parseFloat(value) || 0) : value
    }));
  };

  const calculateGrossProfit = () => {
    return (formData.revenue + formData.otherIncome) - formData.cogs;
  };

  const calculateOperatingExpenses = () => {
    return formData.rent + formData.salaries + formData.marketing + 
           formData.utilities + formData.insurance + formData.professionalFees + 
           formData.travel + formData.mealsEntertainment;
  };

  const calculateNetIncome = () => {
    return calculateGrossProfit() - calculateOperatingExpenses();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    
    try {
      // Create document data
      const documentData: Partial<FinancialDocument> = {
        document_type: 'pnl',
        start_date: formData.startDate || '2024-01-01',
        end_date: formData.endDate || '2024-12-31',
        status: 'approved',
        source: 'manual_entry',
        confidence_score: 1.0,
        summary_metrics: {
          revenue: formData.revenue,
          otherIncome: formData.otherIncome,
          cogs: formData.cogs,
          rent: formData.rent,
          salaries: formData.salaries,
          marketing: formData.marketing,
          utilities: formData.utilities,
          insurance: formData.insurance,
          professionalFees: formData.professionalFees,
          travel: formData.travel,
          mealsEntertainment: formData.mealsEntertainment,
          grossProfit: calculateGrossProfit(),
          netIncome: calculateNetIncome()
        }
      };

      // Create metrics array
      const metrics: Partial<FinancialMetric>[] = [
        // Revenue metrics
        { label: 'Revenue', value: formData.revenue, category: 'revenue', is_verified: true },
        { label: 'Other Income', value: formData.otherIncome, category: 'revenue', is_verified: true },
        
        // COGS metrics
        { label: 'Cost of Goods Sold', value: formData.cogs, category: 'cogs', is_verified: true },
        
        // Operating expense metrics
        { label: 'Rent', value: formData.rent, category: 'expense', is_verified: true },
        { label: 'Salaries', value: formData.salaries, category: 'expense', is_verified: true },
        { label: 'Marketing', value: formData.marketing, category: 'expense', is_verified: true },
        { label: 'Utilities', value: formData.utilities, category: 'expense', is_verified: true },
        { label: 'Insurance', value: formData.insurance, category: 'expense', is_verified: true },
        { label: 'Professional Fees', value: formData.professionalFees, category: 'expense', is_verified: true },
        { label: 'Travel', value: formData.travel, category: 'expense', is_verified: true },
        { label: 'Meals and Entertainment', value: formData.mealsEntertainment, category: 'expense', is_verified: true },
        
        // KPI metrics
        { label: 'Gross Profit', value: calculateGrossProfit(), category: 'kpi', is_verified: true },
        { label: 'Net Income', value: calculateNetIncome(), category: 'kpi', is_verified: true }
      ].filter(metric => metric.value > 0); // Only include non-zero values

      // Create extracted data format for saving
      const extractedFields: Record<string, { value: string | number; confidence: number; boundingBox: number[] }> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value === 'number' || typeof value === 'string') {
          extractedFields[key] = { value, confidence: 1.0, boundingBox: [] };
        }
      });

      const extractedData = {
        document: { ...documentData, user_id: user.id },
        extractedFields,
        summary: documentData.summary_metrics,
        metadata: { 
          processingTime: 0,
          confidence: 1.0, 
          documentId: `manual_${Date.now()}`,
          extractedAt: new Date().toISOString(),
          pageCount: 1
        },
        documentType: 'pnl' as const,
        azureData: {},
        tables: []
      };

      await AzureDocumentService.saveDocument(extractedData, metrics as FinancialMetric[]);
      
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              Manual P&L Entry
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Period Information */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Revenue Section */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revenue
                </label>
                <input
                  type="number"
                  value={formData.revenue}
                  onChange={(e) => handleInputChange('revenue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Income
                </label>
                <input
                  type="number"
                  value={formData.otherIncome}
                  onChange={(e) => handleInputChange('otherIncome', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Cost of Goods Sold */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost of Goods Sold</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost of Goods Sold
              </label>
              <input
                type="number"
                value={formData.cogs}
                onChange={(e) => handleInputChange('cogs', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Expenses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rent
                </label>
                <input
                  type="number"
                  value={formData.rent}
                  onChange={(e) => handleInputChange('rent', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salaries
                </label>
                <input
                  type="number"
                  value={formData.salaries}
                  onChange={(e) => handleInputChange('salaries', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marketing
                </label>
                <input
                  type="number"
                  value={formData.marketing}
                  onChange={(e) => handleInputChange('marketing', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Utilities
                </label>
                <input
                  type="number"
                  value={formData.utilities}
                  onChange={(e) => handleInputChange('utilities', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance
                </label>
                <input
                  type="number"
                  value={formData.insurance}
                  onChange={(e) => handleInputChange('insurance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Fees
                </label>
                <input
                  type="number"
                  value={formData.professionalFees}
                  onChange={(e) => handleInputChange('professionalFees', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Travel
                </label>
                <input
                  type="number"
                  value={formData.travel}
                  onChange={(e) => handleInputChange('travel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meals & Entertainment
                </label>
                <input
                  type="number"
                  value={formData.mealsEntertainment}
                  onChange={(e) => handleInputChange('mealsEntertainment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Gross Profit:</span>
                <span className={calculateGrossProfit() >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(calculateGrossProfit())}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Operating Expenses:</span>
                <span className="text-red-600">
                  {formatCurrency(calculateOperatingExpenses())}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Net Income:</span>
                <span className={calculateNetIncome() >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {formatCurrency(calculateNetIncome())}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save P&L Statement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
