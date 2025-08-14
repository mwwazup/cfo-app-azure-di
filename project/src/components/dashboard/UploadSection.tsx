import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { useFinancialData } from '../../hooks/useFinancialData';
import { StatementType } from '../../models/FinancialStatement';
import { FinancialDataService } from '../../services/financialDataService';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  X,
  FileSpreadsheet,
  DollarSign
} from 'lucide-react';

interface UploadSectionProps {
  onUploadComplete?: () => void;
}

export function UploadSection({ onUploadComplete }: UploadSectionProps) {
  const { uploadStatement, loading } = useFinancialData();
  const [selectedType, setSelectedType] = useState<StatementType>('profit_loss');
  const [pasteData, setPasteData] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    status: 'idle' | 'uploading' | 'success' | 'error';
    message?: string;
    fileName?: string;
  }>({ status: 'idle' });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadStatus({ 
      status: 'uploading', 
      message: 'Parsing and uploading file...', 
      fileName: file.name 
    });

    try {
      const result = await uploadStatement(file, selectedType);
      
      if (result.success) {
        setUploadStatus({ 
          status: 'success', 
          message: 'File uploaded and parsed successfully!',
          fileName: file.name
        });
        onUploadComplete?.();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setUploadStatus({ status: 'idle' });
        }, 3000);
      } else {
        setUploadStatus({ 
          status: 'error', 
          message: result.error || 'Upload failed',
          fileName: file.name
        });
      }
    } catch (error) {
      setUploadStatus({ 
        status: 'error', 
        message: 'Unexpected error during upload',
        fileName: file.name
      });
    }
  }, [uploadStatement, selectedType, onUploadComplete]);

  const handlePasteUpload = async () => {
    if (!pasteData.trim()) return;

    setUploadStatus({ 
      status: 'uploading', 
      message: 'Processing pasted data...', 
      fileName: 'Pasted Data' 
    });

    try {
      // Convert pasted text to CSV format
      const lines = pasteData.trim().split('\n');
      const csvContent = lines.map(line => {
        // Simple parsing - split by tabs or multiple spaces
        const parts = line.split(/\t|  +/);
        return parts.map(part => `"${part.trim()}"`).join(',');
      }).join('\n');

      // Create a blob and file from the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'pasted-data.csv', { type: 'text/csv' });

      const result = await uploadStatement(file, selectedType);
      
      if (result.success) {
        setUploadStatus({ 
          status: 'success', 
          message: 'Pasted data processed successfully!',
          fileName: 'Pasted Data'
        });
        setPasteData('');
        setShowPasteArea(false);
        onUploadComplete?.();
        
        setTimeout(() => {
          setUploadStatus({ status: 'idle' });
        }, 3000);
      } else {
        setUploadStatus({ 
          status: 'error', 
          message: result.error || 'Processing failed',
          fileName: 'Pasted Data'
        });
      }
    } catch (error) {
      setUploadStatus({ 
        status: 'error', 
        message: 'Unexpected error during processing',
        fileName: 'Pasted Data'
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: loading || uploadStatus.status === 'uploading'
  });

  const clearStatus = () => {
    setUploadStatus({ status: 'idle' });
  };

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'uploading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus.status) {
      case 'uploading':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      default:
        return '';
    }
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Financial Statements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statement Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Statement Type
          </label>
          <Select value={selectedType} onValueChange={(value: StatementType) => setSelectedType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select statement type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profit_loss">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Profit & Loss
                </div>
              </SelectItem>
              <SelectItem value="cash_flow">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Cash Flow
                </div>
              </SelectItem>
              <SelectItem value="balance_sheet">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Balance Sheet
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upload Status */}
        {uploadStatus.status !== 'idle' && (
          <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <div className="font-medium text-sm">
                    {uploadStatus.fileName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {uploadStatus.message}
                  </div>
                </div>
              </div>
              {uploadStatus.status !== 'uploading' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearStatus}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          } ${loading || uploadStatus.status === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload className={`h-12 w-12 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your financial statement'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                or click to browse files
              </p>
            </div>
            
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Supported formats: CSV, Excel (.xlsx, .xls), PDF
            </div>
          </div>
        </div>

        {/* Manual Upload Button */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="outline"
              disabled={loading || uploadStatus.status === 'uploading'}
              onClick={() => document.querySelector('input[type="file"]')?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
            <Button
              variant="outline"
              disabled={loading || uploadStatus.status === 'uploading'}
              onClick={() => setShowPasteArea(!showPasteArea)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Paste Data
            </Button>
          </div>
        </div>

        {/* Paste Data Area */}
        {showPasteArea && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Paste Financial Data
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Copy and paste data from your accounting software, spreadsheet, or PDF. 
              Make sure account names and amounts are in separate columns.
            </p>
            <textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Account Name    Amount&#10;Revenue         50000&#10;Expenses        30000&#10;..."
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 font-mono text-sm"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPasteData('');
                  setShowPasteArea(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePasteUpload}
                disabled={!pasteData.trim() || loading || uploadStatus.status === 'uploading'}
              >
                Process Data
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Upload Instructions:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Ensure your file has account names in the first column</li>
            <li>• Include amounts in the second column</li>
            <li>• Use standard accounting formats (negative numbers in parentheses)</li>
            <li>• For PDFs: Ensure text is selectable (not scanned images)</li>
            <li>• For pasted data: Use tab or multiple spaces to separate columns</li>
            <li>• The system will automatically detect and categorize your data</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}