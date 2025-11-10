/**
 * Polling Utilities with Proper Cleanup
 * Prevents memory leaks by supporting AbortController and cleanup
 */

// ============================================================================
// Polling with AbortController
// ============================================================================

export interface PollingOptions<T> {
  /**
   * Function to execute on each poll
   */
  pollFn: () => Promise<T>;
  
  /**
   * Condition to stop polling (returns true when done)
   */
  shouldStop?: (result: T) => boolean;
  
  /**
   * Interval between polls in milliseconds
   */
  interval?: number;
  
  /**
   * Maximum number of attempts
   */
  maxAttempts?: number;
  
  /**
   * Timeout for entire polling operation in milliseconds
   */
  timeout?: number;
  
  /**
   * AbortSignal for cancellation
   */
  signal?: AbortSignal;
  
  /**
   * Callback on each attempt
   */
  onAttempt?: (attempt: number, result: T) => void;
  
  /**
   * Callback on timeout
   */
  onTimeout?: () => void;
  
  /**
   * Exponential backoff multiplier (1 = no backoff)
   */
  backoffMultiplier?: number;
}

/**
 * Poll a function with proper cleanup and abort support
 * 
 * @example
 * const controller = new AbortController();
 * 
 * try {
 *   const result = await poll({
 *     pollFn: () => checkStatus(jobId),
 *     shouldStop: (status) => status.complete,
 *     interval: 1000,
 *     maxAttempts: 30,
 *     signal: controller.signal
 *   });
 * } catch (error) {
 *   if (error.name === 'AbortError') {
 *     console.log('Polling cancelled');
 *   }
 * }
 * 
 * // Cleanup
 * controller.abort();
 */
export async function poll<T>(options: PollingOptions<T>): Promise<T> {
  const {
    pollFn,
    shouldStop = () => false,
    interval = 1000,
    maxAttempts = 30,
    timeout,
    signal,
    onAttempt,
    onTimeout,
    backoffMultiplier = 1,
  } = options;

  const startTime = Date.now();
  let lastResult: T | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check if aborted
    if (signal?.aborted) {
      throw new DOMException('Polling aborted', 'AbortError');
    }

    // Check timeout
    if (timeout && Date.now() - startTime > timeout) {
      onTimeout?.();
      throw new Error(`Polling timed out after ${timeout}ms`);
    }

    try {
      // Execute poll function
      const result = await pollFn();
      lastResult = result;

      // Callback
      onAttempt?.(attempt, result);

      // Check if done
      if (shouldStop(result)) {
        return result;
      }
    } catch (error) {
      // If it's an abort error, rethrow immediately
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      
      // For other errors, continue polling (or rethrow based on your needs)
      console.warn(`Poll attempt ${attempt} failed:`, error);
    }

    // Don't wait after last attempt
    if (attempt < maxAttempts) {
      // Calculate delay with exponential backoff
      const delay = interval * Math.pow(backoffMultiplier, attempt - 1);
      
      // Wait with abort support
      await sleep(delay, signal);
    }
  }

  // Max attempts reached
  throw new Error(
    `Polling failed: max attempts (${maxAttempts}) reached. Last result: ${JSON.stringify(lastResult)}`
  );
}

// ============================================================================
// Sleep with AbortController
// ============================================================================

/**
 * Sleep with abort support
 * 
 * @param ms - Milliseconds to sleep
 * @param signal - Optional AbortSignal
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal?.aborted) {
      reject(new DOMException('Sleep aborted', 'AbortError'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    // Listen for abort
    const abortHandler = () => {
      clearTimeout(timeout);
      reject(new DOMException('Sleep aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', abortHandler, { once: true });

    // Clean up listener when done
    setTimeout(() => {
      signal?.removeEventListener('abort', abortHandler);
    }, ms);
  });
}

// ============================================================================
// Polling Class
// ============================================================================

/**
 * Polling class with built-in cleanup
 * 
 * @example
 * const poller = new Poller({
 *   pollFn: () => checkStatus(jobId),
 *   shouldStop: (status) => status.complete,
 *   interval: 1000
 * });
 * 
 * poller.start().then(result => {
 *   console.log('Done:', result);
 * });
 * 
 * // Stop polling
 * poller.stop();
 */
