import React, { useState, useRef } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../contexts/auth-context';
import { parseFinancialCSV, validateCSVFile } from '../../utils/csvParser';
import { createManualFinancialDocument } from '../../api/financialDocuments';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const CSVUploadModal: React.FC<CSVUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const { dbUserId } = useAuthContext();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validation = validateCSVFile(selectedFile);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid CSV file');
        setUploadStatus('error');
        return;
      }
      setFile(selectedFile);
      setErrorMessage('');
      setUploadStatus('idle');
    }
  };

  const handleParseCSV = async () => {
    if (!file) return;

    try {
      setUploadStatus('parsing');
      const result = await parseFinancialCSV(file, 'pnl');
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse CSV file');
      }
      
      if (result.data) {
        // Convert the parsed data to a simple array format for preview
        const previewData = Object.entries(result.data.extractedFields).map(([key, field]) => ({
          category: key,
          value: field.value,
          confidence: field.confidence
        }));
        setParsedData(previewData);
      }
      
      setUploadStatus('idle');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse CSV file');
      setUploadStatus('error');
    }
  };

  const handleUpload = async () => {
    if (!file || !dbUserId || parsedData.length === 0) return;

    try {
      setUploadStatus('uploading');
      setIsUploading(true);

      // Parse the CSV again to get the full data structure
      const parseResult = await parseFinancialCSV(file, 'pnl');
      
      if (!parseResult.success || !parseResult.data) {
        throw new Error(parseResult.error || 'Failed to parse CSV data');
      }

      // Create a financial document from CSV data
      const documentData = {
        user_id: dbUserId,
        document_type: parseResult.data.documentType,
        status: 'completed',
        start_date: parseResult.data.document.start_date || new Date().toISOString().split('T')[0],
        end_date: parseResult.data.document.end_date || new Date().toISOString().split('T')[0],
        file_name: file.name,
        source: 'csv_upload',
        raw_json: parseResult.data.extractedFields,
        summary_metrics: parseResult.data.summary
      };

      const result = await createManualFinancialDocument(documentData);
      
      if (result.success) {
        setUploadStatus('success');
        setTimeout(() => {
          onUploadSuccess();
          handleClose();
        }, 2000);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setErrorMessage('');
    setUploadStatus('idle');
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // Calculation functions removed - using existing csvParser utilities

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Upload CSV Financial Data</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isUploading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File Upload Area */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-6">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">
            {file ? file.name : 'Select a CSV file to upload'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your financial data in CSV format
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-file-input"
            disabled={isUploading}
          />
          <label
            htmlFor="csv-file-input"
            className="inline-flex items-center px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 cursor-pointer transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose File
          </label>
        </div>

        {/* Status Messages */}
        {uploadStatus === 'parsing' && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-blue-700 dark:text-blue-300">Parsing CSV file...</span>
          </div>
        )}

        {uploadStatus === 'uploading' && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-blue-700 dark:text-blue-300">Creating financial document...</span>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg mb-4">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-700 dark:text-green-300">CSV data uploaded successfully!</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{errorMessage}</span>
          </div>
        )}

        {/* Parsed Data Preview */}
        {parsedData.length > 0 && uploadStatus !== 'success' && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-2">Extracted Financial Data</h3>
            <div className="border border-border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                      Value
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedData.map((row, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-xs text-foreground capitalize">
                        {row.category?.replace(/_/g, ' ') || 'Unknown'}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        ${typeof row.value === 'number' ? row.value.toLocaleString() : row.value}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {row.confidence ? `${Math.round((row.confidence || 0) * 100)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isUploading}
          >
            Cancel
          </button>
          {file && uploadStatus === 'idle' && (
            <button
              onClick={handleParseCSV}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors text-sm"
            >
              Parse CSV
            </button>
          )}
          {parsedData.length > 0 && uploadStatus === 'idle' && (
            <button
              onClick={handleUpload}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors text-sm"
            >
              Upload Data
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-2">CSV Format Instructions:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Include columns for revenue, expenses, and other financial metrics</li>
            <li>• Use clear column headers (e.g., "Revenue", "Cost of Goods Sold", "Operating Expenses")</li>
            <li>• Format monetary values with or without currency symbols ($1,000 or 1000)</li>
            <li>• The system will automatically detect and categorize financial data</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
