import React, { useState, cloneElement } from "react";
import { supabase } from "../../config/supabaseClient";
import { useAuth } from "../../contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  CheckCircle, 
  Loader2,
  BookOpen,
  Target,
  DollarSign,
  TrendingUp,
  Lightbulb,
  Star,
  MessageCircle,
  Clock,
  Sparkles,
  Play
} from 'lucide-react';

type JournalSection =
  | "personal_feelings" | "positive_ripples" | "negative_ripples"
  | "team_events" | "customer_signals" | "external_factors"
  | "lessons" | "looking_forward";

interface StepMeta {
  id: JournalSection;
  title: string;
  element: JSX.Element;
}

export interface MomentumWizardProps {
  ownerId?: string;
  month?: Date;
  celebration?: "confetti" | "wave" | "bubbles";
}

// Simple step components since the imported ones don't exist yet
function FeelingStep({ value, onChange }: { value?: any; onChange?: (value: any) => void }) {
  const feelings = ['energized', 'proud', 'relaxed', 'frustrated', 'overwhelmed', 'optimistic', 'concerned'];
  
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">How did you feel about your business this month?</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {feelings.map((feeling) => (
          <button
            key={feeling}
            onClick={() => onChange?.({ feeling, content: feeling })}
            className={`p-3 rounded-lg border transition-colors capitalize ${
              value?.feeling === feeling
                ? 'bg-accent text-background border-accent'
                : 'bg-card border-border hover:bg-border'
            }`}
          >
            {feeling}
          </button>
        ))}
      </div>
      {value?.feeling && (
        <textarea
          placeholder="Tell us more about why you felt this way..."
          value={value?.content || ''}
          onChange={(e) => onChange?.({ ...value, content: e.target.value })}
          className="w-full p-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted resize-none"
          rows={3}
        />
      )}
    </div>
  );
}

function TextAreaStep({ placeholder, value, onChange }: { placeholder?: string; value?: any; onChange?: (value: any) => void }) {
  return (
    <div className="space-y-4">
      <textarea
        placeholder={placeholder}
        value={value?.content || ''}
        onChange={(e) => onChange?.({ content: e.target.value })}
        className="w-full p-4 bg-input border border-border rounded-lg text-foreground placeholder:text-muted resize-none"
        rows={6}
      />
    </div>
  );
}

function RippleChecklist({ tags, value, onChange }: { tags: string[]; value?: any; onChange?: (value: any) => void }) {
  const selectedTags = value?.tags || [];
  
  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t: string) => t !== tag)
      : [...selectedTags, tag];
    onChange?.({ tags: newTags, content: newTags.join(', ') });
  };
  
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">Select all that apply:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`p-3 rounded-lg border transition-colors text-left ${
              selectedTags.includes(tag)
                ? 'bg-accent text-background border-accent'
                : 'bg-card border-border hover:bg-border'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      {selectedTags.length > 0 && (
        <textarea
          placeholder="Add any additional details..."
          value={value?.additionalContent || ''}
          onChange={(e) => onChange?.({ ...value, additionalContent: e.target.value })}
          className="w-full p-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted resize-none"
          rows={3}
        />
      )}
    </div>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i <= current ? 'bg-accent' : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

// Simple celebration functions
const celebrations = {
  confetti: () => {
    // Simple confetti effect
    console.log('🎉 Confetti celebration!');
  },
  wave: () => {
    // Wave effect
    console.log('🌊 Wave celebration!');
  },
  bubbles: () => {
    // Bubble effect
    console.log('🫧 Bubble celebration!');
  }
};

