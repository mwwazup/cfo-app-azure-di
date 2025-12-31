import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Waves, 
  LayoutDashboard, 
  TrendingUp, 
  Compass, 
  FileText, 
  Users, 
  Brain, 
  BookOpen, 
  FastForward,
  ArrowRight,
  CheckCircle,
  Target,
  Lightbulb
} from 'lucide-react';

export const StartHerePage: React.FC = () => {
  const navigate = useNavigate();

  const journeySteps = [
    {
      title: "Set Your Foundation",
      description: "Start with your financial big picture and establish your revenue targets",
      icon: Target,
      path: "/coach/your-big-fig",
      status: "recommended" as const,
      estimatedTime: "15 minutes"
    },
    {
      title: "Master Your Revenue",
      description: "Track your progress against targets and understand your revenue patterns",
      icon: TrendingUp,
      path: "/revenue/master",
      status: "next" as const,
      estimatedTime: "10 minutes"
    },
    {
      title: "Optimize Services",
      description: "Analyze service performance and budget vs actuals",
      icon: Brain,
      path: "/service-hub",
      status: "later" as const,
      estimatedTime: "20 minutes"
    },
    {
      title: "Build Your Team",
      description: "Manage employees, track LER, and optimize bonus structures",
      icon: Users,
      path: "/employees",
      status: "later" as const,
      estimatedTime: "30 minutes"
    }
  ];

  const quickActions = [
    {
      title: "Upload Financial Statements",
      description: "Get insights by uploading your P&L, balance sheet, and cash flow statements",
      icon: FileText,
      path: "/financial-statements",
      color: "bg-blue-500"
    },
    {
      title: "Analyze Profit Impact",
      description: "See how small changes can create big profit improvements",
      icon: BookOpen,
      path: "/coach/profit-impact",
      color: "bg-green-500"
    },
    {
      title: "Track Your Momentum",
      description: "Monitor your progress and celebrate your wins",
      icon: FastForward,
      path: "/momentum",
      color: "bg-purple-500"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recommended':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'next':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'later':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recommended':
        return 'Start Here';
      case 'next':
        return 'Next Step';
      case 'later':
        return 'Later';
      default:
        return 'Optional';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-accent/20">
            <Waves className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Welcome to WaveRider</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Your journey to financial clarity and business mastery starts here. 
          We'll guide you step-by-step through the most impactful areas of your business.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          <span>Follow the recommended path or explore any area that interests you</span>
        </div>
      </div>

      {/* Journey Path */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Your Journey Path</h2>
          <p className="text-muted-foreground">Complete these steps in order for maximum impact</p>
        </div>
        
        <div className="grid gap-4 max-w-4xl mx-auto">
          {journeySteps.map((step) => (
            <Card key={step.title} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10">
                      <step.icon className="h-6 w-6 text-accent" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(step.status)}`}>
                        {getStatusText(step.status)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-2">{step.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>⏱️ {step.estimatedTime}</span>
                      {step.status === 'recommended' && (
                        <span className="text-green-600 font-medium">🎯 Recommended starting point</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Button
                      onClick={() => navigate(step.path)}
                      className="flex items-center gap-2"
                      variant={step.status === 'recommended' ? 'primary' : 'outline'}
                    >
                      {step.status === 'recommended' ? 'Start' : 'Explore'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Quick Actions</h2>
          <p className="text-muted-foreground">Jump to any feature whenever you're ready</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full ${action.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{action.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{action.description}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(action.path)}
                  className="w-full"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            Pro Tips for Success
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Start with your Lighthouse</p>
              <p className="text-sm text-muted-foreground">Setting clear revenue targets makes everything else easier</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Upload your financials regularly</p>
              <p className="text-sm text-muted-foreground">Monthly P&L uploads give you the best insights</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Track your LER daily</p>
              <p className="text-sm text-muted-foreground">Labor Efficiency Ratio is your most powerful profit lever</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Help */}
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Need Help Getting Started?</h3>
        <p className="text-muted-foreground">
          Use the AI chat bubble in the bottom-right corner for instant guidance
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
          <Button onClick={() => navigate('/coach/your-big-fig')}>
            <Compass className="h-4 w-4 mr-2" />
            Start Your Lighthouse
          </Button>
        </div>
      </div>
    </div>
  );
};
