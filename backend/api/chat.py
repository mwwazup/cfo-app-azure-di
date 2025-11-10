from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal
import os
import time
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Circuit breaker state
class CircuitBreaker:
    def __init__(self, failure_threshold=3, timeout_seconds=60):
        self.failure_threshold = failure_threshold
        self.timeout_seconds = timeout_seconds
        self.failures = {'claude': 0, 'openai': 0}
        self.last_failure_time = {'claude': None, 'openai': None}
        self.is_open = {'claude': False, 'openai': False}
    
    def record_failure(self, provider: str):
        """Record a failure for the provider"""
        self.failures[provider] += 1
        self.last_failure_time[provider] = datetime.now()
        
        if self.failures[provider] >= self.failure_threshold:
            self.is_open[provider] = True
            print(f"⚠️ Circuit breaker OPEN for {provider} (failures: {self.failures[provider]})")
    
    def record_success(self, provider: str):
        """Record a success - reset failure count"""
        self.failures[provider] = 0
        self.is_open[provider] = False
    
    def can_attempt(self, provider: str) -> bool:
        """Check if we can attempt to use this provider"""
        if not self.is_open[provider]:
            return True
        
        # Check if timeout has passed - allow retry
        if self.last_failure_time[provider]:
            elapsed = (datetime.now() - self.last_failure_time[provider]).total_seconds()
            if elapsed > self.timeout_seconds:
                print(f"🔄 Circuit breaker timeout expired for {provider}, allowing retry")
                self.failures[provider] = 0  # Reset on timeout
                self.is_open[provider] = False
                return True
        
        return False
    
    def get_status(self):
        """Get current circuit breaker status"""
        return {
            'claude': {
                'failures': self.failures['claude'],
                'is_open': self.is_open['claude'],
                'can_attempt': self.can_attempt('claude')
            },
            'openai': {
                'failures': self.failures['openai'],
                'is_open': self.is_open['openai'],
                'can_attempt': self.can_attempt('openai')
            }
        }

# Global circuit breaker instance
circuit_breaker = CircuitBreaker(failure_threshold=3, timeout_seconds=60)

# Initialize AI clients lazily to avoid import errors if packages not installed
_openai_client = None
_anthropic_client = None

def get_openai_client():
    global _openai_client
    if _openai_client is None:
        try:
            from openai import OpenAI
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found in environment")
            _openai_client = OpenAI(api_key=api_key)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI initialization failed: {str(e)}")
    return _openai_client

def get_anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        try:
            from anthropic import Anthropic
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not found in environment")
            _anthropic_client = Anthropic(api_key=api_key)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Anthropic initialization failed: {str(e)}")
    return _anthropic_client

class Message(BaseModel):
    role: str
    content: str

class AICoachRequest(BaseModel):
    userMessage: str
    userId: str
    financialContext: Optional[dict] = None
    conversationHistory: Optional[List[dict]] = None
    provider: Optional[Literal['claude', 'openai']] = 'claude'
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024

class AICoachResponse(BaseModel):
    response: str
    provider: str

def is_retryable_error(error: Exception) -> bool:
    """
    Determine if an error is worth retrying with fallback provider.
    Network errors, timeouts, and rate limits are retryable.
    Authentication, invalid requests, and content policy violations are not.
    """
    error_str = str(error).lower()
    
    # Non-retryable errors (don't waste API calls on fallback)
    non_retryable_patterns = [
        'authentication', 'api key', 'invalid key', 'unauthorized',
        'invalid request', 'bad request', 'content policy',
        'invalid model', 'model not found'
    ]
    
    for pattern in non_retryable_patterns:
        if pattern in error_str:
            print(f"🚫 Non-retryable error detected: {pattern}")
            return False
    
    # Retryable errors (network, rate limit, service unavailable)
    retryable_patterns = [
        'timeout', 'rate limit', 'too many requests',
        'service unavailable', 'connection', 'network'
    ]
    
    for pattern in retryable_patterns:
        if pattern in error_str:
            print(f"🔄 Retryable error detected: {pattern}")
            return True
    
    # Default: assume retryable for unknown errors
    return True