export default function MomentumWizard({
  ownerId,
  month = new Date(),
  celebration = "confetti"
}: MomentumWizardProps) {
  const { user } = useAuth();
  const actualOwnerId = ownerId || user?.id;

  const steps: StepMeta[] = [
    { 
      id: "personal_feelings",
      title: "How did you feel this month?",
      element: <FeelingStep /> 
    },
    { 
      id: "positive_ripples",
      title: "Name one win that made you proud",
      element: <TextAreaStep placeholder="We landed the AC-megastore contract…" /> 
    },
    { 
      id: "negative_ripples",
      title: "What frustrated or drained you?",
      element: <TextAreaStep placeholder="Compressor shortage delayed installs…" /> 
    },
    { 
      id: "team_events",
      title: "Any people or gear hiccups?",
      element: <RippleChecklist tags={["Sick leave", "Truck down", "New hire", "Vacation overlap"]} /> 
    },
    { 
      id: "customer_signals",
      title: "Did customers behave differently?",
      element: <RippleChecklist tags={["Lead spike", "Review surge", "Cancellation uptick"]} /> 
    },
    { 
      id: "external_factors",
      title: "Outside curve-balls?",
      element: <RippleChecklist tags={["Heat wave", "Supplier delay", "Competitor promo"]} /> 
    },
    { 
      id: "lessons",
      title: "What lesson will future-you need?",
      element: <TextAreaStep placeholder="Always pre-order compressors before May…" /> 
    },
    { 
      id: "looking_forward",
      title: "Next month, what ripple will you try to create?",
      element: <TextAreaStep placeholder="Book two warranty calls per tech per week…" /> 
    }
  ];

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Record<JournalSection, any>>({} as any);
  const [isSaving, setSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const Section = steps[step];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleVideoPlay = (stepIndex: number) => {
    // Placeholder for future video functionality
    alert(`Video for step ${stepIndex + 1} will be available soon! This will explain: "${steps[stepIndex].title}"`);
  };

  async function saveMonth() {
    if (!actualOwnerId) return;
    
    setSaving(true);
    try {
      // For now, save to localStorage (in real implementation, use Supabase)
      const monthKey = month.toISOString().slice(0, 7);
      const storageKey = `momentum_wizard_${actualOwnerId}_${monthKey}`;
      
      const payload = Object.entries(draft).map(([section, data]) => ({
        owner_id: actualOwnerId,
        month: monthKey,
        section,
        content: data?.content || '',
        feeling: data?.feeling ?? null,
        impact_score: data?.impact ?? null,
        tags: data?.tags || [],
        additional_content: data?.additionalContent || ''
      }));
      
      localStorage.setItem(storageKey, JSON.stringify(payload));
      
      setIsCompleted(true);
      triggerCelebration();
    } catch (error) {
      console.error('Error saving momentum data:', error);
    } finally {
      setSaving(false);
    }
  }

  function triggerCelebration() {
    celebrations[celebration]();
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (isCompleted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                🎉 Month Captured!
              </h2>
              <p className="text-muted">
                Your {formatMonth(month)} momentum journal has been saved. 
                These insights will help improve your AI coaching experience.
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>
              Start Another Month
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header - Keep consistent black background */}
      <Card className="bg-background border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Momentum Wizard - {formatMonth(month)}
                </CardTitle>
                <p className="text-muted text-sm mt-1">
                  Step {step + 1} of {steps.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ProgressDots total={steps.length} current={step} />
              {/* Video Play Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleVideoPlay(step)}
                className="flex items-center gap-2 bg-accent/10 border-accent/20 hover:bg-accent/20"
                title={`Watch explanation video for: ${Section.title}`}
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Video</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Step - Keep consistent black background */}
      <Card className="bg-background border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-foreground">{Section.title}</CardTitle>
            {/* Video Play Button in upper right corner of step */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVideoPlay(step)}
              className="flex items-center gap-2 text-accent hover:text-accent/80 hover:bg-accent/10"
              title={`Watch explanation video for: ${Section.title}`}
            >
              <Play className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cloneElement(Section.element, {
            value: draft[Section.id],
            onChange: (value: any) =>
              setDraft((d) => ({ ...d, [Section.id]: value }))
          })}
        </CardContent>
      </Card>

      {/* Navigation - Keep consistent black background */}
      <Card className="bg-background border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={prev} className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : <span />}

            {step < steps.length - 1 ? (
              <Button onClick={next} className="flex items-center gap-2">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={saveMonth} 
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Month
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <div className="text-center text-sm text-muted">
        <Sparkles className="h-4 w-4 inline mr-1" />
        Building momentum, one reflection at a time
      </div>
    </div>
  );
}