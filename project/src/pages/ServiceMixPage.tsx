import { ServiceMixBarChart } from '../components/services/ServiceMixBarChart';
import { ServiceTrackerModal } from '../components/services/ServiceTrackerModalRedesigned';
import { TrackActivitiesCard } from '../components/services/TrackActivitiesCard';
import { ServiceAnalyticsSection } from '../components/services/ServiceAnalyticsSection';
import { ServiceSummaryCards } from '../components/services/ServiceSummaryCards';
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Plus, CheckCircle2, Circle, Calendar, X } from 'lucide-react';
import { useServices } from '../hooks/useServices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function ServiceMixPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'services' | 'activities'>('services');
  const [trackActivitiesExpanded, setTrackActivitiesExpanded] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | 'ytd'>(currentMonth);
  const { services } = useServices();

  // Auto-expand Track Activities when services exist
  useEffect(() => {
    if (services.length > 0 && !trackActivitiesExpanded) {
      setTrackActivitiesExpanded(true);
    }
  }, [services.length]);

  const handleAddService = () => {
    setModalTab('services');
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    // Show success message if services exist
    if (services.length > 0) {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Service Mix Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track and analyze revenue by service to understand how each of your services affects your revenue
          </p>
        </div>
        <Button
          onClick={handleAddService}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Period Filter - Matching Financial Documents Pattern */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <div className="space-y-4">
          {/* Active Viewing Display */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Viewing:</span>
            <span className="font-medium text-foreground">
              {filterMonth === 'ytd' ? 'Year to Date' : new Date(filterYear, (filterMonth as number) - 1).toLocaleDateString('en-US', { month: 'long' })}
            </span>
            <span className="font-medium text-foreground">{filterYear}</span>
          </div>
          
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              <Select 
                value={filterYear.toString()} 
                onValueChange={(value) => setFilterYear(Number(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => {
                    const year = currentDate.getFullYear() - (5 - i);
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              <Select 
                value={filterMonth.toString()} 
                onValueChange={(value) => {
                  if (value === 'ytd') {
                    setFilterMonth('ytd');
                  } else {
                    setFilterMonth(Number(value));
                  }
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthName = new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' });
                    return (
                      <SelectItem key={month} value={month.toString()}>
                        {monthName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {/* Clear Filter Button */}
            {(filterYear !== currentDate.getFullYear() || filterMonth !== currentDate.getMonth() + 1) && (
              <button
                onClick={() => {
                  setFilterYear(currentDate.getFullYear());
                  setFilterMonth(currentDate.getMonth() + 1);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {services.length > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">Step 1: Add Services</p>
              <p className="text-xs text-muted-foreground">
                {services.length === 0 
                  ? 'Click "Add Service" button above to get started'
                  : `${services.length} service${services.length === 1 ? '' : 's'} added`
                }
              </p>
            </div>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-3">
            {services.length > 0 ? (
              <Circle className="h-5 w-5 text-accent" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">Step 2: Track Activities</p>
              <p className="text-xs text-muted-foreground">
                {services.length === 0
                  ? 'Add services first to unlock'
                  : 'Record weekly appointments and revenue below'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && services.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-sm text-green-400">
            Services saved successfully! Now scroll down to the "Track Activities" section to record your weekly data.
          </p>
        </div>
      )}

      {services.length === 0 ? (
        <div className="bg-muted/30 border border-border rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
              <Plus className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">No Services Yet</h3>
            <p className="text-muted-foreground">
              Get started by adding your first service. Once you add services, you'll be able to track weekly activities and see revenue breakdowns.
            </p>
            <Button onClick={handleAddService} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards - Above Service Revenue Breakdown */}
          <ServiceSummaryCards year={filterYear} month={filterMonth} />
          
          <ServiceMixBarChart year={filterYear} month={filterMonth} />
        </>
      )}

      <TrackActivitiesCard 
        year={filterYear}
        month={filterMonth}
        initiallyExpanded={trackActivitiesExpanded}
      />

      {/* Inspirational Quote */}
      <div className="py-8 text-center">
        <p 
          className="text-xl md:text-2xl text-foreground/90 leading-relaxed max-w-3xl mx-auto mb-12 mt-12"
          style={{ fontFamily: "'Lora', normal" }}
        >
          "Seize tomorrow by acting today.<br />
          Don't wait for 'some day.' Start making your business the tool for your dreams now."
        </p>
      </div>

      <ServiceAnalyticsSection year={filterYear} month={filterMonth} />

      <ServiceTrackerModal
        open={modalOpen}
        onClose={handleModalClose}
        defaultTab={modalTab}
      />
    </div>
  );
}
