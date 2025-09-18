import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Clock, Tag, Loader2, Edit3, Trash2, Save, X, Check, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/auth-context';

interface Conversation {
  id: string;
  timestamp: Date;
  question: string;
  answer: string;
  tags: string[];
  duration?: number;
  saved?: boolean;
}

interface PendingMessage {
  text: string;
  timestamp: Date;
  isEditing: boolean;
}

export default function WaveRiderCoachPage() {
  const { user } = useAuth();
  
  // Temporary: Use dev user ID that has data for testing
  const effectiveUserId = user?.id || 'e2e72fa4-3e63-4b9d-ab12-1ed2ca583fa3';
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [editingTranscript, setEditingTranscript] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [textInput, setTextInput] = useState('');
  const [inputMethod, setInputMethod] = useState<'voice' | 'text'>('voice');
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const transcriptRef = useRef<string>('');

  // Load conversation history on component mount
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (effectiveUserId) {
        try {
          const response = await fetch(`http://localhost:8000/api/voice-coach/conversations?user_id=${effectiveUserId}&limit=20`);
          if (response.ok) {
            const data = await response.json();
            const historyConversations = data.conversations.map((conv: any) => ({
              id: conv.id,
              timestamp: new Date(conv.created_at),
              question: conv.question,
              answer: conv.answer,
              tags: conv.tags || [],
              duration: conv.duration_seconds,
              saved: true
            }));
            setConversations(historyConversations);
          }
        } catch (error) {
          console.error('Failed to load conversation history:', error);
        }
      }
    };

    loadConversationHistory();
  }, [effectiveUserId]);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Allow longer speech
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        console.log('🎤 Speech recognition started - microphone is active');
      };

      recognitionRef.current.onresult = (event: any) => {
        console.log('🗣️ Speech result event fired:', event);
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log(`Result ${i}: "${transcript}" (final: ${event.results[i].isFinal})`);
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);
        transcriptRef.current = fullTranscript; // Store in ref for onend handler
        console.log('📝 Full transcript:', fullTranscript);
      };

      recognitionRef.current.onend = () => {
        console.log('🛑 Speech recognition ended');
        setIsListening(false);
        
        // Create pending message if we have transcript
        const currentTranscript = transcriptRef.current;
        if (currentTranscript.trim()) {
          console.log('📋 Creating pending message with transcript:', currentTranscript.trim());
          setPendingMessage({
            text: currentTranscript.trim(),
            timestamp: new Date(),
            isEditing: false
          });
          setEditingTranscript(currentTranscript.trim());
        } else {
          console.log('❌ No transcript to create pending message');
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error, event);
        // For most errors, just stop listening and let user restart manually
        if (event.error === 'aborted') {
          // Aborted is normal when user stops manually
          console.log('Speech recognition aborted by user');
          return;
        } else if (event.error === 'no-speech') {
          console.log('No speech detected - keeping listening state');
          return;
        } else {
          console.log('Speech recognition error - stopping');
          setIsListening(false);
        }
      };
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isListening]);

  const startListening = async () => {
    // First check microphone permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Clean up
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Microphone access is required for voice input. Please allow microphone access and try again.');
      return;
    }
    
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      transcriptRef.current = ''; // Clear the ref too
      setPendingMessage(null);
      startTimeRef.current = new Date();
      setIsListening(true);
      
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
      
      // Create pending message if we have transcript
      if (transcript.trim()) {
        setPendingMessage({
          text: transcript.trim(),
          timestamp: new Date(),
          isEditing: false
        });
        setEditingTranscript(transcript.trim());
      }
    }
  };

  const handleQuestionSubmit = async (question: string, fromVoice: boolean = false) => {
    if (!question.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputMethod(fromVoice ? 'voice' : 'text');

    try {
      // Try RAG V2 endpoint first, then fallback to regular voice coach
      let response = await fetch('http://localhost:8000/api/voice-coach/v2/ask-fixed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question, 
          user_id: effectiveUserId
        })
      });
      
      // If RAG V2 fails, try the regular voice coach endpoint
      if (!response.ok) {
        response = await fetch('http://localhost:8000/api/voice-coach/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question, 
            user_id: effectiveUserId,
            timestamp: new Date().toISOString()
          })
        });
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      let answer = data.answer || "I understand your question about your business. Let me analyze your data and provide insights based on your current performance metrics.";
      
      // If we get a "tenant not found" error, provide a helpful fallback
      if (answer.includes('Tenant or user not found')) {
        answer = "I'm ready to help analyze your business data! However, it looks like your revenue data hasn't been seeded into the system yet. Once you upload some financial documents or revenue data, I'll be able to provide specific insights about your business performance, trends, and recommendations.";
      }

      // Speak the answer using text-to-speech
      if (synthRef.current && answer) {
        console.log('🔊 Speaking AI response:', answer.substring(0, 50) + '...');
        setIsSpeaking(true);
        
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        utterance.onend = () => {
          console.log('🔇 Finished speaking');
          setIsSpeaking(false);
        };
        
        utterance.onerror = (error) => {
          // Only log non-interrupted errors (interrupted is normal when user stops)
          if (error.error !== 'interrupted') {
            console.error('Speech synthesis error:', error);
          }
          setIsSpeaking(false);
        };
        
        synthRef.current.speak(utterance);
      }

      // Save conversation to database
      const saveResponse = await fetch('http://localhost:8000/api/voice-coach/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          answer,
          tags: data.tags || ['general'],
          duration_seconds: startTimeRef.current ? Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000) : undefined,
          user_id: effectiveUserId
        })
      });

      const saveData = await saveResponse.json();

      // Create conversation record
      const conversation: Conversation = {
        id: saveData.conversation_id || Date.now().toString(),
        timestamp: new Date(),
        question,
        answer,
        tags: data.tags || ['general'],
        duration: startTimeRef.current ? Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000) : undefined,
        saved: saveData.success || false
      };

      setConversations(prev => [conversation, ...prev]);
      
      // Clear pending message and custom tags
      setPendingMessage(null);
      setCustomTags([]);

      // Only speak the answer if it came from voice input
      if (fromVoice) {
        speakAnswer(answer);
      }

      // Save conversation to database
      try {
        const saveResponse = await fetch('http://localhost:8000/api/voice-coach/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: conversation.question,
            answer: conversation.answer,
            tags: conversation.tags,
            duration_seconds: conversation.duration,
            user_id: effectiveUserId
          })
        });
        
        if (saveResponse.ok) {
          const savedConv = await saveResponse.json();
          console.log('Conversation saved to database:', savedConv);
        }
      } catch (error) {
        console.error('Error saving conversation to database:', error);
      }

    } catch (error) {
      console.error('Error processing question:', error);
      const fallbackAnswer = "I'm having trouble processing your request right now. Please try again in a moment.";
      
      // Create fallback conversation record
      const conversation: Conversation = {
        id: Date.now().toString(),
        timestamp: new Date(),
        question,
        answer: fallbackAnswer,
        tags: customTags.length > 0 ? customTags : ['error'],
        duration: startTimeRef.current ? Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000) : undefined,
        saved: false
      };

      setConversations(prev => [conversation, ...prev]);
      setPendingMessage(null);
      setCustomTags([]);
      speakAnswer(fallbackAnswer);
    } finally {
      setIsProcessing(false);
      setTranscript('');
      startTimeRef.current = null;
      // Reset button state for next question
      setIsListening(false);
    }
  };

  const speakAnswer = (text: string) => {
    if (synthRef.current && text) {
      synthRef.current.cancel();
      setIsSpeaking(true);
      
      // Clean up text for better speech synthesis
      let cleanedText = text
        // Replace currency formatting for better speech
        .replace(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, (_, amount) => {
          // Convert $61,348.00 to "61,348 dollars"
          const cleanAmount = amount.replace(/\.00$/, '');
          return `${cleanAmount} dollars`;
        })
        // Replace other decimal numbers that might cause issues
        .replace(/(\d+)\.00\b/g, '$1')
        // Replace periods in numbers with "point" to avoid sentence breaks
        .replace(/(\d+)\.(\d+)/g, '$1 point $2');
      
      // Use smaller chunks and ensure proper sequencing
      const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      let currentSentence = 0;
      
      const speakSentence = () => {
        if (currentSentence < sentences.length) {
          const utterance = new SpeechSynthesisUtterance(sentences[currentSentence].trim() + '.');
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          utterance.onend = () => {
            currentSentence++;
            if (currentSentence < sentences.length) {
              setTimeout(() => speakSentence(), 100);
            } else {
              setIsSpeaking(false);
            }
          };
          
          utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            // Don't stop speaking on interruption errors, just continue
            if (event.error !== 'interrupted') {
              setIsSpeaking(false);
            }
          };
          
          if (synthRef.current) {
            synthRef.current.speak(utterance);
          }
        } else {
          setIsSpeaking(false);
        }
      };
      
      speakSentence();
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };


  const saveConversation = async (conversationId: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      // Call API to save conversation to database
      const response = await fetch('http://localhost:8000/api/voice-coach/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: conversation.question,
          answer: conversation.answer,
          tags: conversation.tags,
          duration_seconds: conversation.duration,
          user_id: user?.id || 'test-user'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Conversation saved:', result);
        // Mark as saved in local state
        setConversations(prev => 
          prev.map(c => c.id === conversationId ? { ...c, saved: true } : c)
        );
      } else {
        console.error('Failed to save conversation:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
  };

  const filteredConversations = selectedTags.length > 0 
    ? conversations.filter(conv => conv.tags.some(tag => selectedTags.includes(tag)))
    : conversations;

  const allTags = Array.from(new Set(conversations.flatMap(conv => conv.tags)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">WaveRider Coach</h1>
        <p className="text-muted text-lg">Your AI-powered business coach with voice interaction</p>
      </div>


      {/* Voice Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Voice Coach Interface
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            {/* Status Display */}
            <div className="text-center">
              {isProcessing && (
                <div className="flex items-center gap-2 text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing your question...</span>
                </div>
              )}
              {isListening && (
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Listening...</span>
                </div>
              )}
              {isSpeaking && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Volume2 className="h-4 w-4" />
                  <span>Speaking...</span>
                </div>
              )}
              {!isListening && !isProcessing && !isSpeaking && (
                <span className="text-muted">Ready to help with your business questions</span>
              )}
            </div>

            {/* Voice Controls */}
            <div className="flex items-center gap-4">
              <Button
                size="lg"
                className={`w-24 h-24 rounded-full border-0 ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-accent hover:bg-accent/90'
                }`}
                style={{ borderRadius: '50%' }}
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
              >
                {isListening ? (
                  <div className="flex flex-col items-center">
                    <Mic className="h-8 w-8" />
                    <span className="text-xs mt-1">Stop</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <MicOff className="h-8 w-8" />
                    <span className="text-xs mt-1">Start</span>
                  </div>
                )}
              </Button>

              {isSpeaking && (
                <Button
                  variant="outline"
                  onClick={stopSpeaking}
                  className="flex items-center gap-2"
                >
                  <VolumeX className="h-4 w-4" />
                  Stop Speaking
                </Button>
              )}
            </div>

            {/* Pending Message Preview */}
            {pendingMessage && (
              <div className="w-full max-w-2xl">
                <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-accent">
                      Voice Message Preview:
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (pendingMessage && !pendingMessage.isEditing) {
                            handleQuestionSubmit(pendingMessage.text, true);
                          }
                        }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPendingMessage(null);
                          setTranscript('');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {pendingMessage.isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingTranscript}
                        onChange={(e) => setEditingTranscript(e.target.value)}
                        className="w-full p-2 border border-border rounded bg-input text-foreground resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setPendingMessage({ 
                              ...pendingMessage, 
                              text: editingTranscript,
                              isEditing: false 
                            });
                          }}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPendingMessage({ ...pendingMessage, isEditing: false });
                            setEditingTranscript(pendingMessage.text);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-foreground">{pendingMessage.text}</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleQuestionSubmit(pendingMessage.text)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            'Send Message'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Live Transcript */}
            {transcript && !pendingMessage && (
              <div className="w-full max-w-2xl">
                <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                  <p className="text-sm font-medium text-accent mb-2">
                    Listening...
                  </p>
                  <p className="text-foreground">
                    {transcript}
                  </p>
                </div>
              </div>
            )}

            <p className="text-sm text-muted text-center max-w-md">
              Click the microphone to start recording, speak your question, 
              then click again to stop and submit.
            </p>
          </div>
        </CardContent>
      </Card>


      {/* SMS-Style Conversation Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* SMS-Style Chat Messages */}
            <div className="max-h-96 overflow-y-auto space-y-4 p-4 bg-background/50 rounded-lg border border-border">
              {conversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium mb-1">No conversations yet</p>
                  <p className="text-sm">Use the microphone above to start chatting with your AI coach</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div key={conversation.id} className="space-y-3">
                    {/* User Message Bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-[75%] lg:max-w-[60%]">
                        <div className="bg-primary text-primary-foreground rounded-3xl rounded-br-lg px-4 py-3 shadow-sm">
                          <p className="text-sm leading-relaxed">{conversation.question}</p>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1 px-2">
                          <span className="text-xs text-muted-foreground">
                            {conversation.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {conversation.tags.length > 0 && (
                            <div className="flex gap-1">
                              {conversation.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* AI Coach Response Bubble */}
                    <div className="flex justify-start">
                      <div className="max-w-[75%] lg:max-w-[60%]">
                        <div className="bg-card text-card-foreground border border-border rounded-3xl rounded-bl-lg px-4 py-3 shadow-sm">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white">AI</span>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground mt-1">Coach</span>
                          </div>
                          <p className="text-sm leading-relaxed text-card-foreground">{conversation.answer}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1 px-2">
                          <span className="text-xs text-muted-foreground">Just now</span>
                          <div className="flex items-center gap-1">
                            {!conversation.saved && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => saveConversation(conversation.id)}
                                className="h-7 px-2 text-xs hover:bg-accent hover:text-accent-foreground"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteConversation(conversation.id)}
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            
            {/* Text Input Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Type a Question:</p>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your question here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isProcessing) {
                      handleQuestionSubmit(textInput, false);
                      setTextInput('');
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isProcessing}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (textInput.trim()) {
                      handleQuestionSubmit(textInput, false);
                      setTextInput('');
                    }
                  }}
                  disabled={!textInput.trim() || isProcessing}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tag Assignment Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Assign Tags to Conversations:</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTagInput(!showTagInput)}
                  className="text-xs"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {showTagInput ? 'Cancel' : 'Add Tag'}
                </Button>
              </div>
              
              {/* Current Tags */}
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent rounded-full text-xs"
                    >
                      {tag}
                      <button
                        onClick={() => setCustomTags(prev => prev.filter((_, i) => i !== index))}
                        className="hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Tag Input */}
              {showTagInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter tag name (e.g., 'Revenue Strategy', 'Cost Analysis')..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        setCustomTags([...customTags, newTag.trim()]);
                        setNewTag('');
                        setShowTagInput(false);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newTag.trim()) {
                        setCustomTags([...customTags, newTag.trim()]);
                        setNewTag('');
                        setShowTagInput(false);
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}
              
              {/* Preset Tags */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Quick Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {['Revenue', 'Costs', 'Profit', 'Growth', 'Strategy', 'Marketing', 'Operations'].map(tag => (
                    <Button
                      key={tag}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!customTags.includes(tag)) {
                          setCustomTags([...customTags, tag]);
                        }
                      }}
                      className="text-xs h-7"
                      disabled={customTags.includes(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Custom Tags Display */}
            {customTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted">Custom tags:</span>
                {customTags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => setCustomTags(customTags.filter((_, i) => i !== index))}
                      className="hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Conversation History */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              Filter by Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allTags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? "secondary" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                >
                  {tag}
                </Button>
              ))}
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedTags([])}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversation List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Conversation History ({filteredConversations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredConversations.length > 0 ? (
                <div className="space-y-4">
                  {filteredConversations.map(conversation => (
                    <div
                      key={conversation.id}
                      className="bg-card border border-border rounded-lg p-4 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <Clock className="h-3 w-3" />
                          {conversation.timestamp.toLocaleString()}
                          {conversation.duration && (
                            <span>• {conversation.duration}s</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {conversation.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-accent mb-1">Question:</p>
                          <p className="text-foreground">{conversation.question}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-accent mb-1">Answer:</p>
                          <p className="text-muted">{conversation.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No conversations yet
                  </h3>
                  <p className="text-muted">
                    Start by asking your voice coach a question about your business.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
