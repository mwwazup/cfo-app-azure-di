/**
 * React Hooks for Async Operations and Loading States
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce, debounceAsync } from '../utils/rateLimiting';

// ============================================================================
// useAsync Hook
// ============================================================================

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for managing async operations with loading states
 * 
 * @example
 * const { data, isLoading, error, execute } = useAsync(fetchData);
 * 
 * useEffect(() => {
 *   execute(userId);
 * }, [userId]);
 */
export function useAsync<T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const { immediate = false, onSuccess, onError } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: immediate,
    isSuccess: false,
    isError: false,
  });

  const execute = useCallback(
    async (...args: Args) => {
      setState({
        data: null,
        error: null,
        isLoading: true,
        isSuccess: false,
        isError: false,
      });

      try {
        const data = await asyncFunction(...args);
        setState({
          data,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
        });
        onSuccess?.(data);
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({
          data: null,
          error: err,
          isLoading: false,
          isSuccess: false,
          isError: true,
        });
        onError?.(err);
        throw err;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// ============================================================================
// useDebounce Hook
// ============================================================================

/**
 * Hook for debouncing a value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     searchAPI(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// useDebouncedCallback Hook
// ============================================================================

/**
 * Hook for debouncing a callback function
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => searchAPI(query),
 *   300
 * );
 * 
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
    [delay]
  );
}

// ============================================================================
// useAsyncDebounce Hook
// ============================================================================

/**
 * Hook for debouncing async operations
 * 
 * @example
 * const debouncedSearch = useAsyncDebounce(
 *   async (query: string) => {
 *     const results = await searchAPI(query);
 *     setResults(results);
 *   },
 *   300
 * );
 */
export function useAsyncDebounce<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T,
  delay: number
): T {
  const functionRef = useRef(asyncFunction);

  useEffect(() => {
    functionRef.current = asyncFunction;
  }, [asyncFunction]);

  return useCallback(
    debounceAsync((...args: Parameters<T>) => functionRef.current(...args), delay),
    [delay]
  ) as T;
}

// ============================================================================
// useLoadingState Hook
// ============================================================================

/**
 * Hook for managing loading state
 * 
 * @example
 * const { isLoading, startLoading, stopLoading, withLoading } = useLoadingState();
 * 
 * const handleSubmit = withLoading(async () => {
 *   await saveData();
 * });
 */
export function useLoadingState(initialState: boolean = false) {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);

  const withLoading = useCallback(
    async <T,>(asyncFunction: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        const result = await asyncFunction();
        return result;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}

// ============================================================================
// useFetch Hook
// ============================================================================

interface UseFetchOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  dependencies?: any[];
}

/**
 * Hook for fetching data with automatic refetch on dependency changes
 * 
 * @example
 * const { data, isLoading, error, refetch } = useFetch(
 *   () => getRevenueData(userId, year),
 *   { dependencies: [userId, year] }
 * );
 */
export function useFetch<T>(
  fetchFunction: () => Promise<T>,
  options: UseFetchOptions<T> = {}
) {
  const { immediate = true, onSuccess, onError, dependencies = [] } = options;

  const { data, error, isLoading, execute, reset } = useAsync(fetchFunction, {
    immediate: false,
    onSuccess,
    onError,
  });

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  return {
    data,
    error,
    isLoading,
    refetch,
    reset,
  };
}

// ============================================================================
// usePrevious Hook
// ============================================================================

/**
 * Hook to get previous value
 * 
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// ============================================================================
// useIsMounted Hook
// ============================================================================

/**
 * Hook to check if component is mounted
 * Useful for preventing state updates on unmounted components
 * 
 * @example
 * const isMounted = useIsMounted();
 * 
 * const fetchData = async () => {
 *   const data = await api.getData();
 *   if (isMounted()) {
 *     setData(data);
 *   }
 * };
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

// ============================================================================
// useRetry Hook
// ============================================================================

interface UseRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
}

/**
 * Hook for retrying failed operations
 * 
 * @example
 * const { execute, isLoading, error, retryCount } = useRetry(
 *   () => fetchData(),
 *   { maxRetries: 3, retryDelay: 1000 }
 * );
 */
export function useRetry<T>(
  asyncFunction: () => Promise<T>,
  options: UseRetryOptions = {}
) {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options;
  const [retryCount, setRetryCount] = useState(0);

  const executeWithRetry = useCallback(async (): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncFunction();
        setRetryCount(0);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          setRetryCount(attempt + 1);
          onRetry?.(attempt + 1);
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError;
  }, [asyncFunction, maxRetries, retryDelay, onRetry]);

  const { data, error, isLoading, execute } = useAsync(executeWithRetry);

  return {
    data,
    error,
    isLoading,
    retryCount,
    execute,
  };
}

// ============================================================================
// usePolling Hook
// ============================================================================

interface UsePollingOptions<T> {
  interval: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for polling data at regular intervals
 * 
 * @example
 * const { data, isLoading, error, start, stop } = usePolling(
 *   () => getStatus(),
 *   { interval: 5000 }
 * );
 */
export function usePolling<T>(
  fetchFunction: () => Promise<T>,
  options: UsePollingOptions<T>
) {
  const { interval, enabled = true, onSuccess, onError } = options;
  const [isPolling, setIsPolling] = useState(enabled);

  const { data, error, isLoading, execute } = useAsync(fetchFunction, {
    onSuccess,
    onError,
  });

  useEffect(() => {
    if (!isPolling) return;

    const poll = async () => {
      try {
        await execute();
      } catch (err) {
        // Error already handled by useAsync
      }
    };

    // Initial fetch
    poll();

    // Set up polling
    const intervalId = setInterval(poll, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [isPolling, interval, execute]);

  const start = useCallback(() => setIsPolling(true), []);
  const stop = useCallback(() => setIsPolling(false), []);

  return {
    data,
    error,
    isLoading,
    isPolling,
    start,
    stop,
  };
}
