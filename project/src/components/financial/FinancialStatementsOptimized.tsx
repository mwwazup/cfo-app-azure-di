import React, { useState, useMemo } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Trash2, ChevronDown, ChevronUp, DollarSign, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { useDocumentsMeta, useIngestDocument, useSelectedDocument } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/auth-context';

type DocumentType = 'profit_loss' | 'balance_sheet' | 'cash_flow';

interface DocumentUploadProps {
  type: DocumentType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const DocumentUploadCard: React.FC<DocumentUploadProps> = ({ type, title, description, icon }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const ingestMutation = useIngestDocument();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Use the new ingest API
      await ingestMutation.mutateAsync({ 
        file: base64, 
        documentType: type 
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      notification.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Document processed and saved successfully!
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);

    } catch (error) {
      console.error('Error processing document:', error);
      alert(`Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  return (
    <div className="border-solid p-6 text-center bg-white transition-all" style={{ border: '2px solid #d0b46a', borderRadius: '10px' }}>
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-transparent flex items-center justify-center" style={{ border: '2px solid #d0b46a', borderRadius: '4px' }}>
          {icon}
        </div>
        <div>
          <h4 className="text-lg font-semibold text-black mb-2">{title}</h4>
          <p className="text-sm text-black mb-4">{description}</p>
        </div>
        
        {isUploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
            <p className="text-sm text-black">Processing with AI...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">{uploadProgress}% complete</p>
          </div>
        ) : (
          <label className="inline-flex items-center px-4 py-2 rounded-lg cursor-pointer transition-colors" style={{ backgroundColor: '#d0b46a', color: 'black' }}>
            <Upload className="h-4 w-4 mr-2" />
            Upload {title}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={isUploading || ingestMutation.isPending}
            />
          </label>
        )}
      </div>
    </div>
  );
};

const DocumentsList: React.FC = () => {
  const { data: documentsData, isLoading, error } = useDocumentsMeta();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { kpis, metrics, isLoading: isLoadingDetails } = useSelectedDocument(selectedDocId);

  const documents = documentsData?.docs || [];

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'profit_loss':
        return 'Profit & Loss';
      case 'balance_sheet':
        return 'Balance Sheet';
      case 'cash_flow':
        return 'Cash Flow';
      default:
        return type.replace('_', ' ');
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

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="text-center text-red-600">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Error loading documents: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your Financial Documents</h2>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <>
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-foreground">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">KPIs</th>
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
                              {document.created_at ? new Date(document.created_at).toLocaleDateString() : 'Unknown date'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {document.start_date && document.end_date ? (
                          `${document.start_date} to ${document.end_date}`
                        ) : (
                          'Not specified'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center ${getStatusColor(document.status)}`}>
                          {getStatusIcon(document.status)}
                          <span className="ml-2 text-sm capitalize">{document.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {selectedDocId === document.id && kpis ? (
                          <div className="space-y-1">
                            <div>Revenue: {formatCurrency(kpis.revenue_total || 0)}</div>
                            <div>Net Income: {formatCurrency(kpis.net_income || 0)}</div>
                            <div>Margin: {((kpis.net_margin || 0) * 100).toFixed(1)}%</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Click to view</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedDocId(selectedDocId === document.id ? null : document.id)}
                          className="text-accent hover:text-accent/80 flex items-center"
                          disabled={isLoadingDetails && selectedDocId === document.id}
                        >
                          {isLoadingDetails && selectedDocId === document.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent mr-2"></div>
                          ) : (
                            <Eye className="h-4 w-4 mr-2" />
                          )}
                          {selectedDocId === document.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected Document Details */}
          {selectedDocId && (kpis || metrics) && (
            <div className="border-t border-border p-6 bg-muted/25">
              <h3 className="text-lg font-semibold mb-4">Document Details</h3>
              
              {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                    <div className="text-xl font-semibold text-green-600">
                      {formatCurrency(kpis.revenue_total || 0)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Total Expenses</div>
                    <div className="text-xl font-semibold text-red-600">
                      {formatCurrency(kpis.expense_total || 0)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Net Income</div>
                    <div className="text-xl font-semibold text-blue-600">
                      {formatCurrency(kpis.net_income || 0)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Net Margin</div>
                    <div className="text-xl font-semibold text-purple-600">
                      {((kpis.net_margin || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {metrics && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Detailed Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {metrics.revenue.length > 0 && (
                      <div>
                        <h5 className="font-medium text-green-600 mb-2">Revenue Items</h5>
                        <div className="space-y-1">
                          {metrics.revenue.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="text-muted-foreground">{item.label}:</span> {formatCurrency(item.value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {metrics.expenses.length > 0 && (
                      <div>
                        <h5 className="font-medium text-red-600 mb-2">Expense Items</h5>
                        <div className="space-y-1">
                          {metrics.expenses.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="text-muted-foreground">{item.label}:</span> {formatCurrency(item.value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {metrics.kpis.length > 0 && (
                      <div>
                        <h5 className="font-medium text-blue-600 mb-2">KPI Items</h5>
                        <div className="space-y-1">
                          {metrics.kpis.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="text-muted-foreground">{item.label}:</span> {formatCurrency(item.value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const FinancialStatementsOptimized: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Please log in to access financial statements.</p>
      </div>
    );
  }

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
        
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Upload Your Financial Document</h3>
            <p className="text-muted-foreground mb-6">
              Select a document type and upload your financial statement for AI-powered analysis
            </p>
          </div>
          
          {/* Three Document Type Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DocumentUploadCard
              type="profit_loss"
              title="Profit & Loss"
              description="Upload your P&L statement to analyze revenue, expenses, and profitability"
              icon={<DollarSign className="h-8 w-8" style={{ color: '#d0b46a' }} />}
            />
            
            <DocumentUploadCard
              type="balance_sheet"
              title="Balance Sheet"
              description="Upload your balance sheet to analyze assets, liabilities, and equity"
              icon={<FileSpreadsheet className="h-8 w-8" style={{ color: '#d0b46a' }} />}
            />
            
            <DocumentUploadCard
              type="cash_flow"
              title="Cash Flow"
              description="Upload your cash flow statement to analyze cash movements and liquidity"
              icon={<TrendingUp className="h-8 w-8" style={{ color: '#d0b46a' }} />}
            />
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Supported formats: PDF, JPG, PNG • Maximum file size: 10MB
          </p>
        </div>
      </div>

      {/* Documents List */}
      <DocumentsList />
    </div>
  );
};
