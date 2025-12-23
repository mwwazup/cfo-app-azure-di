import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface CSVRow {
  date: string;
  employeeName: string;
  crewName?: string;
  role?: 'crew' | 'helper'; // Role in crew: 'crew' (default) or 'helper'
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
  onImport: (data: CSVRow[]) => Promise<void | { success: boolean; skipped?: boolean }>;
  employees: Array<{ name: string }>;
  services: Array<{ serviceName: string }>;
}

export function CSVUploadDialog({ open, onClose, onImport, employees, services }: CSVUploadDialogProps) {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingText, setLoadingText] = useState('surfing');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Rotate through surf-themed loading messages
  React.useEffect(() => {
    if (!isProcessing) return;
    
    const messages = ['surfing', 'swimming', 'board', 'paddling', 'riding'];
    let index = 0;
    
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingText(messages[index]);
    }, 500);
    
    return () => clearInterval(interval);
  }, [isProcessing]);

  const downloadTemplate = () => {
    // Template with clear instructions and examples
    // Lines starting with # are automatically skipped during import
    const template = `# ================================================================
# DAILY RECORDS CSV TEMPLATE - INSTRUCTIONS
# ================================================================
# Lines starting with # are automatically ignored during import.
# Delete the SAMPLE DATA ROWS below and replace with your actual data.
#
# ⚠️ IMPORTANT: DATA IS CASE-SENSITIVE!
#    - Employee names must EXACTLY match names in the system
#    - Service names must EXACTLY match names in the system
#
# TWO RECORD TYPES:
# ------------------
# 1. SOLO: Employee works alone. Leave "Crew Name" and "Role" empty.
#
# 2. CREW: 2+ employees working together on same jobs.
#    - All crew members have SAME Crew Name, Date, Service, Jobs, Revenue
#    - Each crew member enters the SAME revenue (total job revenue)
#
# NOTE: To add a HELPER to a crew job, use the Edit button in the UI
#       after importing. Helpers cannot be added via CSV.
#
# COLUMNS:
#   Hours = time spent on THIS specific job/service
#   Total Daily Hours = employee's FULL work day (for base pay calculation)
#
# Each row = one service/job. Multiple services = multiple rows.
# ================================================================
Date,Employee Name,Crew Name,Role,Service Name,Jobs,Hours,Revenue,Total Daily Hours,Tips,Notes
# --- SAMPLE DATA - DELETE THESE ROWS AND ADD YOUR OWN ---
# SOLO EXAMPLE (John works alone - 2 jobs on Jan 15):
2025-01-15,John Doe,,,Window Cleaning (Residential),2,3.5,450.00,8.0,20.00,Morning jobs
2025-01-15,John Doe,,,Gutter Cleaning,1,2.0,200.00,8.0,0.00,Afternoon job
# CREW EXAMPLE (2 employees on same jobs on Jan 16):
2025-01-16,John Doe,Alpha Crew,,Pressure Washing (Residential),3,5.0,900.00,10.0,25.00,Crew member
2025-01-16,Jane Smith,Alpha Crew,,Pressure Washing (Residential),3,5.0,900.00,10.0,25.00,Crew member`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily_records_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedData => {
    // Filter out empty lines AND comment lines (starting with #)
    const lines = text.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    });
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
    const crewIdx = getIndex('crew name');
    const roleIdx = getIndex('role');
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
        // Validate and normalize date (accepts YYYY-MM-DD or M/D/YYYY or MM/DD/YYYY)
        let date = values[dateIdx];
        if (!date) {
          errors.push(`Row ${rowNum}: Date is required`);
          continue;
        }
        
        // Check for MM/DD/YYYY or M/D/YYYY format and convert to YYYY-MM-DD
        const usDateMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (usDateMatch) {
          const [, month, day, year] = usDateMatch;
          date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Validate final format is YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          errors.push(`Row ${rowNum}: Invalid date format. Use YYYY-MM-DD or MM/DD/YYYY`);
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

        // Optional fields - parse these first to check if helper
        const crewName = crewIdx >= 0 && values[crewIdx]?.trim() 
          ? values[crewIdx].trim() 
          : undefined;
        
        // Parse role - only relevant for crew jobs
        const roleValue = roleIdx >= 0 && values[roleIdx]?.trim().toLowerCase();
        // Helpers cannot be imported via CSV - must be added manually via UI
        if (roleValue === 'helper') {
          errors.push(`Row ${rowNum}: Helpers cannot be imported via CSV. Use the Edit button in the UI to add helpers to crew jobs.`);
          continue;
        }
        
        const role: 'crew' | undefined = crewName ? 'crew' : undefined;

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
          crewName,
          role,
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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background/10 border border-accent">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-accent flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            Import Daily Records from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                <Download className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Need a template?</p>
                <p className="text-sm text-muted-foreground">Download a sample CSV file with the correct format</p>
              </div>
            </div>
            <Button 
              onClick={downloadTemplate} 
              variant="ghost"
              className="bg-background/20 border border-accent/50 hover:bg-background/20 hover:border-accent text-foreground"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="border-2 border border-accent/50 rounded-lg p-8 text-center bg-muted/40">
            <div className="p-4 rounded-full bg-accent/20 w-fit mx-auto mb-4">
              <Upload className="h-8 w-8 text-accent" />
            </div>
            <p className="mb-2 font-medium text-foreground">Upload CSV File</p>
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
              variant="ghost"
              className="bg-accent hover:bg-accent/90 text-background font-medium"
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
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-green-500 font-medium">
                    Successfully parsed {parsedData.rows.length} record(s) ready for import
                  </p>
                </div>
              )}

              {/* Warnings */}
              {parsedData.warnings.length > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <p className="font-medium text-yellow-500">Warnings:</p>
                  </div>
                  <ul className="text-sm text-yellow-500 space-y-1 ml-12">
                    {parsedData.warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {parsedData.errors.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                    <p className="font-medium text-red-500">Errors:</p>
                  </div>
                  <ul className="text-sm text-red-500 space-y-1 ml-12">
                    {parsedData.errors.slice(0, 10).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {parsedData.errors.length > 10 && (
                      <li>• ... and {parsedData.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview */}
              {parsedData.rows.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    Preview (first 5 records)
                  </h3>
                  <div className="border border-border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-foreground">Date</th>
                          <th className="text-left p-3 text-sm font-medium text-foreground">Employee</th>
                          <th className="text-left p-3 text-sm font-medium text-foreground">Crew</th>
                          <th className="text-left p-3 text-sm font-medium text-foreground">Role</th>
                          <th className="text-left p-3 text-sm font-medium text-foreground">Service</th>
                          <th className="text-center p-3 text-sm font-medium bg-accent/20 text-accent">Jobs</th>
                          <th className="text-center p-3 text-sm font-medium text-foreground">Hours</th>
                          <th className="text-center p-3 text-sm font-medium bg-accent/20 text-accent">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-border hover:bg-muted/20">
                            <td className="p-3 text-foreground">{row.date}</td>
                            <td className="p-3 text-foreground">{row.employeeName}</td>
                            <td className="p-3 text-muted-foreground">{row.crewName || '—'}</td>
                            <td className="p-3 text-muted-foreground">
                              {row.role === 'helper' ? (
                                <span className="text-yellow-500 font-medium">Helper</span>
                              ) : row.crewName ? (
                                <span className="text-accent">Crew</span>
                              ) : '—'}
                            </td>
                            <td className="p-3 text-muted-foreground">{row.serviceName}</td>
                            <td className="text-center p-3 bg-accent/10">
                              <span className="text-sm font-bold text-accent">{row.jobs}</span>
                            </td>
                            <td className="text-center p-3 text-foreground">{row.hours}</td>
                            <td className="text-center p-3 bg-accent/10">
                              <span className="text-sm font-bold text-accent">${row.revenue.toFixed(2)}</span>
                            </td>
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

        <DialogFooter className="gap-2">
          <Button 
            onClick={handleClose} 
            variant="ghost"
            className="bg-background/20 border border-border hover:bg-background/20 hover:border-accent text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData || parsedData.rows.length === 0 || parsedData.errors.length > 0 || isProcessing}
            className="bg-accent hover:bg-accent/90 text-background font-medium disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="animate-pulse">{loadingText}</span>
                <span>...</span>
              </span>
            ) : (
              `Import ${parsedData?.rows.length || 0} Records`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
