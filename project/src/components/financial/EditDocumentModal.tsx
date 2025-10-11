import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign } from 'lucide-react';
import type { FinancialDocument, DocumentType } from '../../models/FinancialStatement';

interface EditDocumentModalProps {
  document: FinancialDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDocument: FinancialDocument) => Promise<void>;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onSave
}) => {
  const [editedDocument, setEditedDocument] = useState<FinancialDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setEditedDocument({ ...document });
    }
  }, [document]);

  if (!isOpen || !editedDocument) return null;

  const handleSave = async () => {
    if (!editedDocument) return;
    
    setIsSaving(true);
    try {
      await onSave(editedDocument);
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof FinancialDocument, value: any) => {
    if (!editedDocument) return;
    setEditedDocument(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateSummaryMetric = (key: string, value: number) => {
    if (!editedDocument) return;
    setEditedDocument(prev => prev ? {
      ...prev,
      summary_metrics: {
        ...prev.summary_metrics,
        [key]: value
      }
    } : null);
  };

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'pnl': return 'Profit & Loss';
      case 'balance_sheet': return 'Balance Sheet';
      case 'cash_flow': return 'Cash Flow';
      default: return type;
    }
  };

  // Remove unused formatCurrency function

  const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/[$,]/g, '')) || 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Edit {getDocumentTypeLabel(editedDocument.document_type)}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Document Type
            </label>
            <select
              value={editedDocument.document_type}
              onChange={(e) => updateField('document_type', e.target.value as DocumentType)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
            >
              <option value="pnl">Profit & Loss</option>
              <option value="balance_sheet">Balance Sheet</option>
              <option value="cash_flow">Cash Flow</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={editedDocument.start_date || ''}
                onChange={(e) => updateField('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={editedDocument.end_date || ''}
                onChange={(e) => updateField('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status
            </label>
            <select
              value={editedDocument.status || 'pending'}
              onChange={(e) => updateField('status', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
            >
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Financial Metrics */}
          {editedDocument.summary_metrics && Object.keys(editedDocument.summary_metrics).length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Financial Metrics
              </h3>
              <div className="space-y-4">
                {Object.entries(editedDocument.summary_metrics).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <input
                        type="text"
                        value={typeof value === 'number' ? value.toLocaleString() : String(value || '')}
                        onChange={(e) => updateSummaryMetric(key, parseCurrency(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence Score */}
          {editedDocument.confidence_score !== undefined && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Confidence Score
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={editedDocument.confidence_score || 0}
                onChange={(e) => updateField('confidence_score', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Value between 0.00 and 1.00 (current: {((editedDocument.confidence_score || 0) * 100).toFixed(1)}%)
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-foreground bg-muted rounded-md hover:bg-muted/80 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