@router.post("/coach", response_model=AICoachResponse)
async def ai_coach(request: AICoachRequest):
    """
    PERL Coach endpoint - handles AI coaching requests with financial context
    Supports both Claude (Anthropic) and OpenAI with circuit breaker pattern
    """
    # Build the prompt with context
    prompt = request.userMessage
    
    # Add financial context if provided
    if request.financialContext:
        context_str = "\n\nFinancial Context:\n"
        for key, value in request.financialContext.items():
            context_str += f"- {key}: {value}\n"
        prompt = context_str + "\n" + prompt
    
    # Add conversation history if provided
    if request.conversationHistory:
        history_str = "\n\nPrevious Conversation:\n"
        for msg in request.conversationHistory[-5:]:  # Last 5 messages
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            history_str += f"{role}: {content}\n"
        prompt = history_str + "\n" + prompt
    
    # Check if primary provider is available via circuit breaker
    if not circuit_breaker.can_attempt(request.provider):
        print(f"⚠️ Circuit breaker OPEN for {request.provider}, trying fallback immediately")
        fallback_provider = 'openai' if request.provider == 'claude' else 'claude'
        
        if not circuit_breaker.can_attempt(fallback_provider):
            raise HTTPException(
                status_code=503,
                detail=f"Both AI providers are currently unavailable. Please try again in a few moments."
            )
        
        # Use fallback provider
        request.provider = fallback_provider
    
    # Try primary provider
    try:
        if request.provider == 'claude':
            response_text = await generate_claude_response(prompt, request.temperature, request.max_tokens)
            circuit_breaker.record_success('claude')
            return AICoachResponse(response=response_text, provider='claude')
        else:
            response_text = await generate_openai_response(prompt, request.temperature, request.max_tokens)
            circuit_breaker.record_success('openai')
            return AICoachResponse(response=response_text, provider='openai')
            
    except Exception as e:
        # Record failure in circuit breaker
        circuit_breaker.record_failure(request.provider)
        print(f"❌ {request.provider} failed: {str(e)}")
        
        # Check if error is worth retrying with fallback
        if not is_retryable_error(e):
            raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
        
        # Try fallback provider (only if error is retryable)
        fallback_provider = 'openai' if request.provider == 'claude' else 'claude'
        
        # Check if fallback provider is available
        if not circuit_breaker.can_attempt(fallback_provider):
            raise HTTPException(
                status_code=503,
                detail=f"Primary provider failed and fallback provider is unavailable: {str(e)}"
            )
        
        try:
            print(f"🔄 Attempting fallback to {fallback_provider}")
            if fallback_provider == 'claude':
                response_text = await generate_claude_response(prompt, request.temperature, request.max_tokens)
                circuit_breaker.record_success('claude')
            else:
                response_text = await generate_openai_response(prompt, request.temperature, request.max_tokens)
                circuit_breaker.record_success('openai')
            
            return AICoachResponse(response=response_text, provider=fallback_provider)
            
        except Exception as fallback_error:
            circuit_breaker.record_failure(fallback_provider)
            print(f"❌ Fallback {fallback_provider} also failed: {str(fallback_error)}")
            raise HTTPException(
                status_code=503,
                detail=f"Both AI providers failed. Primary: {str(e)}, Fallback: {str(fallback_error)}"
            )

async def generate_claude_response(prompt: str, temperature: float, max_tokens: int) -> str:
    """Generate response using Claude (Anthropic)"""
    try:
        client = get_anthropic_client()
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text if message.content else "No response generated"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude API error: {str(e)}")

async def generate_openai_response(prompt: str, temperature: float, max_tokens: int) -> str:
    """Generate response using OpenAI"""
    try:
        client = get_openai_client()
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return completion.choices[0].message.content or "No response generated"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

@router.get("/health")
async def ai_health():
    """
    Health check endpoint for AI providers
    Returns circuit breaker status and provider availability
    """
    status = circuit_breaker.get_status()
    
    return {
        "status": "healthy" if (status['claude']['can_attempt'] or status['openai']['can_attempt']) else "degraded",
        "providers": status,
        "timestamp": datetime.now().isoformat()
    }
