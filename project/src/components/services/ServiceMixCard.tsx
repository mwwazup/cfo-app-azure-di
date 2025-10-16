import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp, TrendingUp, Plus, Eye, EyeOff } from 'lucide-react';
import { useServices } from '../../hooks/useServices';
import { useServiceRevenueData, ServiceMixStats, generateServiceMixDatasets } from './ServiceMixOverlay';
import { ServiceTrackerModal } from './ServiceTrackerModalRedesigned';

interface ServiceMixCardProps {
  year: number;
  onServiceDatasetsChange?: (datasets: any[]) => void;
}

/**
 * Collapsible card for Service Mix tracking
 * Matches the app's design system and Historical Performance Comparison card style
 */
export function ServiceMixCard({ year, onServiceDatasetsChange }: ServiceMixCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showServiceMix, setShowServiceMix] = useState(false);
  const [visibleServices, setVisibleServices] = useState<Set<string>>(new Set());
  
  const { services, loading } = useServices();
  const { data: serviceData } = useServiceRevenueData(year, services);

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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Service Mix Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              {services.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowServiceMix(!showServiceMix)}
                  className="gap-2"
                >
                  {showServiceMix ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showServiceMix ? 'Hide' : 'Show'} on Graph
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {services.length === 0 ? 'Add Services' : 'Manage'}
              </Button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-foreground" />
                )}
              </button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent>
            {services.length === 0 && !loading ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Track Your Service Performance
                </h3>
                <p className="text-gray-400 mb-4 max-w-md mx-auto">
                  Understand which services drive your revenue throughout the year and identify seasonal patterns.
                </p>
                <Button onClick={() => setShowModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Service
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Service Mix Stats */}
                {serviceData.length > 0 && (
                  <ServiceMixStats serviceData={serviceData} />
                )}

                {/* Service List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-foreground">Your Services</h4>
                    {serviceData.length > 0 && showServiceMix && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleAll}
                        className="text-xs"
                      >
                        {visibleServices.size === serviceData.length ? 'Hide All' : 'Show All'}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {services.map((service) => {
                      const serviceRevenue = serviceData.find(s => s.serviceId === service.id);
                      const isVisible = visibleServices.has(service.id);
                      
                      return (
                        <div
                          key={service.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                            showServiceMix && isVisible
                              ? 'bg-accent/10 border-accent'
                              : 'bg-card border-gray-700 hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: service.color || '#3B82F6' }}
                              title="Service identifier for graph visualization"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {service.serviceName}
                              </p>
                              {service.serviceCategory && (
                                <p className="text-xs text-gray-400">{service.serviceCategory}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {serviceRevenue && (
                              <div className="text-right">
                                <p className="text-sm font-medium text-foreground">
                                  ${serviceRevenue.totalRevenue.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {serviceRevenue.percentageOfTotal.toFixed(1)}% of total
                                </p>
                              </div>
                            )}
                            
                            {showServiceMix && serviceRevenue && (
                              <button
                                onClick={() => handleToggleService(service.id)}
                                className={`p-2 rounded transition-colors ${
                                  isVisible
                                    ? 'bg-accent text-white hover:bg-accent/90'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                                title={isVisible ? 'Hide from graph' : 'Show on graph'}
                              >
                                {isVisible ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Help Text */}
                {showServiceMix && serviceData.length > 0 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-400">
                      <strong>Tip:</strong> Toggle services on/off to compare their performance on the revenue graph above. 
                      Each service appears as a dashed line to help you identify seasonal patterns.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Service Tracker Modal */}
      <ServiceTrackerModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
