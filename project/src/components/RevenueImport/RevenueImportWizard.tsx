import React, { useState } from 'react';
import Papa from 'papaparse';
import { months } from '../../contexts/revenue-context';
import { useAuth } from '../../contexts/auth-context';
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
  const { user } = useAuth();
  const { selectedYear, updateMonthlyRevenue } = useRevenue();

  const [step, setStep] = useState<1 | 2>(1);
  const [rows, setRows] = useState<TableRow[]>(months.map(m => ({ month: m, revenue: '' })));
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const parseCsv = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: res => {
        const parsed: TableRow[] = months.map(m => ({ month: m, revenue: '' }));
        res.data.forEach((row: any) => {
          const month = (row.month || row.Month || '').trim().slice(0, 3);
          const idx = months.findIndex(m => m.toLowerCase() === month.toLowerCase());
          if (idx >= 0) {
            const value = parseFloat(row.revenue || row.Revenue || row.amount || row.Amount || '');
            if (!isNaN(value)) parsed[idx].revenue = value;
          }
        });
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
    if (!user) return;
    try {
      // Only update months the user provided values for
      await Promise.all(
        rows.map((r, idx) => {
          if (r.revenue === '') return Promise.resolve(); // untouched -> keep as-is / remain sample
          const rev = Number(r.revenue);
          return updateMonthlyRevenue(months[idx], rev);
        })
      );
      onClose();
    } catch (e) {
      setError('Failed to save revenue.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-900 rounded-lg shadow-lg w-full max-w-xl p-6 relative">
        <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center bg-white text-gray-900">Import Revenue – Choose Method</h2>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-4 justify-between">
              {/* Upload CSV button */}
              <label className="flex-1 flex items-center justify-center gap-2 p-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <Upload className="h-5 w-5" />
                <span className="font-medium">Upload CSV</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </label>

              {/* Manual Entry button */}
              <button
                className="flex-1 flex items-center justify-center gap-2 p-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setStep(2)}
              >
                <FileText className="h-5 w-5" />
                Manual Entry
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Enter Monthly Revenue – {selectedYear}</h2>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <table className="min-w-full text-sm">
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.month} className="odd:bg-gray-50 dark:odd:bg-gray-700/30">
                      <td className="px-3 py-2 w-24 font-medium">{r.month}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="w-full border rounded px-2 py-1 bg-transparent"
                          value={r.revenue}
                          onChange={e => handleRevenueChange(idx, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm" onClick={() => setStep(1)}>Back</button>
              <button
                className="px-4 py-2 bg-accent text-white rounded disabled:opacity-60"
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
