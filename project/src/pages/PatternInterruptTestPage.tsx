import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RefreshCw, Pause, Play, Plus, Trash2, Users, DollarSign, Calculator, UserPlus } from 'lucide-react';
import { RockPaperScissors, MemoryGame } from '../components/games';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

// ============================================
// CREW BONUS CALCULATOR - TEST COMPONENT
// Styled to match AddDailyRecordWithServices.tsx
// ============================================

interface CrewMember {
  id: string;
  name: string;
  hourlyRate: number;
  splitPercent: number;
}

interface Helper {
  id: string;
  name: string;
  hourlyRate: number;
}

interface Job {
  id: string;
  serviceName: string;
  revenue: number;
  crewHours: number;
  helperId: string | null;
  helperHours: number;
}

interface BonusBreakdown {
  jobId: string;
  jobName: string;
  jobRevenue: number;
  jobBonus: number;
  hasHelper: boolean;
  helperName?: string;
  helperShare?: number;
  helperBonus?: number;
  crewAllocations: { memberId: string; memberName: string; bonus: number }[];
}

interface PersonTotal {
  id: string;
  name: string;
  type: 'crew' | 'helper';
  hourlyRate: number;
  totalBonus: number;
  jobBreakdown: { jobName: string; bonus: number }[];
}

// Company settings (matching AddDailyRecordWithServices)
const CREW_SETTINGS = {
  overheadPercent: 32,
  bonusThresholdMin: 15,
  bonusThresholdMax: 100,
  appointmentBonus3Jobs: 7,
  appointmentBonus4Jobs: 10,
  appointmentBonus5Jobs: 15,
  appointmentBonus6PlusJobs: 20,
};

