/**
 * Rate Limiting and Request Throttling Utilities
 * Prevents rapid-fire requests and improves performance
 */

// ============================================================================
// Debounce Function
// ============================================================================

/**
 * Debounce a function - delays execution until after a period of inactivity
 * Use for: search inputs, form validation, window resize events
 * 
 * @param func - Function to debounce
 * @param wait - Delay in milliseconds
 * @param immediate - Execute on leading edge instead of trailing
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);

    if (callNow) {
      func(...args);
    }
  };
}

// ============================================================================
// Async Debounce Function
// ============================================================================

/**
 * Debounce an async function - returns a promise
 * Use for: API calls, async validation
 * 
 * @param func - Async function to debounce
 * @param wait - Delay in milliseconds
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;

  return function executedFunction(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeout) {
      clearTimeout(timeout);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise((resolve, reject) => {
        timeout = setTimeout(async () => {
          try {
            const result = await func(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
            timeout = null;
          }
        }, wait);
      });
    }

    return pendingPromise;
  };
}

// ============================================================================
// Throttle Function
// ============================================================================

/**
 * Throttle a function - limits execution to once per time period
 * Use for: scroll events, mouse move, API polling
 * 
 * @param func - Function to throttle
 * @param limit - Minimum time between executions in milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ============================================================================
// Request Queue
// ============================================================================

interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority?: number;
}

/**
 * Request Queue - limits concurrent requests
 * Use for: API calls, file uploads, batch operations
 */
export class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private running: number = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add a request to the queue
   */
  async add<T>(
    execute: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      
      this.queue.push({
        id,
        execute,
        resolve,
        reject,
        priority,
      });

      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.running++;

    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queued: this.queue.length,
      running: this.running,
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Rate Limiter - limits requests per time window
 * Use for: API rate limiting, preventing abuse
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  async tryRequest(): Promise<boolean> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  /**
   * Wait until request is allowed
   */
  async waitForSlot(): Promise<void> {
    while (!(await this.tryRequest())) {
      // Wait for the oldest request to expire
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 100)));
    }
  }

  /**
   * Execute function with rate limiting
   */
  async execute<T>(func: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    return func();
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}

// ============================================================================
// Cache with TTL
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache with Time-To-Live
 * Use for: API response caching, computed values
 */
export class CacheWithTTL<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * Set a cache entry
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a cache entry
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get or set with factory function
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

// ============================================================================
// Memoize Function
// ============================================================================

/**
 * Memoize a function - cache results based on arguments
 * Use for: expensive computations, API calls with same params
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  options: {
    ttl?: number;
    maxSize?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const cache = new Map<string, { value: ReturnType<T>; expiresAt: number }>();
  const { ttl = Infinity, maxSize = Infinity, keyGenerator } = options;

  const defaultKeyGenerator = (...args: Parameters<T>): string => {
    return JSON.stringify(args);
  };

  const getKey = keyGenerator || defaultKeyGenerator;

  return function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = getKey(...args);
    const cached = cache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const result = func(...args);
    const expiresAt = Date.now() + ttl;

    // Enforce max size
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, { value: result, expiresAt });
    return result;
  } as T;
}

// ============================================================================
// Batch Requests
// ============================================================================

/**
 * Batch multiple requests into a single call
 * Use for: GraphQL-like batching, reducing API calls
 */
export class RequestBatcher<T, R> {
  private batch: T[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchSize: number;
  private batchDelay: number;
  private executor: (batch: T[]) => Promise<R[]>;
  private pendingPromises: Array<{
    resolve: (value: R) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(
    executor: (batch: T[]) => Promise<R[]>,
    options: {
      batchSize?: number;
      batchDelay?: number;
    } = {}
  ) {
    this.executor = executor;
    this.batchSize = options.batchSize || 10;
    this.batchDelay = options.batchDelay || 50;
  }

  /**
   * Add a request to the batch
   */
  async add(request: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.batch.push(request);
      this.pendingPromises.push({ resolve, reject });

      if (this.batch.length >= this.batchSize) {
        this.flush();
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }

  /**
   * Flush the current batch
   */
  private async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.batch.length === 0) return;

    const currentBatch = this.batch;
    const currentPromises = this.pendingPromises;

    this.batch = [];
    this.pendingPromises = [];

    try {
      const results = await this.executor(currentBatch);
      
      results.forEach((result, index) => {
        currentPromises[index].resolve(result);
      });
    } catch (error) {
      currentPromises.forEach(promise => {
        promise.reject(error);
      });
    }
  }
}

// ============================================================================
// Global Instances
// ============================================================================

// Default request queue (max 3 concurrent)
export const defaultRequestQueue = new RequestQueue(3);

// Default rate limiter (10 requests per second)
export const defaultRateLimiter = new RateLimiter(10, 1000);

// Default cache (1 minute TTL)
export const defaultCache = new CacheWithTTL(60000);
