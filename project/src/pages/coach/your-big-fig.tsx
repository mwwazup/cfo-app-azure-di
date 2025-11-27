import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useRevenue } from '../../contexts/revenue-context';
import { useAuthContext } from '../../contexts/auth-context';
import { getLighthouseGoal, getLighthousePlan, upsertLighthouseGoal, LighthouseGoal, LighthousePlan } from '../../services/bigFigGoalService';
import { claudeService } from '../../services/claudeService';

import {
  Heart,
  Target,
  Lightbulb,
  Save,
  Sparkles,
  Activity,
  Loader2,
} from 'lucide-react';

type LighthousePlanSuggestion = {
  targetAnnualRevenue?: number;
  yearsToGoal?: number;
  targetOwnerPay?: number | null;
  targetProfitMargin?: number | null;
  explanation?: string;
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
    const stepAmount = (targetAnnualRevenue - currentAnnualRevenue) / yearsToGoal;
    const firstYear = targetYear - yearsToGoal + 1;
    const avgJobValueNum = Number(avgJobValue);
    const jobsPerCrewPerMonthNum = Number(jobsPerCrewPerMonth);
    const nowYear = new Date().getFullYear();

    for (let i = 1; i <= yearsToGoal; i++) {
      const year = firstYear + i - 1;
      const targetForStep = currentAnnualRevenue + stepAmount * i;
      const prevRevenue =
        i === 1 ? currentAnnualRevenue : currentAnnualRevenue + stepAmount * (i - 1);

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
                        ~${Math.round(lighthousePlan.requiredAnnualIncrease).toLocaleString()} / year
                        <br />
                        (~${Math.round(lighthousePlan.requiredMonthlyIncrease).toLocaleString()} / month)
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
        <Card className="bg-muted/30 border border-accent/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              <span>Path to Your Lighthouse</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-muted-foreground max-w-2xl">
              Use simple assumptions to turn your Lighthouse into concrete yearly steps you can see and track in jobs and crews.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {lighthouseSteps.map((step) => {
                  const stepProgressPercent = Math.round(step.progress * 100);
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
                        <div className="text-xs text-muted-foreground text-right">
                          {stepProgressPercent > 0
                            ? `${stepProgressPercent}% of this step`
                            : 'Not started yet'}
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-baseline justify-between">
                          <p className="text-sm text-muted-foreground">Target revenue</p>
                          <p className="text-2xl font-bold text-accent">
                            ${Math.round(step.targetRevenue).toLocaleString()}
                          </p>
                        </div>
                        {step.extraJobsPerMonth != null && (
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm text-muted-foreground">Extra jobs / month</p>
                            <p className="text-base font-bold text-foreground">
                              ≈ {Math.round(step.extraJobsPerMonth).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {step.targetCrews != null && (
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm text-muted-foreground">Target crews</p>
                            <p className="text-base font-bold text-foreground">
                              ≈ {step.targetCrews}
                            </p>
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add a couple of assumptions above to see how your Lighthouse breaks into yearly jobs and crew targets.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}