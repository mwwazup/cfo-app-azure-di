import React, { useState } from 'react';
import { Button } from '../ui/button';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { ServiceTrackerModal } from './ServiceTrackerModal';
import { useServices } from '../../hooks/useServices';
import { useServiceRevenueData, ServiceMixLegend, ServiceMixStats, generateServiceMixDatasets } from './ServiceMixOverlay';

interface ServiceMixIntegrationProps {
  year: number;
  onServiceDatasetsChange?: (datasets: any[]) => void;
}

/**
 * Component that integrates service mix tracking into the revenue chart
 * Provides button to open tracker modal and controls for service visibility
 */
export function ServiceMixIntegration({ year, onServiceDatasetsChange }: ServiceMixIntegrationProps) {
  const [showModal, setShowModal] = useState(false);
  const [showServiceMix, setShowServiceMix] = useState(false);
  const [visibleServices, setVisibleServices] = useState<Set<string>>(new Set());
  
  const { services } = useServices();
  const { data: serviceData, loading } = useServiceRevenueData(year, services);

  // Update visible services when service data changes
  React.useEffect(() => {
    if (serviceData.length > 0 && visibleServices.size === 0) {
      // Show top 3 services by default
      const topServices = serviceData.slice(0, 3).map(s => s.serviceId);
      setVisibleServices(new Set(topServices));
    }
  }, [serviceData]);

  // Generate datasets when visibility changes
  React.useEffect(() => {
    if (showServiceMix && onServiceDatasetsChange) {
      const datasets = generateServiceMixDatasets(serviceData, visibleServices, false);
      onServiceDatasetsChange(datasets);
    } else if (onServiceDatasetsChange) {
      onServiceDatasetsChange([]);
    }
  }, [showServiceMix, serviceData, visibleServices, onServiceDatasetsChange]);

  const handleToggleService = (serviceId: string) => {
    const newVisible = new Set(visibleServices);
    if (newVisible.has(serviceId)) {
      newVisible.delete(serviceId);
    } else {
      newVisible.add(serviceId);
    }
    setVisibleServices(newVisible);
  };

  const handleToggleAll = () => {
    if (visibleServices.size === serviceData.length) {
      setVisibleServices(new Set());
    } else {
      setVisibleServices(new Set(serviceData.map(s => s.serviceId)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => setShowModal(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Track Services
        </Button>

        {services.length > 0 && (
          <Button
            onClick={() => setShowServiceMix(!showServiceMix)}
            variant={showServiceMix ? "primary" : "outline"}
            size="sm"
            className="gap-2"
          >
            {showServiceMix ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {showServiceMix ? 'Hide' : 'Show'} Service Mix
          </Button>
        )}

        {showServiceMix && serviceData.length > 0 && (
          <Button
            onClick={handleToggleAll}
            variant="ghost"
            size="sm"
          >
            {visibleServices.size === serviceData.length ? 'Hide All' : 'Show All'}
          </Button>
        )}
      </div>

      {/* Service Mix Controls */}
      {showServiceMix && serviceData.length > 0 && (
        <div className="space-y-3">
          <ServiceMixStats serviceData={serviceData} />
          
          <ServiceMixLegend
            serviceData={serviceData}
            visibleServices={visibleServices}
            onToggleService={handleToggleService}
          />
        </div>
      )}

      {/* No Services Message */}
      {services.length === 0 && !loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Track your service mix!</strong> Click "Track Services" to add your services and see how each contributes to your revenue throughout the year.
          </p>
        </div>
      )}

      {/* Service Tracker Modal */}
      <ServiceTrackerModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
