import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Settings, 
  Percent, 
  Building2,
  Wrench,
  Save,
  AlertTriangle
} from 'lucide-react';
import { useAuthContext } from '../contexts/auth-context';
import * as employeeLERService from '../services/employeeLERService';
import { supabase } from '../config/supabaseClient';

interface ServiceCOGS {
  id: string;
  serviceName: string;
  cogsPercent: number;
}

const CompanySettingsPage: React.FC = () => {
  const { dbUserId } = useAuthContext();
  
  // Financial settings state
  const [financialSettings, setFinancialSettings] = useState({
    overheadPercent: 32,
    bonusThresholdMin: 25,
    bonusThresholdMax: 100,
    overtimeHoursDaily: 12,
    overtimeMultiplier: 1.5
  });
  
  // Service COGS state
  const [services, setServices] = useState<ServiceCOGS[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCOGS, setSavingCOGS] = useState(false);

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
          overtimeMultiplier: settings.overtimeMultiplier
        });
        
        // Load services with COGS
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, service_name, cogs_percent')
          .eq('user_id', dbUserId)
          .order('service_name');
        
        if (servicesData) {
          setServices(servicesData.map(s => ({
            id: s.id,
            serviceName: s.service_name,
            cogsPercent: s.cogs_percent || 0
          })));
        }
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
        overtimeMultiplier: financialSettings.overtimeMultiplier
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

  
  // Update local COGS state
  const updateServiceCOGS = (serviceId: string, cogsPercent: number) => {
    setServices(prev => prev.map(s => 
      s.id === serviceId ? { ...s, cogsPercent } : s
    ));
  };

  // Save all COGS at once
  const handleSaveAllCOGS = async () => {
    if (!dbUserId) return;
    
    setSavingCOGS(true);
    try {
      for (const service of services) {
        const { error } = await supabase
          .from('services')
          .update({ cogs_percent: service.cogsPercent })
          .eq('id', service.id)
          .eq('user_id', dbUserId);
        
        if (error) {
          console.error('Error saving COGS for', service.serviceName, error);
        }
      }
      alert('Service COGS saved successfully!');
    } catch (error) {
      console.error('Error saving COGS:', error);
      alert('Error saving COGS. Please try again.');
    } finally {
      setSavingCOGS(false);
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
          <p className="text-muted-foreground mt-1">Configure company-wide financial settings and service costs</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Settings */}
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
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="overheadPercent">Overhead Allocation (%)</Label>
              <div className="flex items-center gap-2 mt-1">
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
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of revenue allocated to overhead costs (rent, utilities, insurance, etc.)
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="text-sm font-medium mb-3 block">LER Bonus Thresholds</Label>
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
              <p className="text-xs text-muted-foreground mt-2">
                Gross profit % range where LER bonuses apply
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="text-sm font-medium mb-3 block">Overtime Settings</Label>
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
              <p className="text-xs text-muted-foreground mt-2">
                Hours before overtime kicks in and the pay multiplier
              </p>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSaveFinancialSettings}
                disabled={saving}
                className="w-full bg-accent hover:bg-accent/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Financial Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Service COGS Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-accent" />
              Service COGS
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cost of Goods Sold percentage for each service type
            </p>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No services configured yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add services in the Service Mix page to configure COGS.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-muted-foreground">
                    COGS represents material costs as a percentage of service revenue (excluding labor).
                    This affects gross profit calculations in Service Mix and Employee LER.
                  </p>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {services.map(service => (
                    <div key={service.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/50 transition-colors">
                      <span className="font-medium">{service.serviceName}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={service.cogsPercent}
                          onChange={(e) => updateServiceCOGS(service.id, parseFloat(e.target.value) || 0)}
                          className="w-20 text-right"
                        />
                        <span className="text-muted-foreground text-sm">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-border">
                  <Button 
                    onClick={handleSaveAllCOGS}
                    disabled={savingCOGS}
                    className="w-full bg-accent hover:bg-accent/90"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingCOGS ? 'Saving...' : 'Save All COGS'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
              <p className="text-sm text-muted-foreground">Bonus Range</p>
              <p className="text-2xl font-bold">{financialSettings.bonusThresholdMin}-{financialSettings.bonusThresholdMax}%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">OT After</p>
              <p className="text-2xl font-bold">{financialSettings.overtimeHoursDaily} hrs</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Services</p>
              <p className="text-2xl font-bold">{services.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettingsPage;
