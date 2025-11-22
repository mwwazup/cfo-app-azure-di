import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { TrendingUp, Target } from 'lucide-react';

import Navbar from '../navigation/navbar';
import Footer from './footer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CurrencyInput } from '../ui/currency-input';
import { Input } from '../ui/input';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const DEMO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SEASONAL_PRESET = [35000, 40000, 45000, 52000, 58000, 62000, 68000, 72000, 56000, 52000, 46000, 42000];

function LandingRevenueDemo() {
  const [annualTarget, setAnnualTarget] = useState<number>(600000);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>(SEASONAL_PRESET);

  const totalActual = useMemo(
    () => monthlyRevenue.reduce((sum, value) => sum + value, 0),
    [monthlyRevenue]
  );

  const firTargets = useMemo(() => {
    if (!annualTarget || totalActual <= 0) {
      const even = Math.round((annualTarget || 0) / 12);
      return Array(12).fill(even);
    }

    return monthlyRevenue.map((value) => {
      const weight = value / totalActual;
      return Math.round(annualTarget * weight);
    });
  }, [annualTarget, monthlyRevenue, totalActual]);

  const handleMonthlyChange = (index: number, value: number) => {
    setMonthlyRevenue((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const chartData = {
    labels: DEMO_MONTHS,
    datasets: [
      {
        label: 'Actual Revenue',
        data: monthlyRevenue,
        borderColor: 'rgba(0, 123, 255, 1)',
        backgroundColor: 'rgba(0, 123, 255, 0.2)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        pointBorderWidth: 0,
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
      },
      {
        label: 'Future Inspired Revenue',
        data: firTargets,
        borderColor: 'rgba(208, 180, 106, 1)',
        backgroundColor: 'rgba(208, 180, 106, 0.2)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        pointBorderWidth: 0,
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#e5e7eb',
        },
      },
      datalabels: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#e5e7eb' },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.1)' },
        ticks: {
          color: '#e5e7eb',
          callback: (tickValue: string | number) => {
            const numeric = typeof tickValue === 'number' ? tickValue : Number(tickValue);
            return `$${Math.round(numeric).toLocaleString()}`;
          },
        },
      },
    },
  } as const;

  return (
    <Card className="bg-background border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <TrendingUp className="h-5 w-5 text-accent" />
          Test Your Revenue Curve
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-64 md:h-72">
          <Line data={chartData} options={chartOptions} />
        </div>

        <div>
          <p className="text-sm text-muted mb-2">
            Monthly demo inputs (edit any month to see the curve respond in real time):
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {DEMO_MONTHS.map((month, index) => (
              <div key={month} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{month}</p>
                <Input
                  type="number"
                  value={monthlyRevenue[index]}
                  onChange={(e) => handleMonthlyChange(index, Number(e.target.value) || 0)}
                  className="bg-input border-border text-foreground text-sm"
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Demo total: <span className="font-semibold text-foreground">${totalActual.toLocaleString()}</span> for
            the year. In the full app, this curve connects to your real revenue, FIR targets, and KPIs.
          </p>
        </div>

        <div className="space-y-4">
          <CurrencyInput
            label="Annual Target (demo only)"
            value={annualTarget}
            onChange={setAnnualTarget}
          />
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted flex items-start gap-2">
            <Target className="mt-0.5 h-4 w-4 text-accent" />
            <div>
              <p className="text-foreground font-medium mb-1">
                This is a safe demo
              </p>
              <p>
                The blue line is your sample year. The gold line is your target curve—same shape, scaled
                to your annual goal. Type numbers into the months or your target to feel how a small change can reshape
                your year—no login, no data required.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HeroSection() {
  return (
    <div className="min-h-screen flex flex-col bg-card">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-20 lg:py-32 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="flex flex-col gap-4">
                <p className="text-xl text-accent uppercase tracking-[0.2em]">WAVE RIDER</p>
                <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter text-foreground">
                  Your Business Isn't Seasonal—Your Strategy Is
                </h1>
                <p className="text-lg md:text-xl text-muted max-w-[600px]">
                  Imagine you're sitting on your board, toes in the water, watching the next set roll in. Your
                  business is already in the ocean—Wave Rider helps you choose the wave on purpose instead of
                  getting thrown by it.
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted max-w-[600px]">
                  <li>See your entire year on one curve instead of guessing from month to month.</li>
                  <li>Spot the silent slow seasons before they hit your cash and confidence.</li>
                  <li>Turn a tired "get by" business into a Big Fig Biz that actually feels like winning.</li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <a
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-md bg-accent text-background px-6 py-3 text-lg font-semibold hover:bg-accent/90 transition-colors duration-200"
                  >
                    Claim One of 5 Beta Spots
                    <span className="ml-2">&rarr;</span>
                  </a>
                  <a
                    href="#demo"
                    className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-lg text-foreground hover:bg-card transition-colors duration-200"
                  >
                    Play With the Revenue Curve
                  </a>
                </div>
                <p className="mt-2 text-xs text-muted uppercase tracking-[0.2em]">
                  CARPE MAÑANA · SEIZE TOMORROW BY WHAT YOU CHOOSE TODAY
                </p>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#9EC6C1] via-[#A69678] to-card opacity-90 border border-accent/30" />
              </div>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto grid gap-10 lg:grid-cols-[2fr,1fr] items-start">
            <div className="space-y-5 max-w-2xl">
              <h2 className="text-3xl font-bold text-foreground">
                From Drifting to Deliberate: The Moment You Decide to Stand Up
              </h2>
              <p className="text-base md:text-lg text-muted">
                For too long you've been riding the waves of your industry, bobbing up and down with every busy
                season, every slow spell, every surprise bill. You started this with fire in your belly and stars
                in your eyes—but somewhere along the way the grind, the firefighting, and the endless to-do list
                dimmed that flame.
              </p>
              <p className="text-base md:text-lg text-muted">
                The truth? That fire isn't gone. It's smoldering under the surface, waiting for someone to paddle
                up beside you, tap you on the shoulder and say, "The wave's coming in. You're up next." Wave Rider
                is that tap: a quiet but firm invitation to stop drifting and start steering.
              </p>
              <p className="text-base md:text-lg text-muted">
                Your current trajectory is the sum of past choices. Your next curve—the one where your business
                grows, your home life breathes, and your future self is grateful—will be decided by what you do
                with the wave in front of you right now.
              </p>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-accent/40 bg-background/80 p-5 shadow-sm">
                <p className="text-xs font-semibold text-accent tracking-[0.2em] mb-2">
                  THE THREE MOMENTS ON EVERY OWNER'S WAVE
                </p>
                <ol className="space-y-3 text-sm text-muted">
                  <li>
                    <span className="font-semibold text-foreground">Drifting ·</span> Floating just off the
                    break, hoping this year will be different but using the same habits and guesses as last year.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">Deciding ·</span> Realizing "business as
                    usual" leads to quiet regret—the ache of knowing you aimed lower than you could have.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">Riding ·</span> Choosing a deliberate
                    strategy, seeing your numbers clearly, and finally feeling like you're surfing the curve
                    instead of being dragged by it.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Coaching vs Dashboard Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto grid gap-10 lg:grid-cols-2 items-start">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                More Than a Dashboard. A Coach That Only Knows Your Business.
              </h2>
              <p className="text-base md:text-lg text-muted">
                Every business needs a coach. But human coaches are human—they sleep, they forget details, and they
                often run the same playbook for every business in the room. Wave Rider is different. It knows one
                business only: yours.
              </p>
              <p className="text-base md:text-lg text-muted">
                When you can't sleep at 2am and need clarity, Wave Rider is there. When a coach says "business is
                business," you're thinking, "But my business is different." Wave Rider agrees—and it proves it in
                the numbers it shows you.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-background border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Human Coach</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted">
                  <p>Brings wisdom, experience, and accountability.</p>
                  <p>Can't be available every moment you feel the pressure.</p>
                  <p>Can't remember every detail from every session for every client.</p>
                  <p>Often runs group programs that stay general, not deeply specific.</p>
                </CardContent>
              </Card>
              <Card className="bg-background border-accent/40">
                <CardHeader>
                  <CardTitle className="text-sm text-accent">Wave Rider Coach</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted">
                  <p>Only knows your business—your numbers, your patterns, your curve.</p>
                  <p>Never forgets where you left off or what you said last month.</p>
                  <p>Is there when you're worried, curious, or stuck—any time of day.</p>
                  <p>Pairs with your human coach so conversations are grounded in real data.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* WAVE Framework Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-4">The WAVE Framework</h2>
              <p className="text-base md:text-lg text-muted">
                When you open Wave Rider, you're not staring at random KPIs. You're walking through a simple loop
                built to answer one question: "What do I do next to win?"
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[ 
                {
                  title: 'W · What\'s happening?',
                  desc: 'See your actual revenue curve, slow months, spikes, and trends at a glance—no more guessing from memory.',
                },
                {
                  title: 'A · Analyze the GAP',
                  desc: 'Measure the distance between where you are and where you said you\'d be so you can face the truth without shame.',
                },
                {
                  title: 'V · Visualize the Move',
                  desc: 'Imagine new curves and see how decisions today ripple through the rest of your year before you commit.',
                },
                {
                  title: 'E · Execute',
                  desc: 'Turn insights into simple, focused plays for the next 30–90 days so you move from drift to deliberate action.',
                },
              ].map(({ title, desc }) => (
                <div
                  key={title}
                  className="bg-[#fffaf4] rounded-lg p-6 shadow-sm border border-accent hover:shadow-md transition-shadow duration-200"
                >
                  <h3 className="text-xl font-bold mb-3 text-accent">{title}</h3>
                  <p className="text-sm text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Demo Section */}
        <section id="demo" className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto grid gap-10 lg:grid-cols-[1.4fr,1fr] items-start">
            <LandingRevenueDemo />
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                Use the Curve Before You Ever Log In
              </h2>
              <p className="text-base md:text-lg text-muted">
                This little demo is a glimpse of the Master Revenue Curve that powers Wave Rider. Type a few
                sample months, nudge your target, and watch the wave shift. You\'ll feel how small choices today
                change the story of your year.
              </p>
              <ul className="space-y-2 text-sm text-muted">
                <li>Play with a full 12-month curve without connecting any bank accounts or systems.</li>
                <li>See the gap between your current line and where you say you want to be.</li>
                <li>Imagine what it would feel like if this curve was built on your real numbers every day.</li>
              </ul>
              <p className="text-xs text-muted">
                In the live app, this curve is connected to your Supabase-backed revenue data, FIR targets, LER, and
                KPIs. Here, it\'s just a safe sandbox so you can feel the difference between drifting and deciding.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Boxes Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-4">Inside Your Big Fig Biz Dashboard</h2>
              <p className="text-base md:text-lg text-muted">
                Wave Rider isn\'t a toy. It\'s a full system that turns your numbers into decisions you can actually
                act on.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[ 
                {
                  title: 'Master Revenue Curve',
                  desc: 'See your entire year on one screen. Spot seasonality, weak spots, and peak months with a single glance.',
                },
                {
                  title: 'Service Mix & Employee LER',
                  desc: 'Understand which services and which people create real profit—not just busy days.',
                },
                {
                  title: 'Budget vs Actual',
                  desc: 'Track weekly and monthly performance against the plan so surprises stop blindsiding you.',
                },
                {
                  title: 'PERL Coach (AI CFO)',
                  desc: 'Ask honest questions about your numbers and get context-aware answers grounded in your actual data.',
                },
              ].map(({ title, desc }) => (
                <Card key={title} className="bg-background border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Objections Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-4">If You\'re Wondering If This Is Really For You…</h2>
              <p className="text-base md:text-lg text-muted">
                Let\'s be honest about the questions already rolling around in your head. You\'re not alone—and we
                built Wave Rider with those exact hesitations in mind.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[ 
                {
                  q: 'Is this really for my business?',
                  a: 'Wave Rider is built for owner-led service and trades businesses—where seasonality, labor, and cash flow collide. The curves, KPIs, and coaching are tuned to the realities of technicians-turned-owners, not Fortune 500 finance teams.',
                },
                {
                  q: 'I\'m not a numbers person. Will this overwhelm me?',
                  a: 'You don\'t need to be an accountant to use Wave Rider. We do the math under the surface and surface stories, colors, and simple next steps so you can make decisions without a spreadsheet headache.',
                },
                {
                  q: 'How is this different from a human coach?',
                  a: 'A human coach brings wisdom, perspective, and accountability. Wave Rider remembers every number, every curve, and every pattern—and it\'s available when your coach isn\'t. Together, they become a powerful combination instead of a replacement.',
                },
                {
                  q: 'What if my business is unique?',
                  a: 'Every owner says, "My business is different." Wave Rider agrees—and proves it by building your curves and KPIs from your actual data instead of generic industry averages or canned workshop slides.',
                },
                {
                  q: 'What if I don\'t know my numbers?',
                  a: 'You\'re exactly who we built this for. Wave Rider gives you a simple place to start, then helps you clean up and layer in more detail over time. You don\'t have to be perfect on day one to start riding the wave.',
                },
                {
                  q: 'Do I need to fire my current coach or mastermind?',
                  a: 'No. Wave Rider makes those conversations sharper. Instead of vague goals and generic advice, you bring clear curves, gaps, and trends into every session so you both know exactly what\'s real.',
                },
              ].map(({ q, a }) => (
                <Card key={q} className="bg-background border-border">
                  <CardHeader>
                    <CardTitle className="text-base text-foreground">{q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted">{a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Beta Strip */}
        <section className="py-8 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="rounded-2xl border border-accent/40 bg-accent/10 px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-accent tracking-[0.2em] mb-1">PRIVATE BETA · 5 FOUNDING SPOTS</p>
                <p className="text-sm md:text-base text-foreground">
                  We\'re stress-testing Wave Rider on real businesses while running on limited free tiers for third-party
                  services. The first 5 owners in lock in special beta pricing and direct influence on what we build
                  next.
                </p>
              </div>
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-accent text-background px-5 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors duration-200"
              >
                Claim One of 5 Beta Spots
              </a>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
              <p className="text-base md:text-lg text-muted">
                Still wondering if this is the right wave to catch? Here are a few more answers before you decide.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {[ 
                {
                  q: 'Do I need a bookkeeper or accountant first?',
                  a: 'No. Wave Rider can sit alongside whatever books you have today. As your financials mature, the curves and KPIs simply become more accurate and more powerful.',
                },
                {
                  q: 'What happens if I cancel?',
                  a: 'You keep your exported reports and insights, but you lose live access to the interactive curves, KPIs, and coaching. There are no long-term contracts—if we stop creating value, you can step off the wave.',
                },
                {
                  q: 'Will this work if I\'m not "big" yet?',
                  a: 'Yes. In fact, the earlier you build a rhythm of looking at your numbers, the easier it is to grow into a Big Fig Biz without burning out.',
                },
                {
                  q: 'Can I invite my spouse, partner, or team to view the dashboard?',
                  a: 'Wave Rider is being built with multi-user access in mind so the people who share the weight with you can also see the truth of the numbers—without needing to touch your accounting software.',
                },
              ].map(({ q, a }) => (
                <Card key={q} className="bg-background border-border">
                  <CardHeader>
                    <CardTitle className="text-base text-foreground">{q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted">{a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-4xl font-bold text-foreground">The Tide Is Changing. Your Move.</h2>
              <p className="text-lg md:text-xl text-muted">
                You can watch from the shore while others ride the wave in front of you—or you can stand up on your
                board, fall into the wave, and choose a future you won\'t regret. Carpe Mañana.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-md bg-accent text-background px-6 py-3 text-lg font-semibold hover:bg-accent/90 transition-colors duration-200"
                >
                  Claim One of 5 Beta Spots
                  <span className="ml-2">&rarr;</span>
                </a>
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-lg text-foreground hover:bg-card transition-colors duration-200"
                >
                  Try the Revenue Curve Demo
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}