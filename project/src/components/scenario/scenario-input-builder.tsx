import { Input } from '../ui/input';
import { CurrencyInput } from '../ui/currency-input';
import { Label } from '../ui/label';
import { TooltipTrigger } from '../ui/tooltip';
import { UserProvidedInputs } from './scenario-classifier';

interface FieldConfig {
  name: keyof UserProvidedInputs;
  label: string;
  type: 'number' | 'currency' | 'percent';
  placeholder?: string;
  min?: number;
  max?: number;
  tooltipContent?: string;
}

interface ScenarioInputBuilderProps {
  scenarioType: string;
  fieldsToDisplay: FieldConfig[];
  values: UserProvidedInputs;
  onChange: (name: keyof UserProvidedInputs, value: number) => void;
}

const fieldConfigs: Record<string, FieldConfig[]> = {
  pricing: [
    { name: 'currentPrice', label: 'Current Price', type: 'currency' },
    { name: 'newPrice', label: 'New Price', type: 'currency' },
    { name: 'avgMonthlySales', label: 'Average Monthly Sales', type: 'number', min: 1 },
    { 
      name: 'customerRetention', 
      label: 'Customer Retention (%)', 
      type: 'percent', 
      min: 0, 
      max: 100,
      tooltipContent: 'What percentage of customers will stay after the price change? If you\'re unsure, 90-95% is typical for small price increases.'
    }
  ],
  membership: [
    { name: 'monthlyFee', label: 'Monthly Fee', type: 'currency' },
    { name: 'targetMembers', label: 'Target Members', type: 'number', min: 1 },
    { 
      name: 'churnRate', 
      label: 'Monthly Churn Rate (%)', 
      type: 'percent', 
      min: 0, 
      max: 100,
      tooltipContent: 'How many members will cancel each month? Think of it like this: if 5 out of 100 members cancel monthly, that\'s 5%. Most service memberships see 3-8% monthly churn.'
    },
    { 
      name: 'acquisitionCost', 
      label: 'Acquisition Cost per Member', 
      type: 'currency',
      tooltipContent: 'How much does it cost to get one new member? This includes advertising, sales time, and any signup bonuses. If you spend $500 on ads and get 10 new members, that\'s $50 per member.'
    }
  ],
  hiring: [
    { name: 'hourlyRate', label: 'Hourly Rate', type: 'currency' },
    { name: 'hoursPerWeek', label: 'Hours per Week', type: 'number', min: 1, max: 80 },
    { name: 'productivityIncrease', label: 'Productivity Increase (%)', type: 'percent', min: 0 },
    { name: 'onboardingCost', label: 'Onboarding Cost', type: 'currency' }
  ],
  marketing: [
    { name: 'monthlySpend', label: 'Monthly Spend', type: 'currency' },
    { name: 'expectedROI', label: 'Expected ROI (%)', type: 'percent', min: 0 },
    { name: 'conversionRate', label: 'Conversion Rate (%)', type: 'percent', min: 0, max: 100 },
    { name: 'customerLifetimeValue', label: 'Customer Lifetime Value', type: 'currency' }
  ],
  costCutting: [
    { name: 'currentCost', label: 'Current Monthly Cost', type: 'currency' },
    { name: 'proposedSavings', label: 'Proposed Monthly Savings', type: 'currency' },
    { name: 'impactOnRevenue', label: 'Impact on Revenue (%)', type: 'percent', min: 0, max: 100 },
    { name: 'implementationCost', label: 'Implementation Cost', type: 'currency' }
  ],
  salesVolume: [
    { name: 'currentJobsPerMonth', label: 'Current Jobs per Month', type: 'number', min: 0 },
    { name: 'additionalJobs', label: 'Additional Jobs', type: 'number', min: 1 },
    { name: 'avgJobValue', label: 'Average Job Value', type: 'currency' },
    { name: 'timeConstraint', label: 'Time Capacity (%)', type: 'percent', min: 0, max: 100 }
  ]
};

export const ScenarioInputBuilder: React.FC<ScenarioInputBuilderProps> = ({ 
  scenarioType, 
  fieldsToDisplay, 
  values, 
  onChange 
}) => {
  if (fieldsToDisplay.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldsToDisplay.map(field => (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{field.label}</Label>
              {field.tooltipContent && (
                <TooltipTrigger content={field.tooltipContent} />
              )}
            </div>
            {field.type === 'currency' ? (
              <CurrencyInput
                value={values[field.name] || 0}
                onChange={(value) => onChange(field.name, value)}
                placeholder={field.placeholder || '0'}
              />
            ) : (
              <Input
                type="number"
                value={values[field.name] || ''}
                onChange={(e) => onChange(field.name, Number(e.target.value) || 0)}
                placeholder={field.placeholder || '0'}
                min={field.min}
                max={field.max}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to get all fields for a scenario type
export const getAllFieldsForScenario = (scenarioType: string): FieldConfig[] => {
  return fieldConfigs[scenarioType] || [];
};

// Helper function to get missing fields only
export const getMissingFieldsForScenario = (scenarioType: string, missingInputs: string[]): FieldConfig[] => {
  const allFields = fieldConfigs[scenarioType] || [];
  return allFields.filter(field => missingInputs.includes(field.name));
};