import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Save, Trash2, Tag, Clock, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { useCoachingHistory } from '../../hooks/useCoachingHistory';
import { supabase } from '../../config/supabaseClient';
import '../../styles/sms-coach.css';

interface Message {
  id: string;
  type: 'user' | 'coach';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  tags: string[];
  createdAt: Date;
  saved: boolean;
}

// Agentic PERL coaching system with financial data retrieval
const generatePERLResponse = async (userInput: string, userId: string): Promise<string> => {
  const input = userInput.toLowerCase();
  
  // Detect financial data queries
  const isFinancialQuery = input.includes('revenue') || input.includes('income') || input.includes('profit') || 
                          input.includes('expense') || input.includes('cost') || input.includes('sales') ||
                          input.includes('total') || input.includes('2024') || input.includes('2023') ||
                          input.includes('financial') || input.includes('money') || input.includes('cash');
  
  if (isFinancialQuery) {
    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (token) {
        // Fetch financial statements
        const response = await fetch('/api/financial/statements', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const statements = await response.json();
          
          if (statements.length > 0) {
            // Analyze the query and extract relevant data
            const analysisResult = analyzeFinancialQuery(userInput, statements);
            return `Based on your financial data, ${analysisResult}. 

**PERL Analysis:**
- **Problem**: ${analysisResult.includes('no data') ? 'Missing financial data for accurate analysis' : 'Understanding your financial position'}
- **Evaluate**: Let's assess what this means for your business health
- **Roadmap**: What actions should you take based on these numbers?
- **Learn**: What insights can we extract to improve future performance?

What specific aspect would you like to explore further?`;
          } else {
            return `I'd love to help you analyze your 2024 revenue, but I don't see any financial statements uploaded yet.

**PERL Approach:**
- **Problem**: No financial data available for analysis
- **Evaluate**: We need your financial statements to provide accurate insights
- **Roadmap**: Upload your financial statements (income statements, P&L, etc.) to get started
- **Learn**: Once uploaded, I can help you understand trends, identify opportunities, and make data-driven decisions

Would you like me to guide you through uploading your financial documents?`;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  }
  
  // Continue with original PERL coaching logic for non-financial queries
  // Problem-focused responses
  if (input.includes('problem') || input.includes('stuck') || input.includes('challenge') || input.includes('issue')) {
    const problemResponses = [
      "Let's identify the core problem. What specifically is blocking your progress right now? Is it a resource constraint, a skill gap, or something else?",
      "I hear you're facing a challenge. Can you break this down into smaller, more specific issues? Sometimes the real problem is hidden beneath the surface.",
      "Problems often have multiple layers. What's the immediate issue, and what might be the underlying cause? Let's dig deeper.",
      "When did you first notice this problem? Understanding the timeline can help us identify what changed and why."
    ];
    return problemResponses[Math.floor(Math.random() * problemResponses.length)];
  }
  
  // Evaluate-focused responses
  if (input.includes('where am i') || input.includes('evaluate') || input.includes('assess') || input.includes('current')) {
    const evaluateResponses = [
      "Let's take an honest look at where you stand. On a scale of 1-10, how would you rate your current progress toward your main business goal?",
      "Evaluation requires data. What metrics are you currently tracking, and what story do they tell about your business?",
      "Sometimes we're closer than we think, sometimes further. What evidence do you have of your current position - both positive and concerning?",
      "Let's assess your resources: time, money, skills, and support. Which of these is your strongest asset right now, and which needs attention?"
    ];
    return evaluateResponses[Math.floor(Math.random() * evaluateResponses.length)];
  }
  
  // Roadmap-focused responses
  if (input.includes('next') || input.includes('roadmap') || input.includes('plan') || input.includes('move') || input.includes('action')) {
    const roadmapResponses = [
      "Great question! Let's create a clear path forward. What's the single most important outcome you need to achieve in the next 30 days?",
      "Your roadmap should have clear milestones. If you could only accomplish 3 things this quarter, what would move the needle most?",
      "Let's prioritize your next moves. What action, if taken today, would have the biggest positive impact on your business?",
      "Every roadmap needs checkpoints. How will you measure progress, and what will you do if you get off track?"
    ];
    return roadmapResponses[Math.floor(Math.random() * roadmapResponses.length)];
  }
  
  // Learn-focused responses
  if (input.includes('learn') || input.includes('grow') || input.includes('skill') || input.includes('improve') || input.includes('development')) {
    const learnResponses = [
      "Growth mindset is key! What's one skill that, if you developed it, would significantly impact your business success?",
      "Learning never stops in business. What's the last thing you learned that changed how you operate? What's next on your learning list?",
      "The best entrepreneurs are continuous learners. What area of your business do you feel least confident about? That might be your biggest growth opportunity.",
      "Level up by learning from others. Who in your industry do you admire, and what specific skills or approaches could you learn from them?"
    ];
    return learnResponses[Math.floor(Math.random() * learnResponses.length)];
  }
  
  // General PERL framework responses
  const generalResponses = [
    "Welcome to PERL coaching! Let's start with the fundamentals: What's the biggest challenge holding your business back right now? (Problem)",
    "I'm here to guide you through the PERL framework. Would you like to explore a specific Problem, Evaluate your current situation, create a Roadmap, or focus on Learning and growth?",
    "Every successful business owner needs clarity. Let's use PERL to break down your situation: Problem → Evaluate → Roadmap → Learn. Where would you like to start?",
    "The PERL framework helps transform friction into growth. What aspect of your business feels most challenging or unclear right now?",
    "Let's turn your business challenges into opportunities. Using PERL, we can identify problems, evaluate honestly, create roadmaps, and accelerate learning. What's on your mind?"
  ];
  
  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
};

// Helper function to analyze financial queries and extract insights
const analyzeFinancialQuery = (query: string, statements: any[]): string => {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('revenue') || queryLower.includes('income') || queryLower.includes('sales')) {
    if (queryLower.includes('2024')) {
      // Try to find 2024 revenue data
      const revenueData = statements.find(s => s.statement_type === 'income_statement' && 
                                         s.upload_date.includes('2024'));
      if (revenueData) {
        return "I found your 2024 income statement. Let me analyze your revenue performance";
      } else {
        return "I don't see a 2024 income statement uploaded yet. To get your exact revenue figures, please upload your 2024 income statement or P&L";
      }
    }
  }
  
  if (queryLower.includes('total') && queryLower.includes('2024')) {
    return "I can see you have financial data uploaded. For precise 2024 totals, I need to analyze your complete financial statements";
  }
  
  return "I can help analyze your financial data once you provide more specific information about what metrics you'd like to review";
};

export function SMSCoachPage() {
  const { user } = useAuth();
  const { addCoachingMoment } = useCoachingHistory();
  
  // Current conversation state
  const [currentConversation, setCurrentConversation] = useState<Conversation>({
    id: Date.now().toString(),
    title: 'New Conversation',
    messages: [],
    tags: [],
    createdAt: new Date(),
    saved: false
  });
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Voice synthesis state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  
  // Text input state
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [conversationTitle, setConversationTitle] = useState('');
  const [showTitleEdit, setShowTitleEdit] = useState(false);
  const [currentSurfWord, setCurrentSurfWord] = useState(0);
  
  // Conversation history
  const [conversationHistory, setConversationHistory] = useState<Conversation[]>([]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Surf words for loading animation
  const surfWords = ['Surfing', 'Floating', 'Riding', 'Paddling'];

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        // Use a timeout to ensure transcript is processed
        setTimeout(() => {
          if (transcript && transcript.trim()) {
            handleSendMessage(transcript, true);
            setTranscript('');
          }
          setIsRecording(false);
          setIsListening(false);
        }, 100);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation.messages]);

  // Cycle through surf words when loading
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentSurfWord((prev) => (prev + 1) % surfWords.length);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLoading, surfWords.length]);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      setIsListening(true);
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      // The onend event will handle the rest
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || !speechSynthesisRef.current || isSpeaking) return;
    
    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Try to use a professional voice
    const voices = speechSynthesisRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechSynthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleVoice = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const handleSendMessage = async (content: string, isVoice = false) => {
    if (!content.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
      isVoice
    };

    // Add user message to conversation
    setCurrentConversation(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));

    setTextInput('');
    setIsLoading(true);

    try {
      // Temporary mock response until backend API is fixed
      // TODO: Replace with actual API call once backend is working
      const coachResponse = await generatePERLResponse(content, user.id);
      
      // Simulate API delay for realistic experience
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      const coachMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'coach',
        content: coachResponse,
        timestamp: new Date()
      };

      // Add coach response to conversation
      setCurrentConversation(prev => ({
        ...prev,
        messages: [...prev.messages, coachMessage]
      }));

      // Speak the coach response
      speakText(coachResponse);

    } catch (error) {
      console.error('Error getting coach response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'coach',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again.',
        timestamp: new Date()
      };

      setCurrentConversation(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async () => {
    if (currentConversation.messages.length === 0) return;

    try {
      // Generate a title from the first user message if not set
      const title = conversationTitle || 
        currentConversation.messages.find(m => m.type === 'user')?.content.slice(0, 50) + '...' ||
        'Untitled Conversation';

      // Save to coaching history using existing service
      const conversationSummary = currentConversation.messages
        .map(m => `${m.type === 'user' ? 'User' : 'Coach'}: ${m.content}`)
        .join('\n\n');

      await addCoachingMoment({
        question: currentConversation.messages.find(m => m.type === 'user')?.content || 'Conversation',
        response: conversationSummary,
        title: title,
        response_type: 'quick_ridr'
      });

      // Update conversation state
      const savedConversation = {
        ...currentConversation,
        title,
        saved: true
      };

      setCurrentConversation(savedConversation);
      setConversationHistory(prev => [savedConversation, ...prev]);
      setConversationTitle('');
      setShowTitleEdit(false);

      alert('Conversation saved successfully!');
    } catch (error) {
      console.error('Error saving conversation:', error);
      alert('Failed to save conversation. Please try again.');
    }
  };

  const startNewConversation = () => {
    setCurrentConversation({
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      tags: [],
      createdAt: new Date(),
      saved: false
    });
  };

  const addTag = () => {
    if (newTag.trim() && !currentConversation.tags.includes(newTag.trim())) {
      setCurrentConversation(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentConversation(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-6 mb-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground tracking-tight">PERL</h1>
          <div className="w-24 h-1 mx-auto rounded-full bg-accent"></div>
        </div>
        <p className="text-xl text-muted max-w-4xl mx-auto leading-relaxed pb-4">
          Transform business friction into growth and clarity. Your AI coach uses the PERL framework to guide you through challenges and unlock your potential.
        </p>
        
        {/* PERL Framework Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 pb-8">
          {/* Problem Tile */}
          <div className="bg-card rounded-xl shadow-sm border border-border hover:shadow-xl transition-all duration-300 !bg-[#fffaf4]">
            <div className="px-6 py-4 pt-6 !bg-[#fffaf4] rounded-xl">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md bg-accent">
                  <span className="text-2xl font-bold text-background">P</span>
                </div>
                <h3 className="text-lg font-semibold text-[#222222]">Problem</h3>
                <p className="text-sm leading-relaxed text-[#222222]">
                  "What's holding me back?" Identify and articulate the core challenges preventing your progress.
                </p>
              </div>
            </div>
          </div>

          {/* Evaluate Tile */}
          <div className="bg-card rounded-xl shadow-sm border border-border hover:shadow-xl transition-all duration-300 !bg-[#fffaf4]">
            <div className="px-6 py-4 pt-6 !bg-[#fffaf4] rounded-xl">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md bg-accent">
                  <span className="text-2xl font-bold text-background">E</span>
                </div>
                <h3 className="text-lg font-semibold text-[#222222]">Evaluate</h3>
                <p className="text-sm leading-relaxed text-[#222222]">
                  "Where am I really at?" Assess your current situation with honest, data-driven insights.
                </p>
              </div>
            </div>
          </div>

          {/* Roadmap Tile */}
          <div className="bg-card rounded-xl shadow-sm border border-border hover:shadow-xl transition-all duration-300 !bg-[#fffaf4]">
            <div className="px-6 py-4 pt-6 !bg-[#fffaf4] rounded-xl">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md bg-accent">
                  <span className="text-2xl font-bold text-background">R</span>
                </div>
                <h3 className="text-lg font-semibold text-[#222222]">Roadmap</h3>
                <p className="text-sm leading-relaxed text-[#222222]">
                  "What are my next moves?" Create clear, actionable steps to move forward strategically.
                </p>
              </div>
            </div>
          </div>

          {/* Learn Tile */}
          <div className="bg-card rounded-xl shadow-sm border border-border hover:shadow-xl transition-all duration-300 !bg-[#fffaf4]">
            <div className="px-6 py-4 pt-6 !bg-[#fffaf4] rounded-xl">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md bg-accent">
                  <span className="text-2xl font-bold text-background">L</span>
                </div>
                <h3 className="text-lg font-semibold text-[#222222]">Learn & Level Up</h3>
                <p className="text-sm leading-relaxed text-[#222222]">
                  "How do I keep growing?" Develop skills and mindsets for continuous improvement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex h-[calc(100vh-12rem)] bg-card text-foreground rounded-xl overflow-hidden border border-accent/20">
        {/* Conversation History Sidebar */}
        {showHistory && (
        <div className="w-80 bg-background border-r border-accent/20 flex flex-col">
          <div className="p-4 border-b border-accent/20">
            <h2 className="text-lg font-semibold text-foreground">Conversation History</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversationHistory.map((conv) => (
              <div
                key={conv.id}
                className="p-3 bg-card rounded-lg cursor-pointer hover:bg-accent/10 transition-colors border border-accent/20"
                onClick={() => setCurrentConversation(conv)}
              >
                <div className="font-medium text-sm truncate text-foreground">{conv.title}</div>
                <div className="text-xs text-muted mt-1">{formatDate(conv.createdAt)}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {conv.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs bg-accent/20 text-accent px-2 py-1 rounded border border-accent/30">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-accent/20 bg-background flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
            >
              <MessageCircle size={20} className="text-accent" />
            </button>
            <div>
              {showTitleEdit ? (
                <input
                  value={conversationTitle}
                  onChange={(e) => setConversationTitle(e.target.value)}
                  onBlur={() => setShowTitleEdit(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setShowTitleEdit(false)}
                  className="bg-card border border-accent/20 px-2 py-1 rounded text-sm text-foreground focus:outline-none focus:border-accent"
                  placeholder="Enter conversation title..."
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-xl font-semibold cursor-pointer hover:text-accent text-foreground"
                  onClick={() => setShowTitleEdit(true)}
                >
                  {currentConversation.title}
                </h1>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <Clock size={12} className="text-accent" />
                <span className="text-xs text-muted">
                  {formatDate(currentConversation.createdAt)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Voice Controls */}
            <button
              onClick={toggleVoice}
              className={`p-2 rounded-lg transition-colors ${
                voiceEnabled 
                  ? 'hover:bg-accent/10 text-accent' 
                  : 'hover:bg-gray-600 text-gray-400'
              }`}
              title={voiceEnabled ? 'Voice responses enabled' : 'Voice responses disabled'}
            >
              {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-2 hover:bg-red-600/10 rounded-lg transition-colors text-red-400"
                title="Stop speaking"
              >
                <VolumeX size={20} />
              </button>
            )}

            {/* Tags */}
            <div className="flex items-center space-x-2">
              {currentConversation.tags.map((tag) => (
                <span 
                  key={tag} 
                  className="text-xs bg-accent/20 text-accent px-2 py-1 rounded flex items-center space-x-1 cursor-pointer hover:bg-accent/30 border border-accent/30"
                  onClick={() => removeTag(tag)}
                >
                  <span>{tag}</span>
                  <span className="text-xs">×</span>
                </span>
              ))}
              
              {showTagInput ? (
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onBlur={addTag}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  className="bg-card border border-accent/20 px-2 py-1 rounded text-xs w-20 text-foreground focus:outline-none focus:border-accent"
                  placeholder="Tag..."
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="p-1 hover:bg-accent/10 rounded transition-colors"
                >
                  <Tag size={16} className="text-accent" />
                </button>
              )}
            </div>

            <button
              onClick={saveConversation}
              disabled={currentConversation.messages.length === 0}
              className="p-2 hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} className="text-accent" />
            </button>
            
            <button
              onClick={startNewConversation}
              className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
            >
              <Trash2 size={20} className="text-accent" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 chat-container chat-scrollbar bg-background"
        >
          {currentConversation.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted">
                <div className="text-lg text-foreground mb-2">Transform friction into growth</div>
                <p className="text-sm mb-4">PERL helps you turn business challenges into clarity and actionable insights</p>
                <div className="text-xs text-muted space-y-1">
                  <p>Ask about Problems, Evaluation, Roadmaps, or Learning</p>
                  <p>Use voice or text to start your session</p>
                </div>
              </div>
            </div>
          ) : (
            currentConversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-accent text-background'
                      : 'bg-card text-foreground border border-accent/20'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs opacity-70">
                      {formatTime(message.timestamp)}
                    </span>
                    <div className="flex items-center space-x-1">
                      {message.isVoice && (
                        <Mic size={12} className="opacity-70" />
                      )}
                      {message.type === 'coach' && isSpeaking && (
                        <Volume2 size={12} className="opacity-70 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card px-4 py-2 rounded-2xl border border-accent/20">
                <div className="flex items-center space-x-2">
                  <span className="text-accent text-sm font-medium transition-all duration-300">
                    {surfWords[currentSurfWord]}
                  </span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-accent rounded-full typing-dot wave"></div>
                    <div className="w-1 h-1 bg-accent rounded-full typing-dot wave"></div>
                    <div className="w-1 h-1 bg-accent rounded-full typing-dot wave"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-accent/20 bg-background">
          <div className="flex items-center space-x-4">
            {/* Voice Button */}
            <button
              onClick={isListening ? stopRecording : startRecording}
              className={`w-18 h-18 rounded-full flex items-center justify-center transition-all duration-200 focus-ring border-2 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 scale-110 recording-pulse border-red-400'
                  : 'bg-accent hover:bg-accent/90 border-accent'
              }`}
              disabled={isLoading}
            >
              {isListening ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-background" />}
            </button>

            {/* Text Input */}
            <div className="flex-1 flex items-center space-x-2">
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(textInput)}
                placeholder={isListening ? "Listening..." : "Type your message..."}
                className="flex-1 bg-card border border-accent/20 rounded-full px-4 py-2 focus:outline-none focus:border-accent mobile-chat-input focus-ring text-foreground"
                disabled={isLoading || isListening}
              />
              <button
                onClick={() => handleSendMessage(textInput)}
                disabled={!textInput.trim() || isLoading}
                className="p-2 bg-accent hover:bg-accent/90 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring border border-accent"
              >
                <Send size={20} className="text-background" />
              </button>
            </div>
          </div>
          
          {/* Voice Transcript Display */}
          {isListening && transcript && (
            <div className="mt-2 p-2 bg-card border border-accent/20 rounded-lg text-sm">
              <span className="text-accent">Listening: </span>
              <span className="text-foreground">{transcript}</span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default SMSCoachPage;