export class Poller<T> {
  private controller: AbortController | null = null;
  private promise: Promise<T> | null = null;
  private options: PollingOptions<T>;

  constructor(options: Omit<PollingOptions<T>, 'signal'>) {
    this.options = options;
  }

  /**
   * Start polling
   */
  start(): Promise<T> {
    if (this.promise) {
      return this.promise;
    }

    this.controller = new AbortController();
    
    this.promise = poll({
      ...this.options,
      signal: this.controller.signal,
    }).finally(() => {
      this.promise = null;
      this.controller = null;
    });

    return this.promise;
  }

  /**
   * Stop polling
   */
  stop(): void {
    this.controller?.abort();
    this.controller = null;
    this.promise = null;
  }

  /**
   * Check if currently polling
   */
  isPolling(): boolean {
    return this.promise !== null;
  }
}

// ============================================================================
// Fetch with Timeout and Abort
// ============================================================================

/**
 * Fetch with timeout and abort support
 * 
 * @example
 * const controller = new AbortController();
 * 
 * const response = await fetchWithTimeout('/api/data', {
 *   timeout: 5000,
 *   signal: controller.signal
 * });
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, signal, ...fetchOptions } = options;

  // Create abort controller for timeout
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  // Combine signals if provided
  const combinedSignal = signal
    ? combineAbortSignals([signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (timeoutController.signal.aborted) {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
    }
    
    throw error;
  }
}

// ============================================================================
// Combine AbortSignals
// ============================================================================

/**
 * Combine multiple AbortSignals into one
 * Aborts when any of the signals abort
 */
export function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

// ============================================================================
// Polling Strategies
// ============================================================================

/**
 * Poll until a condition is met
 */
export async function pollUntil<T>(
  pollFn: () => Promise<T>,
  condition: (result: T) => boolean,
  options: Omit<PollingOptions<T>, 'pollFn' | 'shouldStop'> = {}
): Promise<T> {
  return poll({
    pollFn,
    shouldStop: condition,
    ...options,
  });
}

/**
 * Poll for a specific value
 */
export async function pollForValue<T>(
  pollFn: () => Promise<T>,
  expectedValue: T,
  options: Omit<PollingOptions<T>, 'pollFn' | 'shouldStop'> = {}
): Promise<T> {
  return poll({
    pollFn,
    shouldStop: (result) => result === expectedValue,
    ...options,
  });
}

/**
 * Poll until no error
 */
export async function pollUntilSuccess<T>(
  pollFn: () => Promise<T>,
  options: Omit<PollingOptions<T>, 'pollFn' | 'shouldStop'> = {}
): Promise<T> {
  let lastError: Error | null = null;

  return poll({
    pollFn: async () => {
      try {
        return await pollFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        throw error;
      }
    },
    shouldStop: () => lastError === null,
    ...options,
  });
}

// ============================================================================
// Long Polling
// ============================================================================

/**
 * Long polling - server holds connection until data is available
 * 
 * @example
 * const result = await longPoll({
 *   url: '/api/notifications',
 *   timeout: 30000,
 *   signal: controller.signal
 * });
 */
export async function longPoll<T>(options: {
  url: string;
  timeout?: number;
  signal?: AbortSignal;
  onData?: (data: T) => void;
}): Promise<T> {
  const { url, timeout = 30000, signal, onData } = options;

  const response = await fetchWithTimeout(url, {
    timeout,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Long poll failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  onData?.(data);
  
  return data;
}

// ============================================================================
// Retry with Polling
// ============================================================================

/**
 * Retry a function with polling until success
 */
export async function retryWithPolling<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    interval?: number;
    signal?: AbortSignal;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    interval = 1000,
    signal,
    shouldRetry = () => true,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Retry aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!shouldRetry(lastError) || attempt === maxAttempts) {
        throw lastError;
      }

      await sleep(interval * attempt, signal);
    }
  }

  throw lastError;
}
