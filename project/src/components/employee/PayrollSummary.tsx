import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  DollarSign, 
  Users,
  User,
  Calendar,
  Download,
  CheckCircle
} from 'lucide-react';
import * as employeeLERService from '../../services/employeeLERService';

interface PayrollEmployee {
  id: string;
  name: string;
  position: string;
  soloBonus: number;
  crewBonus: number;
  totalBonus: number;
  basePay: number;
  totalCompensation: number;
  hoursWorked: number;
  daysWorked: number;
}

interface PayPeriodOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface PayrollSummaryProps {
  dbUserId: string;
  payPeriods: PayPeriodOption[];
  allEmployees: Array<{ id: string; name: string; position: string }>;
}

export const PayrollSummary: React.FC<PayrollSummaryProps> = ({
  dbUserId,
  payPeriods,
  allEmployees
}) => {
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<PayrollEmployee[]>([]);

  // Get available years from pay periods
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear()); // Always include current year
    payPeriods.forEach(p => {
      years.add(new Date(p.startDate).getFullYear());
      years.add(new Date(p.endDate).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payPeriods]);

  // Filter pay periods by year and month
  const filteredPayPeriods = useMemo(() => {
    return payPeriods.filter(p => {
      const periodStart = new Date(p.startDate);
      const periodEnd = new Date(p.endDate);
      
      // Filter by year
      const yearMatch = periodStart.getFullYear() === filterYear || periodEnd.getFullYear() === filterYear;
      if (!yearMatch) return false;
      
      // Filter by month if set
      if (filterMonth !== 'all') {
        const monthStart = new Date(filterYear, filterMonth, 1);
        const monthEnd = new Date(filterYear, filterMonth + 1, 0);
        const overlaps = periodStart <= monthEnd && periodEnd >= monthStart;
        if (!overlaps) return false;
      }
      
      return true;
    });
  }, [payPeriods, filterYear, filterMonth]);

  // Load payroll data when filters change
  useEffect(() => {
    if (dbUserId && filteredPayPeriods.length > 0) {
      loadPayrollData();
    } else {
      setEmployeeData([]);
    }
  }, [selectedPeriodId, filterYear, filterMonth, dbUserId, filteredPayPeriods.length]);

  // Reset period selection when year/month changes
  useEffect(() => {
    setSelectedPeriodId('all');
  }, [filterYear, filterMonth]);

  const loadPayrollData = async () => {
    setLoading(true);
    try {
      // Determine which periods to load
      const periodsToLoad = selectedPeriodId === 'all' 
        ? filteredPayPeriods 
        : filteredPayPeriods.filter(p => p.id === selectedPeriodId);
      
      if (periodsToLoad.length === 0) {
        setEmployeeData([]);
        return;
      }
      
      // Get all daily records for the selected period(s)
      const allRecords: any[] = [];
      for (const period of periodsToLoad) {
        const records = await employeeLERService.getDailyRecords(period.id);
        allRecords.push(...records);
      }
      
      // Group by employee and calculate totals
      const employeeMap = new Map<string, PayrollEmployee>();
      
      for (const record of allRecords) {
        if (!record.employee_id) continue;
        
        const employee = allEmployees.find(e => e.id === record.employee_id);
        if (!employee) continue;
        
        const isCrewRecord = record.is_crew_job || record.tracking_mode === 'crew';
        const bonus = (record.bonus_qualified_for_percent || 0) + (record.appointment_based_bonus || 0);
        const basePay = record.employee_base_pay || 0;
        const hours = record.total_hours_worked || 0;
        const isWorkingDay = !record.called_out && (record.number_of_jobs || 0) > 0;
        
        if (!employeeMap.has(record.employee_id)) {
          employeeMap.set(record.employee_id, {
            id: record.employee_id,
            name: employee.name,
            position: employee.position,
            soloBonus: 0,
            crewBonus: 0,
            totalBonus: 0,
            basePay: 0,
            totalCompensation: 0,
            hoursWorked: 0,
            daysWorked: 0
          });
        }
        
        const emp = employeeMap.get(record.employee_id)!;
        
        if (isCrewRecord) {
          emp.crewBonus += bonus;
        } else {
          emp.soloBonus += bonus;
        }
        emp.totalBonus += bonus;
        emp.basePay += basePay;
        emp.totalCompensation += basePay + bonus;
        emp.hoursWorked += hours;
        if (isWorkingDay) {
          emp.daysWorked += 1;
        }
      }
      
      // Convert to array and sort by name
      const employeeList = Array.from(employeeMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setEmployeeData(employeeList);
    } catch (error) {
      console.error('Error loading payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    return employeeData.reduce((acc, emp) => ({
      soloBonus: acc.soloBonus + emp.soloBonus,
      crewBonus: acc.crewBonus + emp.crewBonus,
      totalBonus: acc.totalBonus + emp.totalBonus,
      basePay: acc.basePay + emp.basePay,
      totalCompensation: acc.totalCompensation + emp.totalCompensation,
      hoursWorked: acc.hoursWorked + emp.hoursWorked,
      daysWorked: acc.daysWorked + emp.daysWorked
    }), {
      soloBonus: 0,
      crewBonus: 0,
      totalBonus: 0,
      basePay: 0,
      totalCompensation: 0,
      hoursWorked: 0,
      daysWorked: 0
    });
  }, [employeeData]);

  const formatCurrency = (value: number) => 
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const selectedPeriod = filteredPayPeriods.find(p => p.id === selectedPeriodId);
  
  // Generate period label for display
  const periodLabel = useMemo(() => {
    if (selectedPeriodId !== 'all' && selectedPeriod) {
      return selectedPeriod.name;
    }
    const monthName = filterMonth === 'all' 
      ? 'Year to Date' 
      : new Date(filterYear, filterMonth as number).toLocaleDateString('en-US', { month: 'long' });
    return `${monthName} ${filterYear}`;
  }, [selectedPeriodId, selectedPeriod, filterYear, filterMonth]);

  const handleExportCSV = () => {
    if (employeeData.length === 0) return;
    
    const headers = ['Employee', 'Position', 'Days', 'Hours', 'Base Pay', 'Solo Bonus', 'Crew Bonus', 'Total Bonus', 'Total Compensation'];
    const rows = employeeData.map(emp => [
      emp.name,
      emp.position,
      emp.daysWorked,
      emp.hoursWorked.toFixed(2),
      emp.basePay.toFixed(2),
      emp.soloBonus.toFixed(2),
      emp.crewBonus.toFixed(2),
      emp.totalBonus.toFixed(2),
      emp.totalCompensation.toFixed(2)
    ]);
    
    // Add totals row
    rows.push([
      'TOTALS',
      '',
      totals.daysWorked.toString(),
      totals.hoursWorked.toFixed(2),
      totals.basePay.toFixed(2),
      totals.soloBonus.toFixed(2),
      totals.crewBonus.toFixed(2),
      totals.totalBonus.toFixed(2),
      totals.totalCompensation.toFixed(2)
    ]);
    
    const csvContent = [
      `Payroll Summary - ${periodLabel}`,
      `Periods: ${filteredPayPeriods.length} pay period(s)`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${periodLabel.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" />
            Payroll Summary
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Filter */}
            <Select value={filterYear.toString()} onValueChange={(v) => setFilterYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <Calendar className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Month Filter */}
            <Select 
              value={filterMonth === 'all' ? 'all' : filterMonth.toString()} 
              onValueChange={(v) => setFilterMonth(v === 'all' ? 'all' : parseInt(v))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Year to Date</SelectItem>
                {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(2025, m).toLocaleDateString('en-US', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Pay Period Filter */}
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select pay period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pay Periods</SelectItem>
                {filteredPayPeriods.map(period => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={employeeData.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading payroll data...</div>
        ) : employeeData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payroll data for this period</p>
            <p className="text-sm mt-2">Select a pay period with employee records</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">Total Base Pay</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totals.basePay)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Solo Bonuses
                </p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totals.soloBonus)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Crew Bonuses
                </p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totals.crewBonus)}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                <p className="text-xs text-accent flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Total Bonuses
                </p>
                <p className="text-xl font-bold text-accent">{formatCurrency(totals.totalBonus)}</p>
              </div>
            </div>

            {/* Employee Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Employee</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Days</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Hours</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Base Pay</th>
                    <th className="text-right py-2 px-3 text-foreground font-medium">
                      <span className="flex items-center justify-end gap-1">
                        <User className="h-3 w-3" /> Solo Bonus
                      </span>
                    </th>
                    <th className="text-right py-2 px-3 text-foreground font-medium">
                      <span className="flex items-center justify-end gap-1">
                        <Users className="h-3 w-3" /> Crew Bonus
                      </span>
                    </th>
                    <th className="text-right py-2 px-3 text-foreground font-medium">Total Bonus</th>
                    <th className="text-right py-2 px-3 text-accent font-medium">Total Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeData.map((emp, index) => (
                    <tr key={emp.id} className={index % 2 === 0 ? 'bg-muted/10' : ''}>
                      <td className="py-2 px-3">
                        <div className="font-medium text-foreground">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.position}</div>
                      </td>
                      <td className="py-2 px-3 text-right text-foreground">{emp.daysWorked}</td>
                      <td className="py-2 px-3 text-right text-foreground">{emp.hoursWorked.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right text-foreground">{formatCurrency(emp.basePay)}</td>
                      <td className="py-2 px-3 text-right text-green-500">
                        {emp.soloBonus > 0 ? formatCurrency(emp.soloBonus) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-green-500">
                        {emp.crewBonus > 0 ? formatCurrency(emp.crewBonus) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-green-500 font-medium">
                        {emp.totalBonus > 0 ? formatCurrency(emp.totalBonus) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-accent font-bold">
                        {formatCurrency(emp.totalCompensation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-accent bg-accent/10">
                    <td className="py-3 px-3 font-bold text-foreground">TOTALS</td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">{totals.daysWorked}</td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">{totals.hoursWorked.toFixed(1)}</td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">{formatCurrency(totals.basePay)}</td>
                    <td className="py-3 px-3 text-right font-bold text-green-500">{formatCurrency(totals.soloBonus)}</td>
                    <td className="py-3 px-3 text-right font-bold text-green-500">{formatCurrency(totals.crewBonus)}</td>
                    <td className="py-3 px-3 text-right font-bold text-green-500">{formatCurrency(totals.totalBonus)}</td>
                    <td className="py-3 px-3 text-right font-bold text-accent text-lg">{formatCurrency(totals.totalCompensation)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Period Info */}
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                {periodLabel} • {filteredPayPeriods.length} pay period(s) • {employeeData.length} employees
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PayrollSummary;
