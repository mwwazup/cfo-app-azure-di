import { useState } from 'react';
import { ServiceTrackerModal } from '../components/services/ServiceTrackerModalRedesigned';
import { Button } from '../components/ui/button';
import { useServices } from '../hooks/useServices';

/**
 * Standalone test page for Service Mix feature
 * Navigate to /service-mix-test to test the feature
 */
export function ServiceMixTestPage() {
  const [showModal, setShowModal] = useState(false);
  const { services, loading } = useServices();

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Service Mix - Test Page
        </h1>
        <p className="text-gray-400">
          This is a standalone page to test the Service Mix feature before integrating it into the main app.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Current Status</h2>
        
        <div className="space-y-2">
          <p className="text-foreground">
            <strong>Services in database:</strong> {loading ? 'Loading...' : services.length}
          </p>
          
          {services.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-foreground mb-2">Your Services:</h3>
              <ul className="space-y-2">
                {services.map((service) => (
                  <li key={service.id} className="flex items-center gap-2 text-accent">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: service.color || '#3B82F6' }}
                    />
                    <span>{service.serviceName}</span>
                    {service.serviceCategory && (
                      <span className="text-xs text-gray-400">({service.serviceCategory})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Button onClick={() => setShowModal(true)} className="mt-4">
          Open Service Tracker Modal
        </Button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">Testing Instructions:</h3>
        <ol className="text-sm text-blue-300 space-y-1 list-decimal list-inside">
          <li>Click "Open Service Tracker Modal"</li>
          <li>Add a service in the "Your Services" section</li>
          <li>Check if it appears in the list above after saving</li>
          <li>Try adding a weekly activity in the "Track Weekly Activity" section</li>
          <li>Check browser console for any errors</li>
        </ol>
      </div>

      <ServiceTrackerModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