const CrewBonusCalculator: React.FC = () => {
  // Crew members - start empty (no hardcoded data)
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([
    { id: '1', name: '', hourlyRate: 0, splitPercent: 60 },
    { id: '2', name: '', hourlyRate: 0, splitPercent: 40 },
  ]);

  // Helpers - hidden until +Add Helper clicked
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [showHelperSection, setShowHelperSection] = useState(false);

  // Jobs - start with one empty job (no hardcoded data)
  const [jobs, setJobs] = useState<Job[]>([
    { id: 'j1', serviceName: '', revenue: 0, crewHours: 0, helperId: null, helperHours: 0 },
  ]);

  // Total Daily Hours (Clock In/Out) - critical field
  const [totalDailyHours, setTotalDailyHours] = useState('');
  const [applyAppointmentBonus, setApplyAppointmentBonus] = useState(true);

  // Calculate totals
  const totals = useMemo(() => {
    const totalRevenue = jobs.reduce((sum, j) => sum + j.revenue, 0);
    const totalJobs = jobs.filter(j => j.serviceName || j.revenue > 0).length;
    const totalJobTime = jobs.reduce((sum, j) => sum + j.crewHours, 0);
    const dailyHours = parseFloat(totalDailyHours) || 0;
    const nonJobTime = Math.max(0, dailyHours - totalJobTime);
    return { totalRevenue, totalJobs, totalJobTime, dailyHours, nonJobTime };
  }, [jobs, totalDailyHours]);

  // Calculate crew labor cost
  const crewLaborCost = useMemo(() => {
    const dailyHours = parseFloat(totalDailyHours) || 0;
    return crewMembers.reduce((sum, m) => sum + (m.hourlyRate * dailyHours), 0);
  }, [crewMembers, totalDailyHours]);

  // Calculate helper labor cost
  const helperLaborCost = useMemo(() => {
    return jobs.reduce((sum, job) => {
      if (job.helperId && job.helperHours > 0) {
        const helper = helpers.find(h => h.id === job.helperId);
        return sum + ((helper?.hourlyRate || 0) * job.helperHours);
      }
      return sum;
    }, 0);
  }, [jobs, helpers]);

  // Calculate preview (matching AddDailyRecordWithServices logic)
  const preview = useMemo(() => {
    const totalLabor = crewLaborCost + helperLaborCost;
    const overheadAllocation = totals.totalRevenue * (CREW_SETTINGS.overheadPercent / 100);
    const totalCostOfJob = totalLabor + overheadAllocation;
    const grossProfitBeforeBonus = totals.totalRevenue - totalCostOfJob;
    const grossProfitPercent = totals.totalRevenue > 0 ? (grossProfitBeforeBonus / totals.totalRevenue) * 100 : 0;
    const ler = totalLabor > 0 ? grossProfitBeforeBonus / totalLabor : 0;
    const qualifyForBonus = grossProfitPercent >= CREW_SETTINGS.bonusThresholdMin && grossProfitPercent <= CREW_SETTINGS.bonusThresholdMax;
    const bonusQualified = qualifyForBonus ? ler * totals.dailyHours : 0;
    
    let appointmentBonus = 0;
    if (applyAppointmentBonus) {
      if (totals.totalJobs === 3) appointmentBonus = CREW_SETTINGS.appointmentBonus3Jobs;
      else if (totals.totalJobs === 4) appointmentBonus = CREW_SETTINGS.appointmentBonus4Jobs;
      else if (totals.totalJobs === 5) appointmentBonus = CREW_SETTINGS.appointmentBonus5Jobs;
      else if (totals.totalJobs >= 6) appointmentBonus = CREW_SETTINGS.appointmentBonus6PlusJobs;
    }
    
    const totalDailyBonus = bonusQualified + appointmentBonus;
    const netProfitAfterBonus = grossProfitBeforeBonus - totalDailyBonus;
    const netProfitPercent = totals.totalRevenue > 0 ? (netProfitAfterBonus / totals.totalRevenue) * 100 : 0;

    return {
      totalLabor,
      overheadAllocation,
      totalCostOfJob,
      grossProfitBeforeBonus,
      grossProfitPercent,
      ler,
      qualifyForBonus,
      bonusQualified,
      appointmentBonus,
      totalDailyBonus,
      netProfitAfterBonus,
      netProfitPercent,
    };
  }, [totals, crewLaborCost, helperLaborCost, applyAppointmentBonus]);

  // Calculate bonus breakdown per job
  const bonusBreakdown = useMemo((): BonusBreakdown[] => {
    if (totals.totalRevenue === 0 || preview.totalDailyBonus === 0) return [];

    return jobs.filter(j => j.serviceName || j.revenue > 0).map((job, index) => {
      const revenueShare = job.revenue / totals.totalRevenue;
      const jobBonus = revenueShare * preview.totalDailyBonus;

      const hasHelper = job.helperId !== null && job.helperHours > 0;
      const helper = helpers.find(h => h.id === job.helperId);

      if (hasHelper && helper) {
        const totalJobHours = (job.crewHours * crewMembers.length) + job.helperHours;
        const helperShare = job.helperHours / totalJobHours;
        const helperBonus = jobBonus * helperShare;
        const crewBonus = jobBonus - helperBonus;

        const crewAllocations = crewMembers.map(member => ({
          memberId: member.id,
          memberName: member.name || `Crew ${member.id}`,
          bonus: crewBonus * (member.splitPercent / 100),
        }));

        return {
          jobId: job.id,
          jobName: job.serviceName || `Job ${index + 1}`,
          jobRevenue: job.revenue,
          jobBonus,
          hasHelper: true,
          helperName: helper.name || 'Helper',
          helperShare: helperShare * 100,
          helperBonus,
          crewAllocations,
        };
      } else {
        const crewAllocations = crewMembers.map(member => ({
          memberId: member.id,
          memberName: member.name || `Crew ${member.id}`,
          bonus: jobBonus * (member.splitPercent / 100),
        }));

        return {
          jobId: job.id,
          jobName: job.serviceName || `Job ${index + 1}`,
          jobRevenue: job.revenue,
          jobBonus,
          hasHelper: false,
          crewAllocations,
        };
      }
    });
  }, [jobs, totals.totalRevenue, preview.totalDailyBonus, helpers, crewMembers]);

  // Calculate totals per person
  const personTotals = useMemo((): PersonTotal[] => {
    const totalsMap: { [id: string]: PersonTotal } = {};

    crewMembers.forEach(member => {
      totalsMap[member.id] = {
        id: member.id,
        name: member.name || `Crew ${member.id}`,
        type: 'crew',
        hourlyRate: member.hourlyRate,
        totalBonus: 0,
        jobBreakdown: [],
      };
    });

    helpers.forEach(helper => {
      totalsMap[helper.id] = {
        id: helper.id,
        name: helper.name || 'Helper',
        type: 'helper',
        hourlyRate: helper.hourlyRate,
        totalBonus: 0,
        jobBreakdown: [],
      };
    });

    bonusBreakdown.forEach(job => {
      job.crewAllocations.forEach(alloc => {
        if (totalsMap[alloc.memberId]) {
          totalsMap[alloc.memberId].totalBonus += alloc.bonus;
          totalsMap[alloc.memberId].jobBreakdown.push({
            jobName: job.jobName,
            bonus: alloc.bonus,
          });
        }
      });

      if (job.hasHelper && job.helperBonus) {
        const helper = helpers.find(h => h.name === job.helperName);
        if (helper && totalsMap[helper.id]) {
          totalsMap[helper.id].totalBonus += job.helperBonus;
          totalsMap[helper.id].jobBreakdown.push({
            jobName: job.jobName,
            bonus: job.helperBonus,
          });
        }
      }
    });

    return Object.values(totalsMap);
  }, [bonusBreakdown, crewMembers, helpers]);

  const calculatedTotal = personTotals.reduce((sum, p) => sum + p.totalBonus, 0);

  // Add new job
  const addJob = () => {
    setJobs(prev => [...prev, {
      id: `j${Date.now()}`,
      serviceName: '',
      revenue: 0,
      crewHours: 0,
      helperId: null,
      helperHours: 0,
    }]);
  };

  const updateJob = (id: string, field: keyof Job, value: string | number | null) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, [field]: value } : j));
  };

  const removeJob = (id: string) => {
    if (jobs.length > 1) {
      setJobs(prev => prev.filter(j => j.id !== id));
    }
  };

  const addHelper = () => {
    setHelpers(prev => [...prev, {
      id: `h${Date.now()}`,
      name: '',
      hourlyRate: 0,
    }]);
    setShowHelperSection(true);
  };

  const removeHelper = (id: string) => {
    setHelpers(prev => prev.filter(h => h.id !== id));
    setJobs(prev => prev.map(j => j.helperId === id ? { ...j, helperId: null, helperHours: 0 } : j));
    if (helpers.length <= 1) {
      setShowHelperSection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Crew Members */}
      <div className="bg-muted/20 rounded-lg p-4 border border-border">
        <h4 className="text-xl text-accent font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Crew Members
        </h4>
        <div className="space-y-3">
          {crewMembers.map((member, index) => (
            <div key={member.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
              <span className="text-lg text-muted-foreground font-medium w-8">{index + 1}.</span>
              <div className="flex-1">
                <Label className="text-muted-foreground">Name</Label>
                <Input
                  value={member.name}
                  onChange={(e) => setCrewMembers(prev => prev.map(m => m.id === member.id ? { ...m, name: e.target.value } : m))}
                  placeholder="Employee name"
                  className="bg-background text-foreground border-border"
                />
              </div>
              <div className="w-28">
                <Label className="text-muted-foreground">Rate</Label>
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-1">$</span>
                  <Input
                    type="number"
                    value={member.hourlyRate || ''}
                    onChange={(e) => setCrewMembers(prev => prev.map(m => m.id === member.id ? { ...m, hourlyRate: parseFloat(e.target.value) || 0 } : m))}
                    placeholder="0"
                    className="bg-background text-foreground border-border"
                  />
                  <span className="text-muted-foreground ml-1">/hr</span>
                </div>
              </div>
              <div className="w-24">
                <Label className="text-muted-foreground">Split %</Label>
                <div className="flex items-center">
                  <Input
                    type="number"
                    value={member.splitPercent || ''}
                    onChange={(e) => setCrewMembers(prev => prev.map(m => m.id === member.id ? { ...m, splitPercent: parseFloat(e.target.value) || 0 } : m))}
                    className="bg-background text-foreground border-border"
                  />
                  <span className="text-muted-foreground ml-1">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Helper Section - Hidden until +Add Helper clicked */}
      {!showHelperSection ? (
        <div className="flex justify-start">
          <Button variant="outline" onClick={addHelper} className="border-accent text-accent hover:bg-accent/10">
            <Plus className="h-4 w-4 mr-2" /> Add Helper
          </Button>
        </div>
      ) : (
        <div className="bg-muted/20 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl text-accent font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Helper
            </h4>
            <Button variant="outline" size="sm" onClick={addHelper} className="border-accent text-accent hover:bg-accent/10">
              <Plus className="h-4 w-4 mr-1" /> Add Another
            </Button>
          </div>
          <div className="space-y-3">
            {helpers.map(helper => (
              <div key={helper.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
                <div className="flex-1">
                  <Label className="text-muted-foreground">Name</Label>
                  <Input
                    value={helper.name}
                    onChange={(e) => setHelpers(prev => prev.map(h => h.id === helper.id ? { ...h, name: e.target.value } : h))}
                    placeholder="Helper name"
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div className="w-28">
                  <Label className="text-muted-foreground">Rate</Label>
                  <div className="flex items-center">
                    <span className="text-muted-foreground mr-1">$</span>
                    <Input
                      type="number"
                      value={helper.hourlyRate || ''}
                      onChange={(e) => setHelpers(prev => prev.map(h => h.id === helper.id ? { ...h, hourlyRate: parseFloat(e.target.value) || 0 } : h))}
                      placeholder="0"
                      className="bg-background text-foreground border-border"
                    />
                    <span className="text-muted-foreground ml-1">/hr</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeHelper(helper.id)}
                  className="text-red-400 hover:text-red-500 mt-5"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Breakdown */}
      <div className="bg-muted/20 rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl text-accent font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Appointment Breakdown
          </h4>
          <Button variant="outline" size="sm" onClick={addJob} className="border-accent text-accent hover:bg-accent/10">
            <Plus className="h-4 w-4 mr-1" /> Add Appointment
          </Button>
        </div>
        <div className="space-y-4">
          {jobs.map((job, index) => (
            <div key={job.id} className="p-4 bg-background rounded-lg border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-semibold text-foreground">Job {index + 1}</span>
                {jobs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeJob(job.id)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className={`grid gap-4 ${helpers.length > 0 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-3'}`}>
                <div>
                  <Label className="text-muted-foreground">Service</Label>
                  <Input
                    value={job.serviceName}
                    onChange={(e) => updateJob(job.id, 'serviceName', e.target.value)}
                    placeholder="Service name"
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Revenue ($)</Label>
                  <Input
                    type="number"
                    value={job.revenue || ''}
                    onChange={(e) => updateJob(job.id, 'revenue', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Job Time (hrs)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={job.crewHours || ''}
                    onChange={(e) => updateJob(job.id, 'crewHours', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-background text-foreground border-border"
                  />
                </div>
                {/* Helper columns - only show if helpers exist */}
                {helpers.length > 0 && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Helper</Label>
                      <Select
                        value={job.helperId || 'none'}
                        onValueChange={(val) => updateJob(job.id, 'helperId', val === 'none' ? null : val)}
                      >
                        <SelectTrigger className="bg-background text-foreground border-border">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {helpers.map(h => (
                            <SelectItem key={h.id} value={h.id}>{h.name || 'Helper'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Helper Hrs</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={job.helperHours || ''}
                        onChange={(e) => updateJob(job.id, 'helperHours', parseFloat(e.target.value) || 0)}
                        disabled={!job.helperId}
                        placeholder="0"
                        className="bg-background text-foreground border-border disabled:opacity-50"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Summary */}
      <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
        <h4 className="font-semibold text-foreground mb-3">Daily Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-muted-foreground">Total Jobs</p>
            <p className="text-2xl font-bold text-accent">{totals.totalJobs}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Job Time</p>
            <p className="text-2xl font-bold text-accent">{totals.totalJobTime.toFixed(2)} hrs</p>
          </div>
          <div>
            <p className="text-muted-foreground">Daily Hours</p>
            <p className="text-2xl font-bold text-accent">{totals.dailyHours.toFixed(2)} hrs</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-accent">${totals.totalRevenue.toFixed(2)}</p>
          </div>
        </div>
        {totals.nonJobTime > 0 && (
          <div className="mt-3 pt-3 border-t border-accent/20">
            <p className="text-muted-foreground">Non-Job Time (travel, breaks, admin)</p>
            <p className="text-lg font-semibold text-yellow-500">{totals.nonJobTime.toFixed(2)} hrs</p>
          </div>
        )}
      </div>

      {/* Total Daily Hours Input */}
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
          className="bg-background text-foreground border-border"
          placeholder="e.g., 8.0"
        />
        <p className="text-muted-foreground mt-1">
          Total hours crew was clocked in (used for pay calculation)
        </p>
      </div>

      {/* Bonus Options */}
      <div className="space-y-3">
        <h4 className="text-xl text-accent font-semibold">Bonus Options</h4>
        <div className="bg-muted/20 rounded-lg p-4 border border-border">
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id="appointmentBonus"
              checked={applyAppointmentBonus}
              onChange={(e) => setApplyAppointmentBonus(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="appointmentBonus" className="text-foreground cursor-pointer text-base">
              Apply appointment-based bonus
            </Label>
          </div>
          {applyAppointmentBonus && (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-muted-foreground">3 jobs</p>
                <p className="text-lg font-semibold text-foreground">${CREW_SETTINGS.appointmentBonus3Jobs}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">4 jobs</p>
                <p className="text-lg font-semibold text-foreground">${CREW_SETTINGS.appointmentBonus4Jobs}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">5 jobs</p>
                <p className="text-lg font-semibold text-foreground">${CREW_SETTINGS.appointmentBonus5Jobs}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">6+ jobs</p>
                <p className="text-lg font-semibold text-foreground">${CREW_SETTINGS.appointmentBonus6PlusJobs}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calculation Preview */}
      <div className="bg-accent/10 rounded-lg p-4 border border-accent/30 space-y-3">
        <h4 className="text-xl font-semibold text-accent pb-4">Calculation Preview</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-muted-foreground">Total Labor (Crew + Helper)</p>
            <p className="text-lg font-semibold text-foreground">${preview.totalLabor.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Overhead ({CREW_SETTINGS.overheadPercent}%)</p>
            <p className="text-lg font-semibold text-foreground">${preview.overheadAllocation.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Cost of Job</p>
            <p className="text-lg font-semibold text-orange-500">${preview.totalCostOfJob.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gross Profit Before Bonus</p>
            <p className={`text-lg font-semibold ${preview.grossProfitBeforeBonus >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${preview.grossProfitBeforeBonus.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Gross Profit %</p>
            <p className={`text-lg font-semibold ${preview.qualifyForBonus ? 'text-green-500' : 'text-yellow-500'}`}>
              {preview.grossProfitPercent.toFixed(1)}%
              {preview.qualifyForBonus ? ' ✓' : ` (need ${CREW_SETTINGS.bonusThresholdMin}%+)`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">LER</p>
            <p className="text-lg font-semibold text-accent">{preview.ler.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Bonus Qualified</p>
            <p className="text-lg font-semibold text-foreground">${preview.bonusQualified.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Appointment Bonus</p>
            <p className="text-lg font-semibold text-foreground">${preview.appointmentBonus.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Daily Bonus</p>
            <p className="text-2xl font-bold text-accent">${preview.totalDailyBonus.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Formula Explanation */}
        <div className="text-muted-foreground space-y-1 pt-4 border-t border-accent/20">
          <p><strong className="text-accent">Total Cost:</strong> Labor (${preview.totalLabor.toFixed(2)}) + Overhead (${preview.overheadAllocation.toFixed(2)}) = ${preview.totalCostOfJob.toFixed(2)}</p>
          <p><strong className="text-accent">Gross Profit:</strong> Revenue (${totals.totalRevenue.toFixed(2)}) - Total Cost (${preview.totalCostOfJob.toFixed(2)}) = ${preview.grossProfitBeforeBonus.toFixed(2)}</p>
          <p><strong className="text-accent">LER:</strong> Gross Profit (${preview.grossProfitBeforeBonus.toFixed(2)}) ÷ Labor (${preview.totalLabor.toFixed(2)}) = {preview.ler.toFixed(2)}</p>
        </div>
      </div>

      {/* Bonus Breakdown (Job by Job) */}
      {preview.totalDailyBonus > 0 && bonusBreakdown.length > 0 && (
        <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
          <h4 className="text-xl font-semibold text-accent mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Bonus Breakdown (Job by Job)
          </h4>
          <div className="space-y-4">
            {bonusBreakdown.map((job, index) => (
              <div 
                key={job.jobId} 
                className="p-4 bg-background rounded-lg border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xl font-bold text-foreground">Job {index + 1}</span>
                    {job.jobName && job.jobName !== `Job ${index + 1}` && (
                      <span className="text-lg text-muted-foreground ml-2">({job.jobName})</span>
                    )}
                    <span className="text-lg text-muted-foreground ml-3">
                      ${job.jobRevenue.toFixed(0)} revenue
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Job Bonus</p>
                    <p className="text-2xl font-bold text-accent">${job.jobBonus.toFixed(2)}</p>
                  </div>
                </div>
                
                {job.hasHelper && (
                  <p className="text-accent mb-3">
                    {job.helperName} helped ({job.helperShare?.toFixed(1)}% of job hours)
                  </p>
                )}
                
                <div className="flex flex-wrap gap-4">
                  {job.crewAllocations.map(alloc => (
                    <div key={alloc.memberId} className="px-4 py-2 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">{alloc.memberName}:</span>
                      <span className="text-xl font-bold text-foreground ml-2">${alloc.bonus.toFixed(2)}</span>
                    </div>
                  ))}
                  {job.hasHelper && (
                    <div className="px-4 py-2 bg-accent/20 rounded-lg">
                      <span className="text-accent">{job.helperName}:</span>
                      <span className="text-xl font-bold text-accent ml-2">${job.helperBonus?.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bonus Summary (Per Person) */}
      {preview.totalDailyBonus > 0 && personTotals.length > 0 && (
        <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
          <h4 className="text-xl font-semibold text-accent mb-4">Bonus Summary (Per Person)</h4>
          <div className="space-y-3">
            {personTotals.map(person => (
              <div 
                key={person.id} 
                className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
              >
                <div>
                  <span className="text-xl font-semibold text-foreground">{person.name}</span>
                  {person.type === 'helper' && (
                    <span className="text-accent ml-2">(Helper)</span>
                  )}
                  <div className="text-muted-foreground mt-1">
                    {person.jobBreakdown.map((jb, i) => (
                      <span key={i}>
                        {jb.jobName}: ${jb.bonus.toFixed(2)}
                        {i < person.jobBreakdown.length - 1 ? ' + ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-2xl font-bold text-accent">${person.totalBonus.toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          {/* Verification */}
          <div className="mt-4 p-3 rounded-lg bg-muted/30 flex items-center justify-between">
            <span className="text-foreground font-medium">
              Total Distributed: ${calculatedTotal.toFixed(2)}
            </span>
            <span className="text-muted-foreground">
              (Expected: ${preview.totalDailyBonus.toFixed(2)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Collection of motivational and business quotes
const quotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Revenue is vanity, profit is sanity, cash is king.", author: "Business Proverb" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The sea, once it casts its spell, holds one in its net of wonder forever.", author: "Jacques Cousteau" },
  { text: "You can't stop the waves, but you can learn to surf.", author: "Jon Kabat-Zinn" },
  { text: "Life is like the ocean. It can be calm or still, and rough or rigid, but in the end, it is always beautiful.", author: "Unknown" },
  { text: "The entrepreneur always searches for change, responds to it, and exploits it as an opportunity.", author: "Peter Drucker" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The wave does not need to die to become water. She is already water.", author: "Thich Nhat Hanh" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Ride the wave of change or be crushed by it.", author: "Unknown" },
  { text: "Cash flow is the lifeblood of your business.", author: "Richard Branson" },
  { text: "A business that makes nothing but money is a poor business.", author: "Henry Ford" },
];

// Different font styles for variety
const fontStyles = [
  { fontFamily: "'Georgia', serif", fontStyle: "italic" },
  { fontFamily: "'Trebuchet MS', sans-serif", letterSpacing: "0.05em" },
  { fontFamily: "'Palatino Linotype', serif", fontStyle: "italic" },
  { fontFamily: "'Brush Script MT', cursive", fontSize: "1.3em" },
];

const QuoteMarquee: React.FC = () => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Start fade out
      setFadeState('out');
      
      // After fade out, change quote and fade in
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
        setFadeState('in');
      }, 500); // Half second for fade out
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentQuote = quotes[currentQuoteIndex];
  const currentFont = fontStyles[currentQuoteIndex % fontStyles.length];

  const handleNext = () => {
    setFadeState('out');
    setTimeout(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
      setFadeState('in');
    }, 300);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-lg p-6 min-h-[120px]">
      {/* Animated wave background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-blue-400 to-transparent animate-pulse" />
      </div>
      
      {/* Quote content */}
      <div 
        className={`relative z-10 text-center transition-all duration-500 ${
          fadeState === 'in' ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4'
        }`}
      >
        <p 
          className="text-white text-xl md:text-2xl mb-3 leading-relaxed"
          style={currentFont}
        >
          "{currentQuote.text}"
        </p>
        <p className="text-blue-200 text-sm font-light tracking-widest uppercase">
          — {currentQuote.author}
        </p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-950">
        <div 
          className={`h-full bg-blue-400 ${isPlaying ? 'animate-progress' : ''}`}
          style={{ 
            animation: isPlaying ? 'progress 4s linear infinite' : 'none',
            width: isPlaying ? '100%' : '0%'
          }}
        />
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

// Alternative: Horizontal scrolling marquee
const ScrollingMarquee: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);

  // Double the quotes for seamless loop
  const doubledQuotes = [...quotes, ...quotes];

  return (
    <div 
      className="relative overflow-hidden bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 rounded-lg py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        className={`flex whitespace-nowrap ${isPaused ? '' : 'animate-marquee'}`}
        style={{
          animation: isPaused ? 'none' : 'marquee 60s linear infinite',
        }}
      >
        {doubledQuotes.map((quote, index) => (
          <span 
            key={index} 
            className="mx-8 text-amber-100 text-lg"
            style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}
          >
            "{quote.text}" <span className="text-amber-300">— {quote.author}</span>
            <span className="mx-8 text-amber-500">•</span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
      `}</style>
    </div>
  );
};

// Compact single-line version
const CompactQuoteBar: React.FC = () => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
        setFadeState('in');
      }, 400);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentQuote = quotes[currentQuoteIndex];

  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-md px-4 py-2 flex items-center justify-center">
      <div 
        className={`text-center transition-all duration-400 ${
          fadeState === 'in' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span 
          className="text-slate-200 text-sm"
          style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}
        >
          "{currentQuote.text}"
        </span>
        <span className="text-slate-400 text-xs ml-2">
          — {currentQuote.author}
        </span>
      </div>
    </div>
  );
};

// Main test page component
const PatternInterruptTestPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Pattern Interrupt Test Page</h1>
        <p className="text-muted-foreground">Experimenting with quote generators and interactive elements</p>
      </div>

      {/* Crew Bonus Calculator - TEST */}
      <Card className="bg-muted/30 border-2 border-accent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-accent" />
            Crew Bonus Calculator (TEST)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Job-by-job bonus breakdown. Helper gets cut only from jobs they worked on.
          </p>
        </CardHeader>
        <CardContent>
          <CrewBonusCalculator />
        </CardContent>
      </Card>

      {/* Style 1: Fade transition with controls */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Style 1: Fade Transition with Controls</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quotes fade in/out every 4 seconds. Different fonts for variety. Pause/play and skip controls.
          </p>
        </CardHeader>
        <CardContent>
          <QuoteMarquee />
        </CardContent>
      </Card>

      {/* Style 2: Horizontal scrolling marquee */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Style 2: Horizontal Scrolling Marquee</CardTitle>
          <p className="text-sm text-muted-foreground">
            Continuous horizontal scroll. Pauses on hover. Classic marquee style.
          </p>
        </CardHeader>
        <CardContent>
          <ScrollingMarquee />
        </CardContent>
      </Card>

      {/* Style 3: Compact single-line */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Style 3: Compact Single-Line Bar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Minimal footprint. Good for headers or between sections.
          </p>
        </CardHeader>
        <CardContent>
          <CompactQuoteBar />
        </CardContent>
      </Card>

      {/* Placement examples */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Example: Between Data Sections</CardTitle>
          <p className="text-sm text-muted-foreground">
            How it might look between two data-heavy sections
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fake data section 1 */}
          <div className="bg-background rounded-lg p-4 border">
            <h3 className="font-semibold mb-2">Revenue Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">$45,230</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">$389,450</p>
                <p className="text-xs text-muted-foreground">YTD</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">+12.4%</p>
                <p className="text-xs text-muted-foreground">Growth</p>
              </div>
            </div>
          </div>

          {/* Quote break */}
          <CompactQuoteBar />

          {/* Fake data section 2 */}
          <div className="bg-background rounded-lg p-4 border">
            <h3 className="font-semibold mb-2">Expense Breakdown</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-500">$28,100</p>
                <p className="text-xs text-muted-foreground">Operating</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">$8,500</p>
                <p className="text-xs text-muted-foreground">COGS</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-500">$5,200</p>
                <p className="text-xs text-muted-foreground">Owner Draws</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rock Paper Scissors Game */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Game: Rock Paper Scissors</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quick mental break. Best of 3 or 5. ~30 seconds to play.
          </p>
        </CardHeader>
        <CardContent>
          <RockPaperScissors bestOf={3} />
        </CardContent>
      </Card>

      {/* Memory Game */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Game: Memory Match</CardTitle>
          <p className="text-sm text-muted-foreground">
            Surf-themed memory game. 3 difficulty levels. 2-5 minutes to play.
          </p>
        </CardHeader>
        <CardContent>
          <MemoryGame initialDifficulty="easy" />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="bg-blue-950/30 border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg text-blue-300">Notes & Ideas</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-200 text-sm space-y-2">
          <p>• Style 1 is most prominent - good for dedicated sections or page headers</p>
          <p>• Style 2 (scrolling) is eye-catching but might be distracting for focused work</p>
          <p>• Style 3 (compact) is subtle - perfect for breaking up data sections</p>
          <p>• Rock Paper Scissors - quick 30-second mental break</p>
          <p>• Could add category filters (business, surf, motivational)</p>
          <p>• Could tie quotes to user performance (encouraging when struggling)</p>
          <p>• Could add user's own custom quotes</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatternInterruptTestPage;
