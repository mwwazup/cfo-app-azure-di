import { env } from '../config/env';

export interface ZepMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  context: string;
  recentMessages: any[];
  relevantMemories: any[];
  summary?: string;
  facts?: Record<string, any>;
  financialContext?: Record<string, any>;
}

/**
 * Zep Service - Memory persistence for AI chat via backend proxy
 * Provides graceful degradation when Zep is not configured
 */
class ZepService {
  private backendUrl: string;
  private initialized = false;

  constructor() {
    // Backend URL from environment
    this.backendUrl = env.backendUrl || 'http://localhost:8000';
    
    // Check if backend is available
    this.checkBackendHealth();
  }

  /**
   * Check backend Zep health
   */
  private async checkBackendHealth() {
    try {
      const response = await fetch(`${this.backendUrl}/api/zep/health`);
      const data = await response.json();
      
      if (data.configured) {
        this.initialized = true;
        console.log('✅ Zep backend proxy configured - memory features available');
      } else {
        console.warn('⚠️ Zep not configured on backend - chat will work without persistent memory');
      }
    } catch (error) {
      console.warn('⚠️ Backend not reachable - chat will work without persistent memory');
    }
  }

  /**
   * Check if Zep is available
   */
  isAvailable(): boolean {
    return this.initialized;
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  /**
   * Initialize session (threads are auto-created in Zep Cloud)
   * This method is kept for API compatibility but doesn't need to do anything
   */
  async initializeSession(userId: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }
    
    console.log(`📝 Zep thread ready for user ${userId}`);
    // Threads are automatically created when adding messages in Zep Cloud
  }

  /**
   * Update session metadata (stored as facts in Zep Cloud)
   */
  async updateSessionMetadata(userId: string, _metadata: Record<string, any>): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      // Metadata is automatically extracted from conversations in Zep Cloud
      console.log(`📝 Metadata will be extracted from conversations for user ${userId}`);
    } catch (error) {
      console.error('Error updating session metadata:', error);
    }
  }

  // ==========================================
  // MEMORY STORAGE
  // ==========================================

  /**
   * Save a conversation exchange to Zep via backend
   */
  async saveConversation(
    userId: string,
    messages: ZepMessage[],
    options?: {
      metadata?: Record<string, any>;
      userEmail?: string;
      userFirstName?: string;
      userLastName?: string;
    }
  ): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      const response = await fetch(`${this.backendUrl}/api/zep/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          messages: messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
            metadata: msg.metadata
          })),
          userEmail: options?.userEmail,
          userFirstName: options?.userFirstName,
          userLastName: options?.userLastName
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`💾 Saved ${messages.length} messages to Zep for user ${userId}`);
      }
    } catch (error) {
      console.error('Error saving conversation to Zep:', error);
      // Graceful degradation - don't throw, just log
    }
  }

  /**
   * Save a single user-assistant exchange
   */
  async saveExchange(
    userId: string,
    userMessage: string,
    assistantMessage: string,
    options?: {
      metadata?: Record<string, any>;
      userEmail?: string;
      userFirstName?: string;
      userLastName?: string;
    }
  ): Promise<void> {
    if (!this.isAvailable()) return;
    
    await this.saveConversation(
      userId,
      [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage }
      ],
      options
    );
  }

  // ==========================================
  // MEMORY RETRIEVAL
  // ==========================================

  /**
   * Get recent conversation history
   */
  async getRecentMemory(userId: string, messageCount = 10): Promise<any | null> {
    if (!this.isAvailable()) return null;
    
    try {
      const response = await fetch(
        `${this.backendUrl}/api/zep/messages/${userId}?lastN=${messageCount}`
      );
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error retrieving recent memory:', error);
      return null;
    }
  }

  /**
   * Search for relevant memories using semantic search
   */
  async searchMemory(
    userId: string,
    _query: string,
    limit = 5
  ): Promise<any[]> {
    if (!this.isAvailable()) return [];
    
    try {
      const response = await fetch(
        `${this.backendUrl}/api/zep/context/${userId}?lastN=${limit}`
      );
      const data = await response.json();
      return data.relevantMemories || [];
    } catch (error) {
      console.error('Error searching memory:', error);
      return [];
    }
  }

  /**
   * Get comprehensive context for AI prompts
   * Returns empty context when Zep is not available
   */
  async getConversationContext(
    userId: string,
    _currentQuery?: string
  ): Promise<ConversationContext> {
    if (!this.isAvailable()) {
      return {
        context: '',
        recentMessages: [],
        relevantMemories: [],
        facts: {}
      };
    }

    try {
      const url = `${this.backendUrl}/api/zep/context/${userId}?lastN=10`;
      console.log('🌐 Fetching context from:', url);
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('❌ Failed to fetch context:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();

      console.log('📊 Zep context received:', {
        contextLength: data.context?.length || 0,
        messageCount: data.recentMessages?.length || 0,
        factCount: Object.keys(data.facts || {}).length,
        facts: data.facts,
        financialContext: data.financialContext,
        _debug: data._debug || 'no_debug_info'
      });

      if (data.context) {
        console.log('📝 Context preview:', data.context.substring(0, 200));
      }

      return {
        context: data.context || '',
        recentMessages: data.recentMessages || [],
        relevantMemories: data.relevantMemories || [],
        summary: undefined,
        facts: data.facts || {},
        financialContext: data.financialContext || {}
      };
    } catch (error) {
      console.error('Error retrieving conversation context:', error);
      return {
        context: '',
        recentMessages: [],
        relevantMemories: [],
        facts: {}
      };
    }
  }

  // ==========================================
  // MEMORY MANAGEMENT
  // ==========================================

  /**
   * Clear all memory for a user (use with caution!)
   */
  async clearMemory(userId: string): Promise<void> {
    if (!this.isAvailable()) return;
    
    try {
      await fetch(`${this.backendUrl}/api/zep/thread/${userId}`, {
        method: 'DELETE'
      });
      console.log(`🗑️ Cleared memory for user ${userId}`);
    } catch (error) {
      console.error('Error clearing memory:', error);
    }
  }

  /**
   * Get memory summary (for debugging/admin view)
   */
  async getMemorySummary(userId: string): Promise<{
    messageCount: number;
    summary: string | undefined;
    facts: Record<string, any>;
  }> {
    if (!this.isAvailable()) {
      return {
        messageCount: 0,
        summary: undefined,
        facts: {}
      };
    }

    try {
      const [messagesResponse, contextResponse] = await Promise.all([
        fetch(`${this.backendUrl}/api/zep/messages/${userId}`),
        fetch(`${this.backendUrl}/api/zep/context/${userId}`)
      ]);
      
      const messages = await messagesResponse.json();
      const context = await contextResponse.json();
      
      return {
        messageCount: messages.messages?.length || 0,
        summary: undefined,
        facts: context.facts || {}
      };
    } catch (error) {
      console.error('Error retrieving memory summary:', error);
      return {
        messageCount: 0,
        summary: undefined,
        facts: {}
      };
    }
  }
}

// Export singleton instance
export const zepService = new ZepService();
