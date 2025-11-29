import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useRevenue } from '../../contexts/revenue-context';
import { useAuthContext } from '../../contexts/auth-context';
import { 
  getLighthouseGoal, 
  getLighthousePlan, 
  upsertLighthouseGoal, 
  getStepOverrides,
  saveStepOverrides,
  LighthouseGoal, 
  LighthousePlan,
  StepOverridePayload,
} from '../../services/bigFigGoalService';
import { claudeService } from '../../services/claudeService';

import {
  Heart,
  Target,
  Lightbulb,
  Save,
  Sparkles,
  Activity,
  Loader2,
  Pencil,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';

type LighthousePlanSuggestion = {
  targetAnnualRevenue?: number;
  yearsToGoal?: number;
  targetOwnerPay?: number | null;
  targetProfitMargin?: number | null;
  explanation?: string;
};

type PlanStatus = 'draft' | 'committed';

type Milestone = {
  id: string;
  text: string;
  completed: boolean;
};

type EditableStep = {
  yearLabel: string;
  targetRevenue: number;
  themeIndex: number; // Index into the phase's theme array
  approved: boolean; // Has user approved this step in the review flow?
  milestones: Milestone[]; // User-defined milestones for this year
};

export function YourBigFigPage() {
  const { currentYear } = useRevenue();
  const totalRevenue = currentYear.data.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const averageMonthly = currentYear.data.length ? Math.round(totalRevenue / currentYear.data.length) : 0;
  const { dbUserId } = useAuthContext();

  const [, setLighthouseGoal] = useState<LighthouseGoal | null>(null);

  const [lighthousePlan, setLighthousePlan] = useState<LighthousePlan | null>(null);
  const [lighthouseStory, setLighthouseStory] = useState('');
  const [targetAnnualRevenue, setTargetAnnualRevenue] = useState('');
  const [yearsToGoal, setYearsToGoal] = useState('');
  const [targetOwnerPay, setTargetOwnerPay] = useState('');
  const [targetProfitMargin, setTargetProfitMargin] = useState('');
  const [lighthouseLoading, setLighthouseLoading] = useState(false);
  const [lighthouseSaving, setLighthouseSaving] = useState(false);
  const [lighthouseError, setLighthouseError] = useState<string | null>(null);
  const [lighthouseSaved, setLighthouseSaved] = useState(false);
  const [planFromStoryLoading, setPlanFromStoryLoading] = useState(false);
  const [planFromStoryError, setPlanFromStoryError] = useState<string | null>(null);
  const [planFromStoryExplanation, setPlanFromStoryExplanation] = useState<string | null>(null);
  const [avgJobValue, setAvgJobValue] = useState('');
  const [jobsPerCrewPerMonth, setJobsPerCrewPerMonth] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('4');

  // Plan review state
  const [planStatus, setPlanStatus] = useState<PlanStatus>('draft');
  const [editableSteps, setEditableSteps] = useState<EditableStep[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStepIndex, setReviewStepIndex] = useState(0);
  const [editingYearIndex, setEditingYearIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLighthouse() {
      const userId = dbUserId;
      if (!userId) return;

      setLighthouseLoading(true);
      setLighthouseError(null);
      try {
        const goal = await getLighthouseGoal(userId);

        if (cancelled) return;

        if (goal) {
          setLighthouseGoal(goal);
          setTargetAnnualRevenue(String(goal.targetAnnualRevenue ?? ''));
          setYearsToGoal(goal.yearsToGoal != null ? String(goal.yearsToGoal) : '');
          setTargetOwnerPay(goal.targetOwnerPay != null ? String(goal.targetOwnerPay) : '');
          setTargetProfitMargin(goal.targetProfitMargin != null ? String(goal.targetProfitMargin) : '');
          setLighthouseStory(goal.notes ?? '');
          setAvgJobValue(goal.avgJobValue != null ? String(goal.avgJobValue) : '');
          setJobsPerCrewPerMonth(
            goal.jobsPerCrewPerMonth != null ? String(goal.jobsPerCrewPerMonth) : ''
          );
        }

        const plan = await getLighthousePlan(userId);

        if (cancelled) return;
        setLighthousePlan(plan);

        // Load step overrides (per-year customizations)
        const overridesResponse = await getStepOverrides(userId);
        if (cancelled) return;
        
        if (overridesResponse) {
          setPlanStatus(overridesResponse.planStatus);
          
          // Convert saved overrides to editableSteps format
          if (overridesResponse.steps.length > 0) {
            const loadedSteps: EditableStep[] = overridesResponse.steps.map((step) => ({
              yearLabel: step.yearLabel,
              targetRevenue: step.targetRevenue ?? 0,
              themeIndex: step.themeIndex ?? 0,
              approved: step.approved,
              milestones: step.milestones.map((m) => ({
                id: m.id,
                text: m.text,
                completed: m.completed,
              })),
            }));
            setEditableSteps(loadedSteps);
          }
        }
      } catch (err) {
        console.error('Error loading Lighthouse goal/plan', err);
        if (!cancelled) {
          setLighthouseError('There was a problem loading your Lighthouse goal.');
        }
      } finally {
        if (!cancelled) {
          setLighthouseLoading(false);
        }
      }
    }

    loadLighthouse();

    return () => {
      cancelled = true;
    };
  }, [dbUserId]);

  const parseLighthousePlanSuggestion = (raw: string): LighthousePlanSuggestion | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      const jsonString = trimmed.slice(start, end + 1);
      const obj = JSON.parse(jsonString);
      if (typeof obj !== 'object' || obj === null) return null;

      const suggestion: LighthousePlanSuggestion = {};
      if (obj.targetAnnualRevenue != null) {
        const v = Number(obj.targetAnnualRevenue);
        if (!Number.isNaN(v) && v > 0) suggestion.targetAnnualRevenue = v;
      }
      if (obj.yearsToGoal != null) {
        const v = Number(obj.yearsToGoal);
        if (!Number.isNaN(v) && v > 0 && v < 50) suggestion.yearsToGoal = Math.round(v);
      }
      if (obj.targetOwnerPay != null) {
        const v = Number(obj.targetOwnerPay);
        if (!Number.isNaN(v) && v >= 0) suggestion.targetOwnerPay = v;
      }
      if (obj.targetProfitMargin != null) {
        const v = Number(obj.targetProfitMargin);
        if (!Number.isNaN(v) && v >= 0 && v <= 100) suggestion.targetProfitMargin = v;
      }
      if (typeof obj.explanation === 'string') {
        suggestion.explanation = obj.explanation;
      }

      if (
        suggestion.targetAnnualRevenue == null &&
        suggestion.yearsToGoal == null &&
        suggestion.targetOwnerPay == null &&
        suggestion.targetProfitMargin == null
      ) {
        return null;
      }

      return suggestion;
    } catch (err) {
      console.error('Error parsing Lighthouse plan suggestion from AI', err);
      return null;
    }
  };

  const handleSaveLighthouse = async () => {
    const userId = dbUserId;
    if (!userId) {
      setLighthouseError('You need to be signed in to save a Lighthouse goal.');
      return;
    }

    const revenueNum = Number(targetAnnualRevenue);
    const yearsNum = parseInt(yearsToGoal, 10);

    if (!revenueNum || revenueNum <= 0) {
      setLighthouseError('Enter a positive target annual revenue.');
      return;
    }

    if (!yearsNum || yearsNum <= 0) {
      setLighthouseError('Enter how many years to reach this Lighthouse.');
      return;
    }

    const ownerPayNum = targetOwnerPay.trim() ? Number(targetOwnerPay) : null;
    const profitMarginNum = targetProfitMargin.trim() ? Number(targetProfitMargin) : null;
    const avgJobValueNum = avgJobValue.trim() ? Number(avgJobValue) : null;
    const jobsPerCrewPerMonthNum = jobsPerCrewPerMonth.trim()
      ? Number(jobsPerCrewPerMonth)
      : null;

    setLighthouseSaving(true);
    setLighthouseError(null);
    setLighthouseSaved(false);

    try {
      const saved = await upsertLighthouseGoal(userId, {
        targetAnnualRevenue: revenueNum,
        yearsToGoal: yearsNum,
        targetOwnerPay: ownerPayNum,
        targetProfitMargin: profitMarginNum,
        avgJobValue: avgJobValueNum,
        jobsPerCrewPerMonth: jobsPerCrewPerMonthNum,
        notes: lighthouseStory || null,
      });

      setLighthouseGoal(saved);
      const plan = await getLighthousePlan(userId);
      setLighthousePlan(plan);
      setLighthouseSaved(true);
    } catch (err) {
      console.error('Error saving Lighthouse goal', err);
      setLighthouseError('There was a problem saving your Lighthouse goal.');
    } finally {
      setLighthouseSaving(false);
    }
  };

  const handlePlanFromStory = async () => {
    if (!dbUserId) {
      setPlanFromStoryError('You need to be signed in to use the AI coach.');
      return;
    }

    if (!lighthouseStory.trim()) {
      setPlanFromStoryError('Start by writing a few sentences about your Lighthouse first.');
      return;
    }

    if (!claudeService.isAvailable()) {
      setPlanFromStoryError("The AI coach isn't configured right now. You can still set your numbers manually.");
      return;
    }

    setPlanFromStoryLoading(true);
    setPlanFromStoryError(null);
    setPlanFromStoryExplanation(null);

    const prompt = `You are an experienced small business CFO coach.

The user has just described their long-term LIGHTHOUSE goal for their business in their own words.

Your job is to translate that story into a SIMPLE numeric plan that this app can use:

- A rough annual revenue target (in dollars)
- A rough number of years to reach that Lighthouse
- Optional target owner pay (in dollars per year)
- Optional target profit margin percentage

Here is their raw Lighthouse story (do NOT rewrite it, just use it as context):

"""${lighthouseStory}"""

Here is lightweight financial context from the app (may be approximate):

- Current average monthly revenue: $${averageMonthly.toLocaleString()}
- Current year-to-date revenue: $${Math.round(totalRevenue).toLocaleString()}

Return your answer as STRICT JSON with this exact shape and nothing else:

{
  "targetAnnualRevenue": 500000,
  "yearsToGoal": 3,
  "targetOwnerPay": 150000,
  "targetProfitMargin": 25,
  "explanation": "Short, friendly coaching explanation (3-6 sentences) that (1) echoes in plain language what they said they want, (2) calls out any assumptions you're making about their business model or industry and treats them as tentative, and (3) comments on whether this target feels conservative, solid, or very ambitious compared to their current revenue and timeline, ending with a simple coaching question inviting them to adjust or confirm the goal."
}

Rules:
- Always pick a positive targetAnnualRevenue in dollars.
- yearsToGoal must be an integer between 1 and 20.
- targetProfitMargin must be between 0 and 80 if you include it.
- If the story is vague, make a thoughtful assumption and explain it in the explanation field.
- In the explanation, briefly echo their Lighthouse story in plain language (for example: 'You said you want to grow to X with Y crews so you can have Z lifestyle.').
- If the story sounds more like a short-term project, tactic, or tool (for example 'add a membership by Q1 2026', 'buy a new truck', 'launch ads') rather than a long-term Lighthouse destination, say that explicitly. Explain that this sounds like a lever or project that can help them move toward a bigger Lighthouse, and briefly describe what that bigger Lighthouse might look like in terms of revenue, owner pay, and lifestyle over the next 3–10 years.
- If you infer a specific business model or industry from the story (for example, lawn care or landscaping), say so explicitly and treat it as a tentative assumption ('This sounds like you're aiming for a landscaping-style model; if that's not quite right they can adjust their story.').
- Compare targetAnnualRevenue and yearsToGoal to the approximate current annual revenue. Say whether the goal seems conservative, solid, or very ambitious. If the target is only a modest step up from current revenue, gently suggest a more ambitious but realistic range they could consider.
- Always end the explanation with a simple coaching question that asks whether this sounds like the right Lighthouse (versus just a near-term project) and invites them to reflect or adjust (for example: 'Does this feel like the right Lighthouse for you, or is it more of a near-term project on the way there?').
- Respond with JSON ONLY. Do not include any backticks, markdown, or commentary around the JSON.
`;

    try {
      const raw = await claudeService.chat(prompt, {
        userId: dbUserId,
        includeContext: true,
        contextDepth: 5,
        temperature: 0.4,
      });

      const suggestion = parseLighthousePlanSuggestion(raw);
      if (!suggestion) {
        setPlanFromStoryError('I had trouble turning that story into a clean plan. You can still set the numbers manually.');
        return;
      }

      if (suggestion.targetAnnualRevenue != null) {
        setTargetAnnualRevenue(String(Math.round(suggestion.targetAnnualRevenue)));
      }
      if (suggestion.yearsToGoal != null) {
        setYearsToGoal(String(suggestion.yearsToGoal));
      }
      if (suggestion.targetOwnerPay != null) {
        setTargetOwnerPay(String(Math.round(suggestion.targetOwnerPay)));
      }
      if (suggestion.targetProfitMargin != null) {
        setTargetProfitMargin(String(Math.round(suggestion.targetProfitMargin)));
      }
      if (suggestion.explanation) {
        setPlanFromStoryExplanation(suggestion.explanation);
      }
    } catch (err) {
      console.error('Error getting Lighthouse plan from story', err);
      setPlanFromStoryError('There was a problem asking the AI for a plan. Try again in a moment or set the numbers manually.');
    } finally {
      setPlanFromStoryLoading(false);
    }
  };

  const lighthouseProgressPercent =
    lighthousePlan && lighthousePlan.targetAnnualRevenue > 0
      ? Math.min(
          Math.round(
            (lighthousePlan.currentAnnualRevenue / lighthousePlan.targetAnnualRevenue) * 100
          ),
          100
        )
      : 0;

  type LighthouseStep = {
    yearLabel: string;
    targetRevenue: number;
    extraJobsPerMonth: number | null;
    targetCrews: number | null;
    progress: number;
  };

  const getLighthouseSteps = (): LighthouseStep[] => {
    if (!lighthousePlan || lighthousePlan.yearsToGoal <= 0) return [];

    const { currentAnnualRevenue, targetAnnualRevenue, yearsToGoal, targetYear } = lighthousePlan;

    if (!Number.isFinite(currentAnnualRevenue) || !Number.isFinite(targetAnnualRevenue)) {
      return [];
    }

    const steps: LighthouseStep[] = [];
    const totalDelta = targetAnnualRevenue - currentAnnualRevenue;
    const firstYear = targetYear - yearsToGoal + 1;
    const avgJobValueNum = Number(avgJobValue);
    const jobsPerCrewPerMonthNum = Number(jobsPerCrewPerMonth);
    const nowYear = new Date().getFullYear();

    const targets: number[] = [];

    if (yearsToGoal <= 1 || totalDelta === 0) {
      const stepAmount = yearsToGoal > 0 ? totalDelta / yearsToGoal : 0;
      for (let i = 1; i <= yearsToGoal; i++) {
        targets.push(currentAnnualRevenue + stepAmount * i);
      }
    } else {
      const n = yearsToGoal;
      const rampStrength = n >= 4 ? 0.5 : 0.3;
      const weights: number[] = [];
      let totalWeight = 0;

      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1);
        const weight = 1 + rampStrength * t;
        weights.push(weight);
        totalWeight += weight;
      }

      if (totalWeight <= 0) {
        const stepAmount = totalDelta / yearsToGoal;
        for (let i = 1; i <= yearsToGoal; i++) {
          targets.push(currentAnnualRevenue + stepAmount * i);
        }
      } else {
        const deltaPerWeight = totalDelta / totalWeight;
        let cumulativeWeight = 0;

        for (let i = 0; i < n; i++) {
          cumulativeWeight += weights[i];
          const targetForStep = currentAnnualRevenue + deltaPerWeight * cumulativeWeight;
          targets.push(targetForStep);
        }
      }
    }

    let prevRevenue = currentAnnualRevenue;

    for (let i = 0; i < targets.length; i++) {
      const year = firstYear + i;
      const targetForStep = targets[i];

      const deltaRevenue = targetForStep - prevRevenue;

      let extraJobsPerMonth: number | null = null;
      if (deltaRevenue > 0 && avgJobValueNum > 0) {
        const extraJobsYear = deltaRevenue / avgJobValueNum;
        extraJobsPerMonth = extraJobsYear / 12;
      }

      let targetCrews: number | null = null;
      if (targetForStep > 0 && avgJobValueNum > 0 && jobsPerCrewPerMonthNum > 0) {
        const jobsPerCrewPerYear = jobsPerCrewPerMonthNum * 12;
        const crewsNeeded = targetForStep / (avgJobValueNum * jobsPerCrewPerYear);
        if (crewsNeeded > 0) {
          targetCrews = Math.ceil(crewsNeeded);
        }
      }

      let progress = 0;
      if (year === nowYear && targetForStep > 0) {
        progress = Math.min(lighthousePlan.currentAnnualRevenue / targetForStep, 1);
      }

      steps.push({
        yearLabel: String(year),
        targetRevenue: targetForStep,
        extraJobsPerMonth,
        targetCrews,
        progress,
      });

      prevRevenue = targetForStep;
    }

    return steps;
  };

  const lighthouseSteps = getLighthouseSteps();

  const lighthouseStepsGridClass =
    lighthouseSteps.length === 1
      ? 'grid grid-cols-1 gap-6'
      : lighthouseSteps.length === 2
        ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
        : lighthouseSteps.length === 3
          ? 'grid grid-cols-1 md:grid-cols-3 gap-6'
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

  type ThemePhase = 'early' | 'growth' | 'freedom';

  type ThemeDefinition = {
    title: string;
    description: string;
  };

  type ThemeWithPhase = ThemeDefinition & {
    phaseLabel: string;
  };

  const earlyStageThemes: ThemeDefinition[] = [
    {
      title: 'Find the Lighthouse',
      description:
        'This year is about getting clear on what you really want your business and life to look like.',
    },
    {
      title: 'Learn the Waves',
      description:
        'This year is about learning when your busy and slow seasons hit so they do not surprise you anymore.',
    },
    {
      title: 'Steady the Boat',
      description:
        'This year is about making your months feel less up and down so money feels more steady.',
    },
    {
      title: 'Know Your Numbers',
      description:
        'This year is about knowing what you make, what you keep, and what has to change.',
    },
    {
      title: 'Fix the Leaks',
      description:
        'This year is about stopping money from slipping away on things that do not really help your business.',
    },
    {
      title: 'Fill the Calendar',
      description:
        'This year is about getting enough jobs each month so you do not feel scared when it gets quiet.',
    },
  ];

  const growthThemes: ThemeDefinition[] = [
    {
      title: 'Ride Bigger Waves',
      description:
        'This year is about growing your revenue on purpose, not by accident.',
    },
    {
      title: 'Make Each Job Worth More',
      description:
        'This year is about earning more from each visit, not just doing more visits.',
    },
    {
      title: 'Keep Good Customers Close',
      description:
        'This year is about getting happy customers to come back again and again.',
    },
    {
      title: 'Build a Strong Crew',
      description:
        'This year is about building a team you trust so you are not doing it all yourself.',
    },
    {
      title: 'Smooth the Seasons',
      description:
        'This year is about using slow months for smart offers so you do not feel dead in the winter or summer.',
    },
    {
      title: 'Follow the WAVE',
      description:
        'This year is about using what is happening, the gap, the next move, and simple action every month.',
    },
  ];

  const freedomThemes: ThemeDefinition[] = [
    {
      title: 'Work Less, Lead More',
      description:
        'This year is about you working fewer hours while your business still grows.',
    },
    {
      title: 'Buy Back Your Time',
      description:
        'This year is about creating room in your week so you are not working all day, every day.',
    },
    {
      title: 'Pay Yourself First',
      description:
        'This year is about making sure your business takes care of your family, not just your bills.',
    },
    {
      title: 'Protect the Lighthouse',
      description:
        'This year is about guarding what you have built so you do not slide backwards.',
    },
    {
      title: 'Live the Story You Wrote',
      description:
        'This year is about your business finally matching the Lighthouse story you wrote at the start.',
    },
  ];

  function getPhaseInfo(index: number, total: number): {
    phase: ThemePhase;
    indexWithinPhase: number;
  } {
    if (total <= 0) {
      return { phase: 'growth', indexWithinPhase: 0 };
    }

    let earlyCount = 1;
    let freedomCount = 1;

    if (total >= 4 && total <= 5) {
      earlyCount = 2;
      freedomCount = 1;
    } else if (total >= 6) {
      earlyCount = 2;
      freedomCount = 2;
    }

    if (index < earlyCount) {
      return { phase: 'early', indexWithinPhase: index };
    }

    if (index >= total - freedomCount) {
      const firstFreedomIndex = total - freedomCount;
      return { phase: 'freedom', indexWithinPhase: index - firstFreedomIndex };
    }

    const firstGrowthIndex = earlyCount;
    return { phase: 'growth', indexWithinPhase: index - firstGrowthIndex };
  }

  function getThemeForStep(index: number, total: number): ThemeWithPhase {
    const { phase, indexWithinPhase } = getPhaseInfo(index, total);

    let source: ThemeDefinition[];
    let phaseLabel: string;

    if (phase === 'early') {
      source = earlyStageThemes;
      phaseLabel = 'Early-stage theme';
    } else if (phase === 'freedom') {
      source = freedomThemes;
      phaseLabel = 'Freedom and owner-life theme';
    } else {
      source = growthThemes;
      phaseLabel = 'Growth theme';
    }

    const theme = source[indexWithinPhase % source.length];

    return {
      ...theme,
      phaseLabel,
    };
  }

  function getFocusForStep(
    step: LighthouseStep,
    index: number,
    steps: LighthouseStep[],
    plan: LighthousePlan | null,
    avgJobValueStr: string,
    jobsPerCrewPerMonthStr: string
  ): string | null {
    if (!plan || !Number.isFinite(plan.currentAnnualRevenue) || plan.currentAnnualRevenue <= 0) {
      return null;
    }

    const avgJobValueNum = Number(avgJobValueStr);
    const jobsPerCrewPerMonthNum = Number(jobsPerCrewPerMonthStr);
    const hasJobInputs = avgJobValueNum > 0 && jobsPerCrewPerMonthNum > 0;

    let estimatedCurrentCrews = 1;
    let jobsPerCrewPerYear = 0;

    if (hasJobInputs) {
      jobsPerCrewPerYear = jobsPerCrewPerMonthNum * 12;
      const revenuePerCrewPerYear = jobsPerCrewPerYear * avgJobValueNum;
      if (revenuePerCrewPerYear > 0) {
        estimatedCurrentCrews = Math.max(
          1,
          Math.round(plan.currentAnnualRevenue / revenuePerCrewPerYear)
        );
      }
    }

    const previousStep = index > 0 ? steps[index - 1] : null;
    const previousTargetRevenue =
      previousStep?.targetRevenue ?? plan.currentAnnualRevenue;

    const deltaRevenue = step.targetRevenue - previousTargetRevenue;
    const baseJobsPerMonth =
      hasJobInputs && estimatedCurrentCrews > 0
        ? jobsPerCrewPerMonthNum * estimatedCurrentCrews
        : 0;

    const addedCrews =
      step.targetCrews != null
        ? step.targetCrews - (previousStep?.targetCrews ?? estimatedCurrentCrews)
        : 0;

    if (addedCrews >= 1 && hasJobInputs) {
      const crewsForCalc = step.targetCrews ?? previousStep?.targetCrews ?? estimatedCurrentCrews;
      const jobsPerCrewPerYearForCalc = jobsPerCrewPerMonthNum * 12;
      const revenuePerCrewPerYear = jobsPerCrewPerYearForCalc * avgJobValueNum;
      const idealRevenueAtFull = crewsForCalc * revenuePerCrewPerYear;
      let utilizationPct = 0;
      if (idealRevenueAtFull > 0) {
        utilizationPct = Math.round((step.targetRevenue / idealRevenueAtFull) * 100);
      }
      if (utilizationPct > 100) {
        utilizationPct = 100;
      }
      if (utilizationPct < 30 && utilizationPct > 0) {
        utilizationPct = 30;
      }
      const crewWord = addedCrews > 1 ? 'crews' : 'crew';
      return `This year is about adding roughly ${addedCrews.toLocaleString()} new ${crewWord} and keeping them around ${utilizationPct}% full.`;
    }

    if (step.extraJobsPerMonth != null && step.extraJobsPerMonth > 0 && baseJobsPerMonth > 0) {
      const jobsIncreasePct = step.extraJobsPerMonth / baseJobsPerMonth;
      if (jobsIncreasePct >= 0.25 || step.extraJobsPerMonth >= 10) {
        return `This year is about filling the calendar with about ${Math.round(
          step.extraJobsPerMonth
        ).toLocaleString()} extra jobs each month.`;
      }
    }

    if (hasJobInputs && deltaRevenue > 0 && jobsPerCrewPerYear > 0) {
      const jobsPerYearAcrossCrews = jobsPerCrewPerYear * estimatedCurrentCrews;
      const requiredAvgJobValueIncrease =
        jobsPerYearAcrossCrews > 0 ? deltaRevenue / jobsPerYearAcrossCrews : 0;

      if (requiredAvgJobValueIncrease >= 5) {
        const increaseRounded = Math.round(requiredAvgJobValueIncrease);
        return `This year is about raising your average job value by about $${increaseRounded.toLocaleString()} so you can grow without overloading your calendar.`;
      }
    }

    const { phase } = getPhaseInfo(index, steps.length);
    if (phase === 'early') {
      return 'This year is about knowing your numbers and steadying the boat so money feels less up and down.';
    }
    if (phase === 'freedom') {
      return 'This year is about protecting your time and income as the business gets close to your Lighthouse.';
    }
    return 'This year is about growing revenue on purpose with simple, repeatable moves each month.';
  }

  // Get themes array for a given phase
  function getThemesForPhase(phase: ThemePhase): ThemeDefinition[] {
    if (phase === 'early') return earlyStageThemes;
    if (phase === 'freedom') return freedomThemes;
    return growthThemes;
  }

  // Initialize editable steps from calculated lighthouse steps
  function initializeEditableSteps(steps: LighthouseStep[], existingSteps?: EditableStep[]): EditableStep[] {
    return steps.map((step, index) => {
      const { indexWithinPhase } = getPhaseInfo(index, steps.length);
      // Preserve existing milestones if available
      const existingMilestones = existingSteps?.[index]?.milestones ?? [];
      return {
        yearLabel: step.yearLabel,
        targetRevenue: step.targetRevenue,
        themeIndex: indexWithinPhase,
        approved: false,
        milestones: existingMilestones,
      };
    });
  }

  // State for tracking which year cards have milestones expanded
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set());

  // Toggle milestone section expansion
  const toggleMilestoneExpansion = (index: number) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Add a new milestone to a step
  const addMilestone = (stepIndex: number) => {
    setEditableSteps((prev) => {
      const updated = [...prev];
      if (updated[stepIndex]) {
        const newMilestone: Milestone = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: '',
          completed: false,
        };
        updated[stepIndex] = {
          ...updated[stepIndex],
          milestones: [...updated[stepIndex].milestones, newMilestone],
        };
      }
      return updated;
    });
  };

  // Update a milestone's text
  const updateMilestoneText = (stepIndex: number, milestoneId: string, text: string) => {
    setEditableSteps((prev) => {
      const updated = [...prev];
      if (updated[stepIndex]) {
        updated[stepIndex] = {
          ...updated[stepIndex],
          milestones: updated[stepIndex].milestones.map((m) =>
            m.id === milestoneId ? { ...m, text } : m
          ),
        };
      }
      return updated;
    });
  };

  // Auto-save milestones to database
  const autoSaveMilestones = async () => {
    if (!dbUserId || editableSteps.length === 0) return;
    
    try {
      const stepsToSave: StepOverridePayload[] = editableSteps.map((step, index) => ({
        yearIndex: index,
        yearLabel: step.yearLabel,
        targetRevenue: step.targetRevenue,
        themeIndex: step.themeIndex,
        milestones: step.milestones,
        approved: step.approved,
      }));
      await saveStepOverrides(dbUserId, planStatus, stepsToSave);
      console.log('✅ Milestones auto-saved');
    } catch (err) {
      console.error('Error auto-saving milestones:', err);
    }
  };

  // Toggle a milestone's completed status (auto-saves)
  const toggleMilestoneCompleted = (stepIndex: number, milestoneId: string) => {
    setEditableSteps((prev) => {
      const updated = [...prev];
      if (updated[stepIndex]) {
        updated[stepIndex] = {
          ...updated[stepIndex],
          milestones: updated[stepIndex].milestones.map((m) =>
            m.id === milestoneId ? { ...m, completed: !m.completed } : m
          ),
        };
      }
      return updated;
    });
    // Auto-save after toggle
    setTimeout(() => autoSaveMilestones(), 100);
  };

  // Delete a milestone
  const deleteMilestone = (stepIndex: number, milestoneId: string) => {
    setEditableSteps((prev) => {
      const updated = [...prev];
      if (updated[stepIndex]) {
        updated[stepIndex] = {
          ...updated[stepIndex],
          milestones: updated[stepIndex].milestones.filter((m) => m.id !== milestoneId),
        };
      }
      return updated;
    });
  };

  // Initialize editableSteps only when lighthouseSteps length changes
  useEffect(() => {
    if (lighthouseSteps.length > 0 && editableSteps.length !== lighthouseSteps.length) {
      setEditableSteps(initializeEditableSteps(lighthouseSteps, editableSteps));
    }
  }, [lighthouseSteps.length, editableSteps]);

  // Start the review flow
  const handleStartReview = () => {
    if (lighthouseSteps.length === 0) return;
    
    // Initialize editable steps if not already done
    if (editableSteps.length !== lighthouseSteps.length) {
      setEditableSteps(initializeEditableSteps(lighthouseSteps, editableSteps));
    }
    
    setReviewStepIndex(0);
    setShowReviewModal(true);
  };

  // Save step overrides to the database
  const handleSaveStepOverrides = async (newStatus: PlanStatus) => {
    if (!dbUserId) return;
    
    try {
      const stepsToSave: StepOverridePayload[] = editableSteps.map((step, index) => ({
        yearIndex: index,
        yearLabel: step.yearLabel,
        targetRevenue: step.targetRevenue,
        themeIndex: step.themeIndex,
        milestones: step.milestones,
        approved: step.approved,
      }));
      
      await saveStepOverrides(dbUserId, newStatus, stepsToSave);
      console.log(`✅ Saved ${stepsToSave.length} step overrides with status: ${newStatus}`);
    } catch (err) {
      console.error('Error saving step overrides:', err);
    }
  };

  // Approve current step in review and move to next
  const handleApproveStep = async () => {
    setEditableSteps((prev) => {
      const updated = [...prev];
      if (updated[reviewStepIndex]) {
        updated[reviewStepIndex] = { ...updated[reviewStepIndex], approved: true };
      }
      return updated;
    });

    if (reviewStepIndex < lighthouseSteps.length - 1) {
      setReviewStepIndex((prev) => prev + 1);
    } else {
      // All steps reviewed - commit the plan and save to database
      setPlanStatus('committed');
      setShowReviewModal(false);
      
      // Save to database with committed status
      const finalSteps = editableSteps.map((step, index) => ({
        ...step,
        approved: index === reviewStepIndex ? true : step.approved,
      }));
      
      const stepsToSave: StepOverridePayload[] = finalSteps.map((step, index) => ({
        yearIndex: index,
        yearLabel: step.yearLabel,
        targetRevenue: step.targetRevenue,
        themeIndex: step.themeIndex,
        milestones: step.milestones,
        approved: step.approved,
      }));
      
      if (dbUserId) {
        try {
          await saveStepOverrides(dbUserId, 'committed', stepsToSave);
          console.log('✅ Plan committed and saved to database');
        } catch (err) {
          console.error('Error saving committed plan:', err);
        }
      }
    }
  };

  // Go back to previous step in review
  const handlePreviousStep = () => {
    if (reviewStepIndex > 0) {
      setReviewStepIndex((prev) => prev - 1);
    }
  };

  // Update a single editable step
  const handleUpdateEditableStep = (
    index: number,
    updates: Partial<Pick<EditableStep, 'targetRevenue' | 'themeIndex'>>
  ) => {
    setEditableSteps((prev) => {
      // If editableSteps is empty or doesn't have this index, initialize from lighthouseSteps
      let updated = [...prev];
      if (updated.length !== lighthouseSteps.length) {
        updated = initializeEditableSteps(lighthouseSteps, prev);
      }
      if (updated[index]) {
        updated[index] = { ...updated[index], ...updates };
      }
      return updated;
    });
  };

  // Get the effective theme for a step (from editableSteps if available, otherwise calculated)
  const getEffectiveTheme = (index: number): ThemeWithPhase => {
    const { phase, indexWithinPhase } = getPhaseInfo(index, lighthouseSteps.length);
    const themes = getThemesForPhase(phase);
    
    // Use custom theme index if available in editableSteps
    const editableStep = editableSteps[index];
    const themeIdx = editableStep?.themeIndex ?? indexWithinPhase;
    const theme = themes[themeIdx % themes.length];
    
    let phaseLabel = 'Growth theme';
    if (phase === 'early') phaseLabel = 'Early-stage theme';
    else if (phase === 'freedom') phaseLabel = 'Freedom and owner-life theme';
    
    return { ...theme, phaseLabel };
  };

  // Get effective target revenue (from editableSteps if available)
  const getEffectiveTargetRevenue = (index: number): number => {
    const editableStep = editableSteps[index];
    return editableStep?.targetRevenue ?? lighthouseSteps[index]?.targetRevenue ?? 0;
  };

  // Reset plan to draft mode
  const handleEditPlan = () => {
    setPlanStatus('draft');
    setEditableSteps((prev) => prev.map((s) => ({ ...s, approved: false })));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
            <Heart className="h-6 w-6 text-background" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Your Lighthouse Goal</h1>
        </div>
        <p className="text-xl text-muted max-w-3xl mx-auto">
          A Lighthouse shines a steady light so ships know where they are and where danger is. In Wave Rider, your Lighthouse Goal is the big future target you’re steering your business toward—like a clear revenue or life goal that doesn’t move, even when your numbers and seasons get choppy. Every plan, forecast, and action in Wave Rider is about helping you paddle toward that light, one small wave at a time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            <span>Your Lighthouse Story</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreround">
            In your own words, describe the Lighthouse you&#39;re steering toward. Don&#39;t worry about being perfect or concise here just get the picture out of your head and onto the page.
          </p>
          <textarea
            id="lighthouse-story"
            className="w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            placeholder="A Lighthouse goal example would be: I want to be at $1.5M gross revenue, taking home $250K, no longer working in the field but in the office working 3‑day weeks by 2028"
            value={lighthouseStory}
            onChange={(e) => {
              setLighthouseStory(e.target.value);
              setPlanFromStoryError(null);
              setPlanFromStoryExplanation(null);
            }}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <Button
              type="button"
              onClick={handlePlanFromStory}
              disabled={planFromStoryLoading || !lighthouseStory.trim()}
              className="flex items-center gap-2"
            >
              {planFromStoryLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>Help me turn this into a plan</span>
            </Button>
            <p className="text-xs text-muted">
              The AI coach will suggest rough numbers based on your story. You can always tweak them before saving.
            </p>
          </div>
          {planFromStoryError && (
            <p className="text-sm text-red-500">{planFromStoryError}</p>
          )}
          {planFromStoryExplanation && !planFromStoryError && (
            <p className="text-sm text-muted">{planFromStoryExplanation}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            <span>Lighthouse Goal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted">
            Now, let&#39;s translate that Lighthouse into a rough revenue plan. These are working numbers—we can refine them over time as your story and business evolve.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lighthouse-target-revenue">Target annual revenue</Label>
                <Input
                  id="lighthouse-target-revenue"
                  type="number"
                  min={0}
                  value={targetAnnualRevenue}
                  onChange={(e) => {
                    setTargetAnnualRevenue(e.target.value);
                    setLighthouseSaved(false);
                  }}
                  disabled={lighthouseLoading || lighthouseSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lighthouse-years">Years to reach this Lighthouse</Label>
                <Input
                  id="lighthouse-years"
                  type="number"
                  min={1}
                  value={yearsToGoal}
                  onChange={(e) => {
                    setYearsToGoal(e.target.value);
                    setLighthouseSaved(false);
                  }}
                  disabled={lighthouseLoading || lighthouseSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lighthouse-owner-pay">Target owner pay (optional)</Label>
                <Input
                  id="lighthouse-owner-pay"
                  type="number"
                  min={0}
                  value={targetOwnerPay}
                  onChange={(e) => {
                    setTargetOwnerPay(e.target.value);
                    setLighthouseSaved(false);
                  }}
                  disabled={lighthouseLoading || lighthouseSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lighthouse-margin">Target profit margin % (optional)</Label>
                <Input
                  id="lighthouse-margin"
                  type="number"
                  min={0}
                  max={100}
                  value={targetProfitMargin}
                  onChange={(e) => {
                    setTargetProfitMargin(e.target.value);
                    setLighthouseSaved(false);
                  }}
                  disabled={lighthouseLoading || lighthouseSaving}
                />
              </div>
              {lighthouseError && (
                <p className="text-sm text-red-500">{lighthouseError}</p>
              )}
              {lighthouseSaved && !lighthouseError && (
                <p className="text-sm text-green-500">Lighthouse goal saved.</p>
              )}
              <Button
                onClick={handleSaveLighthouse}
                disabled={lighthouseLoading || lighthouseSaving || !targetAnnualRevenue || !yearsToGoal}
                className="flex items-center gap-2"
              >
                {lighthouseSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save Lighthouse Goal</span>
              </Button>
            </div>
            <div className="space-y-3">
              {lighthouseLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <p className="text-sm text-muted">Loading your Lighthouse goal...</p>
                </div>
              ) : lighthousePlan ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    Based on your current results and Lighthouse target, here&#39;s the rough path the app will use when coaching you.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted">Current annual revenue (approx)</div>
                      <div className="text-lg font-semibold text-foreground">
                        ${Math.round(lighthousePlan.currentAnnualRevenue).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Lighthouse target</div>
                      <div className="text-lg font-semibold text-accent">
                        ${Math.round(lighthousePlan.targetAnnualRevenue).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Rough timeline</div>
                      <div className="text-sm font-medium text-foreground">
                        {new Date(lighthousePlan.targetYear, lighthousePlan.targetMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} ({lighthousePlan.yearsToGoal} year{lighthousePlan.yearsToGoal !== 1 ? 's' : ''} from now)
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Average lift needed</div>
                      <div className="text-sm font-medium text-foreground">
                        Roughly ${Math.round(lighthousePlan.requiredAnnualIncrease).toLocaleString()} / year
                        <br />
                        Roughly ${Math.round(lighthousePlan.requiredMonthlyIncrease).toLocaleString()} / month
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>Progress toward Lighthouse</span>
                      <span>{lighthouseProgressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${lighthouseProgressPercent}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted">
                    The AI coach will use this Lighthouse path together with your monthly FIR targets when it explains how to go from where you are now to where you want the business to be.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted">
                    You haven&#39;t set a Lighthouse goal yet. Once you save one, this panel will show how much additional revenue per year and per month you need on average to get there.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {lighthousePlan && (
        <Card className={`bg-background border ${planStatus === 'committed' ? 'border-green-500/50' : 'border-accent/50'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                <span>Path to Your Lighthouse</span>
              </CardTitle>
              {planStatus === 'committed' ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                    <Check className="h-3.5 w-3.5" />
                    Plan Committed
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditPlan}
                    className="text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit Plan
                  </Button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
                  Draft Plan
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-muted-foreground max-w-2xl">
              {planStatus === 'committed'
                ? 'This is your committed Lighthouse plan. The AI coach will use these targets to guide your monthly actions.'
                : 'Use simple assumptions to turn your Lighthouse into concrete yearly steps you can see and track in jobs and crews.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avg-job-value">Average revenue per job</Label>
                <Input
                  id="avg-job-value"
                  type="number"
                  min={0}
                  value={avgJobValue}
                  onChange={(e) => {
                    setAvgJobValue(e.target.value);
                    setLighthouseSaved(false);
                  }}
                  placeholder="For example: 250"
                  disabled={lighthouseLoading || lighthouseSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobs-per-crew">Jobs per crew per month</Label>
                <Input
                  id="jobs-per-crew"
                  type="number"
                  min={0}
                  value={jobsPerCrewPerMonth}
                  onChange={(e) => {
                    setJobsPerCrewPerMonth(e.target.value);
                    setLighthouseSaved(false);
                  }}
                  placeholder="For example: 160"
                  disabled={lighthouseLoading || lighthouseSaving}
                />
                <p className="text-[11px] text-muted-foreground">
                  Rough count of finished jobs one crew can handle in a typical month. Gut estimate is
                  fine.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="days-per-week">Typical working days per week</Label>
                <Input
                  id="days-per-week"
                  type="number"
                  min={0}
                  value={daysPerWeek}
                  onChange={(e) => {
                    setDaysPerWeek(e.target.value);
                    setLighthouseSaved(false);
                  }}
                  placeholder="For example: 4"
                  disabled={lighthouseLoading || lighthouseSaving}
                />
                <p className="text-[11px] text-muted-foreground">
                  How many days per week your crews are usually in the field doing jobs. If you have more
  than one crew, just use a typical average — this is about crews, not your office days.
                </p>
              </div>
            </div>

            <div className="flex justify-start">
              <Button
                onClick={handleSaveLighthouse}
                disabled={
                  lighthouseLoading ||
                  lighthouseSaving ||
                  !targetAnnualRevenue ||
                  !yearsToGoal
                }
                className="flex items-center gap-2"
              >
                {lighthouseSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save assumptions</span>
              </Button>
            </div>

            {lighthouseSteps.length > 0 ? (
              <div className={lighthouseStepsGridClass}>
                {lighthouseSteps.map((step, index) => {
                  const stepProgressPercent = Math.round(step.progress * 100);
                  // Use effective values that respect user edits
                  const theme = getEffectiveTheme(index);
                  const effectiveTargetRevenue = getEffectiveTargetRevenue(index);
                  const focusLine = getFocusForStep(
                    step,
                    index,
                    lighthouseSteps,
                    lighthousePlan,
                    avgJobValue,
                    jobsPerCrewPerMonth
                  );
                  const extraJobsPerWeek =
                    step.extraJobsPerMonth != null && step.extraJobsPerMonth > 0
                      ? step.extraJobsPerMonth / 4
                      : null;
                  const daysPerWeekNum = Number(daysPerWeek);
                  const extraJobsPerDay =
                    extraJobsPerWeek != null && daysPerWeekNum > 0
                      ? extraJobsPerWeek / daysPerWeekNum
                      : null;

                  return (
                    <div
                      key={step.yearLabel}
                      className="flex flex-col justify-between rounded-lg bg-muted/30 border border-accent/50 p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-accent/20">
                            <Activity className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Year</p>
                            <p className="text-2xl font-bold text-foreground">
                              {step.yearLabel}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {planStatus === 'draft' && (
                            <button
                              type="button"
                              onClick={() => {
                                // Initialize editable steps if not already done
                                if (editableSteps.length !== lighthouseSteps.length) {
                                  setEditableSteps(initializeEditableSteps(lighthouseSteps));
                                }
                                setEditingYearIndex(index);
                              }}
                              className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                              title="Edit this year"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          <div className="text-xs text-muted-foreground text-right">
                            {stepProgressPercent > 0
                              ? `${stepProgressPercent}% toward this target`
                              : 'Planned step'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{theme.title}</p>
                          <p className="text-xs text-muted-foreground">{theme.description}</p>
                        </div>

                        <div className="flex items-baseline justify-between pt-2">
                          <p className="text-sm text-muted-foreground">Target revenue</p>
                          <p className="text-2xl font-bold text-accent">
                            ${Math.round(effectiveTargetRevenue).toLocaleString()}
                          </p>
                        </div>
                        {step.extraJobsPerMonth != null && (
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm text-muted-foreground">Extra jobs / month</p>
                            <p className="text-base font-bold text-foreground">
                              ~{Math.round(step.extraJobsPerMonth).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {step.targetCrews != null && (
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm text-muted-foreground">Target crews</p>
                            <p className="text-base font-bold text-foreground">~{step.targetCrews}</p>
                          </div>
                        )}

                        {focusLine && (
                          <div className="pt-1 text-xs text-muted-foreground">{focusLine}</div>
                        )}

                        {step.extraJobsPerMonth != null && step.extraJobsPerMonth > 0 && (
                          <div className="pt-1 text-[11px] text-muted-foreground">
                            <span>
                              This roughly means about{' '}
                              {Math.round(step.extraJobsPerMonth).toLocaleString()} extra jobs per
                              month
                            </span>
                            {extraJobsPerWeek != null && (
                              <>
                                <span>
                                  {`, which is around ${Math.round(
                                    extraJobsPerWeek
                                  ).toLocaleString()} extra jobs per week`}
                                </span>
                                {extraJobsPerDay != null && daysPerWeekNum > 0 && (
                                  <span>
                                    {` (about ${Math.max(
                                      1,
                                      Math.round(extraJobsPerDay)
                                  ).toLocaleString()} extra jobs per crew workday if crews work about ${daysPerWeekNum.toLocaleString()} days per week)`}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>This year&apos;s step</span>
                          <span>{stepProgressPercent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted/50">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${stepProgressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Collapsible Milestones Section */}
                      <div className="border-t border-border/50 pt-3 mt-2">
                        <button
                          type="button"
                          onClick={() => toggleMilestoneExpansion(index)}
                          className="flex items-center justify-between w-full text-left group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              Milestones
                            </span>
                            {editableSteps[index]?.milestones?.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({editableSteps[index].milestones.filter(m => m.completed).length}/{editableSteps[index].milestones.length})
                              </span>
                            )}
                          </div>
                          {expandedMilestones.has(index) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          )}
                        </button>

                        {expandedMilestones.has(index) && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              What will you implement this year to move closer to your Lighthouse?
                            </p>
                            
                            {/* Existing milestones */}
                            {editableSteps[index]?.milestones?.map((milestone) => (
                              <div key={milestone.id} className="flex items-start gap-2 group">
                                <button
                                  type="button"
                                  onClick={() => toggleMilestoneCompleted(index, milestone.id)}
                                  className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors ${
                                    milestone.completed
                                      ? 'bg-accent border-accent'
                                      : 'border-accent/50 hover:border-accent'
                                  }`}
                                >
                                  {milestone.completed && (
                                    <Check className="h-3 w-3 text-background m-auto" />
                                  )}
                                </button>
                                <input
                                  type="text"
                                  value={milestone.text}
                                  onChange={(e) => updateMilestoneText(index, milestone.id, e.target.value)}
                                  placeholder="e.g., Launch bonus plan, New website..."
                                  className={`flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/50 ${
                                    milestone.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => deleteMilestone(index, milestone.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all"
                                  title="Delete milestone"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}

                            {/* Add milestone button - limit to 4 */}
                            {(editableSteps[index]?.milestones?.length ?? 0) < 4 && (
                              <button
                                type="button"
                                onClick={() => addMilestone(index)}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors mt-2"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add milestone</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add a couple of assumptions above to see how your Lighthouse breaks into yearly jobs and crew targets.
              </p>
            )}

            <p className="text-xs text-muted-foreground max-w-2xl pt-3 text-center mx-auto">
              This is a starting point or a guide to give you directions toward your Lighthouse goal, it&apos;s not a tattoo we&apos;re stuck with. If this year feels too early or too late for a big change like stepping out of the field, you can adjust your Lighthouse goal or the timeline as you go.
            </p>

            {/* Review & Commit Button */}
            {planStatus === 'draft' && lighthouseSteps.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleStartReview}
                  className="flex items-center gap-2 bg-accent hover:bg-accent/90"
                >
                  <Check className="h-4 w-4" />
                  <span>Review &amp; Commit This Plan</span>
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Review Plan Modal - Step-through guided review */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Review Your Lighthouse Plan
            </DialogTitle>
            <DialogDescription>
              Step {reviewStepIndex + 1} of {lighthouseSteps.length} — Review each year and make adjustments if needed.
            </DialogDescription>
          </DialogHeader>

          {lighthouseSteps[reviewStepIndex] && (
            <div className="space-y-4 py-4">
              {/* Year Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <Activity className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year</p>
                    <p className="text-2xl font-bold text-foreground">
                      {lighthouseSteps[reviewStepIndex].yearLabel}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Target Revenue</p>
                  <p className="text-xl font-bold text-accent">
                    ${Math.round(getEffectiveTargetRevenue(reviewStepIndex)).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Theme */}
              <div className="p-4 rounded-lg bg-muted/30 border border-accent/30">
                <p className="text-sm font-semibold text-foreground">
                  {getEffectiveTheme(reviewStepIndex).title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getEffectiveTheme(reviewStepIndex).description}
                </p>
              </div>

              {/* Focus Line */}
              {(() => {
                const focusLine = getFocusForStep(
                  lighthouseSteps[reviewStepIndex],
                  reviewStepIndex,
                  lighthouseSteps,
                  lighthousePlan,
                  avgJobValue,
                  jobsPerCrewPerMonth
                );
                return focusLine ? (
                  <p className="text-sm text-muted-foreground italic">{focusLine}</p>
                ) : null;
              })()}

              {/* Question */}
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-sm text-foreground">
                  Does this feel right for {lighthouseSteps[reviewStepIndex].yearLabel}?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can click the edit icon on any year card to adjust the target or theme before committing.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousStep}
                disabled={reviewStepIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveStep}
                className="bg-accent hover:bg-accent/90"
              >
                {reviewStepIndex < lighthouseSteps.length - 1 ? (
                  <>
                    Looks Good
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Commit Plan
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Year Modal */}
      <Dialog open={editingYearIndex !== null} onOpenChange={(open) => !open && setEditingYearIndex(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-accent" />
              Edit Year {editingYearIndex !== null && lighthouseSteps[editingYearIndex]?.yearLabel}
            </DialogTitle>
            <DialogDescription>
              Adjust the target revenue or choose a different theme for this year.
            </DialogDescription>
          </DialogHeader>

          {editingYearIndex !== null && lighthouseSteps[editingYearIndex] && (
            <div className="space-y-4 py-4">
              {/* Target Revenue Input */}
              <div className="space-y-2">
                <Label htmlFor="edit-target-revenue">Target Revenue</Label>
                <Input
                  id="edit-target-revenue"
                  type="text"
                  inputMode="numeric"
                  value={Math.round(editableSteps[editingYearIndex]?.targetRevenue ?? lighthouseSteps[editingYearIndex].targetRevenue).toString()}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^0-9]/g, '');
                    const numValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
                    handleUpdateEditableStep(editingYearIndex, { targetRevenue: numValue });
                  }}
                />
              </div>

              {/* Theme Selection */}
              <div className="space-y-2">
                <Label>Theme for this year</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(() => {
                    const { phase } = getPhaseInfo(editingYearIndex, lighthouseSteps.length);
                    const themes = getThemesForPhase(phase);
                    const currentThemeIndex = editableSteps[editingYearIndex]?.themeIndex ?? 0;
                    
                    return themes.map((theme, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUpdateEditableStep(editingYearIndex, { themeIndex: idx })}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          idx === currentThemeIndex
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50 hover:bg-muted/30'
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">{theme.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingYearIndex(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setEditingYearIndex(null)}
              className="bg-accent hover:bg-accent/90"
            >
              <Check className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}