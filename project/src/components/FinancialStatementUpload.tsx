import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadFinancialDocuments } from '../api/financialDocuments';

interface UploadProgress {
  fileName: string;
  status: 'uploading' | 'analyzing' | 'success' | 'error';
  documentId?: string;
  error?: string;
  documentType?: string;
}

interface FinancialStatementUploadProps {
  onUploadComplete?: (documentIds: string[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export const FinancialStatementUpload: React.FC<FinancialStatementUploadProps> = ({
  onUploadComplete,
  maxFiles = 5,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png']
}) => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [userId] = useState(() => {
    // Get user ID from auth context or local storage
    return localStorage.getItem('user_id') || 'demo-user-id';
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => 
      acceptedTypes.some(type => file.name.toLowerCase().endsWith(type.toLowerCase()))
    );

    if (validFiles.length === 0) return;

    // Initialize progress tracking
    const initialProgress = validFiles.map(file => ({
      fileName: file.name,
      status: 'uploading' as const
    }));
    setUploadProgress(initialProgress);

    try {
      // Call backend API for document upload and analysis
      const response = await uploadFinancialDocuments(validFiles, userId);
      
      const completedProgress = validFiles.map((file, fileIndex) => ({
        fileName: file.name,
        status: response.success ? 'success' as const : 'error' as const,
        documentId: response.success ? response.documentIds[fileIndex] : undefined,
        error: response.success ? undefined : response.errors[0],
        documentType: response.success ? 'Financial Statement' : undefined
      }));
      
      setUploadProgress(completedProgress);

      // Call callback with successful uploads
      if (onUploadComplete && response.success) {
        // In a real implementation, we would pass actual document IDs
        onUploadComplete([]);
      }
    } catch (error) {
      // Handle batch upload errors
      const errorProgress = validFiles.map(file => ({
        fileName: file.name,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
      setUploadProgress(errorProgress);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'analyzing':
        return <FileText className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: UploadProgress['status'], documentType?: string) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'analyzing':
        return 'Analyzing with AI...';
      case 'success':
        return `Successfully processed ${documentType || 'document'}`;
      case 'error':
        return 'Failed to process';
    }
  };

  const getDocumentTypeDisplay = (type?: string) => {
    switch (type) {
      case 'P&L':
        return 'P&L Statement';
      case 'BALANCE_SHEET':
        return 'Balance Sheet';
      case 'CASH_FLOW':
        return 'Cash Flow Statement';
      default:
        return 'Financial Document';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Financial Statements</h2>
        <p className="text-gray-600">
          Upload your P&L statements, balance sheets, or cash flow statements. 
          Our AI will analyze and extract the data automatically.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <div className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to upload
        </div>
        <div className="text-sm text-gray-600 mb-4">
          Supports PDF, JPG, JPEG, PNG (max {maxFiles} files)
        </div>
        
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
        >
          Choose Files
        </label>
      </div>

      {uploadProgress.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Upload Progress</h3>
          {uploadProgress.map((progress, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(progress.status)}
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {progress.fileName}
                </div>
                <div className="text-sm text-gray-600">
                  {getStatusText(progress.status, progress.documentType)}
                </div>
                {progress.error && (
                  <div className="text-sm text-red-600 mt-1">
                    {progress.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Supported Document Types</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Profit & Loss Statements (P&L)</li>
          <li>• Balance Sheets</li>
          <li>• Cash Flow Statements</li>
        </ul>
      </div>
    </div>
  );
};
