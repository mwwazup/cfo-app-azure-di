import { ServiceMixBarChart } from '../components/services/ServiceMixBarChart';
import { ServiceTrackerModal } from '../components/services/ServiceTrackerModalRedesigned';
import { TrackActivitiesCard } from '../components/services/TrackActivitiesCard';
import { ServiceAnalyticsSection } from '../components/services/ServiceAnalyticsSection';
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Plus, CheckCircle2, Circle } from 'lucide-react';
import { useServices } from '../hooks/useServices';

export function ServiceMixPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'services' | 'activities'>('services');
  const [trackActivitiesExpanded, setTrackActivitiesExpanded] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const currentYear = new Date().getFullYear();
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
        <ServiceMixBarChart year={currentYear} />
      )}

      <TrackActivitiesCard 
        year={currentYear} 
        initiallyExpanded={trackActivitiesExpanded}
      />

      <ServiceAnalyticsSection year={currentYear} />

      <ServiceTrackerModal
        open={modalOpen}
        onClose={handleModalClose}
        defaultTab={modalTab}
      />
    </div>
  );
}
