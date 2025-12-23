import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Plus, Trash2, AlertCircle, Users, User, UserPlus } from 'lucide-react';
import { useServices } from '../../hooks/useServices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Crew, CrewRole, CrewMember } from '../../services/crewService';

// Employee type for crew entry mode
export interface EmployeeForCrewEntry {
  id: string;
  name: string;
  position: string;
  base_rate: number;
}

// Company Settings
export const COMPANY_SETTINGS = {
  overheadPercent: 32,
  bonusThresholdMin: 25,
  bonusThresholdMax: 100,
  overtimeHoursDaily: 12,
  overtimeMultiplier: 1.5,
  paySchedule: 'bi-weekly' as 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'custom',
  payDayOfWeek: 5,
  payReferenceDate: undefined as string | undefined,
  paySemiMonthlyDates: [1, 15] as [number, number],
  // Appointment-based bonus settings
  enableAppointmentBonus: true,
  appointmentBonus3Jobs: 7,
  appointmentBonus4Jobs: 10,
  appointmentBonus5Jobs: 15,
  appointmentBonus6PlusJobs: 20,
  // Crew capacity settings
  numberOfCrews: undefined as number | undefined,
  employeesPerCrew: undefined as number | undefined,
  monthlyCrewCapacity: undefined as number | undefined,
  // Crew-specific bonus thresholds (lower than solo due to higher labor costs)
  crewBonusThresholdMin: 15,
  crewBonusThresholdMax: 100
};

interface ServiceBreakdownItem {
  serviceId: string;
  serviceName: string;
  jobs: number;
  hours: number;
  revenue: number;
}

export interface DailyRecord {
  id?: string;
  workDay: string;
  date: string;
  calledOut: boolean;
  numberOfJobs: number;
  jobTypes: {
    [serviceName: string]: number;
  };
  totalJobRevenue: number;
  totalHoursWorked: number;
  totalJobTime: number;
  baseRate: number;
  employeeBasePay: number;
  overtimeHours: number;
  overtimePay: number;
  cogsNoLabor: number;
  cogsNoLaborPercent: number;
  overheadCostsPercent: number;
  grossProfitBeforeBonus: number;
  grossProfitBeforeBonusPercent: number;
  ler: number;
  qualifyForBonus: boolean;
  bonusQualifiedForPercent: number;
  appointmentBasedBonus: number;
  tipAmount: number;
  totalEmployeePay: number;
  dailyHourlyWithTipsAndBonus: number;
  dailyNetProfitAfterBonus: number;
  dailyNetProfitAfterBonusPercent: number;
  notes: string;
  serviceBreakdown?: ServiceBreakdownItem[];
  // Crew tracking fields
  crewId?: string;
  isCrewJob?: boolean;
  trackingMode?: 'employee' | 'crew';
  // Record type for hybrid tracking
  recordType?: 'solo' | 'crew';
}

// Helper's participation in a specific appointment
interface HelperAppointment {
  appointmentIndex: number; // Index in serviceBreakdown array
  hours: number; // Hours helper worked on this specific job
}

// Selected employee for crew entry (includes base rate and bonus percentage)
interface SelectedCrewEmployee {
  employeeId: string;
  employeeName: string;
  baseRate: number;
  isHelper: boolean; // true if added as helper (not part of original crew)
  bonusPercentage: number; // % of crew bonus this employee receives (0-100)
  // Helper-specific fields - only used when isHelper is true
  helperHours?: number; // Total hours helper worked (sum of all appointment hours)
  helperAppointments?: HelperAppointment[]; // Which specific appointments helper worked on
}

interface AddDailyRecordWithServicesProps {
  open: boolean;
  onClose: () => void;
  onAdd: (record: DailyRecord, serviceBreakdown: ServiceBreakdownItem[]) => void;
  baseRate: number;
  editingRecord?: DailyRecord | null;
  onUpdate?: (record: DailyRecord, serviceBreakdown: ServiceBreakdownItem[]) => void;
  servicesWithCOGS: { [serviceName: string]: number };
  // Crew tracking props
  crews?: Crew[];
  crewRoles?: CrewRole[];
  crewMembers?: { [crewId: string]: CrewMember[] };
  // New props for crew entry mode
  allEmployees?: EmployeeForCrewEntry[];
  onAddCrewRecords?: (
    records: DailyRecord[], 
    serviceBreakdown: ServiceBreakdownItem[], 
    employeeIds: string[],
    baseRates: { [employeeId: string]: number },
    employeeData: { [employeeId: string]: {
      isHelper: boolean;
      bonusPercentage: number;
      helperHours?: number;
      helperJobs?: number;
      helperRevenue?: number;
      calculatedBonus?: number;
      calculatedRevenue?: number;
    }}
  ) => void;
  // When true, modal opens in crew mode by default
  defaultCrewMode?: boolean;
  // Pre-selected crew ID when opening in crew mode
  defaultCrewId?: string;
  // Company settings for bonus calculations
  overheadPercent?: number;
  crewBonusThresholdMin?: number;
  crewBonusThresholdMax?: number;
  // When true, crew records are view-only (individual employee page)
  crewRecordsReadOnly?: boolean;
}

