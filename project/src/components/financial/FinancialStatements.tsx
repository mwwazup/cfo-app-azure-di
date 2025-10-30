import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Trash2, ChevronDown, ChevronUp, DollarSign, FileSpreadsheet, TrendingUp, RotateCcw, Calendar, ChevronLeft, ChevronRight, Settings, Edit3 } from 'lucide-react';
import { useAuthContext } from '../../contexts/auth-context';
import type { DocumentType, FinancialDocument, FinancialMetric } from '../../models/FinancialStatement';
import { deleteFinancialDocument } from '../../api/financialDocuments';
import { WhereDidTheMoneyGo } from './WhereDidTheMoneyGo';
import { ManualPLFormSimplified } from './ManualPLFormSimplified';
import { ManualBalanceSheetForm } from './ManualBalanceSheetForm';
import { ManualCashFlowForm } from './ManualCashFlowForm';
import { EditDocumentModal } from './EditDocumentModal';
import { CSVUploadModal } from './CSVUploadModal';

interface ProcessingResult {
  document: Omit<FinancialDocument, 'id' | 'user_id'> & { user_id: string };
  metrics: Array<Omit<FinancialMetric, 'id' | 'document_id'>>;
  confidence_score: number;
}

export const FinancialStatements: React.FC = () => {
  const { dbUserId } = useAuthContext();
  const currentDate = new Date();
  
  // Filter state - shared with WhereDidTheMoneyGo component
  // Simple year/month/status approach
  const [filterYear, setFilterYear] = useState<number>(currentDate.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(currentDate.getMonth() + 1);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Simple document state - will be enhanced later
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>('pnl');
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<FinancialDocument | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<FinancialDocument | null>(null);
  const [documentMetrics, setDocumentMetrics] = useState<Array<FinancialMetric>>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isDocumentsCollapsed, setIsDocumentsCollapsed] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [lastExtractedData, setLastExtractedData] = useState<any | null>(null);
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
  const [showManualPLForm, setShowManualPLForm] = useState(false);
  const [showManualBalanceSheetForm, setShowManualBalanceSheetForm] = useState(false);
  const [showManualCashFlowForm, setShowManualCashFlowForm] = useState(false);
  const [showCSVUploadModal, setShowCSVUploadModal] = useState(false);

  // Load documents when component mounts or dbUserId changes
  useEffect(() => {
    const loadDocuments = async () => {
      if (!dbUserId) return;
      
      try {
        console.log('🔄 Loading documents from API...');
        const response = await fetch(`http://localhost:8000/api/financial-documents?userId=${encodeURIComponent(dbUserId)}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📄 API Response:', result);
        
        // The API returns data in a 'data' property
        const documentsData = result.data || [];
        console.log('📋 Documents to display:', documentsData);
        
        // Debug: Log the structure of the first document
        if (documentsData.length > 0) {
          console.log('🔍 First document structure:', documentsData[0]);
          console.log('🔍 Document keys:', Object.keys(documentsData[0]));
        }
        
        // Transform documents to flatten analysis_result data for the modal
        const transformedDocuments = documentsData.map((doc: any) => {
          if (doc.analysis_result) {
            // Extract data from analysis_result and flatten it
            return {
              ...doc,
              start_date: doc.analysis_result.start_date || doc.start_date,
              end_date: doc.analysis_result.end_date || doc.end_date,
              summary_metrics: doc.analysis_result.summary_metrics || doc.summary_metrics,
              raw_json: doc.analysis_result.raw_json || {},
              // Keep the original analysis_result for reference
              _original_analysis_result: doc.analysis_result
            };
          }
          return doc;
        });
        
        console.log('🔍 Transformed documents:', transformedDocuments);
        setDocuments(transformedDocuments);
        console.log('✅ Documents loaded successfully:', documentsData.length);
        
      } catch (error) {
        console.error('❌ Error loading documents:', error);
        // Set empty array on error to show "no documents" message
        setDocuments([]);
      }
    };

    loadDocuments();
  }, [dbUserId]);

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
    if (!file || !dbUserId) return;

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

      console.log(`Processing ${documentType} document with Test Server Document Service...`);
      
      // Process document with Test Server Document Service
      // Document processing temporarily disabled - use manual forms instead
      const extractedData = { 
        documentType, 
        extractedFields: { total_revenue: { value: 0 }, cost_of_goods_sold: { value: 0 }, operating_expenses: { value: 0 }, net_income: { value: 0 } }, 
        summary: { total_revenue: 0, cost_of_goods_sold: 0, operating_expenses: 0, net_income: 0 }, 
        document: { start_date: '', end_date: '', document_type: documentType }, 
        metadata: { confidence: 0.8 } 
      };
      setLastExtractedData(extractedData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log(' Raw extracted data:', extractedData);
      console.log(' Test server financial data:', extractedData.summary);

      // Prepare document data for review - leave dates empty for user to set via calendar
      const documentData: Omit<FinancialDocument, 'id' | 'user_id'> = {
        document_type: selectedDocumentType,
        start_date: '', // Will be set by user via calendar picker
        end_date: '',   // Will be set by user via calendar picker
        raw_json: extractedData.extractedFields || {},
        summary_metrics: extractedData.summary || {},
        confidence_score: extractedData.metadata?.confidence || 0,
        status: 'pending',
        source: 'test_server_upload'
      };

      // Create metrics from the extracted financial data
      let finalMetrics = [];
      
      if (extractedData.extractedFields && selectedDocumentType === 'pnl') {
        // Create properly formatted metrics for the review modal from extracted fields
        const pnlFields = [
          { key: 'total_revenue', label: 'Total Revenue', value: extractedData.extractedFields.total_revenue?.value },
          { key: 'cost_of_goods_sold', label: 'Cost of Goods Sold', value: extractedData.extractedFields.cost_of_goods_sold?.value },
          { key: 'operating_expenses', label: 'Operating Expenses', value: extractedData.extractedFields.operating_expenses?.value },
          { key: 'net_income', label: 'Net Income', value: extractedData.extractedFields.net_income?.value }
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
        // Fallback to all extractedFields if not P&L or no specific fields found
        finalMetrics = Object.keys(extractedData.extractedFields || {}).map(key => {
          const fieldData = (extractedData.extractedFields as any)?.[key];
          return {
            label: key.replace(/_/g, ' '),
            value: typeof fieldData?.value === 'number' ? fieldData.value : 0,
            category: 'extracted',
            is_verified: false
          };
        });
      }

      console.log('📊 Final metrics for review modal:', finalMetrics);

      const processingResultData = {
        document: { ...documentData, user_id: dbUserId },
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
    if (!processingResult || !dbUserId) return;

    try {
      // Save document and metrics to database with approved status
      if (!lastExtractedData) {
        throw new Error('No extracted data available to save');
      }
      
      // Document saving temporarily disabled - use manual forms instead
      // Note: Processing result and extracted data would be used here when saving is enabled
      const documentId = `temp_${Date.now()}`;
      console.log('Document save disabled - use manual forms');

      console.log(`Financial document approved and saved with ID: ${documentId}`);
      
      // Document list refresh disabled - use manual forms instead
      console.log('Document list refresh disabled');
      
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
        // First try to load actual metrics from database
        // Metrics loading temporarily disabled
        const actualMetrics: any[] = [];
        if (actualMetrics && actualMetrics.length > 0) {
          setDocumentMetrics(actualMetrics);
        } else if (document.summary_metrics) {
          // Fallback to summary_metrics if no database metrics found
          const metrics = Object.keys(document.summary_metrics).map(key => ({
            id: `${document.id}_${key}`,
            document_id: document.id!,
            label: key,
            value: document.summary_metrics[key],
            category: 'Financial Data',
            is_verified: document.status === 'approved'
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
            is_verified: document.status === 'approved'
          }));
          setDocumentMetrics(metrics);
        } else {
          // No extracted data available - show message
          setDocumentMetrics([]);
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
    if (!dbUserId) return;
    
    setUpdatingStatusId(documentId);
    
    try {
      // Status update temporarily disabled
      console.log('Status update disabled');
      
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
    if (!showDeleteConfirmation || !dbUserId) return;
    
    const { document, impactAnalysis } = showDeleteConfirmation;
    
    console.log('🗑️ Starting document deletion:', {
      documentId: document.id,
      userId: dbUserId,
      documentType: document.document_type,
      documentStatus: document.status
    });
    
    setShowDeleteConfirmation(prev => prev ? { ...prev, step: 'processing' } : null);
    setDeletingDocumentId(document.id || '');
    
    try {
      // Call the API to delete the document
      console.log('📞 Calling deleteFinancialDocument API...');
      const result = await deleteFinancialDocument(document.id || '', dbUserId);
      
      console.log('📞 API response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete document');
      }
      
      // Remove from local state
      const updatedDocuments = documents.filter(doc => doc.id !== document.id);
      setDocuments(updatedDocuments);
      
      console.log('📋 Documents before deletion:', documents.length);
      console.log('📋 Documents after deletion:', updatedDocuments.length);
      
      // Close any open modals
      if (selectedDocument?.id === document.id) {
        setSelectedDocument(null);
      }
      
      // Dispatch custom event to notify other components (including WhereDidTheMoneyGo)
      console.log('📡 Dispatching documentDeleted event...');
      window.dispatchEvent(new CustomEvent('documentDeleted', {
        detail: {
          documentId: document.id,
          remainingDocuments: updatedDocuments
        }
      }));
      
      setShowDeleteConfirmation(null);
      console.log('✅ Document deletion completed successfully');
      
      // Verify deletion was successful by checking documents list
      setTimeout(() => {
        console.log('🔍 Final verification - remaining documents:', updatedDocuments.length);
        console.log('🔍 Document IDs remaining:', updatedDocuments.map(d => d.id));
      }, 200);
      
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      alert('An error occurred while deleting the document: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

  const editDocument = (document: FinancialDocument) => {
    console.log('🔍 Editing document:', document);
    console.log('🔍 Document fields:', Object.keys(document));
    console.log('🔍 Document values:', Object.entries(document));
    setEditingDocument(document);
    setShowEditModal(true);
  };

  const handleSaveDocumentEdit = async (updatedDocument: FinancialDocument) => {
    if (!dbUserId) return;

    try {
      // Use the same API approach as the manual P&L form
      console.log('🔄 Using API endpoint to update document (same as manual P&L form)');
      console.log('🔍 Document ID:', updatedDocument.id);
      console.log('🔍 Using dbUserId (Clerk ID):', dbUserId);
      console.log('🔍 Updated document data:', updatedDocument);
      
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/financial-documents/${updatedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: dbUserId, // Use the same approach as manual P&L form
          document_type: updatedDocument.document_type,
          status: updatedDocument.status,
          start_date: updatedDocument.start_date,
          end_date: updatedDocument.end_date,
          summary_metrics: updatedDocument.summary_metrics,
          raw_json: updatedDocument.raw_json || {},
          source: 'manual_entry'
        }),
      });

      console.log('🔍 API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Document updated successfully via API:', result);
      
      // Build the analysis_result structure for local state
      const updatedAnalysisResult = {
        source: "manual_entry",
        start_date: updatedDocument.start_date,
        end_date: updatedDocument.end_date,
        summary_metrics: updatedDocument.summary_metrics,
        raw_json: updatedDocument.raw_json || {}
      };
      
      // Update local state with the new structure
      console.log('🔄 Updating local state with:', updatedDocument);
      console.log('🔄 New analysis_result for local state:', updatedAnalysisResult);
      
      setDocuments(prev => {
        const updated = prev.map(doc => 
          doc.id === updatedDocument.id ? {
            ...updatedDocument,
            // Update the analysis_result to reflect the changes
            analysis_result: updatedAnalysisResult,
            // Also update the flattened fields for immediate display
            start_date: updatedDocument.start_date,
            end_date: updatedDocument.end_date,
            summary_metrics: updatedDocument.summary_metrics
          } : doc
        );
        console.log('🔄 Updated documents array:', updated);
        return updated;
      });

      // Close modal
      setShowEditModal(false);
      setEditingDocument(null);
      
      // Optionally refresh the documents list via API (same approach as loading)
      console.log('🔄 Refreshing documents list via API...');
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/financial-documents?userId=${encodeURIComponent(dbUserId)}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          const refreshedDocs = refreshResult.data || [];
          
          // Transform the refreshed documents
          const transformedRefreshed = refreshedDocs.map((doc: any) => {
            if (doc.analysis_result) {
              return {
                ...doc,
                start_date: doc.analysis_result.start_date || doc.start_date,
                end_date: doc.analysis_result.end_date || doc.end_date,
                summary_metrics: doc.analysis_result.summary_metrics || doc.summary_metrics,
                raw_json: doc.analysis_result.raw_json || {},
                _original_analysis_result: doc.analysis_result
              };
            }
            return doc;
          });
          
          console.log('🔄 Setting refreshed documents:', transformedRefreshed);
          setDocuments(transformedRefreshed);
        }
      } catch (refreshError) {
        console.log('⚠️ Could not refresh documents list, but edit was successful:', refreshError);
      }

      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      notification.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Document updated successfully!
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);

    } catch (error) {
      console.error('Error updating document:', error);
      alert(`Error updating document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
                  <div className="space-y-2">
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
                    <button
                      onClick={() => setShowManualPLForm(true)}
                      className="inline-flex items-center px-4 py-2 rounded-lg border-2 transition-colors w-full justify-center"
                      style={{ borderColor: '#d0b46a', color: '#d0b46a' }}
                      disabled={isUploading}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Manual Entry
                    </button>
                  </div>
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
                  <div className="space-y-2">
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
                    <button
                      onClick={() => setShowManualBalanceSheetForm(true)}
                      className="inline-flex items-center px-4 py-2 rounded-lg border-2 transition-colors w-full justify-center"
                      style={{ borderColor: '#d0b46a', color: '#d0b46a' }}
                      disabled={isUploading}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Manual Entry
                    </button>
                  </div>
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
                  <div className="space-y-2">
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
                    <button
                      onClick={() => setShowManualCashFlowForm(true)}
                      className="inline-flex items-center px-4 py-2 rounded-lg border-2 transition-colors w-full justify-center"
                      style={{ borderColor: '#d0b46a', color: '#d0b46a' }}
                      disabled={isUploading}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Manual Entry
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CSV Upload Button */}
            <div className="border-solid p-6 text-center bg-white transition-all" style={{ border: '2px solid #d0b46a', borderRadius: '10px' }}>
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-transparent flex items-center justify-center" style={{ border: '2px solid #d0b46a', borderRadius: '4px' }}>
                  <FileSpreadsheet className="h-8 w-8" style={{ color: '#d0b46a' }} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-black mb-2">CSV Upload</h4>
                  <p className="text-sm text-black mb-4">
                    Upload financial data from CSV files for quick import and analysis
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCSVUploadModal(true)}
                    className="inline-flex items-center px-4 py-2 rounded-lg cursor-pointer transition-colors w-full justify-center"
                    style={{ backgroundColor: '#d0b46a', color: 'black' }}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Supported formats: PDF, JPG, PNG, CSV • Maximum file size: 10MB
          </p>
        </div>
      </div>

      {/* Where Did The Money Go Section */}
      <WhereDidTheMoneyGo 
        filterYear={filterYear}
        setFilterYear={setFilterYear}
        filterMonth={filterMonth}
        setFilterMonth={setFilterMonth}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

      {/* Documents List */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Your Financial Documents</h2>
              </div>
              {/* Active filters display */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Viewing:</span>
                <div className="px-3 py-1 bg-accent/20 rounded-full text-xs font-medium text-accent">
                  {filterMonth === 0 ? `Year to Date ${filterYear}` : new Date(filterYear, filterMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                {filterStatus !== 'all' && (
                  <div className="px-3 py-1 bg-accent/20 rounded-full text-xs font-medium text-accent capitalize">
                    {filterStatus.replace('_', ' ')}
                  </div>
                )}
              </div>
            </div>
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
        
        {!isDocumentsCollapsed && (() => {
          // Filter documents based on the same criteria as WhereDidTheMoneyGo
          const filteredDocuments = documents.filter(doc => {
            // Status filter
            if (filterStatus !== 'all') {
              const docStatus = doc.status || 'unknown';
              if (docStatus !== filterStatus) {
                return false;
              }
            }

            // Year/month filter
            const startDate = doc.start_date || doc.analysis_result?.start_date;
            if (!startDate) return false;

            const docDate = new Date(startDate + 'T00:00:00');
            const docYear = docDate.getFullYear();
            const docMonth = docDate.getMonth() + 1;

            // Filter by year
            if (docYear !== filterYear) return false;
            
            // Filter by month (0 means YTD - include all months)
            if (filterMonth !== 0 && docMonth !== filterMonth) return false;

            return true;
          });

          return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-foreground font-medium">No documents for selected period</p>
                      <p className="text-sm text-muted-foreground">
                        {filterMonth === 0 
                          ? `No documents found for year to date ${filterYear}`
                          : `No documents found for ${new Date(filterYear, filterMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((document) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {document.summary_metrics?.totalRevenue 
                          ? `$${document.summary_metrics.totalRevenue.toLocaleString()}` 
                          : document.summary_metrics?.revenue 
                            ? `$${document.summary_metrics.revenue.toLocaleString()}`
                            : document.raw_json?.revenue?.value
                              ? `$${document.raw_json.revenue.value.toLocaleString()}`
                              : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {document.summary_metrics?.netProfit 
                          ? `$${document.summary_metrics.netProfit.toLocaleString()}` 
                          : document.raw_json?.netProfit?.value
                            ? `$${document.raw_json.netProfit.value.toLocaleString()}`
                            : '-'
                        }
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
                            onClick={() => editDocument(document)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit document"
                          >
                            <Edit3 className="h-4 w-4" />
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
                  ))
                )}
              </tbody>
            </table>
          </div>
          );
        })()}
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
                documentMetrics.length > 0 ? (
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
                              <div className={`flex items-center ${getStatusColor(selectedDocument?.status || 'pending')}`}>
                                {getStatusIcon(selectedDocument?.status || 'pending')}
                                <span className="ml-2 text-sm capitalize">{selectedDocument?.status || 'pending'}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No extracted data available</p>
                    <p className="text-sm">
                      This document may not have been processed yet, or the extraction failed.
                      <br />
                      Try re-uploading the document or contact support if the issue persists.
                    </p>
                  </div>
                )
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

      {/* Manual Form Modals */}
      {showManualPLForm && (
        <ManualPLFormSimplified
          onClose={() => setShowManualPLForm(false)}
          onSave={() => console.log('Document saved')}
        />
      )}

      {showManualBalanceSheetForm && (
        <ManualBalanceSheetForm
          onClose={() => setShowManualBalanceSheetForm(false)}
          onSave={() => console.log('Document saved')}
        />
      )}

      {showManualCashFlowForm && (
        <ManualCashFlowForm
          onClose={() => setShowManualCashFlowForm(false)}
          onSave={() => console.log('Document saved')}
        />
      )}

      {/* Edit Document Modal */}
      <EditDocumentModal
        document={editingDocument}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDocument(null);
        }}
        onSave={handleSaveDocumentEdit}
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={showCSVUploadModal}
        onClose={() => setShowCSVUploadModal(false)}
        onUploadSuccess={loadDocuments}
      />
    </div>
  );
};
