import { useState, useEffect } from 'react';
import { useServices, useServiceRevenueData } from '../../hooks/useServices';
import { Eye, EyeOff } from 'lucide-react';

interface ServiceMixChartOverlayProps {
  year: number;
  onDatasetChange: (datasets: any[]) => void;
}

export function ServiceMixChartOverlay({ year, onDatasetChange }: ServiceMixChartOverlayProps) {
  const { services } = useServices();
  const { revenueData, loading } = useServiceRevenueData(year);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [showServiceMix, setShowServiceMix] = useState(false);

  // Generate Chart.js datasets for selected services
  useEffect(() => {
    if (!showServiceMix || selectedServices.size === 0) {
      onDatasetChange([]);
      return;
    }

    const datasets = revenueData
      .filter(service => selectedServices.has(service.serviceId))
      .map(service => {
        // Create array of 12 months with revenue data
        const data = Array.from({ length: 12 }, (_, index) => {
          const monthData = service.monthlyRevenue.find(m => m.month === index + 1);
          return monthData ? monthData.revenue : 0;
        });

        return {
          label: service.serviceName,
          data,
          borderColor: service.color,
          backgroundColor: `${service.color}20`, // 20% opacity
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        };
      });

    onDatasetChange(datasets);
  }, [showServiceMix, selectedServices, revenueData, onDatasetChange]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const toggleAllServices = () => {
    if (selectedServices.size === services.length) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(services.map(s => s.id)));
    }
  };

  if (services.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Service Mix Overlay</h3>
        <button
          onClick={() => setShowServiceMix(!showServiceMix)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-accent/10"
        >
          {showServiceMix ? (
            <>
              <EyeOff className="h-4 w-4" />
              Hide Services
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Show Services
            </>
          )}
        </button>
      </div>

      {showServiceMix && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAllServices}
              className="text-xs text-accent hover:underline"
            >
              {selectedServices.size === services.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {services.map(service => {
              const isSelected = selectedServices.has(service.id);
              const serviceData = revenueData.find(d => d.serviceId === service.id);
              const totalRevenue = serviceData?.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0) || 0;

              return (
                <button
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  className={`flex items-center gap-2 p-2 rounded-md border transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: service.color }}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {service.serviceName}
                    </p>
                    {totalRevenue > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ${totalRevenue.toLocaleString()}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedServices.size > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {selectedServices.size} {selectedServices.size === 1 ? 'service' : 'services'} selected
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
