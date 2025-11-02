import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Trash2, ChevronDown, ChevronUp, DollarSign, FileSpreadsheet, TrendingUp, RotateCcw, Calendar, ChevronLeft, ChevronRight, Settings, Edit3, X, Edit2, Save } from 'lucide-react';
import { useAuthContext } from '../../contexts/auth-context';
import type { DocumentType, FinancialDocument, FinancialMetric } from '../../models/FinancialStatement';
import { deleteFinancialDocument, createManualFinancialDocument } from '../../api/financialDocuments';
import { WhereDidTheMoneyGo } from './WhereDidTheMoneyGo';
import { ManualPLFormSimplified } from './ManualPLFormSimplified';
import { ManualBalanceSheetForm } from './ManualBalanceSheetForm';
import { ManualCashFlowForm } from './ManualCashFlowForm';
import { parseFinancialCSV } from '../../utils/csvParser';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface ProcessingResult {
  document: Omit<FinancialDocument, 'id' | 'user_id'> & { user_id: string };
  metrics: Array<Omit<FinancialMetric, 'id' | 'document_id'>>;
  confidence_score: number;
}

export const FinancialStatements: React.FC = () => {
  const { dbUserId } = useAuthContext();
  const currentDate = new Date();
  
  // Filter state - shared with WhereDidTheMoneyGo component
  // Simple year/month/status approach with localStorage persistence
  const getSavedFilters = () => {
    try {
      const saved = localStorage.getItem('financial-statements-filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the saved filters
        const filterYear = parsed.filterYear || currentDate.getFullYear();
        const filterMonth = parsed.filterMonth !== undefined ? parsed.filterMonth : currentDate.getMonth() + 1;
        const filterStatus = parsed.filterStatus || 'all';
        return { filterYear, filterMonth, filterStatus };
      }
    } catch (error) {
      console.warn('Error loading saved filters:', error);
    }
    return {
      filterYear: currentDate.getFullYear(),
      filterMonth: currentDate.getMonth() + 1,
      filterStatus: 'all'
    };
  };

  const savedFilters = getSavedFilters();
  const [filterYear, setFilterYear] = useState<number>(savedFilters.filterYear);
  const [filterMonth, setFilterMonth] = useState<number | 'ytd'>(savedFilters.filterMonth);
  const [filterStatus, setFilterStatus] = useState<string>(savedFilters.filterStatus);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // desc = newest first
  // const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>('pnl');
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewPeriodStart, setReviewPeriodStart] = useState('');
  const [reviewPeriodEnd, setReviewPeriodEnd] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<FinancialDocument | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
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
    onConfirm: () => void;
  } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState<{ month: number; year: number }>({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear()
  });
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [showManualPLForm, setShowManualPLForm] = useState(false);
  const [showManualBalanceSheetForm, setShowManualBalanceSheetForm] = useState(false);
  const [showManualCashFlowForm, setShowManualCashFlowForm] = useState(false);

  // Load documents function (can be called from anywhere)
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
      
      // Transform documents to flatten data for the modal
      const transformedDocuments = documentsData.map((doc: any) => {
        // Extract values from raw_json (where backend stores field-level data)
        const rawJson = doc.raw_json || {};
        const summaryMetrics = doc.summary_metrics || {};
        
        // Helper to extract value from raw_json structure
        const extractValue = (field: any) => {
          if (typeof field === 'object' && field !== null && 'value' in field) {
            return field.value;
          }
          return field || 0;
        };
        
        const flattenedDoc = {
          ...doc,
          // Extract from raw_json (field-level data with confidence scores)
          revenue: extractValue(rawJson.revenue) || summaryMetrics.totalRevenue || 0,
          cogs: extractValue(rawJson.cogs) || 0,
          operating_expenses: extractValue(rawJson.operatingExpenses) || 0,
          owner_distributions: extractValue(rawJson.ownerDistributions) || 0,
          taxes: extractValue(rawJson.taxes) || 0,
          // Also include summary metrics for reference
          net_profit: summaryMetrics.netProfit || 0,
          gross_profit: summaryMetrics.grossProfit || 0,
          total_expenses: summaryMetrics.totalExpenses || 0
        };
        
        return flattenedDoc;
      });
      
      setDocuments(transformedDocuments);
      console.log('✅ Documents loaded successfully');
    } catch (error) {
      console.error('❌ Error loading documents:', error);
      setDocuments([]);
    }
  };

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('financial-statements-filters', JSON.stringify({
        filterYear,
        filterMonth,
        filterStatus
      }));
    } catch (error) {
      console.warn('Error saving filters:', error);
    }
  }, [filterYear, filterMonth, filterStatus]);

  // Load documents on component mount and when user changes
  useEffect(() => {
    if (dbUserId) {
      loadDocuments();
    }
  }, [dbUserId]);

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !dbUserId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('📤 Processing file:', file.name);
      
      // Use the current filter period (filterYear and filterMonth)
      // If filterMonth is 'ytd' or invalid, default to current month
      const currentDate = new Date();
      let year = filterYear;
      let month = typeof filterMonth === 'number' ? filterMonth : currentDate.getMonth() + 1;
      
      let startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate(); // month is 1-indexed, so this gets last day correctly
      let endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      
      console.log(`📅 Using filter period: ${startDate} to ${endDate} (Year: ${year}, Month: ${month})`);

      // Generate standardized filename regardless of upload filename
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                         'july', 'august', 'september', 'october', 'november', 'december'];
      const monthName = monthNames[month - 1];
      const fileExtension = file.name.toLowerCase().endsWith('.pdf') ? '.pdf' :
                           file.name.toLowerCase().endsWith('.png') ? '.png' :
                           file.name.toLowerCase().endsWith('.xlsx') ? '.xlsx' : '.csv';
      const standardizedFilename = `${year}_${month.toString().padStart(2, '0')}_${monthName}_${selectedDocumentType}${fileExtension}`;
      
      console.log(`📝 Standardized filename: ${file.name} → ${standardizedFilename}`);

      // For CSV files, parse and create document
      if (file.name.endsWith('.csv')) {
        console.log('CSV content loaded');
        
        // Parse CSV to extract financial values
        const csvResult = await parseFinancialCSV(file);
        console.log('Parsed CSV result:', csvResult);
        
        // Extract values from CSV parse result
        const extractedData = csvResult.data?.extractedFields || {};
        const summary = csvResult.data?.summary || {};
        
        // Store data for review modal with STANDARDIZED filename and extracted values
        const documentData = {
          userId: dbUserId,
          document_type: selectedDocumentType,
          start_date: startDate,
          end_date: endDate,
          filename: standardizedFilename,
          source: 'csv_upload',
          status: 'pending_review',
          raw_json: extractedData,
          summary_metrics: summary,
          confidence_score: 1.0,
          // Store extracted values for modal
          revenue: summary.total_revenue || summary.revenue || 0,
          cogs: summary.cost_of_goods_sold || summary.cogs || 0,
          operatingExpenses: summary.operating_expenses || summary.opex || 0,
          ownerDistributions: summary.owner_distributions || 0,
          taxes: summary.taxes || 0
        };

        // Show review modal instead of immediately posting
        console.log('Setting extracted data:', documentData);
        setLastExtractedData(documentData);
        setShowReviewModal(true);
        setIsUploading(false);
        setUploadProgress(0);
        
        console.log('Document ready for review');
        return; // Don't auto-save, wait for user review
      } else {
        // For PDF/PNG files, you'll need to implement Azure DI processing
        alert('PDF and PNG processing coming soon. Please use CSV files for now.');
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      // Reload documents after successful upload
      await loadDocuments();
      
      // Clear file input
      if (event.target) {
        event.target.value = '';
      }

    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Manual document creation
  const handleCreateManualDocument = async (documentData: any) => {
    if (!dbUserId) return;

    try {
      console.log('📝 Creating manual document...');
      const result = await createManualFinancialDocument({
        ...documentData,
        userId: dbUserId,
        document_type: selectedDocumentType,
        source: 'manual_entry'
      });

      if (result.success) {
        console.log('✅ Manual document created successfully');
        await loadDocuments();
      } else {
        throw new Error(result.error || 'Failed to create document');
      }

    } catch (error) {
      console.error('❌ Error creating manual document:', error);
      alert(`Error creating document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // CSV upload handler
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !dbUserId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('📊 Processing CSV file:', file.name);
      
      // Parse CSV
      const csvData = await parseFinancialCSV(file);
      console.log('📋 Parsed CSV data:', csvData);

      // Create document from CSV data
      await handleCreateManualDocument({
        start_date: csvData.data?.document?.start_date || '',
        end_date: csvData.data?.document?.end_date || '',
        raw_json: csvData.data?.extractedFields || {},
        summary_metrics: csvData.data?.summary || {},
        confidence_score: 0.95,
        status: 'approved',
        filename: file.name
      });

      // Clear file input
      if (event.target) {
        event.target.value = '';
      }

    } catch (error) {
      console.error('❌ CSV processing error:', error);
      alert(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle document approval/rejection
  const handleApproveDocument = async () => {
    if (!processingResult || !dbUserId) return;

    try {
      console.log('✅ Approving document...');
      
      // Create the approved document
      const result = await createManualFinancialDocument({
        userId: dbUserId,
        document_type: processingResult.document.document_type,
        start_date: processingResult.document.start_date,
        end_date: processingResult.document.end_date,
        raw_json: processingResult.document.raw_json || {},
        summary_metrics: processingResult.document.summary_metrics || {},
        confidence_score: processingResult.document.confidence_score,
        status: 'approved',
        source: 'test_server_upload',
        filename: processingResult.document.filename
      });

      if (result.success) {
        console.log('✅ Document approved successfully');
        
        // Create metrics for the document
        if (processingResult.metrics.length > 0) {
          console.log('📊 Creating metrics for document...');
          // Metrics creation would go here
        }
        
        // Reload documents
        await loadDocuments();
        
        // Close modal and reset
        setShowReviewModal(false);
        setProcessingResult(null);
      } else {
        throw new Error(result.error || 'Failed to approve document');
      }

    } catch (error) {
      console.error('❌ Error approving document:', error);
      alert(`Error approving document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRejectDocument = () => {
    setShowReviewModal(false);
    setProcessingResult(null);
  };

  const handleEditDocument = (document: FinancialDocument) => {
    setEditingDocument(document);
    setShowEditModal(true);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    if (!dbUserId) {
      alert('User ID not available');
      return;
    }
    
    setDeletingDocumentId(documentId);
    try {
      await deleteFinancialDocument(documentId, dbUserId);
      await loadDocuments(); // Reload documents after deletion
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const viewDocument = async (document: FinancialDocument) => {
    setSelectedDocument(document);
    setShowViewModal(true);
  };

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'pnl':
        return 'Profit & Loss';
      case 'balance_sheet':
        return 'Balance Sheet';
      case 'cash_flow':
        return 'Cash Flow Statement';
      default:
        return type || 'Unknown';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'reviewed':
        return 'text-yellow-600';
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
      case 'reviewed':
        return <AlertCircle className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatPeriod = (startDate: string, endDate: string): string => {
    if (!startDate && !endDate) return 'No period';
    
    // Parse date string directly to avoid timezone conversion issues
    // Format: "2025-06-01" -> June 2025
    const dateStr = startDate || endDate;
    if (!dateStr) return 'No period';
    
    const [year, month] = dateStr.split('-').map(Number);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${monthNames[month - 1]} ${year}`;
  };

  // Filter documents based on the same criteria as WhereDidTheMoneyGo
  const filteredDocuments = documents.filter(doc => {
    // Status filter
    if (filterStatus !== 'all') {
      return doc.status === filterStatus;
    }
    
    // Date filter - use UTC methods to avoid timezone issues
    if (doc.start_date) {
      const docDate = new Date(doc.start_date);
      const docYear = docDate.getUTCFullYear();
      const docMonth = docDate.getUTCMonth() + 1; // JavaScript months are 0-based
      
      if (filterMonth === 'ytd') {
        // Year to date filter
        return docYear === filterYear && docMonth <= currentDate.getMonth() + 1;
      } else {
        // Specific month filter
        return docYear === filterYear && docMonth === filterMonth;
      }
    }
    
    return true;
  });

  // Sort documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const dateA = new Date(a.start_date || '');
    const dateB = new Date(b.start_date || '');
    return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
  });

  // Shared filter state for WhereDidTheMoneyGo component
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Statements</h1>
          <p className="text-muted-foreground">Upload and manage your financial documents</p>
        </div>
      </div>

      {/* Upload Section - Three boxes at the TOP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* P&L Upload Box */}
        <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 !bg-[#fffaf4] rounded-xl min-h-[320px]">
          <CardContent className="pt-6 !bg-[#fffaf4] rounded-xl h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md" style={{ backgroundColor: '#d5b274' }}>
                <FileText className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#222222]">
                Profit & Loss Statement
              </h3>
              <p className="text-sm leading-relaxed text-[#222222]">
                Upload your P&L statement for automated financial analysis and insights
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls"
                onChange={(e) => {
                  setSelectedDocumentType('pnl');
                  handleFileUpload(e);
                }}
                disabled={isUploading}
                className="hidden"
                id="pnl-upload"
              />
              <label
                htmlFor="pnl-upload"
                className={`inline-flex items-center px-4 py-2 rounded-md shadow-md font-medium transition-all duration-300 hover:shadow-lg ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                style={{ backgroundColor: '#d5b274', color: 'white' }}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading && selectedDocumentType === 'pnl' ? 'Uploading...' : 'Choose File'}
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Balance Sheet Upload Box */}
        <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 !bg-[#fffaf4] rounded-xl min-h-[320px]">
          <CardContent className="pt-6 !bg-[#fffaf4] rounded-xl h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md" style={{ backgroundColor: '#d5b274' }}>
                <FileSpreadsheet className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#222222]">
                Balance Sheet
              </h3>
              <p className="text-sm leading-relaxed text-[#222222]">
                Upload your balance sheet for asset and liability tracking and analysis
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls"
                onChange={(e) => {
                  setSelectedDocumentType('balance_sheet');
                  handleFileUpload(e);
                }}
                disabled={isUploading}
                className="hidden"
                id="balance-sheet-upload"
              />
              <label
                htmlFor="balance-sheet-upload"
                className={`inline-flex items-center px-4 py-2 rounded-md shadow-md font-medium transition-all duration-300 hover:shadow-lg ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                style={{ backgroundColor: '#d5b274', color: 'white' }}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading && selectedDocumentType === 'balance_sheet' ? 'Uploading...' : 'Choose File'}
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Upload Box */}
        <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 !bg-[#fffaf4] rounded-xl min-h-[320px]">
          <CardContent className="pt-6 !bg-[#fffaf4] rounded-xl h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md" style={{ backgroundColor: '#d5b274' }}>
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#222222]">
                Cash Flow Statement
              </h3>
              <p className="text-sm leading-relaxed text-[#222222]">
                Upload your cash flow statement for liquidity and cash management insights
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls"
                onChange={(e) => {
                  setSelectedDocumentType('cash_flow');
                  handleFileUpload(e);
                }}
                disabled={isUploading}
                className="hidden"
                id="cash-flow-upload"
              />
              <label
                htmlFor="cash-flow-upload"
                className={`inline-flex items-center px-4 py-2 rounded-md shadow-md font-medium transition-all duration-300 hover:shadow-lg ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                style={{ backgroundColor: '#d5b274', color: 'white' }}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading && selectedDocumentType === 'cash_flow' ? 'Uploading...' : 'Choose File'}
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WhereDidTheMoneyGo component - MIDDLE SECTION */}
      <WhereDidTheMoneyGo 
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        filterYear={filterYear}
        setFilterYear={setFilterYear}
        filterMonth={filterMonth}
        setFilterMonth={setFilterMonth}
      />

      {/* Financial Documents List */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Your Financial Documents</h2>
              </div>
              
              {/* Active filters display */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Viewing:</span>
                <div className="px-3 py-1 bg-accent/20 rounded-full text-xs font-medium text-accent">
                  {filterMonth === 0 || filterMonth === 'ytd' ? `Year to Date ${filterYear}` : new Date(filterYear, (filterMonth as number) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isDocumentsCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>
          </div>
        </CardHeader>
        
        {!isDocumentsCollapsed && (() => {
          // Filter documents based on the same criteria as WhereDidTheMoneyGo
          const filteredDocuments = documents.filter(doc => {
            // Status filter
            if (filterStatus !== 'all') {
              return doc.status === filterStatus;
            }
            
            // Date filter - use UTC methods to avoid timezone issues
            if (doc.start_date) {
              const docDate = new Date(doc.start_date);
              const docYear = docDate.getUTCFullYear();
              const docMonth = docDate.getUTCMonth() + 1; // JavaScript months are 0-based
              
              if (filterMonth === 'ytd') {
                // Year to date filter
                return docYear === filterYear && docMonth <= currentDate.getMonth() + 1;
              } else {
                // Specific month filter
                return docYear === filterYear && docMonth === filterMonth;
              }
            }
            
            return true;
          });

          // Sort documents
          const sortedDocuments = [...filteredDocuments].sort((a, b) => {
            const dateA = new Date(a.start_date || '');
            const dateB = new Date(b.start_date || '');
            return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
          });

          return (
            <div className="overflow-x-auto">
              {sortedDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-medium">No documents for selected period</p>
                  <p className="text-sm text-muted-foreground">
                    {filterMonth === 0 || filterMonth === 'ytd' 
                      ? `No documents found for year to date ${filterYear}`
                      : `No documents found for ${new Date(filterYear, (filterMonth as number) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    }
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedDocuments.map((document) => (
                      <tr key={document.id} className="hover:bg-muted/25">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-muted-foreground mr-3" />
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {(document as any).filename || `Financial Document`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {document.document_type?.toUpperCase() || 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            {formatPeriod(document.start_date || '', document.end_date || '')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            document.status === 'approved' ? 'bg-green-100 text-green-800' :
                            document.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                            document.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {document.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewDocument(document)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="View document"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditDocument(document)}
                              className="text-accent hover:text-accent/80 transition-colors"
                              title="Edit document"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(document.id!)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}
      </Card>

      {/* Manual Forms */}
      {showManualPLForm && (
        <ManualPLFormSimplified
          onClose={() => setShowManualPLForm(false)}
          onSave={async () => {
            setShowManualPLForm(false);
            await loadDocuments();
          }}
        />
      )}

      {showManualBalanceSheetForm && (
        <ManualBalanceSheetForm
          onClose={() => setShowManualBalanceSheetForm(false)}
          onSave={async () => {
            setShowManualBalanceSheetForm(false);
            await loadDocuments();
          }}
        />
      )}

      {showManualCashFlowForm && (
        <ManualCashFlowForm
          onClose={() => setShowManualCashFlowForm(false)}
          onSave={async () => {
            setShowManualCashFlowForm(false);
            await loadDocuments();
          }}
        />
      )}

      {/* Review Document Modal - Use Edit P&L Modal */}
      {(() => {
        console.log('🎭 Modal render check:', { showReviewModal, hasData: !!lastExtractedData });
        return showReviewModal && lastExtractedData;
      })() && (
        <ManualPLFormSimplified
          initialData={{
            startDate: lastExtractedData.start_date,
            endDate: lastExtractedData.end_date,
            revenue: lastExtractedData.revenue || 0,
            cogs: lastExtractedData.cogs || 0,
            operatingExpenses: lastExtractedData.operatingExpenses || 0,
            ownerDistributions: lastExtractedData.ownerDistributions || 0,
            taxes: lastExtractedData.taxes || 0,
            filename: lastExtractedData.filename
          }}
          onClose={() => {
            setShowReviewModal(false);
            setLastExtractedData(null);
            setReviewPeriodStart('');
            setReviewPeriodEnd('');
          }}
          onSave={async () => {
            // ManualPLFormSimplified handles the save internally
            // This callback is called after successful save
            setShowReviewModal(false);
            setLastExtractedData(null);
            setReviewPeriodStart('');
            setReviewPeriodEnd('');
            await loadDocuments();
          }}
        />
      )}

      {/* OLD REVIEW MODAL - REPLACED WITH EDIT P&L MODAL ABOVE */}
      {false && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground">Review Uploaded Document</CardTitle>
                  <p className="text-muted-foreground mt-1">Verify the document details before saving</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReviewModal(false);
                    setLastExtractedData(null);
                    setReviewPeriodStart('');
                    setReviewPeriodEnd('');
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const finalData = {
                    ...lastExtractedData,
                    start_date: reviewPeriodStart || lastExtractedData.start_date,
                    end_date: reviewPeriodEnd || lastExtractedData.end_date,
                    status: 'processed'
                  };

                  console.log('💾 Saving document:', finalData);

                  const response = await fetch('http://localhost:8000/api/financial-documents', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(finalData),
                  });

                  if (!response.ok) {
                    throw new Error(`Save failed: ${response.statusText}`);
                  }

                  const result = await response.json();
                  console.log('✅ Document saved:', result);

                  setShowReviewModal(false);
                  setLastExtractedData(null);
                  setReviewPeriodStart('');
                  setReviewPeriodEnd('');
                  await loadDocuments();
                } catch (error) {
                  console.error('❌ Save error:', error);
                  alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }} className="space-y-6">
                {/* Document Information */}
                <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Filename</label>
                    <p className="text-foreground font-mono mt-1">{lastExtractedData.filename}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Document Type</label>
                    <p className="text-foreground capitalize mt-1">
                      {lastExtractedData.document_type === 'pnl' ? 'Profit & Loss Statement' :
                       lastExtractedData.document_type === 'balance_sheet' ? 'Balance Sheet' :
                       lastExtractedData.document_type === 'cash_flow' ? 'Cash Flow Statement' :
                       lastExtractedData.document_type}
                    </p>
                  </div>
                </div>

                {/* Period Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-accent" />
                    Period Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Period Start Date
                      </label>
                      <Input
                        type="date"
                        value={reviewPeriodStart || lastExtractedData.start_date}
                        onChange={(e) => setReviewPeriodStart(e.target.value)}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Period End Date
                      </label>
                      <Input
                        type="date"
                        value={reviewPeriodEnd || lastExtractedData.end_date}
                        onChange={(e) => setReviewPeriodEnd(e.target.value)}
                        className="w-full"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowReviewModal(false);
                      setLastExtractedData(null);
                      setReviewPeriodStart('');
                      setReviewPeriodEnd('');
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-accent hover:bg-accent/90 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Document
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Document Modal */}
      {showViewModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground">Document Summary</CardTitle>
                  <p className="text-muted-foreground mt-1">{selectedDocument.filename}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedDocument(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Document Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Document Type</label>
                  <p className="text-foreground font-semibold mt-1">
                    {selectedDocument.document_type === 'pnl' ? 'Profit & Loss' :
                     selectedDocument.document_type === 'balance_sheet' ? 'Balance Sheet' :
                     selectedDocument.document_type === 'cash_flow' ? 'Cash Flow' :
                     selectedDocument.document_type}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Period</label>
                  <p className="text-foreground font-semibold mt-1">
                    {formatPeriod(selectedDocument.start_date || '', selectedDocument.end_date || '')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-foreground font-semibold mt-1 capitalize">
                    {selectedDocument.status || 'processed'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Source</label>
                  <p className="text-foreground font-semibold mt-1 capitalize">
                    {selectedDocument.source?.replace('_', ' ') || 'Upload'}
                  </p>
                </div>
              </div>

              {/* Summary Metrics */}
              {selectedDocument.summary_metrics && Object.keys(selectedDocument.summary_metrics).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Financial Summary</h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    {Object.entries(selectedDocument.summary_metrics).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {typeof value === 'number' 
                            ? new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: 'USD' 
                              }).format(value)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Data section removed - no value to users */}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedDocument(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false);
                    setEditingDocument(selectedDocument);
                    setShowEditModal(true);
                    setSelectedDocument(null);
                  }}
                  className="bg-accent hover:bg-accent/90 text-white"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Document Modal - Use ManualPLFormSimplified for editing */}
      {showEditModal && editingDocument && (
        <ManualPLFormSimplified
          documentId={editingDocument.id} // Pass document ID to enable PUT request
          initialData={{
            startDate: editingDocument.start_date || '',
            endDate: editingDocument.end_date || '',
            // Access flattened fields added during document transformation (lines 119-133)
            revenue: (editingDocument as any).revenue || 0,
            cogs: (editingDocument as any).cogs || 0,
            operatingExpenses: (editingDocument as any).operating_expenses || 0,
            ownerDistributions: (editingDocument as any).owner_distributions || 0,
            taxes: (editingDocument as any).taxes || 0,
            filename: editingDocument.filename
          }}
          onClose={() => {
            setShowEditModal(false);
            setEditingDocument(null);
          }}
          onSave={async () => {
            setShowEditModal(false);
            setEditingDocument(null);
            await loadDocuments();
          }}
        />
      )}
    </div>
  );
};

export default FinancialStatements;
