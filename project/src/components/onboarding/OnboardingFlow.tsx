import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '../../contexts/auth-context';
import { 
  ArrowLeft, 
  ArrowRight, 
  Home, 
  CheckCircle, 
  AlertTriangle,
  Heart,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Lightbulb
} from 'lucide-react';

interface OnboardingData {
  // Step 1 - Basic Info
  name: string;
  business: string;
  website: string;
  yearsInBiz: string;
  reason: string;
  goal: string;
  
  // Step 2 - Pain Points
  stressPoints: string[];
  
  // Step 3 - Current Role
  role: string;
  
  // Step 4 - Dreams & Vision
  dream: string;
  dreamDistance: string;
  
  // Step 5 - Conviction
  conviction: string;
  
  // Step 6 - Financial Reality
  monthlyRevenue: string;
  profitMargin: string;
  
  // Step 7 - Family Impact
  familyReaction: string;
  
  // Step 8 - Roadblocks
  roadblocks: string[];
  
  // Step 9 - Leadership Style
  leadStyle: string;
}

const initialFormData: OnboardingData = {
  name: '',
  business: '',
  website: '',
  yearsInBiz: '',
  reason: '',
  goal: '',
  stressPoints: [],
  role: '',
  dream: '',
  dreamDistance: '',
  conviction: '',
  monthlyRevenue: '',
  profitMargin: '',
  familyReaction: '',
  roadblocks: [],
  leadStyle: ''
};

