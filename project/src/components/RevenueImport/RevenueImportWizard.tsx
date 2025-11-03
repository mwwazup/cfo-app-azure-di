import React, { useState } from 'react';
import Papa from 'papaparse';
import { months } from '../../contexts/revenue-context';
import { useAuthContext } from '../../contexts/auth-context';
import { useRevenue } from '../../contexts/revenue-context';
import { X, Upload, FileText } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface TableRow {
  month: string;
  revenue: number | '';
}

export const RevenueImportWizard: React.FC<Props> = ({ open, onClose }) => {
  const { dbUserId } = useAuthContext();
  const { selectedYear, updateMonthlyRevenue, unlockHistoricalYear, lockHistoricalYear, getYearData } = useRevenue();

  const [step, setStep] = useState<1 | 2>(1);
  const [rows, setRows] = useState<TableRow[]>(months.map(m => ({ month: m, revenue: '' })));
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const parseCsv = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: res => {
        console.log('CSV parsed data:', res.data);
        console.log('CSV columns:', res.meta?.fields);
        
        const parsed: TableRow[] = months.map(m => ({ month: m, revenue: '' }));
        let matchedCount = 0;
        
        // Check if CSV is in transposed format (months as columns)
        const columns = res.meta?.fields || [];
        const hasMonthColumns = months.some(m => 
          columns.some(col => col.toLowerCase() === m.toLowerCase())
        );
        
        if (hasMonthColumns) {
          // TRANSPOSED FORMAT: Months are column headers
          console.log('Detected transposed format (months as columns)');
          
          // Find the revenue row (usually first data row)
          const revenueRow = res.data[0] as any;
          if (revenueRow) {
            months.forEach((month, idx) => {
              // Try different case variations of month name
              const value = parseFloat(
                revenueRow[month] || 
                revenueRow[month.toLowerCase()] || 
                revenueRow[month.toUpperCase()] ||
                ''
              );
              
              if (!isNaN(value) && value > 0) {
                parsed[idx].revenue = value;
                matchedCount++;
                console.log(`Matched ${month}: $${value}`);
              }
            });
          }
        } else {
          // STANDARD FORMAT: Months are row values
          console.log('Detected standard format (months as rows)');
          
          res.data.forEach((row: any) => {
            // Try multiple month column variations
            const monthValue = (
              row.month || row.Month || row.MONTH ||
              row.period || row.Period || row.PERIOD ||
              row.date || row.Date || row.DATE ||
              ''
            ).toString().trim();
            
            if (!monthValue) return;
            
            // Extract first 3 characters for abbreviation matching
            const monthAbbr = monthValue.slice(0, 3).toLowerCase();
            
            // Find matching month index
            const idx = months.findIndex(m => m.toLowerCase() === monthAbbr);
            
            if (idx >= 0) {
              // Try multiple revenue column variations
              const value = parseFloat(
                row.revenue || row.Revenue || row.REVENUE ||
                row.amount || row.Amount || row.AMOUNT ||
                row.value || row.Value || row.VALUE ||
                row.total || row.Total || row.TOTAL ||
                ''
              );
              
              if (!isNaN(value)) {
                parsed[idx].revenue = value;
                matchedCount++;
                console.log(`Matched ${months[idx]}: $${value}`);
              }
            } else {
              console.warn(`Could not match month: "${monthValue}" (abbr: "${monthAbbr}")`);
            }
          });
        }
        
        console.log(`Successfully matched ${matchedCount} months from CSV`);
        
        if (matchedCount === 0) {
          setError('No matching data found. Check console for details or try a different CSV format.');
        }
        
        setRows(parsed);
        setStep(2);
      },
      error: err => setError(err.message)
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseCsv(file);
  };

  const handleRevenueChange = (idx: number, value: string) => {
    const num = value === '' ? '' : Number(value);
    if (num !== '' && Number.isNaN(num)) return;
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, revenue: num } : r)));
  };

  const submit = async () => {
    if (!dbUserId) return;
    try {
      console.log(`Submitting revenue data for year ${selectedYear}:`, rows);
      
      // Check if year is locked
      const yearData = getYearData(selectedYear);
      const wasLocked = yearData.isLocked;
      
      if (wasLocked) {
        console.log(`Year ${selectedYear} is locked - temporarily unlocking for CSV import`);
        unlockHistoricalYear(selectedYear);
      }
      
      // Only update months the user provided values for
      const updates = rows
        .map((r, idx) => ({ month: months[idx], revenue: r.revenue, index: idx }))
        .filter(item => item.revenue !== '');
      
      console.log(`Updating ${updates.length} months for ${selectedYear}:`, updates);
      
      await Promise.all(
        updates.map(item => {
          const rev = Number(item.revenue);
          console.log(`Saving ${selectedYear} ${item.month}: $${rev}`);
          return updateMonthlyRevenue(item.month, rev);
        })
      );
      
      // Re-lock the year if it was locked before
      if (wasLocked) {
        console.log(`Re-locking year ${selectedYear}`);
        lockHistoricalYear(selectedYear);
      }
      
      console.log(`All updates completed successfully for ${selectedYear}`);
      onClose();
      
      // Reload the page to refresh all data and charts
      console.log('Reloading page to refresh data...');
      window.location.reload();
    } catch (e) {
      console.error('Submit error:', e);
      setError('Failed to save revenue.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-xl p-6 relative">
        <button className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-foreground">Import Revenue – Choose Method</h2>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-4 justify-between">
              {/* Upload CSV button */}
              <label className="flex-1 flex flex-col items-center justify-center gap-2 p-4 border border-accent/40 rounded-md bg-muted/30 hover:bg-accent/20 cursor-pointer transition-colors">
                <Upload className="h-6 w-6 text-accent" />
                <span className="font-medium text-foreground">Upload CSV</span>
                <span className="text-xs text-muted-foreground">Click to browse</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} multiple />
              </label>

              {/* Manual Entry button */}
              <button
                className="flex-1 flex flex-col items-center justify-center gap-2 p-4 border border-accent/40 rounded-md bg-muted/30 hover:bg-accent/20 transition-colors"
                onClick={() => setStep(2)}
              >
                <FileText className="h-6 w-6 text-accent" />
                <span className="font-medium text-foreground">Manual Entry</span>
                <span className="text-xs text-muted-foreground">Type values</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Enter Monthly Revenue – {selectedYear}</h2>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="max-h-64 overflow-y-auto border border-border rounded-md bg-background">
              <table className="min-w-full text-sm">
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.month} className="odd:bg-muted/30">
                      <td className="px-3 py-2 w-24 font-medium text-foreground">{r.month}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="w-full border border-border rounded px-2 py-1 bg-background text-foreground"
                          value={r.revenue}
                          onChange={e => handleRevenueChange(idx, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm border border-border rounded hover:bg-muted/30 text-foreground" onClick={() => setStep(1)}>Back</button>
              <button
                className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={submit}
                disabled={rows.every(r => r.revenue === '' || r.revenue === 0)}
              >
                Save Revenue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
