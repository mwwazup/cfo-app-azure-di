/**
 * Global error handler to prevent JavaScript errors from breaking the app
 */

// Prevent external scripts from breaking our app
export function initializeErrorHandling() {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    console.warn('Caught external error:', event.error);
    
    // If it's from external scripts, prevent it from breaking the app
    if (event.filename?.includes('extension') || 
        event.message?.includes('extension') ||
        event.message?.includes('chrome-extension')) {
      event.preventDefault();
      return false;
    }
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Caught unhandled promise rejection:', event.reason);
    
    // Prevent external script errors from crashing the app
    if (event.reason?.message?.includes('share-modal') ||
        event.reason?.message?.includes('addEventListener')) {
      event.preventDefault();
    }
  });

  // Override console.error to filter out known external script errors
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Filter out known external script errors
    if (message.includes('share-modal') || 
        message.includes('Cannot read properties of null')) {
      console.warn('Filtered external error:', ...args);
      return;
    }
    
    originalError.apply(console, args);
  };
}

// Safe DOM element access
export function safeGetElement(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.warn(`Safe element access failed for ${selector}:`, error);
    return null;
  }
}

// Safe event listener addition
export function safeAddEventListener(
  element: Element | null, 
  event: string, 
  handler: EventListener
): boolean {
  if (!element) {
    console.warn('Cannot add event listener: element is null');
    return false;
  }
  
  try {
    element.addEventListener(event, handler);
    return true;
  } catch (error) {
    console.warn('Failed to add event listener:', error);
    return false;
  }
}
