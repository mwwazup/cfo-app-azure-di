import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { VoiceInput } from '../ui/voice-input';
import { useAuth } from '../../contexts/auth-context';
import { useRevenue } from '../../contexts/revenue-context';
import { useMomentum } from '../../hooks/useMomentum';
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
  Star,
  MessageCircle,
  Play,
  AlertCircle,
  Users
} from 'lucide-react';

// Field type definitions
interface SliderOption {
  value: number;
  label: string;
}

interface ChecklistOption {
  key: string;
  label: string;
}

interface FormField {
  key: string;
  label: string;
  type: 'slider' | 'textbox_with_suggestions' | 'dropdown' | 'textbox' | 'number_checklist' | 'toggle' | 'boolean_checklist' | 'summary';
  options?: SliderOption[] | string[] | ChecklistOption[];
  suggestions?: string[];
  placeholder?: string;
  conditionalOn?: {
    field: string;
    value: string;
  };
}

// Function to determine current seasonal phase based on revenue data
const determineSeasonalPhase = (revenueData: any, currentMonth: number): string => {
  if (!revenueData || !revenueData.data || revenueData.data.length === 0) {
    return 'steady';
  }

  // Get historical data for the current month across years
  const currentMonthData = revenueData.data.filter((entry: any) => {
    const entryMonth = new Date(entry.month).getMonth() + 1;
    return entryMonth === currentMonth && entry.actual_revenue > 0;
  });

  if (currentMonthData.length === 0) {
    return 'steady';
  }

  // Calculate average revenue for this month historically
  const avgRevenue = currentMonthData.reduce((sum: number, entry: any) => sum + entry.actual_revenue, 0) / currentMonthData.length;
  
  // Get all months with revenue data to determine overall patterns
  const allMonthsData = revenueData.data.filter((entry: any) => entry.actual_revenue > 0);
  const overallAvg = allMonthsData.reduce((sum: number, entry: any) => sum + entry.actual_revenue, 0) / allMonthsData.length;
  
  // Determine seasonal phase based on current month's historical performance vs overall average
  const ratio = avgRevenue / overallAvg;
  
  if (ratio >= 1.3) {
    return 'peak';
  } else if (ratio <= 0.7) {
    return 'slow';
  } else if (ratio >= 0.9 && ratio <= 1.1) {
    return 'steady';
  } else if (ratio > 1.1) {
    return 'busy';
  } else {
    return 'moderate';
  }
};

// Function to get seasonal description with business context
const getSeasonalDescription = (phase: string): { label: string; description: string; tooltip: string } => {
  switch (phase) {
    case 'peak':
    case 'busy':
      return {
        label: 'busy',
        description: 'This is usually one of your highest-revenue months. In past years, customer demand tends to spike during this time, and your schedule probably feels packed or even overbooked.',
        tooltip: 'We\'re using your past revenue data to identify this month as typically a busy season. This helps you compare how things felt this year vs. your usual trend.'
      };
    case 'steady':
      return {
        label: 'steady',
        description: 'This time of year usually brings in average, predictable revenue. It\'s not a huge spike, but not a slump either—things tend to run at a steady pace.',
        tooltip: 'We\'re using your past revenue data to identify this month as typically a steady season. This helps you compare how things felt this year vs. your usual trend.'
      };
    case 'moderate':
    case 'slow':
      return {
        label: 'slow',
        description: 'This is typically a lower-revenue month for you. Historically, fewer leads come in and things quiet down—either because of weather, holidays, or customer behavior.',
        tooltip: 'We\'re using your past revenue data to identify this month as typically a slow season. This helps you compare how things felt this year vs. your usual trend.'
      };
    default:
      return {
        label: 'typical',
        description: 'Based on your revenue patterns, this month tends to be fairly average for your business.',
        tooltip: 'We\'re analyzing your past revenue data to provide context for this month.'
      };
  }
};

interface StepConfig {
  key: string;
  title: string;
  icon: any;
  description?: string;
  placeholder?: string;
  color: string;
  bgColor: string;
  borderColor: string;
  fields?: FormField[];
  microCoaching?: string;
}

