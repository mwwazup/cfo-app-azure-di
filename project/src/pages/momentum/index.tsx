import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { MomentumTracker } from '../../components/momentum/MomentumTracker';
import { MomentumHistory } from '../../components/momentum/MomentumHistory';
import { 
  Plus, 
  History, 
  Target, 
  Brain,
  TrendingUp,
  MessageCircle,
  Lightbulb
} from 'lucide-react';

type ViewMode = 'overview' | 'tracker' | 'history';

export function MomentumPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();

  const handleStartJournal = () => {
    setSelectedMonth(new Date());
    setViewMode('tracker');
  };

  const handleEditMonth = (month: Date) => {
    setSelectedMonth(month);
    setViewMode('tracker');
  };

  const handleSave = () => {
    // Optionally switch back to history view after saving
    setViewMode('history');
  };

  if (viewMode === 'tracker') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Momentum Tracker</h1>
            <p className="text-muted mt-2">
              Capture your monthly business insights and experiences
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setViewMode('overview')}
          >
            Back to Overview
          </Button>
        </div>
        
        <MomentumTracker 
          selectedMonth={selectedMonth}
          onSave={handleSave}
        />
      </div>
    );
  }

  if (viewMode === 'history') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Journal History</h1>
            <p className="text-muted mt-2">
              Review and manage your momentum tracking entries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode('overview')}
            >
              Back to Overview
            </Button>
            <Button onClick={handleStartJournal}>
              <Plus className="h-4 w-4 mr-2" />
              New Journal
            </Button>
          </div>
        </div>
        
        <MomentumHistory onEditMonth={handleEditMonth} />
      </div>
    );
  }

  // Overview mode
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground tracking-tight">Momentum Tracker</h1>
          <div className="w-24 h-1 mx-auto rounded-full" style={{ backgroundColor: '#d5b274' }}></div>
        </div>
        <p className="text-xl text-muted max-w-4xl mx-auto leading-relaxed">
          Get your thoughts out of your head and into a system that helps you build momentum. 
          Your monthly reflections help the AI coach understand your business better.
        </p>
      </div>

      {/* Key Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 !bg-[#fffaf4]">
          <CardContent className="pt-6 !bg-[#fffaf4]">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md" style={{ backgroundColor: '#d5b274' }}>
                <Brain className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#222222]">
                Clear Your Mind
              </h3>
              <p className="text-sm leading-relaxed text-[#222222]">
                Get thoughts, concerns, and insights out of your head and into a structured format 
                that helps you process and learn from your experiences.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 !bg-[#fffaf4]">
          <CardContent className="pt-6 !bg-[#fffaf4]">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md" style={{ backgroundColor: '#d5b274' }}>
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#222222]">
                Build Momentum
              </h3>
              <p className="text-sm leading-relaxed text-[#222222]">
                Track your progress and celebrate wins while identifying areas for improvement. 
                Small consistent actions compound into significant results.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 !bg-[#fffaf4]">
          <CardContent className="pt-6 !bg-[#fffaf4]">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md" style={{ backgroundColor: '#d5b274' }}>
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#222222]">
                Smart Insights
              </h3>
              <p className="text-sm leading-relaxed text-[#222222]">
                AI-powered analysis of your entries reveals patterns and trends you might miss, 
                helping you make more informed business decisions.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 !bg-[#fffaf4]">
          <CardContent className="pt-6 !bg-[#fffaf4]">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md" style={{ backgroundColor: '#d5b274' }}>
                <Lightbulb className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#222222]">
                Learn & Grow
              </h3>
              <p className="text-sm leading-relaxed text-[#222222]">
                Transform experiences into wisdom. Each entry becomes a learning opportunity 
                that contributes to your long-term business success.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="border border-gray-200 shadow-lg pt-8">
        <CardContent className="pt-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-10 text-center">How It Works</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{ backgroundColor: '#d5b274' }}>
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-3 text-lg">Monthly Reflection</h4>
                  <p className="text-muted text-sm leading-relaxed">
                    Spend 15-20 minutes each month documenting your experiences, challenges, 
                    and wins across key business areas.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{ backgroundColor: '#d5b274' }}>
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-3 text-lg">Pattern Recognition</h4>
                  <p className="text-muted text-sm leading-relaxed">
                    Over time, you'll start to see patterns in your business cycles, customer behavior, 
                    and your own decision-making processes.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{ backgroundColor: '#d5b274' }}>
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-3 text-lg">AI Integration</h4>
                  <p className="text-muted text-sm leading-relaxed">
                    Your entries inform the AI coach, enabling more contextual and personalized 
                    advice when you ask questions about your business.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 mt-20 mb-8 pt-8">
              <h4 className="font-semibold text-[#222222] mb-6 text-lg text-center">What You'll Track:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 flex-shrink-0" style={{ color: '#d5b274' }} />
                  <span className="text-sm text-muted">Monthly overview and general mood</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 flex-shrink-0" style={{ color: '#d5b274' }} />
                  <span className="text-sm text-muted">Revenue patterns and unusual income events</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 flex-shrink-0" style={{ color: '#d5b274' }} />
                  <span className="text-sm text-muted">Expense changes and unexpected costs</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 flex-shrink-0" style={{ color: '#d5b274' }} />
                  <span className="text-sm text-muted">Marketing effectiveness and lead flow</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 flex-shrink-0" style={{ color: '#d5b274' }} />
                  <span className="text-sm text-muted">Key lessons learned and insights</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 flex-shrink-0" style={{ color: '#d5b274' }} />
                  <span className="text-sm text-muted">External events affecting your business</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 flex-shrink-0" style={{ color: '#d5b274' }} />
                  <span className="text-sm text-muted">Reflection and forward-looking thoughts</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
        <Button
          onClick={handleStartJournal}
          className="flex items-center gap-3 text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          style={{ backgroundColor: '#d5b274', color: 'white' }}
        >
          <Plus className="h-6 w-6" />
          Start This Month's Journal
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setViewMode('history')}
          className="flex items-center gap-3 text-lg px-10 py-6 rounded-xl border-2 hover:shadow-lg transition-all duration-300"
          style={{ borderColor: '#d5b274', color: '#d5b274' }}
        >
          <History className="h-6 w-6" />
          View Journal History
        </Button>
      </div>

      {/* Privacy Note */}
      <div className="text-center space-y-4 py-16">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg" style={{ backgroundColor: '#d5b274' }}>
          <MessageCircle className="h-8 w-8 text-white" />
        </div>
        <h4 className="font-semibold text-lg text-muted">Your Privacy Matters</h4>
        <p className="text-sm max-w-2xl mx-auto leading-relaxed text-muted">
          Your journal entries are stored securely and are only used to improve your AI coaching experience. 
          You can export or delete your entries at any time.
        </p>
      </div>
    </div>
  );
}