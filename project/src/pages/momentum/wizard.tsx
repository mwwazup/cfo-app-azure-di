import React from 'react';
import { useAuth } from '../../contexts/auth-context';
import MomentumWizard from '../../components/momentum/MomentumWizard';
import { Button } from '../../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MomentumWizardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  
  // Set to first day of current month
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Momentum Wizard</h1>
          <p className="text-muted mt-2">
            Capture your monthly business insights and build momentum
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/momentum')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Momentum
        </Button>
      </div>
      
      <MomentumWizard
        ownerId={user?.id}
        month={currentMonth}
        celebration="wave"
      />
    </div>
  );
}