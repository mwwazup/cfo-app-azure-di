/**
 * React Hooks for Polling with Proper Cleanup
 * Prevents memory leaks by cleaning up on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { poll, Poller, PollingOptions } from '../utils/polling';

// ============================================================================
// usePollingWithCleanup Hook
// ============================================================================

interface UsePollingOptions<T> extends Omit<PollingOptions<T>, 'signal'> {
  /**
   * Start polling immediately
   */
  immediate?: boolean;
  
  /**
   * Callback when polling completes successfully
   */
  onSuccess?: (result: T) => void;
  
  /**
   * Callback when polling fails
   */
  onError?: (error: Error) => void;
}

/**
 * Hook for polling with automatic cleanup on unmount
 * 
 * @example
 * function StatusChecker({ jobId }) {
 *   const { data, isPolling, error, start, stop } = usePollingWithCleanup({
 *     pollFn: () => checkJobStatus(jobId),
 *     shouldStop: (status) => status.complete,
 *     interval: 1000,
 *     maxAttempts: 30,
 *     immediate: true
 *   });
 * 
 *   if (isPolling) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   return <div>Status: {data?.status}</div>;
 * }
 */
export function usePollingWithCleanup<T>(options: UsePollingOptions<T>) {
  const {
    immediate = false,
    onSuccess,
    onError,
    ...pollingOptions
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    // Clean up previous polling
    controllerRef.current?.abort();
    
    // Create new controller
    controllerRef.current = new AbortController();
    
    setIsPolling(true);
    setError(null);

    try {
      const result = await poll({
        ...pollingOptions,
        signal: controllerRef.current.signal,
      });
      
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Don't set error if aborted (component unmounted)
      if (error.name !== 'AbortError') {
        setError(error);
        onError?.(error);
      }
    } finally {
      setIsPolling(false);
    }
  }, [pollingOptions, onSuccess, onError]);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    setIsPolling(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setData(null);
    setError(null);
  }, [stop]);

  // Start immediately if requested
  useEffect(() => {
    if (immediate) {
      start();
    }
  }, [immediate, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return {
    data,
    error,
    isPolling,
    start,
    stop,
    reset,
  };
}

// ============================================================================
// usePoller Hook
// ============================================================================

/**
 * Hook for using Poller class with automatic cleanup
 * 
 * @example
 * function JobMonitor({ jobId }) {
 *   const { data, isPolling, start, stop } = usePoller({
 *     pollFn: () => getJobStatus(jobId),
 *     shouldStop: (status) => status.done,
 *     interval: 2000
 *   });
 * 
 *   return (
 *     <div>
 *       <button onClick={start} disabled={isPolling}>Start</button>
 *       <button onClick={stop} disabled={!isPolling}>Stop</button>
 *       {data && <div>Progress: {data.progress}%</div>}
 *     </div>
 *   );
 * }
 */
export function usePoller<T>(options: Omit<PollingOptions<T>, 'signal'>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  const pollerRef = useRef<Poller<T>>(new Poller(options));

  const start = useCallback(async () => {
    setIsPolling(true);
    setError(null);

    try {
      const result = await pollerRef.current.start();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name !== 'AbortError') {
        setError(error);
      }
    } finally {
      setIsPolling(false);
    }
  }, []);

  const stop = useCallback(() => {
    pollerRef.current.stop();
    setIsPolling(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollerRef.current.stop();
    };
  }, []);

  return {
    data,
    error,
    isPolling,
    start,
    stop,
  };
}

// ============================================================================
// useAbortController Hook
// ============================================================================

/**
 * Hook for managing AbortController with automatic cleanup
 * 
 * @example
 * function DataFetcher() {
 *   const { signal, abort, reset } = useAbortController();
 * 
 *   const fetchData = async () => {
 *     try {
 *       const response = await fetch('/api/data', { signal });
 *       const data = await response.json();
 *       setData(data);
 *     } catch (error) {
 *       if (error.name === 'AbortError') {
 *         console.log('Fetch cancelled');
 *       }
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={fetchData}>Fetch</button>
 *       <button onClick={abort}>Cancel</button>
 *     </div>
 *   );
 * }
 */
export function useAbortController() {
  const controllerRef = useRef<AbortController>(new AbortController());

  const abort = useCallback(() => {
    controllerRef.current.abort();
  }, []);

  const reset = useCallback(() => {
    controllerRef.current = new AbortController();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current.abort();
    };
  }, []);

  return {
    signal: controllerRef.current.signal,
    abort,
    reset,
  };
}

// ============================================================================
// useIntervalPolling Hook
// ============================================================================

/**
 * Hook for interval-based polling (like setInterval but with cleanup)
 * 
 * @example
 * function LiveData() {
 *   const [data, setData] = useState(null);
 * 
 *   useIntervalPolling(
 *     async () => {
 *       const result = await fetchData();
 *       setData(result);
 *     },
 *     5000,  // Poll every 5 seconds
 *     true   // Start immediately
 *   );
 * 
 *   return <div>{data?.value}</div>;
 * }
 */
export function useIntervalPolling(
  callback: () => void | Promise<void>,
  interval: number,
  enabled: boolean = true
) {
  const savedCallback = useRef(callback);
  const controllerRef = useRef<AbortController>(new AbortController());

  // Update callback ref
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (controllerRef.current.signal.aborted) return;
      await savedCallback.current();
    };

    // Initial call
    tick();

    // Set up interval
    const id = setInterval(tick, interval);

    return () => {
      clearInterval(id);
      controllerRef.current.abort();
      controllerRef.current = new AbortController();
    };
  }, [interval, enabled]);
}

// ============================================================================
// usePollUntil Hook
// ============================================================================

/**
 * Hook for polling until a condition is met
 * 
 * @example
 * function UploadStatus({ uploadId }) {
 *   const { data, isPolling, start } = usePollUntil(
 *     () => getUploadStatus(uploadId),
 *     (status) => status.complete,
 *     { interval: 1000 }
 *   );
 * 
 *   useEffect(() => {
 *     start();
 *   }, [uploadId]);
 * 
 *   return <div>Progress: {data?.progress}%</div>;
 * }
 */
export function usePollUntil<T>(
  pollFn: () => Promise<T>,
  condition: (result: T) => boolean,
  options: Omit<PollingOptions<T>, 'pollFn' | 'shouldStop' | 'signal'> = {}
) {
  return usePollingWithCleanup({
    pollFn,
    shouldStop: condition,
    ...options,
    immediate: false,
  });
}

// ============================================================================
// useTimeout with Cleanup
// ============================================================================

/**
 * Hook for setTimeout with automatic cleanup
 * 
 * @example
 * function DelayedMessage() {
 *   const [show, setShow] = useState(false);
 * 
 *   useTimeout(() => {
 *     setShow(true);
 *   }, 3000);
 * 
 *   return show ? <div>Message!</div> : null;
 * }
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => savedCallback.current(), delay);

    return () => clearTimeout(id);
  }, [delay]);
}

// ============================================================================
// useInterval with Cleanup
// ============================================================================

/**
 * Hook for setInterval with automatic cleanup
 * 
 * @example
 * function Clock() {
 *   const [time, setTime] = useState(new Date());
 * 
 *   useInterval(() => {
 *     setTime(new Date());
 *   }, 1000);
 * 
 *   return <div>{time.toLocaleTimeString()}</div>;
 * }
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);

    return () => clearInterval(id);
  }, [delay]);
}