export function OnboardingFlow() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 10;

  const microWins: Record<number, string> = {
    2: "Step 1 complete – Let's keep going.",
    3: "Step 2 complete – You just owned your pain like a leader.",
    4: "You're doing what most business owners avoid. That takes guts.",
    5: "Only 5 steps left to clarity.",
    6: "Halfway there! Your commitment is showing.",
    7: "Getting real about the numbers – that's courage.",
    8: "Almost there! You're building something powerful.",
    9: "Final stretch – you're about to transform your business.",
    10: "You made it! Time to ride your wave."
  };

  const handleChange = (field: keyof OnboardingData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: keyof OnboardingData, option: string, checked: boolean) => {
    const currentValues = (formData[field] as string[]) || [];
    if (checked) {
      handleChange(field, [...currentValues, option]);
    } else {
      handleChange(field, currentValues.filter(item => item !== option));
    }
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const goHome = () => {
    navigate('/');
  };

  const completeOnboarding = async () => {
    setIsSubmitting(true);
    
    try {
      // Here you would typically save the onboarding data
      // For now, we'll just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to dashboard after completion
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding completion failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepIcon = (stepNumber: number) => {
    switch (stepNumber) {
      case 1: return Users;
      case 2: return AlertTriangle;
      case 3: return Target;
      case 4: return Heart;
      case 5: return TrendingUp;
      case 6: return DollarSign;
      case 7: return Users;
      case 8: return AlertTriangle;
      case 9: return Target;
      case 10: return CheckCircle;
      default: return Lightbulb;
    }
  };

  const StepIcon = getStepIcon(step);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Wave Rider Mastery</h2>
              <p className="text-muted">Let's start with the basics about you and your business</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="business">Business Name *</Label>
                <Input
                  id="business"
                  value={formData.business}
                  onChange={(e) => handleChange('business', e.target.value)}
                  placeholder="Your business name"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="website">Website (if any)</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://yourbusiness.com"
              />
            </div>
            
            <div>
              <Label htmlFor="yearsInBiz">How long have you been in business? *</Label>
              <Select value={formData.yearsInBiz} onValueChange={(value) => handleChange('yearsInBiz', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less-than-1">Less than 1 year</SelectItem>
                  <SelectItem value="1-2">1-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="6-10">6-10 years</SelectItem>
                  <SelectItem value="more-than-10">More than 10 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reason">What made you decide to get help? *</Label>
              <textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                placeholder="Tell us what brought you here..."
                className="w-full p-3 border border-border rounded-lg bg-input text-foreground placeholder:text-muted min-h-[100px] resize-none"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="goal">If you got one thing from this program, what would it be? *</Label>
              <textarea
                id="goal"
                value={formData.goal}
                onChange={(e) => handleChange('goal', e.target.value)}
                placeholder="Your biggest hope for this program..."
                className="w-full p-3 border border-border rounded-lg bg-input text-foreground placeholder:text-muted min-h-[100px] resize-none"
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Let's Talk About What's Really Going On</h2>
              <p className="text-muted">What keeps you up at night? (Select all that apply)</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Can't pay myself",
                "Bills stacking up", 
                "My business controls me",
                "I'm always behind",
                "Don't know my numbers",
                "Other"
              ].map((option) => (
                <label key={option} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-card cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.stressPoints.includes(option)}
                    onChange={(e) => handleCheckboxChange('stressPoints', option, e.target.checked)}
                    className="w-4 h-4 text-accent focus:ring-accent border-border rounded"
                  />
                  <span className="text-foreground">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Where Are You Spending Most of Your Time?</h2>
              <p className="text-muted">Understanding your current role helps us guide you better</p>
            </div>
            
            <div className="space-y-3">
              {[
                "In the field",
                "In the office", 
                "Split time",
                "Not sure",
                "In the bar drowning my stress"
              ].map((option) => (
                <label key={option} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-card cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value={option}
                    checked={formData.role === option}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className="w-4 h-4 text-accent focus:ring-accent border-border"
                  />
                  <span className="text-foreground">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Let's Talk About Your Dream</h2>
              <p className="text-muted">Every business owner started with a vision</p>
            </div>
            
            <div>
              <Label htmlFor="dream">What was your dream when you started your business? *</Label>
              <textarea
                id="dream"
                value={formData.dream}
                onChange={(e) => handleChange('dream', e.target.value)}
                placeholder="Tell us about the vision that started it all..."
                className="w-full p-3 border border-border rounded-lg bg-input text-foreground placeholder:text-muted min-h-[120px] resize-none"
                required
              />
            </div>
            
            <div>
              <Label>Do you feel closer or further from that dream?</Label>
              <div className="space-y-3 mt-3">
                {["Closer", "Further", "Not sure"].map((option) => (
                  <label key={option} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-card cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="dreamDistance"
                      value={option}
                      checked={formData.dreamDistance === option}
                      onChange={(e) => handleChange('dreamDistance', e.target.value)}
                      className="w-4 h-4 text-accent focus:ring-accent border-border"
                    />
                    <span className="text-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">The Most Important Question</h2>
              <p className="text-muted">This determines everything that comes next</p>
            </div>
            
            <div>
              <Label>Do you believe in your dream enough to fight for it?</Label>
              <div className="space-y-3 mt-3">
                {[
                  "Yes",
                  "I want to, but I'm tired", 
                  "No"
                ].map((option) => (
                  <label key={option} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-card cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="conviction"
                      value={option}
                      checked={formData.conviction === option}
                      onChange={(e) => handleChange('conviction', e.target.value)}
                      className="w-4 h-4 text-accent focus:ring-accent border-border"
                    />
                    <span className="text-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {formData.conviction === "No" && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mt-1" />
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                      We Need to Be Honest With You
                    </h4>
                    <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed">
                      If you've already given up on your dream, this might not be the right tool for you right now. 
                      To get the most out of this program, it requires dedication and a mindset shift to WANT to grow 
                      your business and get out of the rut you're currently in.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Let's Get Real About the Numbers</h2>
              <p className="text-muted">Understanding your current financial reality</p>
            </div>
            
            <div>
              <Label htmlFor="monthlyRevenue">What is your current average monthly revenue? *</Label>
              <Input
                id="monthlyRevenue"
                value={formData.monthlyRevenue}
                onChange={(e) => handleChange('monthlyRevenue', e.target.value)}
                placeholder="e.g., $25,000"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="profitMargin">Do you know how much of that you keep as profit? What do you think your profit is (%)? *</Label>
              <Input
                id="profitMargin"
                value={formData.profitMargin}
                onChange={(e) => handleChange('profitMargin', e.target.value)}
                placeholder="e.g., 20%"
                required
              />
              <p className="text-xs text-muted mt-2">
                If you're not sure, that's okay. Most business owners don't track this closely.
              </p>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">The Family Question</h2>
              <p className="text-muted">This one might sting, but it's important</p>
            </div>
            
            <div>
              <Label>If your business ended today, how would your family feel?</Label>
              <div className="space-y-3 mt-3">
                {[
                  "Relieved",
                  "Sad", 
                  "Conflicted",
                  "I'm not sure"
                ].map((option) => (
                  <label key={option} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-card cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="familyReaction"
                      value={option}
                      checked={formData.familyReaction === option}
                      onChange={(e) => handleChange('familyReaction', e.target.value)}
                      className="w-4 h-4 text-accent focus:ring-accent border-border"
                    />
                    <span className="text-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">What's Been Holding You Back?</h2>
              <p className="text-muted">Select all that apply - no judgment here</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Never tracked numbers",
                "Didn't know what to look at", 
                "Survival mode",
                "Not good with money",
                "No system"
              ].map((option) => (
                <label key={option} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-card cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.roadblocks.includes(option)}
                    onChange={(e) => handleCheckboxChange('roadblocks', option, e.target.checked)}
                    className="w-4 h-4 text-accent focus:ring-accent border-border rounded"
                  />
                  <span className="text-foreground">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Leadership Style</h2>
              <p className="text-muted">How do you tend to lead your business?</p>
            </div>
            
            <div className="space-y-3">
              {[
                "Move fast and decide quick",
                "Keep people happy over profits", 
                "Avoid change and stay steady",
                "Check systems before acting"
              ].map((option) => (
                <label key={option} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-card cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="leadStyle"
                    value={option}
                    checked={formData.leadStyle === option}
                    onChange={(e) => handleChange('leadStyle', e.target.value)}
                    className="w-4 h-4 text-accent focus:ring-accent border-border"
                  />
                  <span className="text-foreground">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">You Made It!</h2>
              <p className="text-lg text-muted mb-8">
                Time to transform your business and ride your revenue wave
              </p>
            </div>
            
            <div className="bg-accent/10 rounded-lg p-6 border border-accent/20">
              <h3 className="font-bold text-foreground mb-4">Here's the truth:</h3>
              <p className="text-muted leading-relaxed mb-4">
                Most business owners were trained to do the thing they sell but no one trained them to run a business. 
                You're doing the best you can, you've just never had the right tools to succeed.
              </p>
              <p className="text-muted leading-relaxed">
                Your business should fuel the future you dream of—not crush it. It's time to get in the water. 
                Hop on the board and let's ride your revenue wave to gain clarity, direction and passion for your business again!
              </p>
            </div>
            
            <div className="text-center">
              <Button 
                onClick={completeOnboarding}
                disabled={isSubmitting}
                className="text-lg px-8 py-4"
              >
                {isSubmitting ? 'Setting Up Your Dashboard...' : "Let's Ride My Wave! 🏄‍♂️"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name && formData.business && formData.yearsInBiz && formData.reason && formData.goal;
      case 2:
        return formData.stressPoints.length > 0;
      case 3:
        return formData.role;
      case 4:
        return formData.dream && formData.dreamDistance;
      case 5:
        return formData.conviction;
      case 6:
        return formData.monthlyRevenue && formData.profitMargin;
      case 7:
        return formData.familyReaction;
      case 8:
        return formData.roadblocks.length > 0;
      case 9:
        return formData.leadStyle;
      case 10:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={goHome} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
            <div className="h-6 w-px bg-border"></div>
            <div className="flex items-center gap-2">
              <img 
                src="/Master-Logo_white-on-white2.png" 
                alt="Big Fig CFO Logo" 
                className="h-6 w-auto"
              />
              <span className="font-bold text-accent">Wave Rider Mastery</span>
            </div>
          </div>
          
          <div className="text-sm text-muted">
            Step {step} of {totalSteps}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progress</span>
            <span className="text-sm text-muted">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Micro Win Message */}
        {microWins[step] && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-green-800 dark:text-green-200 font-medium">
                {microWins[step]}
              </span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <Card className="border-2 border-accent/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                <StepIcon className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-xl">
                Step {step} of {totalSteps}
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={step === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i + 1 <= step ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          
          {step < totalSteps ? (
            <Button 
              onClick={nextStep} 
              disabled={!canProceed() || (formData.conviction === "No")}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div></div> // Placeholder for layout
          )}
        </div>
      </div>
    </div>
  );
}