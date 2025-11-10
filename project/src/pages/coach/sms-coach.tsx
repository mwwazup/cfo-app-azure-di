import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Save, Trash2, Tag, Clock, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import { useAuthContext } from '../../contexts/auth-context';
import { useCoachingHistory } from '../../hooks/useCoachingHistory';
import { supabase } from '../../config/supabaseClient';
import { CoachingService } from '../../services/coachingService';
import { generateAICoachResponse } from '../../services/multiAIService';
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

// ENHANCED: True AI coaching system (replaces all canned responses)
const generatePERLResponse = async (userMessage: string, userId: string, conversationMessages: Message[] = []): Promise<string> => {
  try {
    console.log('🤖 Using TRUE AI for response:', userMessage);
    
    // Get comprehensive financial data for AI context
    const comprehensiveContext = await getComprehensiveFinancialData();
    
    console.log('📊 Comprehensive context loaded:', {
      hasData: comprehensiveContext.hasData,
      summary: comprehensiveContext.summary?.substring(0, 100) + '...'
    });
    
    // Call the AI service with comprehensive financial context
    const aiResponse = await generateAICoachResponse({
      userMessage,
      userId,
      financialContext: comprehensiveContext,
      conversationHistory: conversationMessages.slice(-5) // Last 5 messages for context
    });
    
    console.log('✅ Got TRUE AI response:', aiResponse);
    return aiResponse;
    
  } catch (error) {
    console.error('❌ AI Error:', error);
    // Simple fallback - no more canned responses
    return "I'm having some technical difficulties right now. Can you tell me more about what you'd like to discuss?";
  }
};


