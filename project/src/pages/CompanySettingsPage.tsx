import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Settings, 
  Percent, 
  Building2,
  Save,
  AlertTriangle
} from 'lucide-react';
import { useAuthContext } from '../contexts/auth-context';
import * as employeeLERService from '../services/employeeLERService';


const CompanySettingsPage: React.FC = () => {
  const { dbUserId } = useAuthContext();
  
  // Financial settings state
  const [financialSettings, setFinancialSettings] = useState({
    overheadPercent: 32,
    bonusThresholdMin: 25,
    bonusThresholdMax: 100,
    overtimeHoursDaily: 12,
    overtimeMultiplier: 1.5,
    crewBonusThresholdMin: 15,
    crewBonusThresholdMax: 100
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    async function loadData() {
      if (!dbUserId) return;
      
      setLoading(true);
      try {
        // Load company settings
        const settings = await employeeLERService.getCompanySettings(dbUserId);
        setFinancialSettings({
          overheadPercent: settings.overheadPercent,
          bonusThresholdMin: settings.bonusThresholdMin,
          bonusThresholdMax: settings.bonusThresholdMax,
          overtimeHoursDaily: settings.overtimeHoursDaily,
          overtimeMultiplier: settings.overtimeMultiplier,
          crewBonusThresholdMin: settings.crewBonusThresholdMin || 15,
          crewBonusThresholdMax: settings.crewBonusThresholdMax || 100
        });
        
      } catch (error) {
        console.error('Error loading company settings:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [dbUserId]);

  // Save financial settings
  const handleSaveFinancialSettings = async () => {
    if (!dbUserId) return;
    
    setSaving(true);
    try {
      // Get current full settings first
      const currentSettings = await employeeLERService.getCompanySettings(dbUserId);
      
      // Merge with financial settings
      const updatedSettings = {
        ...currentSettings,
        overheadPercent: financialSettings.overheadPercent,
        bonusThresholdMin: financialSettings.bonusThresholdMin,
        bonusThresholdMax: financialSettings.bonusThresholdMax,
        overtimeHoursDaily: financialSettings.overtimeHoursDaily,
        overtimeMultiplier: financialSettings.overtimeMultiplier,
        crewBonusThresholdMin: financialSettings.crewBonusThresholdMin,
        crewBonusThresholdMax: financialSettings.crewBonusThresholdMax
      };
      
      const success = await employeeLERService.saveCompanySettings(dbUserId, updatedSettings);
      if (success) {
        alert('Financial settings saved successfully!');
      } else {
        alert('Error saving settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Company Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-accent" />
            Company Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure company-wide financial settings and costs</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-300 font-medium">Important</p>
            <p className="text-sm text-yellow-300/80">
              Changes to these settings affect calculations across multiple areas including Service Mix, Employee LER, and financial reports. 
              Historical records will remain unchanged unless manually edited.
            </p>
          </div>
        </div>
      </div>

      {/* Financial Settings - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-accent" />
            Financial Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Core financial parameters used in profit calculations
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Row 1: Overhead & Crew Bonus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overhead Allocation */}
              <div className="p-4 rounded-lg border border-border">
                <p className="text-lg text-accent font-medium mb-3">Overhead Allocation</p>
                <div className="flex items-center gap-2">
                  <Input
                    id="overheadPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={financialSettings.overheadPercent}
                    onChange={(e) => setFinancialSettings(prev => ({
                      ...prev,
                      overheadPercent: parseFloat(e.target.value) || 0
                    }))}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Percentage of revenue allocated to overhead costs (rent, utilities, insurance, etc.)
                </p>
              </div>

              {/* Overtime Settings */}
              <div className="p-4 rounded-lg border border-border">
                <p className="text-lg text-accent font-medium mb-3">Overtime Settings</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="otHours" className="text-xs">Daily OT Threshold</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="otHours"
                        type="number"
                        min="0"
                        max="24"
                        value={financialSettings.overtimeHoursDaily}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          overtimeHoursDaily: parseFloat(e.target.value) || 8
                        }))}
                      />
                      <span className="text-muted-foreground text-sm">hrs</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="otMult" className="text-xs">OT Multiplier</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="otMult"
                        type="number"
                        min="1"
                        max="3"
                        step="0.1"
                        value={financialSettings.overtimeMultiplier}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          overtimeMultiplier: parseFloat(e.target.value) || 1.5
                        }))}
                      />
                      <span className="text-muted-foreground text-sm">x</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Hours before overtime kicks in and the pay multiplier
                </p>
              </div>
            </div>

            {/* Row 2: Solo & Crew Bonus Thresholds */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Solo LER Bonus Thresholds */}
              <div className="p-4 rounded-lg border border-border">
                <p className="text-lg text-accent font-medium mb-3">Solo LER Bonus Thresholds</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bonusMin" className="text-xs">Minimum (%)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="bonusMin"
                        type="number"
                        min="0"
                        max="100"
                        value={financialSettings.bonusThresholdMin}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          bonusThresholdMin: parseFloat(e.target.value) || 0
                        }))}
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bonusMax" className="text-xs">Maximum (%)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="bonusMax"
                        type="number"
                        min="0"
                        max="100"
                        value={financialSettings.bonusThresholdMax}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          bonusThresholdMax: parseFloat(e.target.value) || 0
                        }))}
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Solo job gross profit % range where LER bonuses apply
                </p>
              </div>

              {/* Crew LER Bonus Thresholds */}
              <div className="p-4 rounded-lg border border-border">
                <p className="text-lg text-accent font-medium mb-3">Crew LER Bonus Thresholds</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="crewBonusMin" className="text-xs">Minimum (%)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="crewBonusMin"
                        type="number"
                        min="0"
                        max="100"
                        value={financialSettings.crewBonusThresholdMin}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          crewBonusThresholdMin: parseFloat(e.target.value) || 0
                        }))}
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="crewBonusMax" className="text-xs">Maximum (%)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="crewBonusMax"
                        type="number"
                        min="0"
                        max="100"
                        value={financialSettings.crewBonusThresholdMax}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          crewBonusThresholdMax: parseFloat(e.target.value) || 0
                        }))}
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Crew job gross profit % range where LER bonuses apply (lower than solo due to higher labor costs)
                </p>
              </div>
            </div>
          </div>

          <div className="pt-12 flex justify-center pb-6">
            <Button  
              onClick={handleSaveFinancialSettings}
              disabled={saving}
              className="w-64 bg-accent hover:bg-accent/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Financial Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-accent" />
            Settings Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Overhead</p>
              <p className="text-2xl font-bold">{financialSettings.overheadPercent}%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Solo Bonus</p>
              <p className="text-2xl font-bold">{financialSettings.bonusThresholdMin}-{financialSettings.bonusThresholdMax}%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Crew Bonus</p>
              <p className="text-2xl font-bold">{financialSettings.crewBonusThresholdMin}-{financialSettings.crewBonusThresholdMax}%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">OT After</p>
              <p className="text-2xl font-bold">{financialSettings.overtimeHoursDaily} hrs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettingsPage;