// Enhanced step configuration with specific questions and UI elements
const STEPS: StepConfig[] = [
  {
    key: 'overview',
    title: 'Monthly Snapshot',
    icon: BookOpen,
    description: 'Establish context and mood for the month',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    fields: [
      {
        key: 'energy_level',
        label: 'How was your energy this month?',
        type: 'slider',
        options: [
          { value: 1, label: 'Running on Fumes' },
          { value: 2, label: 'Just Showing Up' },
          { value: 3, label: 'Doing My Thing' },
          { value: 4, label: 'Feeling Good' },
          { value: 5, label: 'Crushing It' }
        ]
      },
      {
        key: 'month_descriptor',
        label: 'Outside of your energy, use one word to describe this month:',
        type: 'textbox_with_suggestions',
        suggestions: ['Chaotic', 'Slow', 'Unrelenting', 'Routine', 'Fine Tuned', 'Energizing', 'Momentum']
      },
      {
        key: 'expectations',
        label: 'Did this month go as you expected for revenue?',
        type: 'dropdown',
        options: [
          'Better than expected',
          'What I budgeted', 
          'Worse than expected',
          'I didn\'t have expectations'
        ]
      },
      {
        key: 'effort_results',
        label: 'Did the results match the effort you put in this month?',
        type: 'dropdown',
        options: [
          'Got more than I gave',
          'Got exactly what I gave',
          'Worked way too hard for little results',
          'I coasted a bit',
          'Not sure'
        ]
      },
      {
        key: 'why_explanation',
        label: 'Why?',
        type: 'textbox',
        placeholder: 'If you had to take a wild guess, could you explain the change?'
      }
    ],
    microCoaching: "Just your gut instinct, you don't need a perfect answer."
  },
  {
    key: 'money_in',
    title: 'Revenue Flow',
    icon: DollarSign,
    placeholder: 'Revenue highlights, big wins, what worked, what didn\'t, client feedback, pricing insights...',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    fields: [
      {
        key: 'revenue_this_month',
        label: 'Revenue this month',
        type: 'textbox',
        placeholder: 'Enter this month\'s revenue...'
      },
      {
        key: 'revenue_last_year',
        label: 'Revenue same month last year',
        type: 'textbox',
        placeholder: 'Enter last year\'s revenue for this month...'
      },
      {
        key: 'revenue_difference_reason',
        label: 'Reason for revenue difference',
        type: 'textbox',
        placeholder: 'What caused the difference in revenue compared to last year?...'
      },
      {
        key: 'unexpected_expenses_toggle',
        label: 'Unexpected expenses this month?',
        type: 'toggle',
        placeholder: 'What were they?...'
      },
      {
        key: 'cash_flow_tight_toggle',
        label: 'Was cash flow tight?',
        type: 'toggle',
        placeholder: 'What contributed? (Late payments, payroll timing, high ad spend, etc.)...'
      },
      {
        key: 'weather_impact',
        label: 'Did weather impact this month?',
        type: 'dropdown',
        options: [
          'No Impact',
          'Light Delay',
          'Heavy Delay'
        ]
      },
      {
        key: 'working_days_lost',
        label: 'How many full working days were lost to:',
        type: 'number_checklist',
        options: [
          { key: 'weather_days', label: 'Weather' },
          { key: 'holiday_days', label: 'Holidays' },
          { key: 'sick_pto_days', label: 'Sick days / PTO' },
          { key: 'equipment_days', label: 'Equipment or vehicle issues' },
          { key: 'scheduling_days', label: 'Scheduling problems' },
          { key: 'supply_days', label: 'Supply delays' },
          { key: 'family_days', label: 'Family needs' }
        ]
      },
      {
        key: 'major_events_toggle',
        label: 'Any major events not listed?',
        type: 'toggle',
        placeholder: 'Describe any other events that kept you from making revenue this month...'
      },
      {
        key: 'monthly_reflection',
        label: 'Overall thoughts and reflections on this month:',
        type: 'textbox',
        placeholder: 'How did this month feel overall? What worked well? What would you do differently? Any insights or patterns you noticed?...'
      }
    ],
    microCoaching: "This section highlights revenue, big wins, what worked, what didn\'t, and what kept you from meeting your goals"
  },
  {
    key: 'marketing',
    title: 'Marketing & Lead Flow',
    icon: Target,
    placeholder: 'How were leads? Any promos? Review counts? Referral patterns? Marketing experiments...',
    color: 'text-accent-600',
    bgColor: 'bg-accent-50',
    borderColor: 'border-accent-200',
    fields: [
      {
        key: 'seasonal_context',
        label: 'Based on your revenue curve, you\'re currently in your typical season. How did this month feel to you? Did customer demand match what you expected for this time of year?',
        type: 'textbox',
        placeholder: 'Think about customer inquiries, quote requests, or overall interest—did it feel like a busy season, or quieter than usual?...'
      },
      {
        key: 'marketing_efforts_feeling',
        label: 'How did you feel about your marketing efforts this month?',
        type: 'textbox',
        placeholder: 'Did it feel strategic, scattered, worth it… or just a money pit?...'
      },
      {
        key: 'marketing_feeling_slider',
        label: 'Did your marketing feel like money well spent?',
        type: 'slider',
        options: [
          { value: 1, label: 'Total Waste' },
          { value: 2, label: 'Didn\'t Even Try This Month' },
          { value: 3, label: 'Frustrating' },
          { value: 4, label: 'Unsure, Didn\'t Track It' },
          { value: 5, label: 'Broke Even' },
          { value: 6, label: 'Absolutely Worth It' }
        ]
      },
      {
        key: 'marketing_approach_checklist',
        label: 'Which of these best describes your marketing this month?',
        type: 'dropdown',
        options: [
          'I had a clear plan and followed it',
          'I knew I should market, but kept putting it off',
          'Someone else ran it, but I didn\'t track what they did',
          'I did it all myself',
          'I relied on word-of-mouth or repeat business only',
          'I didn\'t know where to start, so I didn\'t',
          'I reused what\'s worked before',
          'I spent money but didn\'t track results',
          'I\'m not sure what worked'
        ]
      },
      {
        key: 'marketing_gut_feeling',
        label: 'What\'s your gut feeling about marketing right now?',
        type: 'textbox',
        placeholder: 'Only rely on word-of-mouth and repeat customers? A necessary evil? Worth every penny? A confusing mess? Let it out my friend...'
      },
      {
        key: 'marketing_belief',
        label: 'When it comes to marketing, which of these feels most true, right now?',
        type: 'dropdown',
        options: [
          'I trust it will pay off over time',
          'Why pay for marketing when repeat customers and WOM have gotten me this far',
          'I feel like I\'m just throwing money at it',
          'I don\'t really understand what I\'m doing',
          'I know I need to do more, but don\'t know where to start',
          'I hate it but do it anyway',
          'I enjoy it and it\'s part of my growth plan'
        ]
      },
      {
        key: 'google_ads',
        label: 'Google Ads',
        type: 'toggle',
        placeholder: 'What type of Google ads did you run? How did they perform?'
      },
      {
        key: 'facebook_ads',
        label: 'Facebook/Instagram Ads',
        type: 'toggle',
        placeholder: 'What kind of Facebook/Instagram ads? Any insights on performance?'
      },
      {
        key: 'direct_mail',
        label: 'Direct Mail',
        type: 'toggle',
        placeholder: 'What type of direct mail campaign? Response rate?'
      },
      {
        key: 'email_campaign',
        label: 'Email Campaign',
        type: 'toggle',
        placeholder: 'What was the email about? Open rates or responses?'
      },
      {
        key: 'discount_promotion',
        label: 'Discount/Promotion',
        type: 'toggle',
        placeholder: 'What discount or promotion did you offer? How well did it work?'
      },
      {
        key: 'referral_program',
        label: 'Referral Program',
        type: 'toggle',
        placeholder: 'How is your referral program working? Any new referrals?'
      },
      {
        key: 'local_advertising',
        label: 'Local Advertising',
        type: 'toggle',
        placeholder: 'What local advertising did you do? Radio, print, sponsorships?'
      },
      {
        key: 'social_media',
        label: 'Social Media Posts',
        type: 'toggle',
        placeholder: 'What kind of social media content? Any engagement or leads?'
      },
      {
        key: 'google_leads',
        label: 'Google',
        type: 'toggle',
        placeholder: 'How many leads from Google? What type of searches brought them in?'
      },
      {
        key: 'facebook_leads',
        label: 'Facebook/Instagram',
        type: 'toggle',
        placeholder: 'Leads from social media? Organic posts or ads?'
      },
      {
        key: 'word_of_mouth_leads',
        label: 'Word-of-Mouth',
        type: 'toggle',
        placeholder: 'Who referred you? What did they say about your work?'
      },
      {
        key: 'repeat_customers_leads',
        label: 'Repeat Customers',
        type: 'toggle',
        placeholder: 'Which customers came back? New projects or additional work?'
      },
      {
        key: 'referrals_leads',
        label: 'Referrals',
        type: 'toggle',
        placeholder: 'Who sent you referrals? How did they hear about you?'
      },
      {
        key: 'website_leads',
        label: 'Website',
        type: 'toggle',
        placeholder: 'Direct website inquiries? Contact form submissions?'
      },
      {
        key: 'online_reviews',
        label: 'Did you receive online reviews this month?',
        type: 'textbox',
        placeholder: 'Google, Facebook, Yelp, or other platforms - how many and what kind?...'
      }
    ],
    microCoaching: "Not tracking ROI here—just gut feelings. Don't over analyze anything or dig for numbers, you're just journaling your thoughts."
  },
  {
    key: 'team_labor',
    title: 'Team & Labor',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    fields: [
      {
        key: 'has_team',
        label: 'Does your business have team members beyond yourself?',
        type: 'dropdown',
        options: ['Yes', 'No']
      },
      // Solo operator branch (shown when "No" is selected)
      {
        key: 'solo_workload_handling',
        label: 'How did you handle the workload this month?',
        type: 'textbox',
        placeholder: 'Did you feel overwhelmed? Managed well? What was your biggest challenge?...',
        conditionalOn: { field: 'has_team', value: 'No' }
      },
      {
        key: 'solo_stretched_thin',
        label: 'Where did you feel stretched too thin?',
        type: 'textbox',
        placeholder: 'What tasks or areas consumed too much of your time and energy?...',
        conditionalOn: { field: 'has_team', value: 'No' }
      },
      {
        key: 'solo_adding_help',
        label: 'Would adding help—even part-time—relieve pressure next month?',
        type: 'textbox',
        placeholder: 'What kind of help would make the biggest difference? What are you hesitant about?...',
        conditionalOn: { field: 'has_team', value: 'No' }
      },
      {
        key: 'solo_trust_delegation',
        label: 'If you had one extra set of hands right now, what would you trust them with?',
        type: 'textbox',
        placeholder: 'What tasks feel safe to delegate? What reveals your delegation readiness or fear?...',
        conditionalOn: { field: 'has_team', value: 'No' }
      },
      {
        key: 'solo_seasonal_hiring_readiness',
        label: 'This is typically your {seasonal_phase} period. Do you feel like you could afford to hire someone during this time of year?',
        type: 'dropdown',
        options: [
          'Yes, I could afford it right now',
          'Possibly, but I\'d need to run the numbers',
          'No, this isn\'t a good time financially',
          'I\'ve never really thought about it'
        ],
        conditionalOn: { field: 'has_team', value: 'No' }
      },
      {
        key: 'solo_hiring_workload_worry',
        label: 'If you hired someone today, would you worry about keeping them busy?',
        type: 'dropdown',
        options: [
          'Yes — I\'d be nervous about slow weeks',
          'A little — I\'d need to plan their workload carefully',
          'No — there\'s always something to do',
          'Not sure — I\'ve never had help before'
        ],
        conditionalOn: { field: 'has_team', value: 'No' }
      },
      // Team branch (shown when "Yes" is selected)
      {
        key: 'total_team_members',
        label: 'How many total team members were active this month?',
        type: 'textbox',
        placeholder: 'Enter number or describe your team size...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'team_changes',
        label: 'Any changes in your team this month?',
        type: 'toggle',
        placeholder: 'What changes happened and how did they impact the business?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'hired_new_people',
        label: 'Hired new people',
        type: 'toggle',
        placeholder: 'Who did you hire? How are they working out so far?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'someone_quit_fired',
        label: 'Someone quit or was fired',
        type: 'toggle',
        placeholder: 'What happened? How did it affect operations and morale?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'switched_roles',
        label: 'Switched roles',
        type: 'toggle',
        placeholder: 'Who moved to what role? How is the transition going?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'crew_standouts',
        label: 'Did any crew members stand out this month? (positively or negatively)',
        type: 'textbox',
        placeholder: 'Hit deadlines? Missed calls? Great attitude? Any performance issues?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'time_management_issues',
        label: 'Any issues with time management or efficiency?',
        type: 'toggle',
        placeholder: 'What efficiency problems did you notice? How did they impact productivity?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'jobs_ran_longer',
        label: 'Jobs ran longer than expected',
        type: 'toggle',
        placeholder: 'Which jobs took longer? What caused the delays?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'overtime_hours',
        label: 'Overtime hours stacked up',
        type: 'toggle',
        placeholder: 'How much overtime? Was it planned or due to poor scheduling?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'waiting_idle_time',
        label: 'Lots of waiting / idle time',
        type: 'toggle',
        placeholder: 'What caused the downtime? Scheduling gaps? Waiting for materials?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'office_admin_smooth',
        label: 'Did your office or admin support run smoothly this month?',
        type: 'toggle',
        placeholder: 'What admin issues came up? How did they affect operations?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'scheduling_errors',
        label: 'Scheduling errors',
        type: 'toggle',
        placeholder: 'What scheduling mistakes happened? How did you fix them?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'billing_mistakes',
        label: 'Billing mistakes',
        type: 'toggle',
        placeholder: 'What billing errors occurred? How did customers react?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'team_expectations',
        label: 'Did the team meet expectations this month?',
        type: 'slider',
        options: [
          { value: 1, label: 'Way Off' },
          { value: 2, label: 'Below Expectations' },
          { value: 3, label: 'Mixed Results' },
          { value: 4, label: 'Met Expectations' },
          { value: 5, label: 'Exceeded Expectations' }
        ],
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'team_support_feeling',
        label: 'How supported did you feel by your team this month?',
        type: 'slider',
        options: [
          { value: 1, label: 'I carried everything — no one helped the way I needed' },
          { value: 2, label: 'I tried handing off work but it created more stress' },
          { value: 3, label: 'Some help was there, but I still felt on my own' },
          { value: 4, label: 'I had solid support most of the time' },
          { value: 5, label: 'My team truly had my back this month' }
        ],
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'holding_back_delegation',
        label: 'Is there something you\'re holding back from handing off — because it\'s just easier to do it yourself?',
        type: 'toggle',
        placeholder: 'What\'s one thing you wish you didn\'t have to do yourself?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'team_meetings',
        label: 'Did you hold any team meetings this month?',
        type: 'dropdown',
        options: [
          'Yes, and they helped',
          'Yes, but they felt forced',
          'No, and I probably should have',
          'No, no need'
        ],
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'leader_insights',
        label: 'As a leader, what did you learn about your team this month?',
        type: 'textbox',
        placeholder: 'What surprised you—good or bad? Any insights about team dynamics or individual performance?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'leaner_priorities',
        label: 'If next month had to run leaner, who or what would be your priority?',
        type: 'textbox',
        placeholder: 'This helps reveal bottlenecks or MVPs. Who is most essential? What can\'t be cut?...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      }
    ],
    microCoaching: "This section helps you reflect on team dynamics, delegation challenges, and leadership insights. Whether you're solo or managing a team, understanding these patterns is crucial for sustainable growth."
  },
  {
    key: 'key_events',
    title: 'Key Events & External Factors',
    icon: Star,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    fields: [
      {
        key: 'competitor_attention',
        label: 'Did a competitor do something that got your attention?',
        type: 'toggle',
        placeholder: 'What did they do? How might it affect your business? Any response needed?...'
      },
      {
        key: 'market_industry_changes',
        label: 'Any major changes in your local market or industry?',
        type: 'textbox',
        placeholder: 'Pricing wars, new entrants, supplier issues, regulatory changes, economic shifts...'
      },
      {
        key: 'next_month_adjustments',
        label: 'What adjustments are you making next month?',
        type: 'textbox',
        placeholder: 'Process changes, pricing adjustments, service modifications, team changes...'
      },
      {
        key: 'big_improvement_test',
        label: 'What\'s one big thing you\'d like to improve or test?',
        type: 'textbox',
        placeholder: 'Examples: "Raise prices by 5%", "Try Google Ads again", "Implement new scheduling system", "Add a new service"...'
      },
      {
        key: 'risks_concerns',
        label: 'Any risks or concerns on your radar?',
        type: 'textbox',
        placeholder: 'Cash flow concerns, key customer risks, supply chain issues, team problems, market threats...'
      },
      {
        key: 'long_term_goal_progress',
        label: 'Did you move toward any long-term goal this month?',
        type: 'toggle',
        placeholder: 'What goal? What progress did you make? How does it feel to be moving forward?...'
      },
      {
        key: 'future_alignment',
        label: 'What felt most in alignment with the future you want?',
        type: 'textbox',
        placeholder: 'Decisions, actions, or moments that felt like steps toward your ideal business or life...'
      },
      {
        key: 'off_course_reflection',
        label: 'What drifted off-course?',
        type: 'textbox',
        placeholder: 'Optional reflection: Areas where you got distracted from your bigger vision or values...'
      },
      {
        key: 'final_notes',
        label: 'Anything else worth remembering from this month?',
        type: 'textbox',
        placeholder: 'Freeform notes: insights, observations, reminders, or anything that doesn\'t fit elsewhere...'
      },
      {
        key: 'small_wins',
        label: 'Small wins worth celebrating?',
        type: 'textbox',
        placeholder: 'Examples: "Stuck to schedule", "Trained a new tech", "Didn\'t check email on Sunday", "Completed a difficult project"...'
      }
    ],
    microCoaching: "This section captures external factors, competitive moves, and forward-thinking reflections. It\'s about staying aware of your environment while celebrating progress and planning improvements."
  },
  {
    key: 'reflection',
    title: 'Reflection & Summary',
    icon: MessageCircle,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    fields: [
      {
        key: 'month_revenue_season',
        label: 'Month & Revenue Curve Season',
        type: 'summary',
        placeholder: 'Auto-generated summary of the month and seasonal context...'
      },
      {
        key: 'owner_snapshot',
        label: 'Business Owner Snapshot',
        type: 'summary',
        placeholder: 'Energy level, emotional tone, and overall month feeling...'
      },
      {
        key: 'revenue_marketing_summary',
        label: 'Revenue & Marketing',
        type: 'summary',
        placeholder: 'Revenue trends, marketing effectiveness, and owner mindset...'
      },
      {
        key: 'operations_workload_summary',
        label: 'Operations & Workload',
        type: 'summary',
        placeholder: 'Days lost, workflow issues, capacity reflections...'
      },
      {
        key: 'team_insights_summary',
        label: 'Team Insights',
        type: 'summary',
        placeholder: 'Team support, communication, staff changes (if applicable)...',
        conditionalOn: { field: 'has_team', value: 'Yes' }
      },
      {
        key: 'solo_reflections_summary',
        label: 'Solo Reflections',
        type: 'summary',
        placeholder: 'Staying solo feelings, hiring readiness, seasonal concerns...',
        conditionalOn: { field: 'has_team', value: 'No' }
      },
      {
        key: 'external_factors_summary',
        label: 'External Factors',
        type: 'summary',
        placeholder: 'Competitor moves, customer behavior, industry changes...'
      },
      {
        key: 'lessons_next_month_summary',
        label: 'Lessons & Next Month\'s Focus',
        type: 'summary',
        placeholder: 'Key lessons learned, planned adjustments, long-term goal progress...'
      },
      {
        key: 'coach_notes',
        label: 'Coach\'s Notes',
        type: 'textbox',
        placeholder: 'If reviewing with a coach, use this section to add insights, strategy, or accountability points...'
      }
    ],
    microCoaching: "This summary synthesizes your entire month into key insights. It\'s designed to help you see patterns and provide a clear overview for coaches, advisors, or future reference."
  }
];

type StepKey = (typeof STEPS)[number]['key'];
type Draft = Record<StepKey, any>; // Changed to any to accommodate different field types

// Function to generate intelligent summaries based on journal responses
const generateSummaryContent = (summaryKey: string, draft: Draft): string => {
  const monthData = draft.month_overview || {};
  const revenueData = draft.money_in || {};
  const marketingData = draft.marketing || {};
  const teamData = draft.team_labor || {};
  const eventsData = draft.key_events || {};
  
  switch (summaryKey) {
    case 'month_revenue_season':
      const selectedMonth = monthData.selected_month || 'This month';
      const seasonalPhase = marketingData.seasonal_phase || 'steady';
      return `${selectedMonth} – Typically a "${seasonalPhase}" period in their revenue curve. ${getSeasonalContext(seasonalPhase)}`;
      
    case 'owner_snapshot':
      const energyLevel = monthData.energy_level || 3;
      const monthDescriptor = monthData.month_descriptor || '';
      const energyLabels = ['Running on Fumes', 'Low Energy', 'Getting By', 'Good Energy', 'Crushing It'];
      const energyDescription = energyLabels[energyLevel - 1] || 'Moderate energy';
      return `Energy Level: ${energyDescription} (${energyLevel}/5)${monthDescriptor ? `\nMonth Feel: "${monthDescriptor}"` : ''}${monthData.expectations_vs_reality ? `\nExpectations: Month went ${monthData.expectations_vs_reality.toLowerCase()} than expected` : ''}`;
      
    case 'revenue_marketing_summary':
      const revenueThisMonth = revenueData.revenue_this_month || 'Not specified';
      const revenueLastYear = revenueData.revenue_last_year || 'Not specified';
      const revenueReason = revenueData.revenue_difference_reason || '';
      const marketingConfidence = marketingData.marketing_value_confidence || 3;
      return `Revenue: $${revenueThisMonth} this month vs $${revenueLastYear} same month last year${revenueReason ? `\nReason for difference: ${revenueReason}` : ''}\nMarketing Confidence: ${marketingConfidence}/5${getMarketingActivitiesSummary(marketingData)}`;
      
    case 'operations_workload_summary':
      const daysLost = revenueData.working_days_lost || 0;
      const weatherDays = revenueData.weather_days || 0;
      const majorEvents = revenueData.major_events_enabled ? 'Yes' : 'No';
      return `Days Lost: ${daysLost} total (${weatherDays} weather-related)\nMajor Disruptions: ${majorEvents}${revenueData.delays_challenges ? `\nChallenges: ${revenueData.delays_challenges.substring(0, 100)}...` : ''}`;
      
    case 'team_insights_summary':
      if (teamData.has_team !== 'Yes') return 'Not applicable - solo operator';
      const teamSize = teamData.total_team_members || 'Not specified';
      const teamExpectations = teamData.team_expectations || 3;
      const teamSupport = teamData.team_support_feeling || 3;
      return `Team Size: ${teamSize}\nExpectations Met: ${teamExpectations}/5\nSupport Level: ${teamSupport}/5${getTeamIssuesSummary(teamData)}`;
      
    case 'solo_reflections_summary':
      if (teamData.has_team === 'Yes') return 'Not applicable - has team';
      const hiringReadiness = teamData.solo_seasonal_hiring_readiness || 'Not specified';
      const workloadWorry = teamData.solo_hiring_workload_worry || 'Not specified';
      return `Hiring Readiness: ${hiringReadiness}\nWorkload Concerns: ${workloadWorry}${teamData.solo_workload_handling ? `\nWorkload Handling: ${teamData.solo_workload_handling.substring(0, 100)}...` : ''}`;
      
    case 'external_factors_summary':
      const competitorAttention = eventsData.competitor_attention_enabled ? 'Yes' : 'No';
      const marketChanges = eventsData.market_industry_changes ? 'Yes' : 'No';
      return `Competitor Activity: ${competitorAttention}${eventsData.competitor_attention ? `\n- ${eventsData.competitor_attention.substring(0, 100)}...` : ''}\nMarket Changes: ${marketChanges}${eventsData.market_industry_changes ? `\n- ${eventsData.market_industry_changes.substring(0, 100)}...` : ''}`;
      
    case 'lessons_next_month_summary':
      const nextMonthAdjustments = eventsData.next_month_adjustments || '';
      const bigImprovement = eventsData.big_improvement_test || '';
      const longTermProgress = eventsData.long_term_goal_progress_enabled ? 'Yes' : 'No';
      return `Next Month Focus: ${nextMonthAdjustments || 'Not specified'}\nBig Improvement/Test: ${bigImprovement || 'Not specified'}\nLong-term Goal Progress: ${longTermProgress}${eventsData.small_wins ? `\nSmall Wins: ${eventsData.small_wins.substring(0, 100)}...` : ''}`;
      
    default:
      return 'Summary will be generated based on your journal responses...';
  }
};

const getSeasonalContext = (phase: string): string => {
  switch (phase) {
    case 'busy': return 'High demand period with increased activity and revenue opportunities.';
    case 'steady': return 'Consistent demand with predictable workflow and revenue patterns.';
    case 'slow': return 'Lower demand period requiring strategic focus and efficiency improvements.';
    default: return 'Moderate business activity with balanced demand patterns.';
  }
};

const getMarketingActivitiesSummary = (marketingData: any): string => {
  const activities = [];
  if (marketingData.facebook_ads_enabled) activities.push('Facebook Ads');
  if (marketingData.google_ads_enabled) activities.push('Google Ads');
  if (marketingData.referral_program_enabled) activities.push('Referrals');
  if (marketingData.direct_mail_enabled) activities.push('Direct Mail');
  return activities.length > 0 ? `\nActive Channels: ${activities.join(', ')}` : '';
};

const getTeamIssuesSummary = (teamData: any): string => {
  const issues = [];
  if (teamData.team_changes_enabled) issues.push('Team changes');
  if (teamData.time_management_issues_enabled) issues.push('Time management');
  if (teamData.overtime_hours_enabled) issues.push('Overtime hours');
  return issues.length > 0 ? `\nKey Issues: ${issues.join(', ')}` : '';
};

interface MomentumTrackerProps {
  selectedMonth?: Date;
  onSave?: () => void;
}

export function MomentumTracker({ selectedMonth, onSave }: MomentumTrackerProps) {
  const { user } = useAuth();
  const revenueContext = useRevenue();
  const { getYearData, isLoading } = revenueContext;
  const { saveEntry, getEntriesForMonth } = useMomentum();
  const [stepIndex, setStepIndex] = useState(0);
  
  // Get dynamic seasonal context
  const currentMonth = selectedMonth ? selectedMonth.getMonth() + 1 : new Date().getMonth() + 1;
  const seasonalPhase = determineSeasonalPhase(revenueContext, currentMonth);
  const seasonalInfo = getSeasonalDescription(seasonalPhase);
  
  // Create dynamic STEPS with seasonal context
  const getDynamicSteps = (): StepConfig[] => {
    const steps = [...STEPS];
    
    // Find and update the marketing section with dynamic seasonal context
    const marketingStepIndex = steps.findIndex(step => step.key === 'marketing');
    if (marketingStepIndex !== -1 && steps[marketingStepIndex].fields) {
      const marketingStep = { ...steps[marketingStepIndex] };
      marketingStep.fields = [...marketingStep.fields!];
      
      // Update the seasonal context field with dynamic description
      const seasonalFieldIndex = marketingStep.fields.findIndex(field => field.key === 'seasonal_context');
      if (seasonalFieldIndex !== -1) {
        marketingStep.fields[seasonalFieldIndex] = {
          ...marketingStep.fields[seasonalFieldIndex],
          label: `Based on your revenue curve, you're currently in your typical ${seasonalInfo.label} season. ${seasonalInfo.description} How did this month feel to you? Did customer demand match what you expected for this time of year?`
        };
      }
      
      steps[marketingStepIndex] = marketingStep;
    }
    
    return steps;
  };
  
  const dynamicSteps = getDynamicSteps();
  
  // Component state variables
  const currentStep = dynamicSteps[stepIndex];
  const isLastStep = stepIndex === dynamicSteps.length - 1;
  const isFirstStep = stepIndex === 0;
  
  // Simple debug logging without circular dependencies
  useEffect(() => {
    console.log('🔍 MomentumTracker - Component Mounted');
    console.log('🔍 MomentumTracker - User ID:', user?.id);
    console.log('🔍 MomentumTracker - Revenue Loading:', isLoading);
    
    // Direct test of revenue_entries table
    if (user?.id) {
      import('../../services/revenueDataService').then(({ RevenueDataService }) => {
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;
        
        console.log('🔍 Direct DB Test - Testing revenue_entries table access');
        
        Promise.all([
          RevenueDataService.getRevenueDataForYear(user.id, currentYear),
          RevenueDataService.getRevenueDataForYear(user.id, lastYear),
          RevenueDataService.getAvailableYears(user.id)
        ]).then(([currentYearData, lastYearData, availableYears]) => {
          console.log('🔍 Direct DB Test - Results:', {
            currentYear,
            currentYearData: currentYearData.length > 0 ? currentYearData : 'No data',
            lastYear,
            lastYearData: lastYearData.length > 0 ? lastYearData : 'No data',
            availableYears
          });
        }).catch(error => {
          console.error('❌ Direct DB Test - Error:', error);
        });
      });
    }
  }, [user?.id, isLoading]);
  
  const [draft, setDraft] = useState<Draft>(() => {
    const initial: Partial<Draft> = {};
    
    console.log('🔍 Revenue Debug - Initializing Draft');
    console.log('🔍 Revenue Debug - Revenue Context Available:', !!revenueContext);
    console.log('🔍 Revenue Debug - getYearData Function:', typeof getYearData);
    
    // Get current month and year for revenue auto-population
    const now = selectedMonth || new Date();
    const currentMonthIndex = now.getMonth();
    const currentYearNum = now.getFullYear();
    const lastYear = currentYearNum - 1;
    
    console.log('🔍 Revenue Debug - Date Info:', {
      selectedMonth: now,
      currentMonthIndex,
      currentYearNum,
      lastYear
    });
    
    // Get revenue data for auto-population
    let currentMonthRevenue = '';
    let lastYearRevenue = '';
    
    try {
      if (typeof getYearData === 'function') {
        const currentYearData = getYearData(currentYearNum);
        const lastYearData = getYearData(lastYear);
        
        console.log('🔍 Revenue Debug - Year Data:', {
          currentYearData: currentYearData ? {
            year: currentYearData.year,
            hasData: !!currentYearData.data,
            dataLength: currentYearData.data?.length,
            isHistorical: currentYearData.isHistorical,
            monthData: currentYearData.data?.[currentMonthIndex]
          } : null,
          lastYearData: lastYearData ? {
            year: lastYearData.year,
            hasData: !!lastYearData.data,
            dataLength: lastYearData.data?.length,
            isHistorical: lastYearData.isHistorical,
            monthData: lastYearData.data?.[currentMonthIndex]
          } : null
        });
        
        if (currentYearData && currentYearData.data && currentYearData.data[currentMonthIndex]) {
          const revenue = currentYearData.data[currentMonthIndex].revenue;
          const isHistorical = currentYearData.isHistorical;
          console.log('🔍 Revenue Debug - Current Month:', { revenue, isHistorical });
          
          if (revenue > 0) {
            currentMonthRevenue = `$${revenue.toLocaleString()}`;
          }
        }
        
        if (lastYearData && lastYearData.data && lastYearData.data[currentMonthIndex]) {
          const revenue = lastYearData.data[currentMonthIndex].revenue;
          const isHistorical = lastYearData.isHistorical;
          console.log('🔍 Revenue Debug - Last Year Month:', { revenue, isHistorical });
          
          // If historical year = true, auto-populate; otherwise leave for user entry
          if (revenue > 0 && isHistorical) {
            lastYearRevenue = `$${revenue.toLocaleString()}`;
          }
        }
        
        console.log('🔍 Revenue Debug - Final Values:', {
          currentMonthRevenue,
          lastYearRevenue
        });
        
        // Set the revenue values in the money_in section draft
        if (currentMonthRevenue || lastYearRevenue) {
          initial.money_in = {
            revenue_this_month: currentMonthRevenue || '',
            revenue_last_year: lastYearRevenue || '',
            revenue_difference_reason: ''
          };
          console.log('🔍 Revenue Debug - Set Draft Values:', initial.money_in);
        }
      } else {
        console.log('🔍 Revenue Debug - getYearData not available');
      }
      
    } catch (error) {
      console.error('❌ Revenue Debug - Error:', error);
    }
    
    STEPS.forEach(({ key }) => {
      if (key === 'overview') {
        // Initialize overview with structured data
        initial[key] = {
          energy_level: 3,
          month_descriptor: '',
          expectations: '',
          effort_results: '',
          why_explanation: ''
        };
      } else if (key === 'money_in') {
        // Initialize money_in with structured data (will be overridden by revenue auto-population if available)
        initial[key] = {
          revenue_this_month: '',
          revenue_last_year: '',
          revenue_difference_reason: ''
        };
      } else {
        initial[key] = '';
      }
    });
    return initial as Draft;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [month, setMonth] = useState(selectedMonth || new Date());
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const StepIcon = currentStep.icon;

  // Debug user authentication
  useEffect(() => {
    console.log('MomentumTracker - User auth state:', {
      userId: user?.id,
      userEmail: user?.email,
      isAuthenticated: !!user
    });
  }, [user]);

  // Debug save operations
  useEffect(() => {
    console.log('MomentumTracker - Saving state:', {
      saving,
      lastSaved: lastSaved?.toISOString()
    });
  }, [saving, lastSaved]);

  // Debug database responses
  useEffect(() => {
    console.log('MomentumTracker - Database responses:', {
      entries: getEntriesForMonth(month.toISOString().slice(0, 7))
    });
  }, [month]);

  // Debug current step and draft state
  useEffect(() => {
    console.log('MomentumTracker - Current step and draft state:', {
      stepIndex,
      currentStepKey: currentStep.key,
      currentStepTitle: currentStep.title,
      currentDraftContent: draft[currentStep.key],
      allDraftKeys: Object.keys(draft),
      draftState: draft
    });
  }, [stepIndex, currentStep.key, draft]);

  // Auto-populate revenue fields when revenue context loads
  useEffect(() => {
    console.log('🔍 Revenue Auto-Population - useEffect Triggered:', {
      isLoading,
      hasGetYearData: typeof getYearData === 'function',
      hasUserId: !!user?.id,
      shouldRun: !isLoading && typeof getYearData === 'function' && user?.id
    });
    
    if (!isLoading && typeof getYearData === 'function' && user?.id) {
      try {
        const selectedMonth = month || new Date();
        const currentMonthIndex = selectedMonth.getMonth(); // 0-based (0 = January)
        const currentYearNum = selectedMonth.getFullYear();
        const lastYear = currentYearNum - 1;
        
        console.log('🔍 Revenue Auto-Population - Starting:', {
          currentYearNum,
          lastYear,
          currentMonthIndex,
          isLoading,
          hasGetYearData: !!getYearData
        });
        
        const currentYearData = getYearData(currentYearNum);
        const lastYearData = getYearData(lastYear);
        
        if (currentYearData && lastYearData) {
          const currentMonthData = currentYearData.data[currentMonthIndex];
          const lastYearMonthData = lastYearData.data[currentMonthIndex];
          
          let currentMonthRevenue = '';
          let lastYearRevenue = '';
          
          if (currentMonthData && currentMonthData.revenue > 0) {
            currentMonthRevenue = `$${currentMonthData.revenue.toLocaleString()}`;
          }
          
          if (lastYearMonthData && lastYearMonthData.revenue > 0 && lastYearData.isHistorical) {
            lastYearRevenue = `$${lastYearMonthData.revenue.toLocaleString()}`;
          }
          
          console.log('🔍 Revenue Auto-Population - Values:', {
            currentMonthRevenue,
            lastYearRevenue
          });
          
          // Update draft state with revenue values if we have them
          if (currentMonthRevenue || lastYearRevenue) {
            setDraft(prevDraft => ({
              ...prevDraft,
              money_in: {
                revenue_this_month: currentMonthRevenue,
                revenue_last_year: lastYearRevenue,
                revenue_difference_reason: prevDraft.money_in?.revenue_difference_reason || ''
              }
            }));
            console.log('🔍 Revenue Auto-Population - Draft Updated');
          }
        }
      } catch (error) {
        console.error('❌ Revenue Auto-Population - Error:', error);
      }
    }
  }, [isLoading, getYearData, user?.id, month]);

  // Load existing entries for the selected month
  useEffect(() => {
    if (user?.id && month) {
      loadExistingEntries();
    }
  }, [month, user]);

  const loadExistingEntries = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const monthKey = month.toISOString().slice(0, 7); // YYYY-MM format
      const entries = getEntriesForMonth(monthKey);
      
      if (entries.length > 0) {
        const newDraft: Partial<Draft> = {};
        
        entries.forEach(entry => {
          const stepKey = entry.section as StepKey;
          if (STEPS.find(s => s.key === stepKey)) {
            newDraft[stepKey] = entry.content;
          }
        });
        
        setDraft(newDraft as Draft);
      } else {
        // Reset draft for new month, but preserve any existing auto-populated values
        setDraft(prevDraft => {
          const initial: Partial<Draft> = {};
          STEPS.forEach(({ key }) => {
            if (key === 'overview') {
              // Initialize overview with structured data
              initial[key] = {
                energy_level: 3,
                month_descriptor: '',
                expectations: '',
                effort_results: '',
                why_explanation: ''
              };
            } else if (key === 'money_in') {
              // Preserve existing money_in values if they exist, otherwise use empty structure
              initial[key] = prevDraft.money_in || {
                revenue_this_month: '',
                revenue_last_year: '',
                revenue_difference_reason: ''
              };
            } else {
              initial[key] = '';
            }
          });
          console.log('🔍 LoadExistingEntries - Preserving draft:', {
            prevMoneyIn: prevDraft.money_in,
            newMoneyIn: initial.money_in
          });
          return initial as Draft;
        });
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: any) => {
    setDraft(d => ({ ...d, [currentStep.key]: value }));
  };

  const saveCurrentEntry = async (isDraft: boolean = false) => {
    if (!user?.id) {
      console.error('Cannot save: No user ID');
      setVoiceError('Cannot save: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    const currentContent = draft[currentStep.key];
    if (!currentContent) {
      console.log('Skipping save: No content for current section');
      return { success: true }; // Not an error, just nothing to save
    }

    setSaving(true);
    console.log(`Saving current entry for section ${currentStep.key}:`, {
      section: currentStep.key,
      contentLength: JSON.stringify(currentContent).length,
      isDraft
    });

    try {
      const monthKey = month.toISOString().slice(0, 7);
      const result = await saveEntry({
        month: monthKey,
        section: currentStep.key,
        content: JSON.stringify(currentContent),
        is_draft: isDraft
      });

      if (result.success) {
        console.log(`Successfully saved entry for section ${currentStep.key}`);
        setLastSaved(new Date());
        setVoiceError(null); // Clear any previous errors
      } else {
        console.error(`Failed to save entry for section ${currentStep.key}:`, result.error);
        setVoiceError(`Failed to save: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in saveCurrentEntry:', error);
      setVoiceError(`Error saving entry: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (stepIndex < dynamicSteps.length - 1) {
      console.log('MomentumTracker - Going to next step:', {
        currentStep: stepIndex,
        currentStepKey: currentStep.key,
        currentContent: draft[currentStep.key],
        nextStep: stepIndex + 1,
        nextStepKey: STEPS[stepIndex + 1].key
      });
      // Save current entry before moving to next step
      saveCurrentEntry(false); // Save as non-draft
      setStepIndex(stepIndex + 1);
    }
  };

  const goPrev = () => {
    if (stepIndex > 0) {
      // Save current entry before moving to previous step
      saveCurrentEntry(false); // Save as non-draft
      setStepIndex(stepIndex - 1);
    }
  };

  const goToStep = (index: number) => {
    // Save current entry before switching steps
    saveCurrentEntry(false); // Save as non-draft
    setStepIndex(index);
  };

  const handleVideoPlay = (stepIndex: number) => {
    // Placeholder for future video functionality
    const step = dynamicSteps[stepIndex];
    alert(`Video for "${step.title}" will be available soon! This will explain how to effectively capture insights for this section.`);
  };

  const handleFinish = async () => {
    await saveCurrentEntry(false);
    if (onSave) {
      onSave();
    }
  };

  const handleSaveDraft = async () => {
    await saveCurrentEntry(true);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(month);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setMonth(newMonth);
    setStepIndex(0); // Reset to first step when changing months
  };

  const getCompletionPercentage = () => {
    const completedSteps = dynamicSteps.filter(step => draft[step.key] !== undefined && draft[step.key] !== '').length;
    return Math.round((completedSteps / dynamicSteps.length) * 100);
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleVoiceTranscript = (transcript: string) => {
    // Append voice transcript to existing content for current section
    const currentContent = draft[currentStep.key];
    if (currentContent) {
      if (currentStep.key === 'overview') {
        const newContent = { ...currentContent };
        newContent.why_explanation = (newContent.why_explanation || '') + ' ' + transcript;
        handleChange(newContent);
      } else {
        const newContent = (currentContent || '') + ' ' + transcript;
        handleChange(newContent);
      }
    } else {
      handleChange(transcript);
    }
    setVoiceError(null);
  };

  const handleVoiceError = (error: string) => {
    setVoiceError(error);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <span className="ml-2 text-gray-400">Loading your journal...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Month Navigation - Keep consistent black background */}
      <Card className="bg-background border-border">
        <CardHeader className="pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="outline"
                onClick={() => changeMonth('prev')}
                className="flex items-center gap-3 text-base px-6 py-3"
              >
                <ChevronLeft className="h-5 w-5" />
                Previous
              </Button>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-accent" />
                <h2 className="text-2xl font-bold text-foreground">
                  {formatMonth(month)}
                </h2>
              </div>
              
              <Button
                variant="outline"
                onClick={() => changeMonth('next')}
                className="flex items-center gap-3 text-base px-6 py-3"
                disabled={month >= new Date()}
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-base text-muted">
                {getCompletionPercentage()}% Complete
              </div>
              {lastSaved && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Steps - Keep consistent black background */}
      <Card className="bg-background border-border">
        <CardContent className="pt-8 pb-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-base font-medium text-foreground">Progress</span>
            <span className="text-base text-muted">{stepIndex + 1} of {STEPS.length}</span>
          </div>
          
          <div className="flex justify-between gap-3">
            {STEPS.map((step, index) => {
              const isCompleted = draft[step.key] !== undefined && draft[step.key] !== '';
              const isCurrent = index === stepIndex;
              
              return (
                <button
                  key={step.key}
                  onClick={() => goToStep(index)}
                  className={`flex-1 h-3 rounded-full transition-all duration-200 ${
                    isCurrent
                      ? 'bg-accent'
                      : isCompleted
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                  }`}
                  title={step.title}
                />
              );
            })}
          </div>
          
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => (
              <div
                key={step.key}
                className={`text-sm text-center flex-1 ${
                  index === stepIndex ? 'text-accent font-medium' : 'text-muted'
                }`}
              >
                {step.title.split(' ')[0]}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step - Keep consistent black background, remove colored backgrounds */}
      <Card className="bg-background border-border">
        <CardHeader className="pb-8">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-4 text-foreground text-xl">
              <StepIcon className="h-7 w-7" />
              {currentStep.title}
            </CardTitle>
            {/* Video Play Button in upper right corner */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVideoPlay(stepIndex)}
              className="flex items-center gap-3 text-accent hover:text-accent/80 hover:bg-accent/10 text-base px-4 py-2"
              title={`Watch explanation video for: ${currentStep.title}`}
            >
              <Play className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          {currentStep.microCoaching && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <p className="text-base text-blue-800 italic leading-relaxed">
                {currentStep.microCoaching}
              </p>
            </div>
          )}

          {currentStep.fields && (
            <div className="space-y-14">
              {/* Special three-column layout for revenue questions in money_in section */}
              {currentStep.key === 'money_in' && currentStep.fields.length >= 2 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  {currentStep.fields.slice(0, 3).map((field) => {
                    const fieldValue = draft[currentStep.key]?.[field.key] || '';
                    console.log(`🔍 Field Debug - ${field.key}:`, {
                      fieldKey: field.key,
                      draftSection: draft[currentStep.key],
                      fieldValue: fieldValue,
                      hasValue: !!fieldValue
                    });
                    return (
                      <div key={field.key} className="space-y-4">
                        <Label htmlFor={field.key} className="!text-lg font-light text-foreground">
                          {field.label}
                        </Label>
                        {field.type === 'textbox' && (
                          <div className="space-y-4">
                            <textarea
                              id={field.key}
                              rows={2}
                              value={fieldValue}
                              onChange={(e) => handleChange({ 
                                ...draft[currentStep.key], 
                                [field.key]: e.target.value 
                              })}
                              placeholder={field.placeholder}
                              className="w-full pt-5 pb-5 px-5 bg-input border border-border rounded-lg text-base text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors leading-tight"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Special 2-column layout for team toggle fields */}
              {currentStep.key === 'team_labor' && (() => {
                const toggleFields = currentStep.fields.filter(field => 
                  field.type === 'toggle' && field.conditionalOn?.value === 'Yes'
                );
                const otherFields = currentStep.fields.filter(field => 
                  field.type !== 'toggle' || field.conditionalOn?.value !== 'Yes'
                );
                
                return (
                  <>
                    {/* Render non-toggle fields first */}
                    {otherFields.map((field) => {
                      // Handle conditional field rendering
                      if (field.conditionalOn) {
                        const conditionField = field.conditionalOn.field;
                        const conditionValue = field.conditionalOn.value;
                        const currentValue = draft[currentStep.key]?.[conditionField];
                        if (currentValue !== conditionValue) {
                          return null;
                        }
                      }
                      
                      return (
                        <div key={field.key} className="space-y-4">
                          <Label htmlFor={field.key} className="!text-lg font-light text-foreground">
                            {(() => {
                              // Add seasonal context for Team & Labor section
                              if (field.label.includes('{seasonal_phase}')) {
                                const currentMonth = selectedMonth ? selectedMonth.getMonth() + 1 : new Date().getMonth() + 1;
                                const currentYear = new Date().getFullYear();
                                const yearData = getYearData(currentYear);
                                const seasonalPhase = determineSeasonalPhase(yearData, currentMonth);
                                const seasonalDescription = getSeasonalDescription(seasonalPhase);
                                return field.label.replace('{seasonal_phase}', seasonalDescription.label.toLowerCase());
                              }
                              return field.label;
                            })()} 
                          </Label>
                          
                          {field.type === 'textbox' && (
                            <div className="space-y-4">
                              <textarea
                                id={field.key}
                                rows={5}
                                value={draft[currentStep.key]?.[field.key] || ''}
                                onChange={(e) => handleChange({ 
                                  ...draft[currentStep.key], 
                                  [field.key]: e.target.value 
                                })}
                                placeholder={field.placeholder}
                                className="w-full p-5 bg-input border border-border rounded-lg text-base text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors leading-relaxed"
                              />
                              <div className="flex justify-end">
                                <VoiceInput
                                  onTranscript={(transcript) => {
                                    const currentValue = draft[currentStep.key]?.[field.key] || '';
                                    const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
                                    handleChange({ 
                                      ...draft[currentStep.key], 
                                      [field.key]: newValue 
                                    });
                                  }}
                                  onError={handleVoiceError}
                                  disabled={saving}
                                  className="ml-2"
                                />
                              </div>
                            </div>
                          )}
                          
                          {field.type === 'slider' && (
                            <div className="space-y-6">
                              <div className="relative">
                                <input
                                  type="range"
                                  min="1"
                                  max="5"
                                  value={draft[currentStep.key]?.[field.key] || 3}
                                  onChange={(e) => handleChange({ 
                                    ...draft[currentStep.key], 
                                    [field.key]: parseInt(e.target.value) 
                                  })}
                                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                  style={{
                                    background: `linear-gradient(to right, #d5b274 0%, #d5b274 ${((draft[currentStep.key]?.[field.key] || 3) - 1) * 25}%, #e5e7eb ${((draft[currentStep.key]?.[field.key] || 3) - 1) * 25}%, #e5e7eb 100%)`
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-base text-muted px-2">
                                {(field.options as SliderOption[])?.map((option) => (
                                  <span 
                                    key={option.value}
                                    className={`text-center flex-1 ${
                                      draft[currentStep.key]?.[field.key] === option.value 
                                        ? 'text-foreground font-light' 
                                        : ''
                                    }`}
                                  >
                                    {option.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {field.type === 'dropdown' && (
                            <select
                              id={field.key}
                              value={draft[currentStep.key]?.[field.key] || ''}
                              onChange={(e) => handleChange({ 
                                ...draft[currentStep.key], 
                                [field.key]: e.target.value 
                              })}
                              className="w-full p-5 bg-input border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                            >
                              <option value="">Select an option...</option>
                              {(field.options as string[])?.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* 2-column grid for simplified toggle fields */}
                    {toggleFields.length > 0 && draft[currentStep.key]?.has_team === 'Yes' && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-light text-foreground mb-2">Team Performance & Issues</h3>
                        <p className="text-base text-muted font-light mb-4">Select any that apply this month</p>
                        <div className="grid grid-cols-2 gap-4">
                          {toggleFields.map((field) => (
                            <div key={field.key} className="space-y-3">
                              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                                <label className="text-sm text-foreground font-light cursor-pointer flex-1">
                                  {field.label}
                                </label>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      const currentValue = draft[currentStep.key]?.[field.key + '_enabled'] || false;
                                      handleChange({ 
                                        ...draft[currentStep.key], 
                                        [field.key + '_enabled']: !currentValue 
                                      });
                                    }}
                                    className={`px-3 py-1 rounded border transition-colors text-xs ${
                                      draft[currentStep.key]?.[field.key + '_enabled']
                                        ? 'bg-accent text-background border-accent'
                                        : 'bg-card border-border hover:bg-border text-foreground'
                                    }`}
                                  >
                                    {draft[currentStep.key]?.[field.key + '_enabled'] ? 'Yes' : 'No'}
                                  </button>
                                  
                                  {draft[currentStep.key]?.[field.key + '_enabled'] && (
                                    <button
                                      onClick={() => {
                                        const currentShowDetails = draft[currentStep.key]?.[field.key + '_show_details'] || false;
                                        handleChange({ 
                                          ...draft[currentStep.key], 
                                          [field.key + '_show_details']: !currentShowDetails 
                                        });
                                      }}
                                      className="px-2 py-1 text-xs text-accent hover:text-accent/80 transition-colors"
                                    >
                                      {draft[currentStep.key]?.[field.key + '_show_details'] ? 'Hide' : 'Details'}
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {draft[currentStep.key]?.[field.key + '_enabled'] && 
                               draft[currentStep.key]?.[field.key + '_show_details'] && (
                                <div className="space-y-2">
                                  <textarea
                                    id={field.key}
                                    rows={3}
                                    value={draft[currentStep.key]?.[field.key] || ''}
                                    onChange={(e) => handleChange({ 
                                      ...draft[currentStep.key], 
                                      [field.key]: e.target.value 
                                    })}
                                    placeholder={field.placeholder}
                                    className="w-full p-3 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                                  />
                                  <div className="flex justify-end">
                                    <VoiceInput
                                      onTranscript={(transcript) => {
                                        const currentValue = draft[currentStep.key]?.[field.key] || '';
                                        const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
                                        handleChange({ 
                                          ...draft[currentStep.key], 
                                          [field.key]: newValue 
                                        });
                                      }}
                                      onError={handleVoiceError}
                                      disabled={saving}
                                      className="ml-2"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              
              {/* Special 2-column layout for marketing toggle fields */}
              {currentStep.key === 'marketing' && (() => {
                const toggleFields = currentStep.fields.filter(field => field.type === 'toggle');
                const otherFields = currentStep.fields.filter(field => field.type !== 'toggle');
                
                return (
                  <>
                    {/* Render non-toggle fields first */}
                    {otherFields.map((field) => (
                      <div key={field.key} className="space-y-4">
                        <Label htmlFor={field.key} className="!text-lg font-light text-foreground">
                          {field.label}
                        </Label>
                        
                        {field.type === 'textbox' && (
                          <div className="space-y-4">
                            <textarea
                              id={field.key}
                              rows={5}
                              value={draft[currentStep.key]?.[field.key] || ''}
                              onChange={(e) => handleChange({ 
                                ...draft[currentStep.key], 
                                [field.key]: e.target.value 
                              })}
                              placeholder={field.placeholder}
                              className="w-full p-5 bg-input border border-border rounded-lg text-base text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors leading-relaxed"
                            />
                            <div className="flex justify-end">
                              <VoiceInput
                                onTranscript={(transcript) => {
                                  const currentValue = draft[currentStep.key]?.[field.key] || '';
                                  const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
                                  handleChange({ 
                                    ...draft[currentStep.key], 
                                    [field.key]: newValue 
                                  });
                                }}
                                onError={handleVoiceError}
                                disabled={saving}
                                className="ml-2"
                              />
                            </div>
                          </div>
                        )}
                        
                        {field.type === 'slider' && (
                          <div className="space-y-6">
                            <div className="relative">
                              <input
                                type="range"
                                min="1"
                                max="6"
                                value={draft[currentStep.key]?.[field.key] || 3}
                                onChange={(e) => handleChange({ 
                                  ...draft[currentStep.key], 
                                  [field.key]: parseInt(e.target.value) 
                                })}
                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                  background: `linear-gradient(to right, #d5b274 0%, #d5b274 ${((draft[currentStep.key]?.[field.key] || 3) - 1) * 20}%, #e5e7eb ${((draft[currentStep.key]?.[field.key] || 3) - 1) * 20}%, #e5e7eb 100%)`
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-base text-muted px-2">
                              {(field.options as SliderOption[])?.map((option) => (
                                <span 
                                  key={option.value}
                                  className={`text-center flex-1 ${
                                    draft[currentStep.key]?.[field.key] === option.value 
                                      ? 'text-foreground font-light' 
                                      : ''
                                  }`}
                                >
                                  {option.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {field.type === 'dropdown' && (
                          <select
                            id={field.key}
                            value={draft[currentStep.key]?.[field.key] || ''}
                            onChange={(e) => handleChange({ 
                              ...draft[currentStep.key], 
                              [field.key]: e.target.value 
                            })}
                            className="w-full p-5 bg-input border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                          >
                            <option value="">Select an option...</option>
                            {(field.options as string[])?.map(option => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                    
                    {/* 2-column grid for toggle fields */}
                    {toggleFields.length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-light text-foreground mb-2">Marketing Activities & Lead Sources</h3>
                        <p className="text-base text-muted font-light mb-4">Do you know where most leads came from?</p>
                        <div className="grid grid-cols-2 gap-6">
                          {toggleFields.map((field) => (
                            <div key={field.key} className="space-y-4">
                              <Label htmlFor={field.key} className="!text-base font-light text-foreground">
                                {field.label}
                              </Label>
                              
                              <div className="space-y-4">
                                <div className="flex items-center space-x-4">
                                  <button
                                    onClick={() => {
                                      const currentValue = draft[currentStep.key]?.[field.key + '_enabled'] || false;
                                      handleChange({ 
                                        ...draft[currentStep.key], 
                                        [field.key + '_enabled']: !currentValue 
                                      });
                                    }}
                                    className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                                      draft[currentStep.key]?.[field.key + '_enabled']
                                        ? 'bg-accent text-background border-accent'
                                        : 'bg-card border-border hover:bg-border text-foreground'
                                    }`}
                                  >
                                    {draft[currentStep.key]?.[field.key + '_enabled'] ? 'Yes' : 'No'}
                                  </button>
                                </div>
                                
                                {draft[currentStep.key]?.[field.key + '_enabled'] && (
                                  <div className="space-y-2">
                                    <textarea
                                      id={field.key}
                                      rows={3}
                                      value={draft[currentStep.key]?.[field.key] || ''}
                                      onChange={(e) => handleChange({ 
                                        ...draft[currentStep.key], 
                                        [field.key]: e.target.value 
                                      })}
                                      placeholder={field.placeholder}
                                      className="w-full p-3 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                                    />
                                    <div className="flex justify-end">
                                      <VoiceInput
                                        onTranscript={(transcript) => {
                                          const currentValue = draft[currentStep.key]?.[field.key] || '';
                                          const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
                                          handleChange({ 
                                            ...draft[currentStep.key], 
                                            [field.key]: newValue 
                                          });
                                        }}
                                        onError={handleVoiceError}
                                        disabled={saving}
                                        className="ml-2"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              
              {/* Regular field rendering for structured sections */}
              {currentStep.key !== 'marketing' && currentStep.key !== 'team_labor' && currentStep.fields && (currentStep.key === 'money_in' ? currentStep.fields.slice(3) : currentStep.fields)
                .filter((field) => {
                  // Handle conditional field rendering for Team & Labor section
                  if (field.conditionalOn) {
                    const conditionField = field.conditionalOn.field;
                    const conditionValue = field.conditionalOn.value;
                    const currentValue = draft[currentStep.key]?.[conditionField];
                    return currentValue === conditionValue;
                  }
                  return true;
                })
                .map((field) => (
                <div key={field.key} className="space-y-4">
                  <Label htmlFor={field.key} className="!text-lg font-light text-foreground">
                    {(() => {
                      // Add seasonal context for Team & Labor section
                      if (currentStep.key === 'team_labor' && field.label.includes('{seasonal_phase}')) {
                        const currentMonth = selectedMonth ? selectedMonth.getMonth() + 1 : new Date().getMonth() + 1;
                        const currentYear = new Date().getFullYear();
                        const yearData = getYearData(currentYear);
                        const seasonalPhase = determineSeasonalPhase(yearData, currentMonth);
                        const seasonalDescription = getSeasonalDescription(seasonalPhase);
                        return field.label.replace('{seasonal_phase}', seasonalDescription.label.toLowerCase());
                      }
                      return field.label;
                    })()}
                  </Label>
                  
                  {field.type === 'slider' && (
                    <div className="space-y-6">
                      <div className="relative">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={draft[currentStep.key]?.[field.key] || 3}
                          onChange={(e) => handleChange({ 
                            ...draft[currentStep.key], 
                            [field.key]: parseInt(e.target.value) 
                          })}
                          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #d5b274 0%, #d5b274 ${((draft[currentStep.key]?.[field.key] || 3) - 1) * 25}%, #e5e7eb ${((draft[currentStep.key]?.[field.key] || 3) - 1) * 25}%, #e5e7eb 100%)`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-base text-muted px-2">
                        {(field.options as SliderOption[])?.map((option) => (
                          <span 
                            key={option.value}
                            className={`text-center flex-1 ${
                              draft[currentStep.key]?.[field.key] === option.value 
                                ? 'text-foreground font-light' 
                                : ''
                            }`}
                          >
                            {option.label}
                          </span>
                        ))}
                      </div>
                      <div className="text-center">
                        <span className="text-lg font-light" style={{ color: '#d5b274' }}>
                          {(field.options as SliderOption[])?.find(opt => opt.value === (draft[currentStep.key]?.[field.key] || 3))?.label}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {field.type === 'textbox_with_suggestions' && (
                    <div className="space-y-4 mb-10">
                      <input
                        id={field.key}
                        type="text"
                        value={draft[currentStep.key]?.[field.key] || ''}
                        onChange={(e) => handleChange({ 
                          ...draft[currentStep.key], 
                          [field.key]: e.target.value 
                        })}
                        className="w-full p-5 bg-input border border-border rounded-lg text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                        placeholder="Type your answer or click a suggestion below"
                      />
                      <div className="flex flex-wrap gap-3">
                        {field.suggestions?.map(suggestion => (
                          <button
                            key={suggestion}
                            onClick={() => handleChange({ 
                              ...draft[currentStep.key], 
                              [field.key]: suggestion 
                            })}
                            className="px-4 py-2 text-base border border-gray-300 rounded-full hover:border-accent hover:text-accent transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {field.type === 'dropdown' && (
                    <select
                      id={field.key}
                      value={draft[currentStep.key]?.[field.key] || ''}
                      onChange={(e) => handleChange({ 
                        ...draft[currentStep.key], 
                        [field.key]: e.target.value 
                      })}
                      className="w-full p-5 bg-input border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                    >
                      <option value="">Select an option...</option>
                      {(field.options as string[])?.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'textbox' && (
                    <div className="space-y-4">
                      <textarea
                        id={field.key}
                        rows={5}
                        value={draft[currentStep.key]?.[field.key] || ''}
                        onChange={(e) => handleChange({ 
                          ...draft[currentStep.key], 
                          [field.key]: e.target.value 
                        })}
                        placeholder={field.placeholder}
                        className="w-full p-5 bg-input border border-border rounded-lg text-base text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors leading-relaxed"
                      />
                      <div className="flex justify-end">
                        <VoiceInput
                          onTranscript={(transcript) => {
                            const currentValue = draft[currentStep.key]?.[field.key] || '';
                            const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
                            handleChange({ 
                              ...draft[currentStep.key], 
                              [field.key]: newValue 
                            });
                          }}
                          onError={handleVoiceError}
                          disabled={saving}
                          className="ml-2"
                        />
                      </div>
                    </div>
                  )}
                  
                  {field.type === 'number_checklist' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {field.options?.map((option: any) => (
                          <div key={option.key} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
                            <label className="text-base text-foreground font-light">
                              {option.label}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="31"
                              value={draft[currentStep.key]?.[option.key] || ''}
                              onChange={(e) => handleChange({ 
                                ...draft[currentStep.key], 
                                [option.key]: e.target.value 
                              })}
                              className="w-20 p-2 bg-input border border-border rounded text-base text-foreground text-center focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {field.type === 'toggle' && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => {
                            const currentValue = draft[currentStep.key]?.[field.key + '_enabled'] || false;
                            handleChange({ 
                              ...draft[currentStep.key], 
                              [field.key + '_enabled']: !currentValue 
                            });
                          }}
                          className={`px-6 py-3 rounded-lg border transition-colors text-base ${
                            draft[currentStep.key]?.[field.key + '_enabled']
                              ? 'bg-accent text-background border-accent'
                              : 'bg-card border-border hover:bg-border text-foreground'
                          }`}
                        >
                          {draft[currentStep.key]?.[field.key + '_enabled'] ? 'Yes' : 'No'}
                        </button>
                        <span className="text-base text-muted font-light">Click to toggle</span>
                      </div>
                      
                      {draft[currentStep.key]?.[field.key + '_enabled'] && (
                        <div className="space-y-4">
                          <textarea
                            rows={4}
                            value={draft[currentStep.key]?.[field.key] || ''}
                            onChange={(e) => handleChange({ 
                              ...draft[currentStep.key], 
                              [field.key]: e.target.value 
                            })}
                            placeholder={field.placeholder}
                            className="w-full p-5 bg-input border border-border rounded-lg text-base text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors leading-relaxed"
                          />
                          <div className="flex justify-end">
                            <VoiceInput
                              onTranscript={(transcript) => {
                                const currentValue = draft[currentStep.key]?.[field.key] || '';
                                const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
                                handleChange({ 
                                  ...draft[currentStep.key], 
                                  [field.key]: newValue 
                                });
                              }}
                              onError={handleVoiceError}
                              disabled={saving}
                              className="ml-2"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {field.type === 'summary' && (
                    <div className="space-y-4">
                      <div className="p-6 bg-card border border-border rounded-lg">
                        <div className="prose prose-sm max-w-none text-foreground">
                          <div className="text-muted-foreground italic mb-4">
                            {field.placeholder}
                          </div>
                          <div className="min-h-[100px] text-base leading-relaxed">
                            {generateSummaryContent(field.key, draft)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Save Entry Button for structured sections */}
              <div className="flex justify-end pt-6">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => saveCurrentEntry(false)}
                  disabled={saving || !draft[currentStep.key]}
                  className="flex items-center gap-3 text-base px-6 py-3"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  Save Entry
                </Button>
              </div>
            </div>
          )}

          {!currentStep.fields && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content" className="text-sm font-medium text-foreground">
                  Share your thoughts and experiences:
                </Label>
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  onError={handleVoiceError}
                  disabled={saving}
                  className="ml-2"
                />
              </div>
              
              {voiceError && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {voiceError}
                </div>
              )}
              
              <textarea
                id="content"
                rows={8}
                value={draft[currentStep.key]}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full p-4 bg-input border border-border rounded-lg text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
              
              {/* Save Entry Button for current section */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveCurrentEntry(false)}
                  disabled={saving || !draft[currentStep.key]}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Entry
                </Button>
              </div>
            </div>
          )}
          
          <div className="text-xs text-muted">
            Tip: The more detail you provide, the better Wave Rider can understand your business patterns and provide personalized guidance. Use the voice button to speak your response or type directly.
          </div>
        </CardContent>
      </Card>

      {/* Navigation Controls - Keep consistent black background */}
      <Card className="bg-background border-border">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={isFirstStep || saving}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2"
              >
                Save Draft
              </Button>
              
              {isLastStep ? (
                <Button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  Complete Journal
                </Button>
              ) : (
                <Button
                  onClick={goNext}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-save indicator */}
      <div className="text-center">
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="text-sm text-muted hover:text-foreground transition-colors underline"
        >
          Auto-save draft
        </button>
      </div>
    </div>
  );
}