// Get comprehensive financial data for AI context
const getComprehensiveFinancialData = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { hasData: false };
    }

    const userId = session.user.id;

    // Get ALL revenue data (all years) - this is the core table that should exist
    const { data: revenueEntries, error: revenueError } = await supabase
      .from('revenue_entries')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (revenueError) {
      console.error('Error fetching revenue data:', revenueError);
      return { 
        hasData: false, 
        summary: 'Unable to connect to revenue database. Please check your connection.' 
      };
    }

    // Get KPI data (with error handling)
    let kpiData = null;
    try {
      const { data } = await supabase
        .from('kpi_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      kpiData = data;
    } catch (error) {
      console.log('KPI table not available:', error);
    }

    // Get financial documents/statements (with error handling)
    let documents = null;
    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('upload_date', { ascending: false })
        .limit(5);
      documents = data;
    } catch (error) {
      console.log('Documents table not available:', error);
    }

    // Get recent coaching conversations (with error handling)
    let conversations = null;
    try {
      const { data } = await supabase
        .from('coaching_moments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      conversations = data;
    } catch (error) {
      console.log('Coaching moments table not available:', error);
    }

    console.log('📊 Financial data retrieved:', {
      revenue: revenueEntries?.length || 0,
      kpis: kpiData?.length || 0,
      documents: documents?.length || 0,
      conversations: conversations?.length || 0
    });

    // Build comprehensive financial context
    let financialContext: {
      hasData: boolean;
      summary: string;
      revenueData: any;
      kpiInsights: any;
      documentSummary: any;
      conversationHistory: any;
      profitMarginTarget?: number;
      currentProfitMargin?: number;
      profitMarginStatus?: string;
    } = {
      hasData: false,
      summary: '',
      revenueData: null,
      kpiInsights: null,
      documentSummary: null,
      conversationHistory: null
    };

    if (revenueEntries && revenueEntries.length > 0) {
      // Revenue Analysis (All Years)
      const totalRevenue = revenueEntries.reduce((sum, entry) => {
        return sum + (entry.actual_revenue || entry.amount || 0);
      }, 0);

      // Profit Margin Analysis
      const entriesWithMargin = revenueEntries.filter(entry => entry.profit_margin && entry.profit_margin > 0);
      let profitMarginTarget = null;
      let currentProfitMargin = null;
      let profitMarginStatus = 'Unknown';

      if (entriesWithMargin.length > 0) {
        // Get user's configured profit margin target (most recent entry)
        const currentYear = new Date().getFullYear();
        const currentYearEntries = revenueEntries.filter(entry => entry.year === currentYear && entry.profit_margin);
        profitMarginTarget = currentYearEntries.length > 0 ? currentYearEntries[0].profit_margin : null;

        // Calculate current average profit margin
        currentProfitMargin = entriesWithMargin.reduce((sum, entry) => sum + entry.profit_margin, 0) / entriesWithMargin.length;

        // Determine status
        if (profitMarginTarget && currentProfitMargin) {
          const ratio = currentProfitMargin / profitMarginTarget;
          if (ratio >= 0.95) profitMarginStatus = 'Meeting Target';
          else if (ratio >= 0.8) profitMarginStatus = 'Below Target';
          else profitMarginStatus = 'Significantly Below Target';
        }
      }

      // Year-over-year analysis
      const revenueByYear = revenueEntries.reduce((acc, entry) => {
        const year = entry.year;
        if (!acc[year]) acc[year] = 0;
        acc[year] += (entry.actual_revenue || entry.amount || 0);
        return acc;
      }, {});

      // Current year vs previous year
      const currentYear = new Date().getFullYear();
      const currentYearRevenue = revenueByYear[currentYear] || 0;
      const previousYearRevenue = revenueByYear[currentYear - 1] || 0;
      const yoyGrowth = previousYearRevenue > 0 ? 
        ((currentYearRevenue - previousYearRevenue) / previousYearRevenue * 100).toFixed(1) : 'N/A';

      // Monthly trends and seasonal analysis
      const recentEntries = revenueEntries.slice(-6); // Last 6 months
      const trend = recentEntries.length >= 2 ? 
        (recentEntries[recentEntries.length - 1].actual_revenue > recentEntries[0].actual_revenue ? 'up' : 'down') : 'stable';

      // Best and worst performing periods
      const bestEntry = revenueEntries.reduce((best, entry) => 
        (entry.actual_revenue || 0) > (best.actual_revenue || 0) ? entry : best
      );
      const worstEntry = revenueEntries.reduce((worst, entry) => 
        (entry.actual_revenue || 0) < (worst.actual_revenue || 0) ? entry : worst
      );

      // Detailed monthly breakdown by year
      const monthlyBreakdown: Record<string, Record<number, number>> = revenueEntries.reduce((acc, entry) => {
        const year = entry.year.toString();
        const month = entry.month;
        if (!acc[year]) acc[year] = {};
        acc[year][month] = entry.actual_revenue || entry.amount || 0;
        return acc;
      }, {} as Record<string, Record<number, number>>);

      // Seasonal analysis (Q4: Oct, Nov, Dec)
      const seasonalAnalysis: Record<string, any> = {};
      Object.keys(monthlyBreakdown).forEach(year => {
        const yearData = monthlyBreakdown[year];
        seasonalAnalysis[year] = {
          q4Total: (yearData[10] || 0) + (yearData[11] || 0) + (yearData[12] || 0),
          oct: yearData[10] || 0,
          nov: yearData[11] || 0,
          dec: yearData[12] || 0
        };
      });

      // Current year progress
      const currentMonth = new Date().getMonth() + 1;
      const currentYearMonthly = monthlyBreakdown[currentYear] || {};
      const remainingMonths = [];
      for (let month = currentMonth + 1; month <= 12; month++) {
        remainingMonths.push(month);
      }

      financialContext.revenueData = {
        totalAllTime: totalRevenue,
        currentYearRevenue,
        previousYearRevenue,
        yoyGrowth,
        trend,
        bestMonth: `${bestEntry.month}/${bestEntry.year} ($${(bestEntry.actual_revenue || 0).toLocaleString()})`,
        worstMonth: `${worstEntry.month}/${worstEntry.year} ($${(worstEntry.actual_revenue || 0).toLocaleString()})`,
        revenueByYear,
        totalEntries: revenueEntries.length,
        yearsOfData: Object.keys(revenueByYear).length,
        monthlyBreakdown,
        seasonalAnalysis,
        currentYearMonthly,
        remainingMonths
      };

      // Add profit margin data to context
      financialContext.profitMarginTarget = profitMarginTarget || undefined;
      financialContext.currentProfitMargin = currentProfitMargin || undefined;
      financialContext.profitMarginStatus = profitMarginStatus;
    }

    // KPI Analysis
    if (kpiData && kpiData.length > 0) {
      const recentKPIs = kpiData.slice(0, 5).map(kpi => ({
        name: kpi.kpi_name,
        value: kpi.kpi_value,
        category: kpi.kpi_category || 'General',
        date: kpi.created_at,
        suggestion: kpi.action_suggestion
      }));

      financialContext.kpiInsights = {
        totalKPIs: kpiData.length,
        recentKPIs,
        categories: [...new Set(kpiData.map(k => k.kpi_category).filter(Boolean))]
      };
    }

    // Document Summary
    if (documents && documents.length > 0) {
      financialContext.documentSummary = {
        totalDocuments: documents.length,
        recentUploads: documents.slice(0, 3).map(doc => ({
          name: doc.filename,
          type: doc.document_type,
          uploadDate: doc.upload_date
        }))
      };
    }

    // Conversation History
    if (conversations && conversations.length > 0) {
      financialContext.conversationHistory = {
        totalConversations: conversations.length,
        recentTopics: conversations.slice(0, 3).map(conv => ({
          topic: conv.user_message?.substring(0, 100) + '...',
          date: conv.created_at
        }))
      };

    }

    // Build summary
    if (financialContext.revenueData) {
      financialContext.hasData = true;
      const { revenueData } = financialContext;
      financialContext.summary = `Financial Overview: $${revenueData.totalAllTime.toLocaleString()} total revenue across ${revenueData.yearsOfData} years. Current year: $${revenueData.currentYearRevenue.toLocaleString()}. YoY Growth: ${revenueData.yoyGrowth}%. Best month: ${revenueData.bestMonth}. Trend: ${revenueData.trend}.`;
    }

    return financialContext;

  } catch (error) {
    console.error('Error fetching comprehensive financial data:', error);
    return { hasData: false, summary: 'Unable to retrieve financial data' };
  }
};

