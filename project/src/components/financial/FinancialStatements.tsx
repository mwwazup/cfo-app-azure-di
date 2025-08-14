import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AzureDocumentService } from '../../services/azureDocumentService';
import { useAuth } from '../../contexts/auth-context';
import type { DocumentType, FinancialDocument, FinancialMetric } from '../../models/FinancialStatement';

interface ProcessingResult {
  document: Omit<FinancialDocument, 'id' | 'user_id'> & { user_id: string };
  metrics: Array<Omit<FinancialMetric, 'id' | 'document_id'>>;
  confidence_score: number;
}

export const FinancialStatements: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>('pnl');
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<FinancialDocument | null>(null);
  const [documentMetrics, setDocumentMetrics] = useState<Array<FinancialMetric>>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isDocumentsCollapsed, setIsDocumentsCollapsed] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const loadFinancialDocuments = useCallback(async () => {
    try {
      if (!user) return;
      const docs = await AzureDocumentService.getFinancialDocuments(user.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading financial documents:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFinancialDocuments();
    }
  }, [user, loadFinancialDocuments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: DocumentType) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, JPG, or PNG file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    setSelectedDocumentType(documentType);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      console.log(`Processing ${documentType} document with Azure Document Service...`);
      
      // Process document with Azure Document Service
      const extractedData = await AzureDocumentService.processDocument(file, documentType, user.id);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log(' Raw extracted data:', extractedData);
      console.log(' Azure financial data:', extractedData.azureData);

      // Prepare document data for review
      const documentData: Omit<FinancialDocument, 'id' | 'user_id'> = {
        document_type: selectedDocumentType,
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        raw_json: extractedData.extractedFields || {},
        summary_metrics: extractedData.summary || {},
        confidence_score: extractedData.metadata?.confidence || 0,
        status: 'pending',
        source: 'azure_upload'
      };

      // Create metrics from the actual P&L financial data, not raw extractedFields
      let finalMetrics = [];
      
      if (extractedData.azureData && selectedDocumentType === 'pnl') {
        const azureData = extractedData.azureData;
        
        // Create properly formatted metrics for the review modal
        const pnlFields = [
          { key: 'pnl_totalRevenue', label: 'Total Revenue', value: azureData.pnl_totalRevenue },
          { key: 'pnl_costOfGoodsSold', label: 'Cost of Goods Sold', value: azureData.pnl_costOfGoodsSold },
          { key: 'pnl_grossProfit', label: 'Gross Profit', value: azureData.pnl_grossProfit },
          { key: 'pnl_operatingExpenses', label: 'Operating Expenses', value: azureData.pnl_operatingExpenses },
          { key: 'pnl_netIncome', label: 'Net Income', value: azureData.pnl_netIncome }
        ];
        
        finalMetrics = pnlFields
          .filter(field => field.value !== undefined && field.value !== null && field.value !== 0)
          .map(field => ({
            label: field.label,
            value: field.value as number, // Type assertion since we filtered out undefined values
            category: 'pnl',
            is_verified: false
          }));
      } else {
        // Fallback to extractedFields if azureData is not available
        finalMetrics = Object.keys(extractedData.extractedFields || {}).map(key => ({
          label: key.replace(/_/g, ' '),
          value: typeof extractedData.extractedFields[key]?.value === 'number' ? extractedData.extractedFields[key]?.value : 0,
          category: 'extracted',
          is_verified: false
        }));
      }

      console.log('📊 Final metrics for review modal:', finalMetrics);

      const processingResultData = {
        document: { ...documentData, user_id: user.id },
        metrics: finalMetrics,
        confidence_score: extractedData.metadata?.confidence || 0
      };

      console.log('🔍 Setting processing result:', processingResultData);
      setProcessingResult(processingResultData);

      console.log('🔍 Setting showReviewModal to true');
      setShowReviewModal(true);
      
    } catch (error) {
      console.error('Error processing document:', error);
      alert(`Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleApproveDocument = async () => {
    if (!processingResult || !user) return;

    try {
      // Save document and metrics to database
      const documentId = await AzureDocumentService.saveFinancialDocument(
        user.id,
        { ...processingResult.document, status: 'approved' },
        processingResult.metrics
      );

      console.log(`Financial document saved with ID: ${documentId}`);
      
      // Refresh documents list
      await loadFinancialDocuments();
      
      // Close modal
      setShowReviewModal(false);
      setProcessingResult(null);
      
      alert('Financial document saved successfully!');
    } catch (error) {
      console.error('Error saving document:', error);
      alert(`Error saving document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRejectDocument = () => {
    setShowReviewModal(false);
    setProcessingResult(null);
  };

  const viewDocument = async (document: FinancialDocument) => {
    setSelectedDocument(document);
    setIsLoadingMetrics(true);
    try {
      // Load document metrics from the document's summary_metrics
      if (document.summary_metrics && document.id) {
        const metrics = Object.keys(document.summary_metrics).map(key => ({
          id: `${document.id}_${key}`,
          document_id: document.id!,
          label: key,
          value: document.summary_metrics[key],
          category: 'summary',
          is_verified: false
        }));
        setDocumentMetrics(metrics);
      } else {
        setDocumentMetrics([]);
      }
    } catch (error) {
      console.error('Error loading document metrics:', error);
      setDocumentMetrics([]);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'pnl':
        return 'Profit & Loss';
      case 'balance_sheet':
        return 'Balance Sheet';
      case 'cash_flow':
        return 'Cash Flow';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'reviewed':
        return 'text-blue-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'reviewed':
        return <Eye className="h-4 w-4" />;
      case 'rejected':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const deleteDocument = async (documentId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this financial document? This action cannot be undone and may affect your KPIs.')) {
      return;
    }

    setDeletingDocumentId(documentId);
    
    try {
      const success = await AzureDocumentService.deleteFinancialDocument(documentId, user.id);
      
      if (success) {
        // Remove the document from the local state
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        
        // Close any open modals if the deleted document was being viewed
        if (selectedDocument?.id === documentId) {
          setSelectedDocument(null);
        }
        
        console.log('Document deleted successfully');
      } else {
        alert('Failed to delete document. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('An error occurred while deleting the document.');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const formatPeriod = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // If same month and year, show just the month/year
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    // If same year, show month range
    if (start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    
    // Different years, show full range
    return `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Statements</h1>
          <p className="text-muted-foreground">Upload and manage your financial documents with AI-powered data extraction</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Upload Financial Documents</h2>
        
        {isUploading ? (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              <p className="text-foreground">Processing {getDocumentTypeLabel(selectedDocumentType)} with AI...</p>
              <div className="w-full bg-muted rounded-full h-2 max-w-md mx-auto">
                <div 
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Upload Financial Document</h3>
                <p className="text-muted-foreground mb-4">
                  Select a document type and upload your financial statement for AI-powered analysis
                </p>
              </div>
              
              <div className="space-y-4 max-w-md mx-auto">
                <select
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value as DocumentType)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={isUploading}
                >
                  <option value="">Select document type</option>
                  <option value="pnl">Profit & Loss Statement</option>
                  <option value="balance_sheet">Balance Sheet</option>
                  <option value="cash_flow">Cash Flow Statement</option>
                </select>
                
                <label className="inline-flex items-center px-6 py-3 bg-accent text-accent-foreground rounded-lg cursor-pointer hover:bg-accent/90 transition-colors">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, selectedDocumentType)}
                    disabled={isUploading || !selectedDocumentType}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Supported formats: PDF, JPG, PNG • Maximum file size: 10MB
          </p>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your Financial Documents</h2>
            <button
              onClick={() => setIsDocumentsCollapsed(!isDocumentsCollapsed)}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {isDocumentsCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        
        {!isDocumentsCollapsed && (
          documents.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium">No financial documents yet</p>
              <p className="text-sm text-muted-foreground">Upload your first financial statement to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((document) => (
                    <tr key={document.id} className="hover:bg-muted/25">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-muted-foreground mr-3" />
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {getDocumentTypeLabel(document.document_type)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Uploaded {new Date(document.uploaded_at || '').toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatPeriod(document.start_date, document.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center ${getStatusColor(document.status)}`}>
                          {getStatusIcon(document.status)}
                          <span className="ml-2 text-sm capitalize">{document.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {document.confidence_score ? `${(document.confidence_score * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewDocument(document)}
                            className="text-accent hover:text-accent/80"
                            title="View document details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (document.id) {
                                deleteDocument(document.id);
                              }
                            }}
                            disabled={!document.id || deletingDocumentId === document.id}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete document"
                          >
                            {deletingDocumentId === document.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && processingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Review Extracted Data</h3>
              <p className="text-sm text-muted-foreground">
                Please review the extracted financial data and make any necessary corrections before saving.
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Document Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Document Type</label>
                  <p className="text-sm text-muted-foreground">{getDocumentTypeLabel(processingResult.document.document_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Period</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(processingResult.document.start_date).toLocaleDateString()} - {new Date(processingResult.document.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Confidence Score</label>
                  <p className="text-sm text-muted-foreground">{(processingResult.confidence_score * 100).toFixed(1)}%</p>
                </div>
              </div>

              {/* Extracted Metrics */}
              <div>
                <h4 className="text-md font-medium text-foreground mb-3">Extracted Financial Data</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-border rounded-md">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Field</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Value</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {processingResult.metrics.map((metric, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-foreground capitalize">
                            {String(metric.label || '').replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-2 text-sm text-foreground font-medium">
                            <input
                              type="number"
                              value={metric.value || 0}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0;
                                setProcessingResult(prev => prev ? {
                                  ...prev,
                                  metrics: prev.metrics.map((m, i) => 
                                    i === index ? { ...m, value: newValue, is_verified: true } : m
                                  )
                                } : null);
                              }}
                              className="w-full px-2 py-1 border border-border rounded text-sm bg-background"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground capitalize">
                            {String(metric.category || 'unknown')}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {metric.is_verified ? (
                              <span className="text-green-600 flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Verified
                              </span>
                            ) : (
                              <span className="text-yellow-600 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                Review
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end space-x-3">
              <button
                onClick={handleRejectDocument}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveDocument}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
              >
                Save Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {getDocumentTypeLabel(selectedDocument.document_type)} Details
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Period: {formatPeriod(selectedDocument.start_date, selectedDocument.end_date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Uploaded: {new Date(selectedDocument.uploaded_at || '').toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (selectedDocument.id) {
                      deleteDocument(selectedDocument.id);
                    }
                  }}
                  disabled={!selectedDocument.id || deletingDocumentId === selectedDocument.id}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-md hover:bg-red-50"
                  title="Delete this document"
                >
                  {deletingDocumentId === selectedDocument.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {isLoadingMetrics ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border border-border rounded-md">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Field</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Value</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {documentMetrics.map((metric) => (
                        <tr key={metric.id}>
                          <td className="px-4 py-2 text-sm text-foreground capitalize">
                            {String(metric.label || '').replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-2 text-sm text-foreground font-medium">
                            {formatCurrency(Number(metric.value || 0))}
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground capitalize">
                            {String(metric.category || 'unknown')}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className="text-yellow-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Pending
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedDocument(null)}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
