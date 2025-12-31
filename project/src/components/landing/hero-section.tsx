import { useMemo, useState } from 'react';
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
import { TrendingUp, Target, ChevronDown } from 'lucide-react';

import Navbar from '../navigation/navbar';
import Footer from './footer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CurrencyInput } from '../ui/currency-input';
import { Input } from '../ui/input';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const DEMO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SEASONAL_PRESET = [27000, 32500, 45000, 52000, 58000, 62000, 68000, 72000, 56000, 52000, 36500, 26200];

function LandingRevenueDemo() {
  const [annualTarget, setAnnualTarget] = useState<number>(680000);
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
            the year. In the full app, this curve connects to your real revenue, Future Inspired Revenue targets, and KPIs.
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How is this different from QuickBooks or my bookkeeping software?',
      answer:
        "I had QuickBooks too. It told me what happened last month. Wave Rider tells me what's going to happen next month. Think of it like this: your bookkeeper gives you the score after the game. I built Wave Rider to be your coach while you're still on the field.",
    },
    {
      question: "I'm not a numbers person. Is this going to be over my head?",
      answer:
        "I wasn't a numbers person either. That's why I built this. Wave Rider talks to you in plain English, not accounting jargon. Instead of 'EBITDA' you get 'Here's why you ran out of money in March' and 'Here's what to set aside for winter.'",
    },
    {
      question: 'How much time does this take?',
      answer:
        'I built this because I didn\'t have time for complex systems. About 10 minutes a week. Wave Rider does the heavy lifting—analyzing your data, spotting patterns, and giving you specific next steps. You just show up for a quick conversation, like grabbing coffee with someone who actually gets your business.',
    },
    {
      question: 'Will this work for my type of business?',
      answer:
        "I built this for my seasonal service business. If you run a service business where cash flow swings wildly (window cleaning, pressure washing, landscaping, etc.) and you're tired of being 'slow in winter,' this was built for you. I understand your business model because I lived it.",
    },
    {
      question: "What if I don't have my financial data organized yet?",
      answer:
        "I started with a messy bank account and a shoebox full of receipts. Wave Rider can work with whatever you've got. The AI helps you make sense of your numbers from day one, and guides you toward better tracking as you go. You don't need perfect books to start.",
    },
    {
      question: 'Is my financial data secure?',
      answer:
        'Absolutely. I use bank-level encryption and never sell your data. Your financial information stays private and is only used to give you personalized coaching. I built this for my own business first—security was non-negotiable.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen flex flex-col bg-card">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-20 lg:py-32 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="flex flex-col gap-4">
                <p className="text-lg text-accent uppercase tracking-[0.2em]">THE SEASONAL BUSINESS TRAP</p>
                <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter text-foreground">
                  My Revenue Surged In The Busy Season… Then Crashed In The Slow Months
                </h1>
                <p className="text-xl text-muted max-w-[600px]">
                Revenue came in waves — big months, then lean months — and nobody could tell me what to actually do about it. So I built a tool that reads the revenue curve and coaches on the exact moves to make — so lean months become predictable, not reactive.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <a
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-md bg-accent text-background px-6 py-3 text-lg font-semibold hover:bg-accent/90 transition-colors duration-200"
                  >
                    Ride Your Revenue Wave
                    <span className="ml-2">&rarr;</span>
                  </a>
                  <a
                    href="#demo"
                    className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-lg text-foreground hover:bg-card transition-colors duration-200"
                  >
                    See What I Built
                  </a>
                </div>
                <p className="mt-4 text-lg text-accent font-medium">
                  "Most tools measure the waves. Wave Rider helps you ride them."
                </p>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#9EC6C1] via-[#A69678] to-card opacity-90 border border-accent/30" />
              </div>
            </div>
          </div>
        </section>

        {/* What I Tried Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                Four Ways I Tried To Fix My Business (And Why None Worked)
                </h2>
                <p className="text-lg text-muted">
                  I did everything the "experts" say to do. Here's what happened:
                </p>
              </div>
              
              <div className="grid gap-8 md:grid-cols-2 mb-12">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent font-semibold text-sm">1</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        I had spreadsheets…
                      </h3>
                      <p className="text-muted">
                        But they didn't tell me what the numbers meant or what to do about them.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent font-semibold text-sm">2</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        I had a KPI dashboard…
                      </h3>
                      <p className="text-muted">
                        But it didn't tell me what actions to take with all that data.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent font-semibold text-sm">3</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        I paid for coaching…
                      </h3>
                      <p className="text-muted">
                        But it was expensive and they didn't understand how my business was different.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent font-semibold text-sm">4</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        I didn't have a CFO…
                      </h3>
                      <p className="text-muted">
                        Because I was "too small to afford one."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-2xl p-8 text-center border border-accent/20">
                <p className="text-xl text-foreground font-semibold mb-4">
                  And the worst part?
                </p>
                <p className="text-lg text-muted mb-6">
                  I didn't need more numbers. I needed to know what to do with them — especially before the slow season showed up.
                </p>
                
                <div className="space-y-4 max-w-2xl mx-auto">
                  <p className="text-lg text-foreground font-medium">
                    What I needed was simple:
                  </p>
                  <p className="text-lg text-accent font-semibold">
                    Look at my numbers... tell me what they mean... and tell me what to do next.
                  </p>
                  <p className="text-xl text-foreground font-bold pt-4">
                    That's why I built Wave Rider.
                  </p>
                  <p className="text-lg text-muted">
                    Because most business owners don't need more data… they need direction.
                  </p>
                </div>
                
                <div className="mt-8 p-6 bg-background/30 rounded-xl border border-border">
                  <p className="text-sm text-accent mb-4">
                    Wave Rider turns your revenue curve into plain-English guidance — like:
                  </p>
                  <div className="space-y-3 text-left max-w-lg mx-auto">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-foreground">
                        "You're heading for a slow-month squeeze. Here's the move to make this week."
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-foreground">
                        "Your average ticket is the easiest win right now. Here are 3 ways to raise it."
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-foreground">
                        "You're busy, but cash is tight. Here's where the money is leaking."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Breakthrough Demo - Moved Up */}
        <section id="demo" className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                The Curve That Changed Everything
              </h2>
              <p className="text-base md:text-lg text-muted">
                This isn't another dashboard. It's the conversation I wish I could have had with myself 10 years ago. 
                Try the curve that shows you the gap between what you make and what you keep.
              </p>
            </div>
            <div className="grid gap-10 lg:grid-cols-[1.4fr,1fr] items-start">
              <LandingRevenueDemo />
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-foreground">
                  Every Year Was...Big Months...Lean Months...Panic...Then Hope Next Year Would Be Different
                </h3>
                <p className="text-base md:text-lg text-muted">
                My revenue came in waves. Busy season felt like relief. Slow season felt like a gut punch.
                And nobody could tell me what to actually do about it.
                </p>
                <p className="text-base md:text-lg text-muted">
                The fact-of-the-matter is the slow season is like Christmas, it comes around every year. We know it's coming but we never plan for it. Once it here, we panic saying 'that came quick!' 
                With Wave Rider, you see the pattern. You plan for it and prepare for it so if it does come around, you're ready. 
                </p>
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <p className="text-sm text-muted">
                  <strong>Try this:</strong> Enter your best month and your worst month.
                  If you saw this pattern early, what would you change first?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What I Built Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                So I Built What I Wish I Had
              </h2>
              <p className="text-base md:text-lg text-muted">
                Every feature in Wave Rider exists because I needed it for my own business. 
                These aren't enterprise solutions scaled down—they're owner-built solutions that actually work.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: 'Master Revenue Curve',
                  desc: 'I built this because I needed to see my entire year on one screen. No more guessing if winter would bankrupt me.',
                },
                {
                  title: 'Service Mix & Employee LER',
                  desc: 'I built this because I kept paying techs who were busy but not profitable. Now I know who and what actually makes money.',
                },
                {
                  title: 'Budget vs Actual',
                  desc: 'I built this because I was tired of surprises. Now I know weeks in advance if I need to hustle or if I can breathe.',
                },
                {
                  title: 'AI Coach (Available 24/7)',
                  desc: 'I built this because my biggest questions came at 2 AM. Now I have someone who actually understands my business to talk to.',
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

        {/* Detailed Features Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto space-y-24">
            {/* Row 1 – Your Revenue Tells The Story */}
            <div className="grid gap-8 lg:grid-cols-2 items-stretch">
              <div className="space-y-4 rounded-2xl border border-border bg-foreground/90 p-6 lg:p-8 h-full">
                <h2 className="text-3xl md:text-4xl font-bold text-accent">
                  Your Revenue Tells The Story Of Your Business
                </h2>
                <p className="text-base md:text-lg text-muted">
                  Most business owners know they want to grow – "I want to grow next year" – but don&apos;t
                  really know how or what that looks like.
                </p>
                <p className="text-base md:text-lg text-muted">
                  Wave Rider tells you each month what your GAP is. You&apos;ll clearly see how much more revenue each
                  month you&apos;ll need to hit your FIR (Future Inspired Revenue) goal.
                </p>
                <p className="text-base md:text-lg text-muted">
                  You&apos;ll know if you are falling behind or ahead of the wave at all times.
                </p>
              </div>
              <div className="relative h-full">
                <div className="rounded-2xl border border-border bg-foreground/90 shadow-lg overflow-hidden p-4 md:p-6 h-full">
                  <img
                    src="/Features 1.png"
                    alt="Wave Rider dashboard showing the Master Revenue Curve and revenue gap"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Row 2 – Not Just Another Fancy Dashboard */}
            <div className="grid gap-8 lg:grid-cols-2 items-stretch">
              <div className="space-y-4 rounded-2xl border border-border bg-foreground/90 p-6 lg:p-8 h-full">
                <h2 className="text-3xl md:text-4xl font-bold text-accent">
                  Not Just Another Fancy Dashboard!
                </h2>
                <p className="text-base md:text-lg text-muted">
                  Everyone loves a fancy dashboard. It makes us feel good about what we&apos;re tracking. The problem is
                  most dashboards don&apos;t tell you what to do with that information. Now that you have this fancy
                  dashboard and KPIs, what do you do with it? What&apos;s next?
                </p>
                <p className="text-base md:text-lg text-muted">
                  Wave Rider is built on your numbers. Get insight into your KPIs like never before.
                </p>
                <p className="text-base md:text-lg text-muted">
                  Got a question about a KPI? Chat with the AI to get relevant answers and coaching.
                </p>
              </div>
              <div className="relative h-full">
                <div className="rounded-2xl border border-border bg-foreground/90 shadow-lg overflow-hidden p-4 md:p-6 h-full">
                  <img
                    src="/features 2.png"
                    alt="Wave Rider KPI dashboard with coaching overlays"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Row 3 – Your Financial Documents */}
            <div className="grid gap-8 lg:grid-cols-2 items-stretch">
              <div className="space-y-4 rounded-2xl border border-border bg-foreground/90 p-6 lg:p-8 h-full">
                <h2 className="text-3xl md:text-4xl font-bold text-accent">Your Financial Documents</h2>
                <p className="text-base md:text-lg text-muted">
                  Most business owners wonder why their bank account doesn&apos;t match the effort and revenue they
                  made – often questioning, "I made all this revenue and my bank account doesn&apos;t show it, where did
                  all the money go?"
                </p>
                <p className="text-base md:text-lg text-muted">
                  Wave Rider shows you where your money is going and compares it to past performance. You will easily
                  and quickly see where you&apos;re spending your money.
                </p>
                <p className="text-base md:text-lg text-muted">
                  We&apos;ve added this one metric that dashboards miss and that has a huge impact on where your money
                  went.
                </p>
              </div>
              <div className="relative h-full">
                <div className="rounded-2xl border border-border bg-foreground/90 shadow-lg overflow-hidden p-4 md:p-6 h-full">
                  <img
                    src="/features 3.png"
                    alt="Wave Rider financial statements and radial charts"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Row 4 – Employee Performance */}
            <div className="grid gap-8 lg:grid-cols-2 items-stretch">
              <div className="space-y-4 rounded-2xl border border-border bg-foreground/90 p-6 lg:p-8 h-full">
                <h2 className="text-3xl md:text-4xl font-bold text-accent">Employee Performance</h2>
                <p className="text-base md:text-lg text-muted">
                  Most business owners do not have a clear picture of the performance of their employees. Pay raises,
                  reviews, and bonus structures are sloppy at best and usually based on feeling or industry "standards"
                  and not facts.
                </p>
                <p className="text-base md:text-lg text-muted">
                  Wave Rider helps you keep track of the daily performance of your employees:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-base md:text-lg text-muted">
                  <li>Are they efficient with their time?</li>
                  <li>Is the company making a profit on this tech?</li>
                  <li>Are they a high performer or weak in certain areas?</li>
                </ul>
                <p className="text-base md:text-lg text-muted">
                  Wave Rider takes the emotion out of employee performance.
                </p>
              </div>
              <div className="relative h-full">
                <div className="rounded-2xl border border-border bg-foreground/90 shadow-lg overflow-hidden p-4 md:p-6 h-full">
                  <img
                    src="/features 4.png"
                    alt="Wave Rider daily performance records and insights"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Row 5 – LER Bonus Impact */}
            <div className="grid gap-8 lg:grid-cols-2 items-stretch">
              <div className="space-y-4 rounded-2xl border border-border bg-foreground/90 p-6 lg:p-8 h-full">
                <h2 className="text-3xl md:text-4xl font-bold text-accent">LER Bonus Impact</h2>
                <p className="text-base md:text-lg text-muted">
                  A bonus program is almost a must in today&apos;s job market. But most business owners start one by
                  using industry "standards" and not knowing how it will impact their profitability, let alone if it&apos;s
                  a good program for the techs.
                </p>
                <p className="text-base md:text-lg text-muted">
                  Wave Rider keeps track of the daily performance of your employees and provides an LER (Labor
                  Efficiency Ratio) number.
                </p>
                <p className="text-base md:text-lg text-muted">
                  LER tells you for every dollar you pay the tech, how much profit they are making in return.
                </p>
              </div>
              <div className="relative h-full">
                <div className="rounded-2xl border border-border bg-foreground/90 shadow-lg overflow-hidden p-4 md:p-6 h-full">
                  <img
                    src="/features 5.png"
                    alt="Wave Rider LER bonus impact charts and metrics"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Row 6 – The Brain Behind Wave Rider */}
            <div className="grid gap-8 lg:grid-cols-2 items-stretch">
              <div className="space-y-4 rounded-2xl border border-border bg-foreground/90 p-6 lg:p-8 h-full">
                <h2 className="text-3xl md:text-4xl font-bold text-accent">The Brain Behind Wave Rider</h2>
                <p className="text-base md:text-lg text-muted">
                  A human coach can be brilliant — but they can't hold your entire business in their head, especially between calls.
                </p>
                <p className="text-base md:text-lg text-muted">
                  Wave Rider is different because your business is different. Wave Rider builds a living 'brain', a connected map of your numbers, seasons, goals, conversations, and past decisions — so it can connect the invisible dots and tell you what to do next.
                </p>
                <p className="text-base md:text-lg text-muted">
                  Think of Wave Rider as a coach with perfect memory, built around your business and only your business.
                </p>
              </div>
              <div className="relative h-full">
                <div className="rounded-2xl border border-border bg-foreground/90 shadow-lg overflow-hidden p-4 md:p-6 h-full">
                  <img
                    src="/Brain Feature.png"
                    alt="Wave Rider AI coach with business intelligence and memory"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Row 7 – And MORE */}
            <div className="grid gap-8 lg:grid-cols-2 items-stretch">
              <div className="space-y-4 rounded-2xl border border-border bg-foreground/90 p-6 lg:p-8 h-full">
                <h2 className="text-3xl md:text-4xl font-bold text-accent">And MORE…</h2>
                <ul className="list-disc pl-5 space-y-2 text-base md:text-lg text-muted">
                  <li>
                    Track your budget vs actual revenue to see if you&apos;re on track or falling behind.
                  </li>
                  <li>
                    Service mix analysis – track your services, which ones are performing better, and which ones you
                    may need to increase pricing on.
                  </li>
                  <li>
                    Service Hub – compare your top services with strategic recommendations to improve.
                  </li>
                  <li>
                    Revenue Trend Analysis – see how your service mix is impacting your overall revenue trajectory.
                  </li>
                  <li>
                    Profit Impact Calculator – know how much that shiny new truck or marketing ad spend is going to
                    cost you to maintain your profit margin.
                  </li>
                </ul>
              </div>
              <div className="relative h-full">
                <div className="rounded-2xl border border-border bg-foreground/90 shadow-lg overflow-hidden p-4 md:p-6 h-full">
                  <img
                    src="/features 6.png"
                    alt="Wave Rider service profitability, laptop, and mobile views"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
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
                  I'm still building and improving this based on real business owners' feedback. The first 5 owners get special beta pricing and direct influence on what I build next.
                </p>
              </div>
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-accent text-background px-5 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors duration-200 w-full md:w-auto text-center"
              >
                Join the Beta
              </a>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-4">Questions I Had When I Started</h2>
              <p className="text-base md:text-lg text-muted">
                Everything you need to know before you try the system that saved my business.
              </p>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={faq.question}
                  className="border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-4 md:px-6 py-4 flex items-center justify-between text-left hover:bg-card transition-colors"
                  >
                    <span className="text-base md:text-lg font-semibold text-foreground pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground flex-shrink-0 transform transition-transform duration-200 ${
                        openFaqIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaqIndex === index && (
                    <div className="px-4 md:px-6 pb-4 text-sm text-muted leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <p className="text-sm md:text-base text-muted mb-4">Still have questions?</p>
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-accent text-background px-6 py-3 text-base font-semibold hover:bg-accent/90 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Try Wave Rider Risk-Free
              </a>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-4xl font-bold text-foreground">I Built This For The Me From 10 Years Ago</h2>
              <p className="text-lg md:text-xl text-muted">
                The guy staring at spreadsheets he didn't understand, wondering if he'd make payroll, 
                and laying awake at night worrying about the slow season. If that's you, let's talk.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-md bg-accent text-background px-6 py-3 text-lg font-semibold hover:bg-accent/90 transition-colors duration-200"
                >
                  Stop Guessing About Your Money
                  <span className="ml-2">&rarr;</span>
                </a>
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-lg text-foreground hover:bg-card transition-colors duration-200"
                >
                  Try The Curve Demo
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