// Helper function to parse conversation from stored response
const parseConversationFromResponse = (response: string): Message[] => {
  try {
    // Try to parse if it's stored as JSON
    if (response.startsWith('[') || response.startsWith('{')) {
      return JSON.parse(response);
    }
    
    // Parse from text format: "User: message\n\nCoach: response"
    const messages: Message[] = [];
    const parts = response.split('\n\n');
    
    parts.forEach((part, index) => {
      if (part.startsWith('User: ')) {
        messages.push({
          id: `${Date.now()}-${index}`,
          type: 'user',
          content: part.substring(6),
          timestamp: new Date()
        });
      } else if (part.startsWith('Coach: ')) {
        messages.push({
          id: `${Date.now()}-${index}`,
          type: 'coach',
          content: part.substring(7),
          timestamp: new Date()
        });
      }
    });
    
    return messages;
  } catch (error) {
    // Fallback: create a single coach message
    return [{
      id: Date.now().toString(),
      type: 'coach',
      content: response,
      timestamp: new Date()
    }];
  }
};

export function SMSCoachPage() {
  const { dbUserId } = useAuthContext();
  const { addCoachingMoment } = useCoachingHistory();
  
  // Current conversation state with localStorage persistence
  const [currentConversation, setCurrentConversation] = useState<Conversation>(() => {
    // Try to restore from localStorage on initial load
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sms-coach-conversation-${dbUserId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Ensure createdAt is a Date object
          parsed.createdAt = new Date(parsed.createdAt || parsed.timestamp || Date.now());
          parsed.messages = parsed.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          return parsed;
        } catch (error) {
          console.error('Error parsing saved conversation:', error);
        }
      }
    }
    
    // Default conversation if nothing saved
    return {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      tags: [],
      createdAt: new Date(),
      saved: false
    };
  });
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Voice synthesis state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  
  // Load conversation history from coaching moments
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!dbUserId) return;
      
      try {
        // Get coaching moments and convert to conversations
        const moments = await CoachingService.getCoachingMoments(dbUserId);
        const conversations = moments.map(moment => ({
          id: moment.id,
          title: moment.title || moment.question.slice(0, 50) + '...',
          messages: parseConversationFromResponse(moment.response),
          tags: moment.tags || [], // Initialize empty tags array
          createdAt: new Date(moment.created_at),
          saved: true
        }));
        
        setConversationHistory(conversations);
      } catch (error) {
        console.error('Error loading conversation history:', error);
      }
    };
    
    loadConversationHistory();
  }, [dbUserId]);

  // Auto-save current conversation to localStorage
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
      
      // Load available voices
      const loadVoices = () => {
        const voices = speechSynthesisRef.current?.getVoices() || [];
        
        // Auto-select best voice if none selected
        if (!selectedVoice && voices.length > 0) {
          // Prioritize Google US English voice specifically
          const preferredVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('google') && voice.lang.startsWith('en-us')
          ) || voices.find(voice => 
            voice.name.toLowerCase().includes('google') && voice.lang.startsWith('en')
          ) || voices.find(voice => 
            voice.name.toLowerCase().includes('microsoft') && voice.lang.startsWith('en-us')
          ) || voices.find(voice => 
            voice.name.toLowerCase().includes('samantha') ||
            voice.name.toLowerCase().includes('alex')
          ) || voices.find(voice => 
            voice.lang.startsWith('en') && voice.localService === false
          ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
          
          setSelectedVoice(preferredVoice);
        }
      };
      
      // Load voices immediately and on voiceschanged event
      loadVoices();
      speechSynthesisRef.current.onvoiceschanged = loadVoices;
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

  // Function to clean text for speech synthesis
  const cleanTextForSpeech = (text: string): string => {
    return text
      // Remove markdown formatting
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold**
      .replace(/\*([^*]+)\*/g, '$1')     // Remove *italic*
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove [link](url)
      .replace(/`([^`]+)`/g, '$1')       // Remove `code`
      .replace(/#{1,6}\s*/g, '')         // Remove # headers
      .replace(/\n\s*[-*+]\s*/g, '. ')   // Convert bullet points to periods
      .replace(/\n{2,}/g, '. ')          // Convert double line breaks to periods
      .replace(/\n/g, ' ')               // Convert single line breaks to spaces
      .replace(/\s{2,}/g, ' ')           // Collapse multiple spaces
      // Standardize currency formatting for speech
      .replace(/\$([0-9,]+)K/g, (_, number) => {
        // Convert $549K to "549 thousand dollars"
        const cleanNumber = number.replace(/,/g, '');
        return `${cleanNumber} thousand dollars`;
      })
      .replace(/\$([0-9,]+)M/g, (_, number) => {
        // Convert $1.5M to "1.5 million dollars"
        const cleanNumber = number.replace(/,/g, '');
        return `${cleanNumber} million dollars`;
      })
      .replace(/\$([0-9,]+\.[0-9]{2})/g, (_, number) => {
        // Convert $549.00 to "549 dollars"
        const wholeNumber = number.split('.')[0].replace(/,/g, '');
        const cents = number.split('.')[1];
        if (cents === '00') {
          return `${wholeNumber} dollars`;
        } else {
          return `${wholeNumber} dollars and ${cents} cents`;
        }
      })
      .replace(/\$([0-9,]+)/g, (_, number) => {
        // Convert $549,217 to "549,217 dollars"
        return `${number} dollars`;
      })
      // Convert percentages to speech-friendly format
      .replace(/([0-9.]+)%/g, '$1 percent')
      .trim();
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || !speechSynthesisRef.current || isSpeaking) return;
    
    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();
    
    // Clean the text for better speech synthesis
    const cleanedText = cleanTextForSpeech(text);
    
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Use selected voice or fallback to preferred voice
    if (selectedVoice) {
      utterance.voice = selectedVoice;
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
      // Enhanced PERL response with Financial Intelligence and safe fallbacks
      const coachResponse = await generatePERLResponse(content, dbUserId || '', currentConversation.messages);
      
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
    if (currentConversation.messages.length === 0) {
      alert('No messages to save');
      return;
    }

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

      // Clear localStorage since it's now saved
      localStorage.removeItem(`sms-coach-conversation-${dbUserId}`);

      alert('Conversation saved successfully!');
    } catch (error) {
      console.error('Error saving conversation:', error);
      alert('Failed to save conversation. Please try again.');
    }
  };


  const startNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      tags: [],
      createdAt: new Date(),
      saved: false
    };
    
    setCurrentConversation(newConversation);
    setConversationTitle('');
    
    // Clear localStorage
    if (dbUserId) {
      localStorage.removeItem(`sms-coach-conversation-${dbUserId}`);
    }
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
            <div className="flex items-center space-x-2">
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
            </div>
            
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
            <div className="flex-1 flex items-end space-x-2">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(textInput);
                  }
                }}
                placeholder={isListening ? "Listening..." : "Type your message... (Shift+Enter for new line)"}
                className="flex-1 bg-card border border-accent/20 rounded-lg px-4 py-2 focus:outline-none focus:border-accent mobile-chat-input focus-ring text-foreground resize-none min-h-[40px] max-h-[120px]"
                disabled={isLoading || isListening}
                rows={1}
                style={{
                  height: 'auto',
                  minHeight: '40px',
                  maxHeight: '120px',
                  overflowY: textInput.split('\n').length > 3 ? 'auto' : 'hidden'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={() => handleSendMessage(textInput)}
                disabled={!textInput.trim() || isLoading}
                className="p-2 bg-accent hover:bg-accent/90 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring border border-accent self-end mb-1"
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
