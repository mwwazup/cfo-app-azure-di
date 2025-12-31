import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useRevenue } from '../../contexts/revenue-context';
import { DollarSign, HelpCircle } from 'lucide-react';

const toNumber = (value: string): number => {
  const cleaned = value.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number): string => {
  if (!Number.isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
};

interface CalculationResult {
  monthlyCost: number;
  marginPercent: number;
  requiredRevenue: number;
  extraJobs?: number;
}

const calculateImpact = (
  rawCost: string,
  period: 'monthly' | 'annual',
  rawMarginPercent: string,
  rawAverageJob: string
): CalculationResult | null => {
  const cost = toNumber(rawCost);
  const marginPercent = toNumber(rawMarginPercent);
  const averageJob = toNumber(rawAverageJob);

  if (cost <= 0 || marginPercent <= 0) {
    return null;
  }

  const monthlyCost = period === 'annual' ? cost / 12 : cost;
  const margin = marginPercent / 100;

  const requiredRevenue = monthlyCost / margin;

  let extraJobs: number | undefined;
  if (averageJob > 0) {
    extraJobs = requiredRevenue / averageJob;
  }

  return {
    monthlyCost,
    marginPercent,
    requiredRevenue,
    extraJobs,
  };
};

const ProfitImpactPage: React.FC = () => {
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [marginPercent, setMarginPercent] = useState('');
  const [averageJob, setAverageJob] = useState('');
  const [marginAutoFilled, setMarginAutoFilled] = useState(false);

  const { currentYear } = useRevenue();

  const profitMarginFromPlan = currentYear?.profitMargin ?? 0;

  const result = useMemo(
    () => calculateImpact(cost, period, marginPercent, averageJob),
    [cost, period, marginPercent, averageJob]
  );

  useEffect(() => {
    if (!marginPercent && profitMarginFromPlan > 0) {
      setMarginPercent(profitMarginFromPlan.toString());
      setMarginAutoFilled(true);
    }
  }, [marginPercent, profitMarginFromPlan]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profit Impact Calculator</h1>
          <p className="text-muted">You want to know where the money went? A new purchase has to be paid somehow and it comes from the profit of the company. This calculator helps you see how a new purchase changes your profit and how many extra jobs you might need to keep your current profit level. The question is not only "Can you afford it?" The real question is, "How are you going to pay for it?"</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-accent" />
              Set up your decision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="description">What are you thinking about buying?</Label>
              <Input
                id="description"
                placeholder="New work truck, ad campaign, software, equipment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[2fr,1fr] items-end">
              <div className="space-y-1.5">
                <Label htmlFor="cost">Cost of this purchase</Label>
                <Input
                  id="cost"
                  inputMode="decimal"
                  placeholder="$1,200"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="period">How often?</Label>
                <Select value={period} onValueChange={(value) => setPeriod(value as 'monthly' | 'annual')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Per month</SelectItem>
                    <SelectItem value="annual">Per year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="margin">Your current profit margin (%)</Label>
              <Input
                id="margin"
                inputMode="decimal"
                placeholder="For example: 20"
                value={marginPercent}
                onChange={(e) => setMarginPercent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This is how much of every dollar you keep as profit. For example, 20% means you keep 20 cents
                out of every dollar of revenue.
              </p>
              {marginAutoFilled && (
                <p className="text-xs text-muted-foreground">
                  Based on your recent numbers. Feel free to adjust.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="average-job">Average revenue per job (optional)</Label>
              <Input
                id="average-job"
                inputMode="decimal"
                placeholder="You can leave this blank"
                value={averageJob}
                onChange={(e) => setAverageJob(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If you know this number, we&apos;ll also show about how many extra jobs you might need. If you
                are not sure, you can leave it blank.
              </p>
            </div>

            {result && (
              <div className="mt-4 rounded-lg border border-border bg-background/40 p-4 space-y-3">
                <p className="text-base md:text-lg text-foreground font-medium">
                  To keep your current profit level, this purchase would require your business to bring in about{' '}
                  <span className="font-semibold text-xl md:text-2xl">
                    {' '}
                    {formatCurrency(result.requiredRevenue)} per month
                  </span>{' '}
                  in extra revenue.
                </p>
                {typeof result.extraJobs === 'number' && result.extraJobs > 0 && (
                  <p className="text-base md:text-lg text-foreground">
                    If your average job is around{' '}
                    <span className="font-semibold">{formatCurrency(toNumber(averageJob))}</span>, that is
                    roughly{' '}
                    <span className="font-semibold text-xl md:text-2xl">{Math.ceil(result.extraJobs)}</span>{' '}
                    extra jobs each month{' '}
                    just to keep the same profit percent you have now.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-accent" />
              Where did the money go?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p>
              Every month, your business brings in money from jobs and pays money out for supplies, wages,
              overhead, and owner pay. Whatever is left over is your profit.
            </p>
            <p>
              When you add a new payment like a truck, a loan, or a software bill, that money has to come from
              somewhere. If your profit percent is around 20%, it means you keep about 20 cents out of every
              dollar of revenue.
            </p>
            <p>
              At that level, every $1 of new monthly cost really needs about $5 of new revenue just to keep the
              same profit percent. If the new truck or ad campaign does not bring in that extra work, the
              payment is coming out of your profit. The truck may be nice, but it is now being paid for with
              money you used to keep.
            </p>
            <p>
              This page helps you see that trade: how much new revenue, and roughly how many extra jobs, it
              may take to pay for a new choice while keeping the profit level you already worked hard to
              build.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitImpactPage;