// Helper function to round to 2 decimal places
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export function AddDailyRecordWithServices({ 
  open, 
  onClose, 
  onAdd, 
  baseRate, 
  editingRecord = null, 
  onUpdate,
  servicesWithCOGS,
  crews = [],
  crewRoles = [],
  crewMembers = {},
  allEmployees = [],
  onAddCrewRecords,
  defaultCrewMode = false,
  defaultCrewId = '',
  // overheadPercent is used in calculations but not directly referenced
  crewBonusThresholdMin = 15,
  crewBonusThresholdMax = 100,
  crewRecordsReadOnly = false
}: AddDailyRecordWithServicesProps) {
  const { services } = useServices(); // Fetch services from database
  
  const [date, setDate] = useState('');
  const [calledOut, setCalledOut] = useState(false);
  const [tips, setTips] = useState('0');
  const [notes, setNotes] = useState('');
  const [applyAppointmentBonus, setApplyAppointmentBonus] = useState(COMPANY_SETTINGS.enableAppointmentBonus);
  const [totalDailyHours, setTotalDailyHours] = useState<string>(''); // Total clock in/out hours
  
  // Service breakdown state
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdownItem[]>([]);
  const [validationError, setValidationError] = useState<string>('');
  
  // Crew tracking state
  const [isCrewJob, setIsCrewJob] = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  
  // Crew entry mode state - selected employees for bulk record creation
  const [selectedCrewEmployees, setSelectedCrewEmployees] = useState<SelectedCrewEmployee[]>([]);
  const [showHelperSelector, setShowHelperSelector] = useState(false);
  // helperBonusPercent removed - now auto-calculated from hours

  // Determine if form should be read-only (crew record on individual page)
  const isFormReadOnly = crewRecordsReadOnly && editingRecord?.isCrewJob;

  // Auto-populate service breakdown for crew jobs
  useEffect(() => {
    if (isCrewJob && serviceBreakdown.length === 0 && services.length > 0) {
      // Add one service row by default for crew jobs
      setServiceBreakdown([{
        serviceId: services[0].id,
        serviceName: services[0].serviceName,
        jobs: 1,
        hours: 0,
        revenue: 0
      }]);
    }
  }, [isCrewJob, serviceBreakdown.length, services]);

  // Initialize with one empty service row
  useEffect(() => {
    if (open && !editingRecord) {
      // Clear all fields for new record
      setDate('');
      setCalledOut(false);
      setTips('0');
      setNotes('');
      setTotalDailyHours('');
      
      // Only set empty service breakdown if not in crew mode
      if (!defaultCrewMode) {
        setServiceBreakdown([{
          serviceId: '',
          serviceName: '',
          jobs: 1, // Each row = 1 appointment
          hours: 0,
          revenue: 0
        }]);
      }
      
      // If opening in crew mode, set the crew state
      if (defaultCrewMode && crews.length > 0) {
        setIsCrewJob(true);
        // Use defaultCrewId if provided, otherwise use first active crew
        const crewId = defaultCrewId || crews.find(c => c.is_active)?.id || '';
        setSelectedCrewId(crewId);
      } else {
        setIsCrewJob(false);
        setSelectedCrewId('');
        setSelectedCrewEmployees([]);
      }
    }
  }, [open, editingRecord, defaultCrewMode, defaultCrewId, crews]);

  // Auto-populate crew members when a crew is selected
  useEffect(() => {
    if (isCrewJob && selectedCrewId && crewMembers[selectedCrewId]) {
      const members = crewMembers[selectedCrewId];
      const crewEmployees: SelectedCrewEmployee[] = members.map(member => {
        // Find the employee's base rate from allEmployees
        const employee = allEmployees.find(e => e.id === member.employee_id);
        // Get bonus percentage from crew role
        const role = crewRoles.find(r => r.id === member.role_id);
        return {
          employeeId: member.employee_id,
          employeeName: member.employee_name || 'Unknown',
          baseRate: employee?.base_rate || baseRate,
          isHelper: false,
          bonusPercentage: role?.bonus_percentage || 0
        };
      });
      setSelectedCrewEmployees(crewEmployees);
    } else if (!isCrewJob) {
      setSelectedCrewEmployees([]);
      setShowHelperSelector(false);
    }
  }, [isCrewJob, selectedCrewId, crewMembers, allEmployees, baseRate, crewRoles]);

  // Load editing record data - this runs after the reset effect
  useEffect(() => {
    if (editingRecord && open) {
      console.log('🔍 Loading editing record:', editingRecord);
      console.log('📦 Service breakdown from record:', editingRecord.serviceBreakdown);
      console.log('📦 Service breakdown type:', typeof editingRecord.serviceBreakdown);
      console.log('📦 Service breakdown length:', editingRecord.serviceBreakdown?.length);
      console.log('👥 Crew fields in editing record:', {
        isCrewJob: editingRecord.isCrewJob,
        crewId: editingRecord.crewId,
        trackingMode: editingRecord.trackingMode
      });
      
      // Set the mode first based on the record type
      setIsCrewJob(editingRecord.isCrewJob || false);
      console.log('🎯 Set isCrewJob to:', editingRecord.isCrewJob || false);
      
      setDate(editingRecord.date);
      setCalledOut(editingRecord.calledOut || false);
      setTips(editingRecord.tipAmount.toString());
      setNotes(editingRecord.notes || '');
      setTotalDailyHours(editingRecord.totalHoursWorked.toString());
      
      // Load crew data if this is a crew record
      if (editingRecord.isCrewJob && editingRecord.crewId) {
        console.log('👥 Loading crew record data:', editingRecord.crewId);
        console.log('📋 Available crews:', crews);
        setSelectedCrewId(editingRecord.crewId);
        
        // For editing, we need to load the actual employees who worked on this date
        // Query all employee records for this date and crew to get the actual participants
        console.log('🔍 Querying employee records for date:', editingRecord.date, 'and crew:', editingRecord.crewId);
        
        // Use an async function inside useEffect
        const loadCrewEmployees = async () => {
          // Import the services to query records
          const employeeLERServiceModule = await import('../../services/employeeLERService');
          const crewServiceModule = await import('../../services/crewService');
          const employeeLERService = employeeLERServiceModule as any;
          const crewService = crewServiceModule as any;
          
          try {
            // First, check if we have a valid record ID
            if (!editingRecord.id) {
              console.error('❌ No record ID found in editingRecord:', editingRecord);
              return;
            }
            
            // First, try to get crew composition from daily_record_crew_members
            console.log('🔍 Querying crew composition from daily_record_crew_members for record:', editingRecord.id);
            const crewMembers = await crewService.getDailyRecordCrewMembers(editingRecord.id);
            console.log('📊 Raw crew members response:', crewMembers);
            
            if (crewMembers.length > 0) {
              console.log('✅ Found crew composition in daily_record_crew_members:', crewMembers);
              console.log('📋 All employees available:', allEmployees);
              
              // Build the employee list from the crew members
              const crewEmployees: SelectedCrewEmployee[] = crewMembers.map((member: any) => {
                console.log('🔍 Processing crew member:', member);
                const employee = allEmployees.find(e => e.id === member.employee_id);
                console.log('👤 Found employee:', employee);
                
                // Check for helper status from is_helper field or role_name
                const isHelper = member.is_helper === true || member.role_name === 'Helper';
                
                // Load helper appointments if available
                let helperAppointments: HelperAppointment[] | undefined;
                let helperHours: number | undefined;
                if (isHelper && member.helper_appointments) {
                  helperAppointments = member.helper_appointments;
                  helperHours = helperAppointments?.reduce((sum: number, ha: HelperAppointment) => sum + ha.hours, 0) || 0;
                  console.log('📋 Loaded helper appointments:', helperAppointments, 'total hours:', helperHours);
                }
                
                return {
                  employeeId: member.employee_id,
                  employeeName: member.employee_name || employee?.name || 'Unknown Employee',
                  baseRate: employee?.base_rate || 0,
                  isHelper: isHelper,
                  bonusPercentage: member.bonus_percentage || 0,
                  helperHours: helperHours,
                  helperAppointments: helperAppointments
                };
              });
              
              console.log('✅ Mapped crew employees:', crewEmployees);
              setSelectedCrewEmployees(crewEmployees);
              console.log('✅ Loaded crew employees from daily_record_crew_members:', crewEmployees);
            } else {
              // Fallback: query all employee records for this date and crew
              console.log('⚠️ No crew composition found in daily_record_crew_members, falling back to employee records');
              const recordsForDate = await employeeLERService.getDailyRecordsForDate(editingRecord.date);
              const crewRecordsForDate = recordsForDate.filter((r: any) => r.is_crew_job && r.crew_id === editingRecord.crewId);
              
              console.log('📊 Found crew records for date:', crewRecordsForDate);
              
              if (crewRecordsForDate.length > 0) {
                // Build the employee list from the actual records
                const crewEmployees: SelectedCrewEmployee[] = crewRecordsForDate.map((record: any) => {
                  const employee = allEmployees.find(e => e.id === record.employee_id);
                  return {
                    employeeId: record.employee_id,
                    employeeName: employee?.name || 'Unknown Employee',
                    baseRate: record.base_rate || employee?.base_rate || 0,
                    isHelper: false, // We'll need to determine this from crew roles
                    bonusPercentage: 0 // Will be calculated based on crew size
                  };
                });
                
                setSelectedCrewEmployees(crewEmployees);
                console.log('✅ Loaded actual crew employees from records:', crewEmployees);
              } else {
                // Final fallback to crew roster
                console.log('⚠️ No crew records found, falling back to crew roster');
                const members = crewMembers[editingRecord.crewId || ''] || [];
                if (members.length > 0) {
                  const crewEmployees: SelectedCrewEmployee[] = members.map((member: any) => ({
                    employeeId: member.employee_id,
                    employeeName: member.employee_name || 'Unknown Employee',
                    baseRate: allEmployees.find(e => e.id === member.employee_id)?.base_rate || 0,
                    isHelper: member.role_name === 'Helper',
                    bonusPercentage: member.bonus_percentage || (100 / members.length)
                  }));
                  setSelectedCrewEmployees(crewEmployees);
                  console.log('✅ Loaded crew employees from roster:', crewEmployees);
                }
              }
            }
          } catch (error) {
            console.error('❌ Error querying crew records:', error);
            // Fallback to crew roster
            const members = crewMembers[editingRecord.crewId || ''] || [];
            if (members.length > 0) {
              const crewEmployees: SelectedCrewEmployee[] = members.map((member: any) => ({
                employeeId: member.employee_id,
                employeeName: member.employee_name || 'Unknown Employee',
                baseRate: allEmployees.find(e => e.id === member.employee_id)?.base_rate || 0,
                isHelper: member.role_name === 'Helper',
                bonusPercentage: member.bonus_percentage || (100 / members.length)
              }));
              setSelectedCrewEmployees(crewEmployees);
            }
          }
        };
        
        loadCrewEmployees();
      } else {
        console.log('📝 Not a crew record or missing crew data');
        setSelectedCrewId('');
        setSelectedCrewEmployees([]);
      }
      
      // Load service breakdown if it exists
      if (editingRecord.serviceBreakdown && editingRecord.serviceBreakdown.length > 0) {
        console.log('✅ Using existing service breakdown:', editingRecord.serviceBreakdown);
        console.log('📊 Service breakdown details:', editingRecord.serviceBreakdown.map(s => ({
          service: s.serviceName,
          jobs: s.jobs,
          hours: s.hours,
          revenue: s.revenue
        })));
        setServiceBreakdown(editingRecord.serviceBreakdown);
      } else {
        console.log('⚠️ No service breakdown found, using fallback rollup logic');
        console.log('📊 Job types to convert:', editingRecord.jobTypes);
        // Convert old format to new format - distribute totals proportionally
        const breakdown: ServiceBreakdownItem[] = [];
        const jobTypesArray = Object.entries(editingRecord.jobTypes).filter(([_, jobs]) => jobs > 0);
        const totalJobsInRecord = Object.values(editingRecord.jobTypes).reduce((sum, jobs) => sum + jobs, 0);
        
        if (jobTypesArray.length > 0 && totalJobsInRecord > 0) {
          jobTypesArray.forEach(([serviceName, jobs]) => {
            const service = services.find(s => s.serviceName === serviceName);
            const jobProportion = jobs / totalJobsInRecord;
            
            breakdown.push({
              serviceId: service?.id || '',
              serviceName,
              jobs,
              // Distribute hours and revenue proportionally based on job count
              hours: roundToTwo(editingRecord.totalHoursWorked * jobProportion),
              revenue: roundToTwo(editingRecord.totalJobRevenue * jobProportion)
            });
          });
        }
        
        setServiceBreakdown(breakdown.length > 0 ? breakdown : [{
          serviceId: '',
          serviceName: '',
          jobs: 1, // Each row = 1 appointment
          hours: 0,
          revenue: 0
        }]);
      }
    }
  }, [editingRecord, open, services, crews, crewMembers, allEmployees, crewRoles]);

  const handleAddServiceRow = () => {
    // Initialize with jobs: 1 since each row = 1 appointment
    // jobs will be set to 1 again when serviceId is selected for safety
    setServiceBreakdown([...serviceBreakdown, {
      serviceId: '',
      serviceName: '',
      jobs: 1,
      hours: 0,
      revenue: 0
    }]);
  };

  // Remove service row
  const removeServiceRow = (index: number) => {
    if (serviceBreakdown.length > 1) {
      setServiceBreakdown(serviceBreakdown.filter((_, i) => i !== index));
    }
  };

  // Update service row
  const updateServiceRow = (index: number, field: keyof ServiceBreakdownItem, value: string | number) => {
    const updated = [...serviceBreakdown];
    
    if (field === 'serviceId') {
      const service = services.find(s => s.id === value);
      updated[index].serviceId = value as string;
      updated[index].serviceName = service?.serviceName || '';
      // Each row = 1 job/appointment, auto-set jobs to 1 when service is selected
      updated[index].jobs = 1;
      // Auto-calculate revenue based on service rate and hours
      if (service && updated[index].hours > 0) {
        const serviceRate = parseFloat(service.defaultPrice || '0');
        updated[index].revenue = serviceRate * updated[index].hours;
      }
    } else if (field === 'serviceName') {
      updated[index].serviceName = value as string;
    } else if (field === 'jobs') {
      updated[index].jobs = value as number;
    } else if (field === 'hours') {
      updated[index].hours = value as number;
      // Auto-calculate revenue when hours change if service is selected
      const service = services.find(s => s.id === updated[index].serviceId);
      if (service && value as number > 0) {
        const serviceRate = parseFloat(service.defaultPrice || '0');
        updated[index].revenue = serviceRate * (value as number);
      }
    } else if (field === 'revenue') {
      updated[index].revenue = value as number;
    }
    
    setServiceBreakdown(updated);
  };

  // Calculate totals from service breakdown
  const calculateTotals = () => {
    // Each appointment row = 1 job (count rows with valid service selected)
    const totalJobs = serviceBreakdown.filter(item => item.serviceId).length;
    const crewRevenue = serviceBreakdown.reduce((sum, item) => sum + (parseFloat(item.revenue?.toString() || '0') || 0), 0);
    const crewJobTime = serviceBreakdown.reduce((sum, item) => sum + (parseFloat(item.hours?.toString() || '0') || 0), 0);
    const dailyHours = parseFloat(totalDailyHours) || 0;
    const nonJobTime = dailyHours - crewJobTime;
    
    return { totalJobs, crewJobTime, crewRevenue, dailyHours, nonJobTime };
  };

  // Validate service breakdown
  const validateBreakdown = (): boolean => {
    setValidationError('');
    
    // Check if crew mode has employees selected
    if (isCrewJob && selectedCrewEmployees.length === 0) {
      setValidationError('Please select at least one crew member');
      return false;
    }
    
    // Check if at least one service is selected
    const hasServices = serviceBreakdown.some(item => item.serviceId);
    if (!hasServices) {
      setValidationError('Please add at least one appointment');
      return false;
    }
    
    // Check that all selected services have valid data
    for (const item of serviceBreakdown) {
      if (item.serviceId) {
        if (item.hours <= 0) {
          setValidationError(`${item.serviceName}: Hours must be greater than 0`);
          return false;
        }
        if (item.revenue <= 0) {
          setValidationError(`${item.serviceName}: Revenue must be greater than 0`);
          return false;
        }
      }
    }
    
    return true;
  };

  const calculatePreview = () => {
    const { totalJobs, crewJobTime: totalJobTime, crewRevenue: totalRevenue, dailyHours, nonJobTime } = calculateTotals();
    
    // If called out sick, return all zeros (no work done, no costs incurred)
    if (calledOut) {
      return {
        totalJobs: 0,
        totalJobTime: 0,
        dailyHours: 0,
        nonJobTime: 0,
        totalRevenue: 0,
        basePay: 0,
        overtimeHours: 0,
        overtimePay: 0,
        cogsNoLabor: 0,
        cogsNoLaborPercent: 0,
        overheadCostsPercent: COMPANY_SETTINGS.overheadPercent,
        overheadAllocation: 0,
        totalCostOfJob: 0,
        grossProfitBeforeBonus: 0,
        grossProfitBeforeBonusPercent: 0,
        ler: 0,
        qualifyForBonus: false,
        bonusQualifiedForPercent: 0,
        bonusQualifiedForDollars: 0,
        appointmentBasedBonus: 0,
        totalEmployeePay: 0,
        dailyHourlyWithTipsAndBonus: 0,
        dailyNetProfitAfterBonus: 0,
        dailyNetProfitAfterBonusPercent: 0
      };
    }
    
    // Calculate labor costs based on TOTAL DAILY HOURS (clock in/out), not job time
    // For crew mode: calculate total labor for all crew members
    let regularHours = dailyHours;
    let overtimeHours = 0;
    let basePay = 0;
    let overtimePay = 0;
    
    if (isCrewJob && selectedCrewEmployees.length > 0) {
      // Crew mode: sum labor costs for all crew members (not helpers)
      const crewOnly = selectedCrewEmployees.filter(e => !e.isHelper);
      basePay = crewOnly.reduce((sum, emp) => {
        let empRegularPay = 0;
        let empOvertimePay = 0;
        
        if (dailyHours > COMPANY_SETTINGS.overtimeHoursDaily) {
          const regHrs = COMPANY_SETTINGS.overtimeHoursDaily;
          const otHrs = dailyHours - COMPANY_SETTINGS.overtimeHoursDaily;
          empRegularPay = regHrs * emp.baseRate;
          empOvertimePay = otHrs * (emp.baseRate * COMPANY_SETTINGS.overtimeMultiplier);
        } else {
          empRegularPay = dailyHours * emp.baseRate;
        }
        
        return sum + empRegularPay + empOvertimePay;
      }, 0);
      
      // Add helper labor costs
      const helpers = selectedCrewEmployees.filter(e => e.isHelper);
      basePay += helpers.reduce((sum, h) => sum + ((h.helperHours || 0) * h.baseRate), 0);
      
      // Calculate overtime for display (based on first crew member for simplicity)
      if (dailyHours > COMPANY_SETTINGS.overtimeHoursDaily) {
        overtimeHours = dailyHours - COMPANY_SETTINGS.overtimeHoursDaily;
        overtimePay = crewOnly.reduce((sum, emp) => 
          sum + (overtimeHours * (emp.baseRate * COMPANY_SETTINGS.overtimeMultiplier)), 0);
      }
    } else {
      // Solo mode: single employee
      if (dailyHours > COMPANY_SETTINGS.overtimeHoursDaily) {
        regularHours = COMPANY_SETTINGS.overtimeHoursDaily;
        overtimeHours = dailyHours - COMPANY_SETTINGS.overtimeHoursDaily;
        basePay = (regularHours * baseRate) + (overtimeHours * (baseRate * COMPANY_SETTINGS.overtimeMultiplier));
        overtimePay = overtimeHours * (baseRate * COMPANY_SETTINGS.overtimeMultiplier);
      } else {
        basePay = dailyHours * baseRate;
      }
    }
    
    // Calculate COGS dynamically based on services performed (1 job per appointment row)
    const cogsNoLaborDollars = serviceBreakdown.reduce((total, item) => {
      if (!item.serviceId) return total;
      const costPerService = servicesWithCOGS[item.serviceName] || 0;
      return total + costPerService; // Each row = 1 job
    }, 0);
    
    const cogsNoLaborPercent = totalRevenue > 0 ? (cogsNoLaborDollars / totalRevenue) * 100 : 0;
    
    // Calculate overhead allocation
    const overheadPercent = COMPANY_SETTINGS.overheadPercent;
    const overheadAllocationRate = totalRevenue * (overheadPercent / 100);
    
    // Calculate total cost of job
    const totalCostOfJob = basePay + cogsNoLaborDollars + overheadAllocationRate;
    
    // Calculate gross profit before bonus
    const grossProfitBeforeBonusDollars = totalRevenue - totalCostOfJob;
    const grossProfitBeforeBonusPercent = totalRevenue > 0 
      ? (grossProfitBeforeBonusDollars / totalRevenue) * 100
      : 0;
    
    // Calculate LER (Labor Efficiency Ratio)
    const ler = basePay > 0 ? grossProfitBeforeBonusDollars / basePay : 0;
    
    // Check if qualifies for bonus - use crew thresholds for crew jobs
    const thresholdMin = isCrewJob ? crewBonusThresholdMin : COMPANY_SETTINGS.bonusThresholdMin;
    const thresholdMax = isCrewJob ? crewBonusThresholdMax : COMPANY_SETTINGS.bonusThresholdMax;
    const qualifyForBonus = 
      grossProfitBeforeBonusPercent >= thresholdMin && 
      grossProfitBeforeBonusPercent <= thresholdMax;
    
    // Calculate Bonus Qualified For (based on daily hours)
    const bonusQualifiedForDollars = qualifyForBonus ? ler * dailyHours : 0;
    
    // Calculate Appointment Based Bonus (if enabled)
    let appointmentBasedBonus = 0;
    if (applyAppointmentBonus) {
      if (totalJobs === 3) {
        appointmentBasedBonus = COMPANY_SETTINGS.appointmentBonus3Jobs;
      } else if (totalJobs === 4) {
        appointmentBasedBonus = COMPANY_SETTINGS.appointmentBonus4Jobs;
      } else if (totalJobs === 5) {
        appointmentBasedBonus = COMPANY_SETTINGS.appointmentBonus5Jobs;
      } else if (totalJobs >= 6) {
        appointmentBasedBonus = COMPANY_SETTINGS.appointmentBonus6PlusJobs;
      }
    }
    
    const tipsDollars = parseFloat(tips) || 0;
    const totalEmployeePay = basePay + bonusQualifiedForDollars + appointmentBasedBonus + tipsDollars;
    const dailyHourlyWithTipsAndBonus = dailyHours > 0 ? totalEmployeePay / dailyHours : 0;
    const dailyNetProfitAfterBonus = totalRevenue - totalCostOfJob - bonusQualifiedForDollars - appointmentBasedBonus;
    const dailyNetProfitAfterBonusPercent = totalRevenue > 0 
      ? (dailyNetProfitAfterBonus / totalRevenue) * 100
      : 0;

    return {
      totalJobs,
      totalJobTime,
      dailyHours,
      nonJobTime,
      totalRevenue,
      basePay: roundToTwo(basePay),
      overtimeHours: roundToTwo(overtimeHours),
      overtimePay: roundToTwo(overtimePay),
      cogsNoLabor: roundToTwo(cogsNoLaborDollars),
      cogsNoLaborPercent: roundToTwo(cogsNoLaborPercent),
      overheadCostsPercent: overheadPercent,
      overheadAllocation: roundToTwo(overheadAllocationRate),
      totalCostOfJob: roundToTwo(totalCostOfJob),
      grossProfitBeforeBonus: roundToTwo(grossProfitBeforeBonusDollars),
      grossProfitBeforeBonusPercent: roundToTwo(grossProfitBeforeBonusPercent),
      ler: roundToTwo(ler),
      qualifyForBonus,
      bonusQualifiedForPercent: roundToTwo(bonusQualifiedForDollars),
      bonusQualifiedForDollars: roundToTwo(bonusQualifiedForDollars),
      appointmentBasedBonus,
      totalEmployeePay: roundToTwo(totalEmployeePay),
      dailyHourlyWithTipsAndBonus: roundToTwo(dailyHourlyWithTipsAndBonus),
      dailyNetProfitAfterBonus: roundToTwo(dailyNetProfitAfterBonus),
      dailyNetProfitAfterBonusPercent: roundToTwo(dailyNetProfitAfterBonusPercent)
    };
  };

  const preview = calculatePreview();

  const handleSubmit = async () => {
    if (!date) {
      setValidationError('Please select a date');
      return;
    }
    
    // Skip hours and service validation if called out sick
    if (!calledOut) {
      if (!totalDailyHours || parseFloat(totalDailyHours) <= 0) {
        setValidationError('Please enter total daily hours (clock in/out time)');
        return;
      }
      
      if (!validateBreakdown()) {
        return;
      }
    }

    // ============================================
    // CRITICAL: COGS VALIDATION
    // ============================================
    // Prevent data entry errors like 85% COGS anomaly
    const { cogsNoLabor, cogsNoLaborPercent } = preview;
    
    // Validation #1: High COGS Percentage (>20%)
    if (cogsNoLaborPercent > 20) {
      const confirmed = window.confirm(
        `⚠️ HIGH COGS ALERT!\n\n` +
        `COGS: $${cogsNoLabor.toFixed(2)} (${cogsNoLaborPercent.toFixed(1)}%)\n` +
        `Revenue: $${preview.totalRevenue.toFixed(2)}\n\n` +
        `Normal COGS range is 2-6%.\n` +
        `This ${cogsNoLaborPercent.toFixed(1)}% is ${(cogsNoLaborPercent / 5).toFixed(1)}x higher than normal!\n\n` +
        `Common causes:\n` +
        `• Decimal point error ($810 instead of $8.10)\n` +
        `• Equipment purchase entered as daily COGS\n` +
        `• Subcontractor cost not properly tracked\n\n` +
        `Are you SURE this is correct?`
      );
      if (!confirmed) {
        setValidationError(`COGS of ${cogsNoLaborPercent.toFixed(1)}% is unusually high. Please verify your entries.`);
        return;
      }
    }
    
    // Validation #2: Large COGS Dollar Amount (>$100)
    if (cogsNoLabor > 100) {
      const suggestedValue = (cogsNoLabor / 100).toFixed(2);
      const confirmed = window.confirm(
        `⚠️ LARGE COGS ENTRY!\n\n` +
        `COGS Amount: $${cogsNoLabor.toFixed(2)}\n` +
        `Revenue: $${preview.totalRevenue.toFixed(2)}\n\n` +
        `This is unusually high for a single day.\n\n` +
        `Did you mean $${suggestedValue}?\n\n` +
        `Continue with $${cogsNoLabor.toFixed(2)}?`
      );
      if (!confirmed) {
        setValidationError(`COGS of $${cogsNoLabor.toFixed(2)} is unusually high. Please verify your entries.`);
        return;
      }
    }
    
    // Validation #3: Negative Profit Margin
    if (preview.grossProfitBeforeBonusPercent < 0) {
      const confirmed = window.confirm(
        `🔴 NEGATIVE PROFIT MARGIN!\n\n` +
        `Gross Profit: $${preview.grossProfitBeforeBonus.toFixed(2)}\n` +
        `Profit Margin: ${preview.grossProfitBeforeBonusPercent.toFixed(1)}%\n\n` +
        `This job is LOSING MONEY!\n\n` +
        `Revenue: $${preview.totalRevenue.toFixed(2)}\n` +
        `Total Costs: $${preview.totalCostOfJob.toFixed(2)}\n` +
        `  - Labor: $${preview.basePay.toFixed(2)}\n` +
        `  - COGS: $${cogsNoLabor.toFixed(2)}\n` +
        `  - Overhead: $${preview.overheadAllocation.toFixed(2)}\n\n` +
        `Are you SURE you want to save this?`
      );
      if (!confirmed) {
        setValidationError(`Negative profit margin detected. Please review your entries.`);
        return;
      }
    }

    const { totalJobs, crewJobTime: totalJobTime, dailyHours, crewRevenue: totalRevenue } = calculateTotals();
    
    // Build jobTypes object for backward compatibility (sum up duplicate services)
    const jobTypes: { [serviceName: string]: number } = {};
    serviceBreakdown.forEach(item => {
      if (item.serviceId && item.jobs > 0) {
        if (jobTypes[item.serviceName]) {
          jobTypes[item.serviceName] += item.jobs;
        } else {
          jobTypes[item.serviceName] = item.jobs;
        }
      }
    });

    // Get day of week without timezone conversion
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed
    const workDay = dayNames[dateObj.getDay()];

    const record: DailyRecord = {
      workDay,
      date,
      calledOut,
      numberOfJobs: calledOut ? 0 : totalJobs,
      jobTypes: calledOut ? {} : jobTypes,
      totalJobRevenue: calledOut ? 0 : totalRevenue,
      totalHoursWorked: calledOut ? 0 : dailyHours,  // Total daily hours (clock in/out)
      totalJobTime: calledOut ? 0 : totalJobTime,     // Actual time on jobs
      baseRate,
      employeeBasePay: preview.basePay,
      overtimeHours: preview.overtimeHours,
      overtimePay: preview.overtimePay,
      cogsNoLabor: preview.cogsNoLabor,
      cogsNoLaborPercent: preview.cogsNoLaborPercent,
      overheadCostsPercent: preview.overheadCostsPercent,
      grossProfitBeforeBonus: preview.grossProfitBeforeBonus,
      grossProfitBeforeBonusPercent: preview.grossProfitBeforeBonusPercent,
      ler: preview.ler,
      qualifyForBonus: preview.qualifyForBonus,
      bonusQualifiedForPercent: preview.bonusQualifiedForPercent,
      appointmentBasedBonus: preview.appointmentBasedBonus,
      tipAmount: calledOut ? 0 : (parseFloat(tips) || 0),
      totalEmployeePay: preview.totalEmployeePay,
      dailyHourlyWithTipsAndBonus: preview.dailyHourlyWithTipsAndBonus,
      dailyNetProfitAfterBonus: preview.dailyNetProfitAfterBonus,
      dailyNetProfitAfterBonusPercent: preview.dailyNetProfitAfterBonusPercent,
      notes,
      serviceBreakdown: calledOut ? [] : serviceBreakdown.filter(item => item.serviceId && item.jobs > 0),
      // Crew tracking fields
      crewId: isCrewJob ? selectedCrewId : undefined,
      isCrewJob: isCrewJob,
      trackingMode: isCrewJob ? 'crew' : 'employee',
      recordType: isCrewJob ? 'crew' : 'solo'
    };

    // Filter out empty service rows
    const validServiceBreakdown = serviceBreakdown.filter(item => item.serviceId && item.jobs > 0);
    
    // Debug: Log what we're about to save
    console.log('💾 About to save serviceBreakdown:', validServiceBreakdown);
    console.log('📊 Original serviceBreakdown before filtering:', serviceBreakdown);
    console.log('🔍 Is crew job?', isCrewJob);
    console.log('👥 Selected crew employees count:', selectedCrewEmployees.length);

    if (editingRecord && onUpdate) {
      // Editing mode - single record update
      onUpdate(record, validServiceBreakdown);
    } else if (isCrewJob && selectedCrewEmployees.length > 0 && onAddCrewRecords) {
      // Crew mode - create records for all selected employees
      // Build base rates map and employee data for each employee
      const baseRates: { [employeeId: string]: number } = {};
      const employeeData: { [employeeId: string]: {
        isHelper: boolean;
        bonusPercentage: number;
        helperHours?: number;
        helperAppointments?: HelperAppointment[];
        calculatedBonus?: number; // Pre-calculated bonus from the modal
        calculatedRevenue?: number; // Revenue share for this employee
      }} = {};
      
      // Calculate the per-person bonus breakdown (same logic as the display)
      const totalDailyBonus = preview.bonusQualifiedForDollars + preview.appointmentBasedBonus;
      const crewMembers = selectedCrewEmployees.filter(e => !e.isHelper);
      const helpers = selectedCrewEmployees.filter(e => e.isHelper);
      
      // Check if bonus percentages are set - if all are 0, split evenly
      const totalBonusPercent = crewMembers.reduce((sum, m) => sum + (m.bonusPercentage || 0), 0);
      const useEvenSplit = totalBonusPercent === 0;
      
      // Helper function to get crew member's bonus share
      const getCrewBonusShare = (member: SelectedCrewEmployee, crewBonus: number) => {
        if (useEvenSplit) {
          return crewMembers.length > 0 ? crewBonus / crewMembers.length : 0;
        }
        return crewBonus * ((member.bonusPercentage || 0) / 100);
      };
      
      // Calculate bonus breakdown per job
      const jobBreakdown = serviceBreakdown
        .filter(appt => appt.serviceId)
        .map((appt, index) => {
          const revenueShare = preview.totalRevenue > 0 ? (appt.revenue || 0) / preview.totalRevenue : 0;
          const jobBonus = revenueShare * totalDailyBonus;
          
          // Check if any helper worked on this job
          const helperOnJob = helpers.find(h => 
            h.helperAppointments?.some(ha => ha.appointmentIndex === index)
          );
          
          if (helperOnJob && helperOnJob.helperAppointments) {
            const helperAppt = helperOnJob.helperAppointments.find(ha => ha.appointmentIndex === index);
            const helperHrs = helperAppt?.hours || 0;
            const crewDailyHours = parseFloat(totalDailyHours) || 0;
            const totalJobHours = (crewDailyHours * crewMembers.length) + helperHrs;
            const helperShare = totalJobHours > 0 ? helperHrs / totalJobHours : 0;
            const helperBonus = jobBonus * helperShare;
            const crewBonus = jobBonus - helperBonus;
            
            return {
              revenue: appt.revenue || 0,
              jobBonus,
              hasHelper: true,
              helperId: helperOnJob.employeeId,
              helperBonus,
              crewBonus,
              crewAllocations: crewMembers.map(m => ({
                employeeId: m.employeeId,
                bonus: getCrewBonusShare(m, crewBonus)
              }))
            };
          } else {
            return {
              revenue: appt.revenue || 0,
              jobBonus,
              hasHelper: false,
              crewBonus: jobBonus,
              crewAllocations: crewMembers.map(m => ({
                employeeId: m.employeeId,
                bonus: getCrewBonusShare(m, jobBonus)
              }))
            };
          }
        });
      
      // Calculate person totals from job breakdown
      const personBonusTotals: { [employeeId: string]: number } = {};
      const personRevenueTotals: { [employeeId: string]: number } = {};
      
      // Initialize all employees
      selectedCrewEmployees.forEach(emp => {
        personBonusTotals[emp.employeeId] = 0;
        personRevenueTotals[emp.employeeId] = 0;
      });
      
      // Sum up bonuses from each job
      jobBreakdown.forEach(job => {
        // Crew members get their share of every job
        job.crewAllocations.forEach(alloc => {
          personBonusTotals[alloc.employeeId] = (personBonusTotals[alloc.employeeId] || 0) + alloc.bonus;
        });
        
        // Helpers only get bonus from jobs they worked on
        helpers.forEach(h => {
          const helperBonus = (h.helperAppointments || []).reduce((sum, ha) => {
            const appt = serviceBreakdown[ha.appointmentIndex];
            return sum + (appt?.revenue || 0) * 0.1; // Estimate 10% bonus from revenue
          }, 0);
          personBonusTotals[h.employeeId] = helperBonus;
        });
      });
      
      // Build employee data with pre-calculated bonuses
      selectedCrewEmployees.forEach(emp => {
        baseRates[emp.employeeId] = emp.baseRate;
        employeeData[emp.employeeId] = {
          isHelper: emp.isHelper,
          bonusPercentage: emp.bonusPercentage,
          helperHours: emp.helperHours,
          helperAppointments: emp.helperAppointments,
          calculatedBonus: personBonusTotals[emp.employeeId] || 0,
          calculatedRevenue: personRevenueTotals[emp.employeeId] || 0
        };
      });
      
      // Create array of records (one per employee, calculations will be done per-employee in the page)
      const records: DailyRecord[] = selectedCrewEmployees.map(emp => ({
        ...record,
        baseRate: emp.baseRate, // Use each employee's base rate
      }));
      
      const employeeIds = selectedCrewEmployees.map(emp => emp.employeeId);
      
      onAddCrewRecords(records, validServiceBreakdown, employeeIds, baseRates, employeeData);
    } else {
      // Solo mode - single record
      onAdd(record, validServiceBreakdown);
    }

    // Reset form
    setDate('');
    setTips('0');
    setNotes('');
    setTotalDailyHours('');
    setIsCrewJob(false);
    setSelectedCrewId('');
    setSelectedCrewEmployees([]);
    setShowHelperSelector(false);
    setServiceBreakdown([{
      serviceId: '',
      serviceName: '',
      jobs: 0,
      hours: 0,
      revenue: 0
    }]);
    setValidationError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {editingRecord ? 'Edit Daily Appointment Record' : 'Add Daily Appointment Record'}
          </DialogTitle>
        </DialogHeader>

        {/* Read-only notice for crew records on individual employee page */}
        {crewRecordsReadOnly && editingRecord?.isCrewJob && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-accent mb-1">Crew Day - View Only</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  This is a crew day record. Changes to shared crew data affect all crew members and must be made from the <strong>Crew page</strong>.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                  <li>• <strong>Daily Hours</strong> - affects all crew members</li>
                  <li>• <strong>Revenue</strong> - affects all crew members</li>
                  <li>• <strong>Job Time</strong> - affects all crew members</li>
                  <li>• <strong>COGS/Expenses</strong> - affects all crew members</li>
                </ul>
                <p className="text-xs text-accent">
                  Go to <strong>Employee LER → Crew View</strong> to edit this crew day.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Date and Called Out */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="date" className="text-foreground">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isFormReadOnly}
                className="bg-background text-foreground border-border [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="calledOut"
                checked={calledOut}
                onCheckedChange={(checked) => setCalledOut(checked === true)}
                disabled={isFormReadOnly}
              />
              <Label htmlFor="calledOut" className="text-foreground cursor-pointer">
                Called Out Sick
              </Label>
            </div>
          </div>
          
          {/* Called Out Notice */}
          {calledOut && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-sm text-amber-500">
                <strong>Sick Day:</strong> This day will be marked as called out. No jobs, revenue, or bonuses will be recorded. 
                Hours worked will still be tracked if entered.
              </p>
            </div>
          )}

          {/* Job Type Toggle - Solo vs Crew (hidden when editing or opened in crew mode) */}
          {crews.length > 0 && !defaultCrewMode && !editingRecord && (
            <div className="space-y-3">
              <h4 className="text-xl text-accent font-semibold">Role Assignment</h4>
              <div className="bg-muted/20 rounded-lg p-4 border border-border space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setIsCrewJob(false);
                      setSelectedCrewId('');
                    }}
                    className={`w-full py-4 text-base border-2 border-accent ${!isCrewJob ? "bg-accent text-accent-foreground hover:bg-accent/90" : "hover:bg-muted/50"}`}
                  >
                    <User className="h-5 w-5 mr-2" />
                    Solo Job
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setIsCrewJob(true)}
                    className={`w-full py-4 text-base border-2 border-accent ${isCrewJob ? "bg-accent text-accent-foreground hover:bg-accent/90" : "hover:bg-muted/50"}`}
                  >
                    <Users className="h-5 w-5 mr-2" />
                    Crew Job
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* Crew Selection - shown when in crew mode (either via toggle or defaultCrewMode) */}
          {isCrewJob && crews.length > 0 && (
            <div className="space-y-3">
              {defaultCrewMode && (
                <h4 className="text-xl text-accent font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Crew Day Entry
                </h4>
              )}
              <div>
                <Label className="text-sm text-muted-foreground">Select Crew</Label>
                <Select value={selectedCrewId} onValueChange={setSelectedCrewId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Choose a crew..." />
                  </SelectTrigger>
                  <SelectContent>
                    {crews.filter(c => c.is_active).map(crew => (
                      <SelectItem key={crew.id} value={crew.id!}>
                        {crew.crew_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                  {selectedCrewId && selectedCrewEmployees.length > 0 && (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-muted-foreground">
                          Crew Members ({selectedCrewEmployees.length} selected)
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Re-select all original crew members
                              const members = crewMembers[selectedCrewId] || [];
                              const crewEmployees: SelectedCrewEmployee[] = members.map(member => {
                                const employee = allEmployees.find(e => e.id === member.employee_id);
                                const role = crewRoles.find(r => r.id === member.role_id);
                                return {
                                  employeeId: member.employee_id,
                                  employeeName: member.employee_name || 'Unknown',
                                  baseRate: employee?.base_rate || baseRate,
                                  isHelper: false,
                                  bonusPercentage: role?.bonus_percentage || 0
                                };
                              });
                              setSelectedCrewEmployees(crewEmployees);
                            }}
                            className="text-xs h-7 px-2"
                          >
                            Select All
                          </Button>
                        </div>
                      </div>
                      
                      {/* Crew member checkboxes */}
                      <div className="space-y-2">
                        {selectedCrewEmployees.map(emp => {
                          return (
                            <div key={emp.employeeId} className="space-y-1">
                              <div 
                                className={`flex items-center justify-between text-sm py-2 px-3 rounded border ${
                                  emp.isHelper 
                                    ? 'bg-background/30 border-border' 
                                    : 'bg-background/30 border-transparent'
                                }`}
                              >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`crew-emp-${emp.employeeId}`}
                                  checked={true}
                                  onCheckedChange={() => {
                                    // Remove this employee from selection
                                    setSelectedCrewEmployees(prev => 
                                      prev.filter(e => e.employeeId !== emp.employeeId)
                                    );
                                  }}
                                />
                                <label 
                                  htmlFor={`crew-emp-${emp.employeeId}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {emp.employeeName}
                                  {emp.isHelper && (
                                    <span className="ml-2 text-xs text-accent-400">(Helper)</span>
                                  )}
                                </label>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground text-sm">
                                  ${(emp.baseRate || 0).toFixed(2)}/hr
                                </span>
                                {/* Bonus % - editable for helpers, display only for crew members */}
                                {emp.isHelper ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={emp.bonusPercentage}
                                      onChange={(e) => {
                                        const newPercent = parseFloat(e.target.value) || 0;
                                        setSelectedCrewEmployees(prev => 
                                          prev.map(p => p.employeeId === emp.employeeId 
                                            ? { ...p, bonusPercentage: newPercent }
                                            : p
                                          )
                                        );
                                      }}
                                      className="w-14 h-6 text-xs text-center"
                                    />
                                    <span className="text-accent text-sm">%</span>
                                  </div>
                                ) : (
                                  <span className="text-accent text-sm">
                                    {emp.bonusPercentage}%
                                  </span>
                                )}
                                {!emp.isHelper && emp.bonusPercentage > 0 && (
                                  <span className="text-muted-foreground text-sm">
                                    {emp.bonusPercentage}% Bonus
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Helper note - configuration moved to after appointments */}
                            {emp.isHelper && (
                              <p className="ml-8 mt-1 text-xs text-accent">
                                ↓ Configure which appointments this helper worked on below
                              </p>
                            )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Helper Button */}
                      {!showHelperSelector ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowHelperSelector(true)}
                          className="w-full mt-2 border-dashed"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Helper (Non-Crew Employee)
                        </Button>
                      ) : (
                        <div className="mt-3 p-3 bg-background/10 rounded-lg border border-accent">
                          <Label className="text-sm text-accent mb-2 block">Add Helper to Today's Crew</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            Select an employee to add as a helper. Their bonus will be auto-calculated based on hours worked.
                          </p>
                          
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {allEmployees
                              .filter(emp => !selectedCrewEmployees.some(s => s.employeeId === emp.id))
                              .map(emp => (
                                <div 
                                  key={emp.id}
                                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                                  onClick={() => {
                                    setSelectedCrewEmployees(prev => [...prev, {
                                      employeeId: emp.id,
                                      employeeName: emp.name,
                                      baseRate: emp.base_rate || 0,
                                      isHelper: true,
                                      bonusPercentage: 0,
                                      helperHours: 0
                                    }]);
                                    setShowHelperSelector(false); // Auto-close after selecting
                                  }}
                                >
                                  <span className="font-medium">{emp.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">{emp.position}</span>
                                    <span className="text-muted-foreground text-sm">${(emp.base_rate || 0).toFixed(2)}/hr</span>
                                    <UserPlus className="h-4 w-4 text-accent" />
                                  </div>
                                </div>
                              ))}
                            {allEmployees.filter(emp => !selectedCrewEmployees.some(s => s.employeeId === emp.id)).length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                All employees are already in the crew
                              </p>
                            )}
                          </div>
                                                  </div>
                      )}

                      <p className="text-sm text-accent mt-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Records will be created for all {selectedCrewEmployees.length} selected employees
                      </p>
                    </div>
                  )}
            </div>
          )}

          {/* Service Breakdown Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Appointments</Label>
              {!isFormReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddServiceRow()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Appointment
                </Button>
              )}
            </div>

            {serviceBreakdown.map((item, index) => (
              <div key={index} className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Appointment {index + 1}</span>
                  {serviceBreakdown.length > 1 && !isFormReadOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeServiceRow(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Service Selection */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Service</Label>
                    <Select
                      value={item.serviceId}
                      onValueChange={(value) => updateServiceRow(index, 'serviceId', value)}
                    >
                      <SelectTrigger className="w-full bg-muted/30" disabled={isFormReadOnly}>
                        <SelectValue placeholder="Select service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(service => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.serviceName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job Time (hours on this specific service) */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Job Time (hrs)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={item.hours || ''}
                      onChange={(e) => updateServiceRow(index, 'hours', parseFloat(e.target.value) || 0)}
                      disabled={isFormReadOnly}
                      className="bg-background text-foreground border-border"
                      placeholder="Time on job"
                    />
                  </div>

                  {/* Revenue */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Revenue ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.revenue || ''}
                      onChange={(e) => updateServiceRow(index, 'revenue', parseFloat(e.target.value) || 0)}
                      disabled={isFormReadOnly}
                      className="bg-background text-foreground border-border"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Daily Hours Input - Right after appointments to tell the story of the day */}
          <div>
            <Label htmlFor="totalDailyHours" className="text-foreground font-semibold mb-3">
              Total Daily Hours (Clock In/Out) *
            </Label>
            <Input
              id="totalDailyHours"
              type="number"
              step="0.25"
              min="0"
              value={totalDailyHours}
              onChange={(e) => setTotalDailyHours(e.target.value)}
              disabled={isFormReadOnly}
              className="bg-background text-foreground border-border"
              placeholder="e.g., 8.0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total hours employee was clocked in (used for pay calculation)
            </p>
          </div>

          {/* Helper Job Assignment Section - Only show if there are helpers and appointments */}
          {isCrewJob && selectedCrewEmployees.some(emp => emp.isHelper) && serviceBreakdown.some(s => s.serviceName) && (
            <div className="space-y-3 bg-background/10 rounded-lg p-4 border border-accent/20">
              <h4 className="text-lg text-accent font-semibold flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Helper Job Assignment
              </h4>
              <p className="text-sm text-muted-foreground">
                Select which appointments each helper worked on. Their bonus will be calculated based only on those jobs.
              </p>
              
              {selectedCrewEmployees.filter(emp => emp.isHelper).map(helper => (
                <div key={helper.employeeId} className="bg-background/50 rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-foreground">{helper.employeeName}</span>
                    <span className="text-xs text-muted-foreground">${helper.baseRate.toFixed(2)}/hr</span>
                  </div>
                  
                  {/* Appointment checkboxes */}
                  <div className="space-y-2">
                    {serviceBreakdown.map((appt, apptIndex) => {
                      if (!appt.serviceName) return null;
                      
                      const helperAppt = helper.helperAppointments?.find(ha => ha.appointmentIndex === apptIndex);
                      const isSelected = !!helperAppt;
                      
                      return (
                        <div key={apptIndex} className={`p-2 rounded border ${isSelected ? 'bg-muted/30-500/10 border-accent/30' : 'bg-muted/20 border-transparent'}`}>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`helper-${helper.employeeId}-appt-${apptIndex}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                setSelectedCrewEmployees(prev => prev.map(emp => {
                                  if (emp.employeeId !== helper.employeeId) return emp;
                                  
                                  let newAppointments = [...(emp.helperAppointments || [])];
                                  if (checked) {
                                    // Add this appointment
                                    newAppointments.push({ appointmentIndex: apptIndex, hours: 0 });
                                  } else {
                                    // Remove this appointment
                                    newAppointments = newAppointments.filter(ha => ha.appointmentIndex !== apptIndex);
                                  }
                                  
                                  // Calculate total helper hours
                                  const totalHelperHours = newAppointments.reduce((sum, ha) => sum + ha.hours, 0);
                                  
                                  // Calculate helper's revenue from selected appointments
                                  const helperRevenue = newAppointments.reduce((sum, ha) => {
                                    const appt = serviceBreakdown[ha.appointmentIndex];
                                    return sum + (appt?.revenue || 0);
                                  }, 0);
                                  
                                  // Calculate total revenue
                                  const totalRevenue = serviceBreakdown.reduce((sum, s) => sum + (s.revenue || 0), 0);
                                  
                                  // Auto-calculate bonus % based on revenue share
                                  const autoBonus = totalRevenue > 0 ? (helperRevenue / totalRevenue) * 100 : 0;
                                  
                                  return {
                                    ...emp,
                                    helperAppointments: newAppointments,
                                    helperHours: totalHelperHours,
                                    bonusPercentage: Math.round(autoBonus * 10) / 10
                                  };
                                }));
                              }}
                            />
                            <label 
                              htmlFor={`helper-${helper.employeeId}-appt-${apptIndex}`}
                              className="flex-1 cursor-pointer"
                            >
                              <span className="text-sm font-medium">{appt.serviceName}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                (${(appt.revenue || 0).toFixed(0)})
                              </span>
                            </label>
                            
                            {/* Hours input - only show if selected */}
                            {isSelected && (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={helperAppt?.hours || ''}
                                  onChange={(e) => {
                                    const hours = parseFloat(e.target.value) || 0;
                                    setSelectedCrewEmployees(prev => prev.map(emp => {
                                      if (emp.employeeId !== helper.employeeId) return emp;
                                      
                                      const newAppointments = (emp.helperAppointments || []).map(ha => 
                                        ha.appointmentIndex === apptIndex ? { ...ha, hours } : ha
                                      );
                                      
                                      const totalHelperHours = newAppointments.reduce((sum, ha) => sum + ha.hours, 0);
                                      
                                      // Recalculate bonus % based on hours ratio
                                      const crewMemberCount = selectedCrewEmployees.filter(e => !e.isHelper).length;
                                      const crewDailyHours = parseFloat(totalDailyHours) || 0;
                                      // Total hours = (crew members × daily hours) + helper hours
                                      const totalCrewHours = (crewDailyHours * crewMemberCount) + totalHelperHours;
                                      const autoBonus = totalCrewHours > 0 ? (totalHelperHours / totalCrewHours) * 100 : 0;
                                      
                                      return {
                                        ...emp,
                                        helperAppointments: newAppointments,
                                        helperHours: totalHelperHours,
                                        bonusPercentage: Math.round(autoBonus * 10) / 10
                                      };
                                    }));
                                  }}
                                  placeholder="hrs"
                                  className="w-16 h-7 text-xs text-center"
                                />
                                <span className="text-xs text-muted-foreground">hrs</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Helper Summary with Detailed Breakdown */}
                  {helper.helperAppointments && helper.helperAppointments.length > 0 && (() => {
                    // Calculate detailed breakdown
                    const helperHrs = helper.helperHours || 0;
                    
                    // Helper's revenue from selected jobs
                    const helperRevenue = helper.helperAppointments.reduce((sum, ha) => {
                      const appt = serviceBreakdown[ha.appointmentIndex];
                      // appt variable used in calculation
                      return sum + (appt?.revenue || 0);
                    }, 0);
                    
                    // Total revenue
                    
                    // Helper's labor cost
                    
                    // Helper's COGS (from their jobs only - 1 job per appointment)
                    
                    // Helper's overhead
                    
                    // Helper's profit
                    
                    // Calculate bonus using same logic as job breakdown
                    const totalDailyBonus = preview.bonusQualifiedForDollars + preview.appointmentBasedBonus;
                    const helperBonus = serviceBreakdown
                      .filter((_appt, index) => {
                        return helper.helperAppointments?.some(ha => ha.appointmentIndex === index);
                      })
                      .reduce((sum: number, appt: any, index: number) => {
                        const revenueShare = preview.totalRevenue > 0 ? (appt.revenue || 0) / preview.totalRevenue : 0;
                        const jobBonus = revenueShare * totalDailyBonus;
                        
                        const helperAppt = helper.helperAppointments?.find(ha => ha.appointmentIndex === index);
                        // helperAppt used in calculation
                        const helperHrs = helperAppt?.hours || 0;
                        const crewDailyHours = parseFloat(totalDailyHours) || 0;
                        const totalJobHours = (crewDailyHours * (crewMembers?.length || 0)) + helperHrs;
                        const helperShare = totalJobHours > 0 ? helperHrs / totalJobHours : 0;
                        
                        return sum + (jobBonus * helperShare);
                      }, 0);
                    
                    return (
                      <div className="mt-3 space-y-2">
                        {/* Jobs Helper Worked On - Simplified */}
                        <div className="p-3 bg-background/10 rounded border border-accent/30">
                          <p className="text-xs text-accent font-medium mb-2">
                            Jobs {helper.employeeName} Helped With:
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Revenue: ${helperRevenue.toFixed(2)} | Hours: {helperHrs}
                            </span>
                            <span className="text-sm font-medium text-accent">
                              Est. Bonus: ${helperBonus.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{validationError}</p>
            </div>
          )}

          {/* Totals Summary */}
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
            <h4 className="font-semibold text-foreground mb-3">Daily Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
                <p className="text-lg font-bold text-accent">{preview.totalJobs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job Time</p>
                <p className="text-lg font-bold text-accent">{preview.totalJobTime.toFixed(2)} hrs</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Daily Hours</p>
                <p className="text-lg font-bold text-accent">{preview.dailyHours.toFixed(2)} hrs</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold text-accent">${preview.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
            {preview.nonJobTime > 0 && (
              <div className="mt-3 pt-3 border-t border-accent/20">
                <p className="text-xs text-muted-foreground">Non-Job Time (travel, breaks, admin)</p>
                <p className="text-sm font-semibold text-yellow-500">{preview.nonJobTime.toFixed(2)} hrs</p>
              </div>
            )}
          </div>

          {/* Bonus Options */}
          <div className="space-y-3">
            <h4 className="text-xl text-accent font-semibold">Bonus Options</h4>
            <div className="bg-muted/20 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="appointmentBonus"
                    checked={applyAppointmentBonus}
                    onCheckedChange={(checked) => setApplyAppointmentBonus(checked as boolean)}
                  />
                  <Label htmlFor="appointmentBonus" className="text-foreground cursor-pointer text-base">
                    Apply appointment-based bonus
                  </Label>
                </div>
              </div>
            
            {applyAppointmentBonus && (
              <div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-muted-foreground">3 jobs</p>
                    <p className="font-semibold text-foreground">${COMPANY_SETTINGS.appointmentBonus3Jobs}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">4 jobs</p>
                    <p className="font-semibold text-foreground">${COMPANY_SETTINGS.appointmentBonus4Jobs}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">5 jobs</p>
                    <p className="font-semibold text-foreground">${COMPANY_SETTINGS.appointmentBonus5Jobs}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">6+ jobs</p>
                    <p className="font-semibold text-foreground">${COMPANY_SETTINGS.appointmentBonus6PlusJobs}</p>
                  </div>
                </div>
                <p className="text-sm text-yellow-500 mt-8">💡 Configure in Company Settings</p>
              </div>
            )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-foreground mb-3">Notes (Optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isFormReadOnly}
              className="w-full px-3 py-2 border border-border rounded-md bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Add any notes about this day..."
            />
          </div>

          {/* Job-by-Job Bonus Breakdown - Only show for crew mode when there's bonus to distribute */}
          {isCrewJob && preview.qualifyForBonus && serviceBreakdown.some(s => s.serviceId) && (() => {
            const totalDailyBonus = preview.bonusQualifiedForDollars + preview.appointmentBasedBonus;
            if (totalDailyBonus <= 0) return null;
            
            const crewMembers = selectedCrewEmployees.filter(e => !e.isHelper);
            const helpers = selectedCrewEmployees.filter(e => e.isHelper);
            
            // Check if bonus percentages are set - if all are 0, split evenly
            const totalBonusPercent = crewMembers.reduce((sum, m) => sum + (m.bonusPercentage || 0), 0);
            const useEvenSplit = totalBonusPercent === 0;
            const evenSplitPercent = crewMembers.length > 0 ? 100 / crewMembers.length : 0;
            
            // Helper function to get crew member's bonus share
            const getCrewBonusShare = (member: SelectedCrewEmployee, crewBonus: number) => {
              if (useEvenSplit) {
                return crewBonus / crewMembers.length;
              }
              return crewBonus * ((member.bonusPercentage || 0) / 100);
            };
            
            // Calculate bonus breakdown per job
            const jobBreakdown = serviceBreakdown
              .filter(appt => appt.serviceId)
              .map((appt, index) => {
                const revenueShare = preview.totalRevenue > 0 ? (appt.revenue || 0) / preview.totalRevenue : 0;
                const jobBonus = revenueShare * totalDailyBonus;
                
                // Calculate gross profit for this job
                const jobRevenue = appt.revenue || 0;
                const jobLabor = (jobRevenue * 40) / 100; // 40% labor cost
                const jobCOGS = servicesWithCOGS[appt.serviceName] || 0;
                const jobOverhead = jobRevenue * (COMPANY_SETTINGS.overheadPercent / 100);
                const jobProfit = jobRevenue - jobLabor - jobCOGS - jobOverhead;
                const grossProfitPct = jobRevenue > 0 ? (jobProfit / jobRevenue) * 100 : 0;
                
                // Check if any helper worked on this job
                const helperOnJob = helpers.find(h => 
                  h.helperAppointments?.some(ha => ha.appointmentIndex === index)
                );
                
                if (helperOnJob && helperOnJob.helperAppointments) {
                  const helperAppt = helperOnJob.helperAppointments.find(ha => ha.appointmentIndex === index);
                  const helperHrs = helperAppt?.hours || 0;
                  const crewDailyHours = parseFloat(totalDailyHours) || 0;
                  const totalJobHours = (crewDailyHours * crewMembers.length) + helperHrs;
                  const helperShare = totalJobHours > 0 ? helperHrs / totalJobHours : 0;
                  const helperBonus = jobBonus * helperShare;
                  const crewBonus = jobBonus - helperBonus;
                  
                  return {
                    serviceName: appt.serviceName,
                    revenue: appt.revenue || 0,
                    jobBonus,
                    grossProfitPct,
                    hasHelper: true,
                    helperName: helperOnJob.employeeName,
                    helperShare: helperShare * 100,
                    helperBonus,
                    crewBonus,
                    crewAllocations: crewMembers.map(m => ({
                      name: m.employeeName,
                      bonus: getCrewBonusShare(m, crewBonus),
                      percent: useEvenSplit ? evenSplitPercent : (m.bonusPercentage || 0)
                    }))
                  };
                } else {
                  return {
                    serviceName: appt.serviceName,
                    revenue: appt.revenue || 0,
                    jobBonus,
                    grossProfitPct,
                    hasHelper: false,
                    crewBonus: jobBonus,
                    crewAllocations: crewMembers.map(m => ({
                      name: m.employeeName,
                      bonus: getCrewBonusShare(m, jobBonus),
                      percent: useEvenSplit ? evenSplitPercent : (m.bonusPercentage || 0)
                    }))
                  };
                }
              });
            
            // Calculate person totals
            const personTotals = [
              ...crewMembers.map(m => ({
                name: m.employeeName,
                type: 'crew' as const,
                totalBonus: jobBreakdown.reduce((sum, job) => {
                  const alloc = job.crewAllocations.find(a => a.name === m.employeeName);
                  return sum + (alloc?.bonus || 0);
                }, 0)
              })),
              ...helpers.map(h => ({
                name: h.employeeName,
                type: 'helper' as const,
                totalBonus: jobBreakdown.reduce((sum, job) => {
                  if (job.hasHelper && job.helperName === h.employeeName) {
                    return sum + (job.helperBonus || 0);
                  }
                  return sum;
                }, 0)
              }))
            ];
            
            return (
              <>
                {/* Bonus Breakdown (Job by Job) */}
                <div className="bg-background/10 rounded-lg p-4 border border-accent/30">
                  <h4 className="text-xl font-semibold text-accent mb-2">
                    Bonus Breakdown (Job by Job)
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Bonus qualification is based on daily total GP ({preview.grossProfitBeforeBonusPercent.toFixed(1)}%), distributed by revenue share per job.
                  </p>
                  <div className="space-y-4">
                    {jobBreakdown.map((job, index) => (
                      <div 
                        key={index} 
                        className="p-4 bg-muted/30 rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-xl font-bold text-foreground">Job {index + 1}</span>
                            <span className="text-lg text-muted-foreground ml-2">({job.serviceName})</span>
                            <span className="text-lg text-muted-foreground ml-3">
                              ${job.revenue.toFixed(0)} revenue
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-muted-foreground">Gross Profit</p>
                              <p className={`text-xl font-bold ${(job.grossProfitPct || 0) >= 30 ? 'text-green-400' : (job.grossProfitPct || 0) >= 20 ? 'text-green-400' : 'text-red-400'}`}>
                                {(job.grossProfitPct || 0).toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground">Job Bonus</p>
                              <p className="text-2xl font-bold text-accent">${job.jobBonus.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        
                        {job.hasHelper && (
                          <p className="text-accent mb-3">
                            {job.helperName} helped ({job.helperShare?.toFixed(1)}% of job hours)
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-4">
                          {job.crewAllocations.map((alloc, i) => (
                            <div key={i} className="px-4 py-2 bg-background/20 rounded-lg border border-border">
                              <span className="text-muted-foreground">{alloc.name}:</span>
                              <span className="text-xl font-bold text-foreground ml-2">${alloc.bonus.toFixed(2)}</span>
                            </div>
                          ))}
                          {job.hasHelper && (
                            <div className="px-4 py-2 bg-accent/20 rounded-lg border border-accent/30">
                              <span className="text-accent">{job.helperName}:</span>
                              <span className="text-xl font-bold text-accent ml-2">${job.helperBonus?.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bonus Summary (Per Person) */}
                <div className="bg-background/10 rounded-lg p-4 border border-accent/30">
                  <h4 className="text-xl font-semibold text-accent mb-4">Bonus Summary (Per Person)</h4>
                  <div className="space-y-3">
                    {personTotals.map((person, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                      >
                        <div>
                          <span className="text-xl font-semibold text-foreground">{person.name}</span>
                          {person.type === 'helper' && (
                            <span className="text-accent ml-2">(Helper)</span>
                          )}
                        </div>
                        <span className="text-2xl font-bold text-accent">${person.totalBonus.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Verification */}
                  <div className="mt-4 p-3 rounded-lg bg-muted/30 flex items-center justify-between">
                    <span className="text-foreground font-medium">
                      Total Distributed: ${personTotals.reduce((sum, p) => sum + p.totalBonus, 0).toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      (Expected: ${totalDailyBonus.toFixed(2)})
                    </span>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Preview Section */}
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-semibold text-accent pb-4">Calculation Preview</h4>
              {/* COGS Warning Indicator */}
              {preview.cogsNoLaborPercent > 20 && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold">HIGH COGS: {preview.cogsNoLaborPercent.toFixed(1)}%</span>
                </div>
              )}
              {preview.cogsNoLaborPercent >= 10 && preview.cogsNoLaborPercent <= 20 && (
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold">ELEVATED COGS: {preview.cogsNoLaborPercent.toFixed(1)}%</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Base Pay (Labor)</p>
                <p className="font-semibold text-foreground">${preview.basePay.toFixed(2)}</p>
              </div>
              {preview.overtimeHours > 0 && (
                <div>
                  <p className="text-muted-foreground">Overtime Pay</p>
                  <p className="font-semibold text-foreground">${preview.overtimePay.toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">COGS (No Labor)</p>
                <p className={`font-semibold ${
                  preview.cogsNoLaborPercent > 20 ? 'text-red-500' : 
                  preview.cogsNoLaborPercent >= 10 ? 'text-yellow-500' : 
                  'text-foreground'
                }`}>
                  ${preview.cogsNoLabor.toFixed(2)} ({preview.cogsNoLaborPercent.toFixed(1)}%)
                </p>
                {preview.cogsNoLaborPercent > 20 && (
                  <p className="text-xs text-red-500 mt-1">⚠️ Unusually high!</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Overhead ({preview.overheadCostsPercent}%)</p>
                <p className="font-semibold text-foreground">${preview.overheadAllocation.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Cost of Job</p>
                <p className="font-semibold text-orange-500">${preview.totalCostOfJob.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gross Profit Before Bonus</p>
                <p className="font-semibold text-green-500">${preview.grossProfitBeforeBonus.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gross Profit %</p>
                <p className="font-semibold text-foreground">{preview.grossProfitBeforeBonusPercent.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">LER</p>
                <p className="font-semibold text-accent">{preview.ler.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bonus Qualified</p>
                <p className="font-semibold text-foreground">${preview.bonusQualifiedForPercent.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Appointment Bonus</p>
                <p className="font-semibold text-foreground">${preview.appointmentBasedBonus.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Employee Pay</p>
                <p className="font-semibold text-accent">${preview.totalEmployeePay.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Profit %</p>
                <p className={`font-semibold ${preview.dailyNetProfitAfterBonusPercent >= 25 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {preview.dailyNetProfitAfterBonusPercent.toFixed(1)}%
                </p>
              </div>
            </div>
            
            {/* Formula Explanation */}
            <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t border-border pt-8">
              <p><strong className="text-accent">Total Cost of Job:</strong> Labor (${preview.basePay.toFixed(2)}) + COGS (${preview.cogsNoLabor.toFixed(2)}) + Overhead (${preview.overheadAllocation.toFixed(2)}) = ${preview.totalCostOfJob.toFixed(2)}</p>
              <p><strong className="text-accent">Gross Profit Before Bonus:</strong> Revenue (${preview.totalRevenue.toFixed(2)}) - Total Cost (${preview.totalCostOfJob.toFixed(2)}) = ${preview.grossProfitBeforeBonus.toFixed(2)}</p>
              <p><strong className="text-accent">LER Formula:</strong> Gross Profit (${preview.grossProfitBeforeBonus.toFixed(2)}) ÷ Labor (${preview.basePay.toFixed(2)}) = {preview.ler.toFixed(2)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-foreground hover:bg-muted/50"
            >
              {isFormReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {!isFormReadOnly && (
              <Button
                type="button"
                onClick={handleSubmit}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {editingRecord ? 'Update Record' : 'Add Record'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
