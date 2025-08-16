import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Trash2, ChevronDown, ChevronUp, DollarSign, FileSpreadsheet, TrendingUp, RotateCcw, Calendar, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { AzureDocumentService, type ExtractedFinancialData } from '../../services/azureDocumentService';
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
  const [lastExtractedData, setLastExtractedData] = useState<ExtractedFinancialData | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<{
    document: FinancialDocument;
    step: 'initial' | 'impact' | 'confirm' | 'processing';
    impactAnalysis?: {
      affectedKPIs: string[];
      canRollback: boolean;
      isApproved: boolean;
    };
  } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState<{ month: number; year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);

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

  useEffect(() => {
    loadFinancialDocuments();
  }, [loadFinancialDocuments]);

  // Initialize calendar dates when processing result changes
  useEffect(() => {
    if (processingResult) {
      // Only set dates if they exist and are valid (not empty strings)
      const startDate = processingResult.document.start_date && processingResult.document.start_date !== '' 
        ? new Date(processingResult.document.start_date) : null;
      const endDate = processingResult.document.end_date && processingResult.document.end_date !== '' 
        ? new Date(processingResult.document.end_date) : null;
      
      setSelectedStartDate(startDate);
      setSelectedEndDate(endDate);
      
      // Set calendar view to current month/year if no valid start date
      if (startDate && !isNaN(startDate.getTime())) {
        setCalendarView({
          month: startDate.getMonth(),
          year: startDate.getFullYear()
        });
      } else {
        // Default to current month/year
        const now = new Date();
        setCalendarView({
          month: now.getMonth(),
          year: now.getFullYear()
        });
      }
    }
  }, [processingResult]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCalendar && !(event.target as Element)?.closest('.calendar-dropdown')) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType?: DocumentType) => {
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

    // Use provided document type or default to P&L
    const documentType: DocumentType = docType || selectedDocumentType || 'pnl';
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
      const extractedData = await AzureDocumentService.processDocument(file, documentType);
      setLastExtractedData(extractedData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log(' Raw extracted data:', extractedData);
      console.log(' Azure financial data:', extractedData.azureData);

      // Prepare document data for review - leave dates empty for user to set via calendar
      const documentData: Omit<FinancialDocument, 'id' | 'user_id'> = {
        document_type: selectedDocumentType,
        start_date: '', // Will be set by user via calendar picker
        end_date: '',   // Will be set by user via calendar picker
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
      // Save document and metrics to database with approved status
      if (!lastExtractedData) {
        throw new Error('No extracted data available to save');
      }
      
      // Update the processing result to set status as approved
      const updatedProcessingResult = {
        ...processingResult,
        document: {
          ...processingResult.document,
          status: 'approved'
        }
      };
      
      // Create updated extracted data with calendar-selected dates
      const updatedExtractedData = {
        ...lastExtractedData,
        document: {
          ...lastExtractedData.document,
          start_date: processingResult.document.start_date,
          end_date: processingResult.document.end_date
        }
      };

      const documentId = await AzureDocumentService.saveDocument(
        updatedExtractedData,
        updatedProcessingResult.metrics as FinancialMetric[]
      );

      console.log(`Financial document approved and saved with ID: ${documentId}`);
      
      // Refresh documents list
      await loadFinancialDocuments();
      
      // Close modal
      setShowReviewModal(false);
      setProcessingResult(null);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      notification.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Document saved successfully!
      `;
      document.body.appendChild(notification);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
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
      // Load document data for display
      if (document.id) {
        // First check if we have summary_metrics
        if (document.summary_metrics) {
          const metrics = Object.keys(document.summary_metrics).map(key => ({
            id: `${document.id}_${key}`,
            document_id: document.id!,
            label: key,
            value: document.summary_metrics[key],
            category: 'Financial Data',
            is_verified: false
          }));
          setDocumentMetrics(metrics);
        } else if (document.raw_json) {
          // Show raw_json data if available
          const metrics = Object.keys(document.raw_json).map(key => ({
            id: `${document.id}_${key}`,
            document_id: document.id!,
            label: key,
            value: document.raw_json[key],
            category: 'Financial Data',
            is_verified: false
          }));
          setDocumentMetrics(metrics);
        } else {
          // Create sample financial metrics for demonstration
          const sampleFinancialMetrics = [
            {
              id: `${document.id}_revenue`,
              document_id: document.id!,
              label: 'Total Revenue',
              value: 125000,
              category: 'Income Statement',
              is_verified: document.status === 'approved',
              display_value: formatCurrency(125000)
            },
            {
              id: `${document.id}_cogs`,
              document_id: document.id!,
              label: 'Cost of Goods Sold',
              value: 75000,
              category: 'Income Statement',
              is_verified: document.status === 'approved',
              display_value: formatCurrency(75000)
            },
            {
              id: `${document.id}_gross_profit`,
              document_id: document.id!,
              label: 'Gross Profit',
              value: 50000,
              category: 'Income Statement',
              is_verified: document.status === 'approved',
              display_value: formatCurrency(50000)
            },
            {
              id: `${document.id}_operating_expenses`,
              document_id: document.id!,
              label: 'Operating Expenses',
              value: 30000,
              category: 'Income Statement',
              is_verified: document.status === 'approved',
              display_value: formatCurrency(30000)
            },
            {
              id: `${document.id}_net_income`,
              document_id: document.id!,
              label: 'Net Income',
              value: 20000,
              category: 'Income Statement',
              is_verified: document.status === 'approved',
              display_value: formatCurrency(20000)
            }
          ];
          setDocumentMetrics(sampleFinancialMetrics);
        }
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

  const updateDocumentStatus = async (documentId: string, newStatus: 'pending' | 'reviewed' | 'approved' | 'rejected') => {
    if (!user) return;
    
    setUpdatingStatusId(documentId);
    
    try {
      await AzureDocumentService.updateDocumentStatus(documentId, newStatus);
      
      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, status: newStatus } : doc
      ));
      
      console.log(`Document status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating document status:', error);
      alert('Failed to update document status.');
    } finally {
      setUpdatingStatusId(null);
      setShowStatusDropdown(null);
    }
  };

  const analyzeDeleteImpact = async (document: FinancialDocument) => {
    // Simulate impact analysis - in real implementation, this would check KPIs
    const isApproved = document.status === 'approved';
    const affectedKPIs = isApproved ? ['Revenue Growth', 'Profit Margin', 'Cash Flow Ratio'] : [];
    
    return {
      affectedKPIs,
      canRollback: isApproved,
      isApproved
    };
  };

  const initiateDocumentDeletion = async (document: FinancialDocument) => {
    const impactAnalysis = await analyzeDeleteImpact(document);
    
    setShowDeleteConfirmation({
      document,
      step: 'initial',
      impactAnalysis
    });
  };

  const executeDocumentDeletion = async () => {
    if (!showDeleteConfirmation || !user) return;
    
    const { document, impactAnalysis } = showDeleteConfirmation;
    
    setShowDeleteConfirmation(prev => prev ? { ...prev, step: 'processing' } : null);
    setDeletingDocumentId(document.id || '');
    
    try {
      if (impactAnalysis?.isApproved) {
        // Enhanced deletion for approved documents
        await AzureDocumentService.deleteApprovedDocument(document.id!);
      } else {
        // Simple deletion for pending documents
        await AzureDocumentService.deleteDocument(document.id!);
      }
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      
      // Close any open modals
      if (selectedDocument?.id === document.id) {
        setSelectedDocument(null);
      }
      
      setShowDeleteConfirmation(null);
      console.log('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('An error occurred while deleting the document.');
      setShowDeleteConfirmation(prev => prev ? { ...prev, step: 'initial' } : null);
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const deleteDocument = async (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;
    
    await initiateDocumentDeletion(document);
  };

  // Calendar helper functions
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isDateInRange = (date: Date, start: Date | null, end: Date | null) => {
    if (!start || !end) return false;
    const time = date.getTime();
    return time >= start.getTime() && time <= end.getTime();
  };

  const handleDateClick = (date: Date) => {
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // Start new selection
      setSelectedStartDate(date);
      setSelectedEndDate(null);
    } else if (selectedStartDate && !selectedEndDate) {
      // Complete the range
      if (date < selectedStartDate) {
        setSelectedStartDate(date);
        setSelectedEndDate(selectedStartDate);
      } else {
        setSelectedEndDate(date);
      }
      
      // Update the processing result with selected dates
      if (processingResult) {
        setProcessingResult(prev => prev ? {
          ...prev,
          document: {
            ...prev.document,
            start_date: (date < selectedStartDate ? date : selectedStartDate).toISOString(),
            end_date: (date < selectedStartDate ? selectedStartDate : date).toISOString()
          }
        } : null);
      }
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarView(prev => {
      const newMonth = direction === 'prev' ? prev.month - 1 : prev.month + 1;
      if (newMonth < 0) {
        return { month: 11, year: prev.year - 1 };
      } else if (newMonth > 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { ...prev, month: newMonth };
    });
  };

  const formatPeriod = (startDate: string, endDate: string): string => {
    // Parse dates as local dates to avoid timezone issues
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
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
        <h2 className="text-lg font-semibold text-foreground mb-6">Upload Your Financial Documents</h2>
        
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
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">Upload Your Financial Document</h3>
              <p className="text-muted-foreground mb-6">
                Select a document type and upload your financial statement for AI-powered analysis
              </p>
            </div>
            
            {/* Three Document Type Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profit & Loss Button */}
              <div className="border-solid p-6 text-center bg-white transition-all" style={{ border: '2px solid #d0b46a', borderRadius: '10px' }}>
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-transparent flex items-center justify-center" style={{ border: '2px solid #d0b46a', borderRadius: '4px' }}>
                    <DollarSign className="h-8 w-8" style={{ color: '#d0b46a' }} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-black mb-2">Profit & Loss</h4>
                    <p className="text-sm text-black mb-4">
                      Upload your P&L statement to analyze revenue, expenses, and profitability
                    </p>
                  </div>
                  <label className="inline-flex items-center px-4 py-2 rounded-lg cursor-pointer transition-colors" style={{ backgroundColor: '#d0b46a', color: 'black' }}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload P&L
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'pnl')}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>

              {/* Balance Sheet Button */}
              <div className="border-solid p-6 text-center bg-white transition-all" style={{ border: '2px solid #d0b46a', borderRadius: '10px' }}>
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-transparent flex items-center justify-center" style={{ border: '2px solid #d0b46a', borderRadius: '4px' }}>
                    <FileSpreadsheet className="h-8 w-8" style={{ color: '#d0b46a' }} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-black mb-2">Balance Sheet</h4>
                    <p className="text-sm text-black mb-4">
                      Upload your balance sheet to analyze assets, liabilities, and equity
                    </p>
                  </div>
                  <label className="inline-flex items-center px-4 py-2 rounded-lg cursor-pointer transition-colors" style={{ backgroundColor: '#d0b46a', color: 'black' }}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Balance Sheet
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'balance_sheet')}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>

              {/* Cash Flow Button */}
              <div className="border-solid p-6 text-center bg-white transition-all" style={{ border: '2px solid #d0b46a', borderRadius: '10px' }}>
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-transparent flex items-center justify-center" style={{ border: '2px solid #d0b46a', borderRadius: '4px' }}>
                    <TrendingUp className="h-8 w-8" style={{ color: '#d0b46a' }} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-black mb-2">Cash Flow</h4>
                    <p className="text-sm text-black mb-4">
                      Upload your cash flow statement to analyze cash movements and liquidity
                    </p>
                  </div>
                  <label className="inline-flex items-center px-4 py-2 rounded-lg cursor-pointer transition-colors" style={{ backgroundColor: '#d0b46a', color: 'black' }}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Cash Flow
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'cash_flow')}
                      disabled={isUploading}
                    />
                  </label>
                </div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewDocument(document)}
                            className="text-accent hover:text-accent/80"
                            title="View document details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {/* Status Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setShowStatusDropdown(showStatusDropdown === document.id ? null : document.id || '')}
                              className="p-1 text-accent hover:text-accent/80 hover:bg-accent/10 rounded"
                              title="Change status"
                              disabled={updatingStatusId === document.id}
                            >
                              {updatingStatusId === document.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              ) : (
                                <Settings className="h-4 w-4" />
                              )}
                            </button>
                            
                            {showStatusDropdown === document.id && (
                              <div className="absolute right-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-max">
                                <div className="flex flex-col space-y-1 p-2">
                                  <button
                                    onClick={() => updateDocumentStatus(document.id!, 'pending')}
                                    className={`px-3 py-2 text-sm bg-white text-black border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center whitespace-nowrap ${document.status === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
                                  >
                                    <AlertCircle className="h-3 w-3 mr-2 text-yellow-600" />
                                    Pending
                                  </button>
                                  <button
                                    onClick={() => updateDocumentStatus(document.id!, 'reviewed')}
                                    className={`px-3 py-2 text-sm bg-white text-black border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center whitespace-nowrap ${document.status === 'reviewed' ? 'ring-2 ring-blue-500' : ''}`}
                                  >
                                    <Eye className="h-3 w-3 mr-2 text-blue-600" />
                                    Reviewed
                                  </button>
                                  <button
                                    onClick={() => updateDocumentStatus(document.id!, 'approved')}
                                    className={`px-3 py-2 text-sm bg-white text-black border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center whitespace-nowrap ${document.status === 'approved' ? 'ring-2 ring-green-500' : ''}`}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                                    Approved
                                  </button>
                                  <button
                                    onClick={() => updateDocumentStatus(document.id!, 'rejected')}
                                    className={`px-3 py-2 text-sm bg-white text-black border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center whitespace-nowrap ${document.status === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
                                  >
                                    <Trash2 className="h-3 w-3 mr-2 text-red-600" />
                                    Rejected
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Document Type</label>
                  <p className="text-sm text-muted-foreground">{getDocumentTypeLabel(processingResult.document.document_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Upload Date</label>
                  <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Period Information with QuickBooks-style Calendar */}
              <div className="border border-border rounded-lg p-4 bg-muted/20">
                <h4 className="text-md font-medium text-foreground mb-3">Reporting Period</h4>
                
                {/* Calendar Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {selectedStartDate && selectedEndDate
                          ? `${selectedStartDate.toLocaleDateString()} - ${selectedEndDate.toLocaleDateString()}`
                          : selectedStartDate
                          ? `${selectedStartDate.toLocaleDateString()} - Select end date`
                          : 'Select date range'
                        }
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Calendar Dropdown */}
                  {showCalendar && (
                    <div className="calendar-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
                      {/* Month/Year Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => navigateMonth('prev')}
                          className="p-1 hover:bg-gray-100 rounded text-black"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <select
                            value={calendarView.month}
                            onChange={(e) => setCalendarView(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-black"
                          >
                            {monthNames.map((month, index) => (
                              <option key={index} value={index}>{month}</option>
                            ))}
                          </select>
                          
                          <select
                            value={calendarView.year}
                            onChange={(e) => setCalendarView(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-black"
                          >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                        
                        <button
                          onClick={() => navigateMonth('next')}
                          className="p-1 hover:bg-gray-100 rounded text-black"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: getFirstDayOfMonth(calendarView.month, calendarView.year) }).map((_, index) => (
                          <div key={`empty-${index}`} className="h-8"></div>
                        ))}
                        
                        {/* Days of the month */}
                        {Array.from({ length: getDaysInMonth(calendarView.month, calendarView.year) }).map((_, dayIndex) => {
                          const day = dayIndex + 1;
                          const date = new Date(calendarView.year, calendarView.month, day);
                          const isSelected = selectedStartDate && isSameDay(date, selectedStartDate) || 
                                           selectedEndDate && isSameDay(date, selectedEndDate);
                          const isInRange = selectedStartDate && selectedEndDate && isDateInRange(date, selectedStartDate, selectedEndDate);
                          const isToday = isSameDay(date, new Date());

                          return (
                            <button
                              key={day}
                              onClick={() => handleDateClick(date)}
                              className={`
                                h-8 text-sm rounded hover:bg-gray-100 transition-colors text-black
                                ${isSelected ? 'bg-accent text-black font-semibold' : ''}
                                ${isInRange && !isSelected ? 'bg-accent/50' : ''}
                                ${isToday && !isSelected ? 'border border-blue-500' : ''}
                              `}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setSelectedStartDate(null);
                            setSelectedEndDate(null);
                          }}
                          className="text-sm text-gray-600 hover:text-black"
                        >
                          Clear
                        </button>
                        
                        <button
                          onClick={() => {
                            if (selectedStartDate && selectedEndDate) {
                              // Update the processing result with selected dates
                              setProcessingResult(prev => prev ? {
                                ...prev,
                                document: {
                                  ...prev.document,
                                  start_date: selectedStartDate.toISOString().split('T')[0],
                                  end_date: selectedEndDate.toISOString().split('T')[0]
                                }
                              } : null);
                            }
                            setShowCalendar(false);
                          }}
                          disabled={!selectedStartDate || !selectedEndDate}
                          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Extracted Metrics */}
              <div>
                <h4 className="text-md font-medium text-foreground mb-3">Extracted Financial Data</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-border rounded-md">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-foreground uppercase">Field</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-foreground uppercase">Value</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-foreground uppercase">Category</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-foreground uppercase">Status</th>
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
                            {(metric as any).display_value || formatCurrency(Number(metric.value || 0))}
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
                                Pending
                              </span>
                            )}
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

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {showDeleteConfirmation.step === 'initial' && 'Delete Financial Document'}
                {showDeleteConfirmation.step === 'impact' && 'Impact Analysis'}
                {showDeleteConfirmation.step === 'confirm' && 'Confirm Deletion'}
                {showDeleteConfirmation.step === 'processing' && 'Deleting Document...'}
              </h3>
            </div>
            
            <div className="p-6">
              {showDeleteConfirmation.step === 'initial' && (
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-6 w-6 text-red-500 mt-1" />
                    <div>
                      <p className="text-foreground font-medium">
                        You are about to delete: {getDocumentTypeLabel(showDeleteConfirmation.document.document_type)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Period: {formatPeriod(showDeleteConfirmation.document.start_date, showDeleteConfirmation.document.end_date)}
                      </p>
                    </div>
                  </div>
                  
                  {showDeleteConfirmation.impactAnalysis?.isApproved && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800 dark:text-red-200">High Impact Deletion</span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                        This approved document affects the following KPIs:
                      </p>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {showDeleteConfirmation.impactAnalysis.affectedKPIs.map((kpi, index) => (
                          <li key={index}>• {kpi}</li>
                        ))}
                      </ul>
                      {showDeleteConfirmation.impactAnalysis.canRollback && (
                        <div className="mt-3 flex items-center space-x-2">
                          <RotateCcw className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-300">
                            Rollback capability available for 30 days
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800 dark:text-yellow-200">
                        This action cannot be easily undone
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      {showDeleteConfirmation.impactAnalysis?.isApproved 
                        ? 'Deleting this approved document will permanently remove it from your KPIs and reports.'
                        : 'This will permanently delete the document from your system.'
                      }
                    </p>
                  </div>
                </div>
              )}
              
              {showDeleteConfirmation.step === 'processing' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                  <p className="text-foreground">
                    {showDeleteConfirmation.impactAnalysis?.isApproved 
                      ? 'Removing document from KPIs and knowledgebase...'
                      : 'Deleting document...'
                    }
                  </p>
                </div>
              )}
            </div>

            {showDeleteConfirmation.step !== 'processing' && (
              <div className="p-6 border-t border-border flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirmation(null)}
                  className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDocumentDeletion}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  {showDeleteConfirmation.impactAnalysis?.isApproved ? 'Delete & Update KPIs' : 'Delete Document'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
