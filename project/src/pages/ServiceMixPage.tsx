import { ServiceMixBarChart } from '../components/services/ServiceMixBarChart';
import { ServiceTrackerModal } from '../components/services/ServiceTrackerModalRedesigned';
import { TrackActivitiesCard } from '../components/services/TrackActivitiesCard';
import { ServiceAnalyticsSection } from '../components/services/ServiceAnalyticsSection';
import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';

export function ServiceMixPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'services' | 'activities'>('services');
  const currentYear = new Date().getFullYear();

  const handleAddService = () => {
    setModalTab('services');
    setModalOpen(true);
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

      <ServiceMixBarChart year={currentYear} />

      <TrackActivitiesCard year={currentYear} />

      <ServiceAnalyticsSection year={currentYear} />

      <ServiceTrackerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
      />
    </div>
  );
}
