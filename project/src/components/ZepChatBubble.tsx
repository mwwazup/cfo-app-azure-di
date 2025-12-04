import { useState, useRef, useEffect } from 'react';
import { useZepChat } from '../hooks/useZepChat';
import { MessageCircle, X, Send, Loader2, Minimize2 } from 'lucide-react';

const surfWords = ['Surfing...', 'Riding the wave...', 'Boarding...', "Swimming...", 'Catching air...'];

export function ZepChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [currentSurfWord, setCurrentSurfWord] = useState(0);
  const { messages, isLoading, error, sendMessage, loadHistory } = useZepChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Cycle through surf words while loading
  useEffect(() => {
    if (!isLoading) {
      setCurrentSurfWord(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentSurfWord((prev) => (prev + 1) % surfWords.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await sendMessage(input);
    setInput('');
  };

  const toggleChat = async () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    setIsMinimized(false);
    
    // Load history when opening chat
    if (willOpen) {
      await loadHistory();
    }
  };

  const toggleMinimize = () => {
    // Minimize = close the chat window completely, show circular button
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 w-14 h-14 bg-accent hover:bg-accent/90 text-background rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center z-50 group"
          title="Chat with your CFO Coach"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 w-80 bg-card border border-border rounded-lg shadow-2xl z-50 transition-all flex flex-col max-h-[calc(100vh-6rem)]"
          style={{ height: 'min(500px, calc(100vh - 6rem))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-accent to-accent/80 rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-background" />
              <div>
                <h3 className="text-sm font-semibold text-background">WAVE RIDER Coach</h3>
                <p className="text-xs text-background/80">AI-powered business coaching</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMinimize}
                className="text-background hover:text-background/80 transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={toggleChat}
                className="text-background hover:text-background/80 transition-colors"
                title="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-accent" />
                    <p className="text-sm font-medium mb-1 text-foreground">Hi! I'm your WAVE coach.</p>
                    <p className="text-xs text-muted-foreground">Ask me anything about your business!</p>
                  </div>
                )}

                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-accent text-background'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-background/70' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      <span className="text-sm text-foreground font-medium transition-all duration-300">
                        {surfWords[currentSurfWord]}
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Ask about your business... (Shift+Enter for new line)"
                    className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    disabled={isLoading}
                    rows={2}
                    style={{
                      resize: 'vertical',
                      minHeight: '44px',
                      maxHeight: '120px'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="px-4 py-2 bg-accent text-background rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    title="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </form>
            </>
        </div>
      )}
    </>
  );
}
