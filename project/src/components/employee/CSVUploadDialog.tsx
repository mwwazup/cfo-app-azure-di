import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface CSVRow {
  date: string;
  employeeName: string;
  serviceName: string;
  jobs: number;
  hours: number;
  revenue: number;
  totalDailyHours?: number;
  tips?: number;
  notes?: string;
}

interface ParsedData {
  rows: CSVRow[];
  errors: string[];
  warnings: string[];
}

interface CSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: CSVRow[]) => Promise<void>;
  employees: Array<{ name: string }>;
  services: Array<{ serviceName: string }>;
}

export function CSVUploadDialog({ open, onClose, onImport, employees, services }: CSVUploadDialogProps) {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = `Date,Employee Name,Service Name,Jobs,Hours,Revenue,Total Daily Hours,Tips,Notes
2025-05-01,John Doe,Window Cleaning (Residential),2,3.5,450.00,8.5,20.00,Great day
2025-05-01,John Doe,Gutter Cleaning,1,2.0,200.00,8.5,20.00,
2025-05-02,John Doe,Pressure Washing (Residential),3,6.0,750.00,7.0,0.00,Completed early`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily_records_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedData => {
    const lines = text.split('\n').filter(line => line.trim());
    const errors: string[] = [];
    const warnings: string[] = [];
    const rows: CSVRow[] = [];

    if (lines.length < 2) {
      errors.push('CSV file is empty or has no data rows');
      return { rows, errors, warnings };
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredColumns = ['date', 'employee name', 'service name', 'jobs', 'hours', 'revenue'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      return { rows, errors, warnings };
    }

    // Get column indices
    const getIndex = (name: string) => header.indexOf(name);
    const dateIdx = getIndex('date');
    const employeeIdx = getIndex('employee name');
    const serviceIdx = getIndex('service name');
    const jobsIdx = getIndex('jobs');
    const hoursIdx = getIndex('hours');
    const revenueIdx = getIndex('revenue');
    const totalHoursIdx = getIndex('total daily hours');
    const tipsIdx = getIndex('tips');
    const notesIdx = getIndex('notes');

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const rowNum = i + 1;

      try {
        // Validate date
        const date = values[dateIdx];
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          errors.push(`Row ${rowNum}: Invalid date format. Use YYYY-MM-DD`);
          continue;
        }

        // Validate employee
        const employeeName = values[employeeIdx];
        if (!employeeName) {
          errors.push(`Row ${rowNum}: Employee name is required`);
          continue;
        }
        if (!employees.find(e => e.name.toLowerCase() === employeeName.toLowerCase())) {
          errors.push(`Row ${rowNum}: Employee "${employeeName}" not found`);
          continue;
        }

        // Validate service
        const serviceName = values[serviceIdx];
        if (!serviceName) {
          errors.push(`Row ${rowNum}: Service name is required`);
          continue;
        }
        if (!services.find(s => s.serviceName.toLowerCase() === serviceName.toLowerCase())) {
          warnings.push(`Row ${rowNum}: Service "${serviceName}" not found in service list`);
        }

        // Validate numbers
        const jobs = parseFloat(values[jobsIdx]);
        const hours = parseFloat(values[hoursIdx]);
        const revenue = parseFloat(values[revenueIdx]);

        if (isNaN(jobs) || jobs < 0) {
          errors.push(`Row ${rowNum}: Invalid jobs value`);
          continue;
        }
        if (isNaN(hours) || hours < 0) {
          errors.push(`Row ${rowNum}: Invalid hours value`);
          continue;
        }
        if (isNaN(revenue) || revenue < 0) {
          errors.push(`Row ${rowNum}: Invalid revenue value`);
          continue;
        }

        // Optional fields
        const totalDailyHours = totalHoursIdx >= 0 && values[totalHoursIdx] 
          ? parseFloat(values[totalHoursIdx]) 
          : undefined;
        const tips = tipsIdx >= 0 && values[tipsIdx] 
          ? parseFloat(values[tipsIdx]) 
          : 0;
        const notes = notesIdx >= 0 ? values[notesIdx] || '' : '';

        rows.push({
          date,
          employeeName,
          serviceName,
          jobs,
          hours,
          revenue,
          totalDailyHours,
          tips,
          notes
        });
      } catch (error) {
        errors.push(`Row ${rowNum}: Failed to parse - ${error}`);
      }
    }

    return { rows, errors, warnings };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.rows.length === 0) return;

    setIsProcessing(true);
    try {
      await onImport(parsedData.rows);
      setParsedData(null);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setParsedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Daily Records from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium">Need a template?</p>
              <p className="text-sm text-muted-foreground">Download a sample CSV file with the correct format</p>
            </div>
            <Button onClick={downloadTemplate} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="mb-2 font-medium">Upload CSV File</p>
            <p className="text-sm text-muted-foreground mb-4">
              Select a CSV file with daily performance records
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Choose File
            </Button>
          </div>

          {/* Validation Results */}
          {parsedData && (
            <div className="space-y-3">
              {/* Success */}
              {parsedData.rows.length > 0 && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-500">
                    Successfully parsed {parsedData.rows.length} record(s) ready for import
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {parsedData.warnings.length > 0 && (
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription>
                    <p className="font-medium text-yellow-500 mb-2">Warnings:</p>
                    <ul className="text-sm text-yellow-500 space-y-1">
                      {parsedData.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Errors */}
              {parsedData.errors.length > 0 && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <X className="h-4 w-4 text-red-500" />
                  <AlertDescription>
                    <p className="font-medium text-red-500 mb-2">Errors:</p>
                    <ul className="text-sm text-red-500 space-y-1">
                      {parsedData.errors.slice(0, 10).map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                      {parsedData.errors.length > 10 && (
                        <li>• ... and {parsedData.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {parsedData.rows.length > 0 && (
                <div className="border border-muted rounded-lg p-4">
                  <p className="font-medium mb-2">Preview (first 5 records):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Employee</th>
                          <th className="text-left p-2">Service</th>
                          <th className="text-right p-2">Jobs</th>
                          <th className="text-right p-2">Hours</th>
                          <th className="text-right p-2">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{row.date}</td>
                            <td className="p-2">{row.employeeName}</td>
                            <td className="p-2">{row.serviceName}</td>
                            <td className="text-right p-2">{row.jobs}</td>
                            <td className="text-right p-2">{row.hours}</td>
                            <td className="text-right p-2">${row.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData || parsedData.rows.length === 0 || parsedData.errors.length > 0 || isProcessing}
          >
            {isProcessing ? 'Importing...' : `Import ${parsedData?.rows.length || 0} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
