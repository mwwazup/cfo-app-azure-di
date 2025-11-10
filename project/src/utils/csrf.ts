/**
 * CSRF Protection Utilities
 * Implements CSRF token generation, validation, and automatic inclusion in requests
 */

// ============================================================================
// CSRF Token Management
// ============================================================================

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get CSRF token from storage
 */
export function getCSRFToken(): string | null {
  // Try sessionStorage first
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!token) {
    // Try to get from cookie
    token = getCSRFTokenFromCookie();
  }
  
  if (!token) {
    // Generate new token if none exists
    token = generateCSRFToken();
    setCSRFToken(token);
  }
  
  return token;
}

/**
 * Set CSRF token in storage
 */
export function setCSRFToken(token: string): void {
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  
  // Also set as cookie for server-side validation
  document.cookie = `${CSRF_COOKIE_NAME}=${token}; path=/; SameSite=Strict; Secure`;
}

/**
 * Get CSRF token from cookie
 */
function getCSRFTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME) {
      return value;
    }
  }
  
  return null;
}

/**
 * Clear CSRF token
 */
export function clearCSRFToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  document.cookie = `${CSRF_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Refresh CSRF token (e.g., after login)
 */
export function refreshCSRFToken(): string {
  const token = generateCSRFToken();
  setCSRFToken(token);
  return token;
}

// ============================================================================
// Fetch with CSRF Protection
// ============================================================================

/**
 * Check if HTTP method requires CSRF protection
 */
function requiresCSRFProtection(method: string): boolean {
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  return protectedMethods.includes(method.toUpperCase());
}

/**
 * Add CSRF token to request headers
 */
export function addCSRFToken(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFToken();
  
  if (!token) {
    console.warn('No CSRF token available');
    return headers;
  }
  
  const headersObj = new Headers(headers);
  headersObj.set(CSRF_HEADER_NAME, token);
  
  return headersObj;
}

/**
 * Fetch with automatic CSRF token inclusion
 * 
 * @example
 * const response = await fetchWithCSRF('/api/revenue-entries', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || 'GET';
  
  // Add CSRF token for state-changing operations
  if (requiresCSRFProtection(method)) {
    options.headers = addCSRFToken(options.headers);
  }
  
  return fetch(url, options);
}

// ============================================================================
// CSRF Validation Middleware (for backend)
// ============================================================================

/**
 * Validate CSRF token from request
 * This is a reference implementation for the backend
 */
export function validateCSRFToken(
  headerToken: string | null,
  cookieToken: string | null
): boolean {
  if (!headerToken || !cookieToken) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(headerToken, cookieToken);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by ensuring comparison takes constant time
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// ============================================================================
// CSRF Error Handling
// ============================================================================

export class CSRFError extends Error {
  constructor(message: string = 'CSRF token validation failed') {
    super(message);
    this.name = 'CSRFError';
  }
}

/**
 * Check if error is CSRF-related
 */
export function isCSRFError(error: unknown): boolean {
  if (error instanceof CSRFError) {
    return true;
  }
  
  if (error instanceof Response && error.status === 403) {
    return true;
  }
  
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('csrf');
  }
  
  return false;
}

/**
 * Handle CSRF error (refresh token and retry)
 */
export async function handleCSRFError(
  retryFn: () => Promise<Response>
): Promise<Response> {
  // Refresh CSRF token
  refreshCSRFToken();
  
  // Retry the request
  return retryFn();
}

// ============================================================================
// React Integration
// ============================================================================

/**
 * Initialize CSRF protection on app load
 */
export function initializeCSRF(): void {
  // Ensure CSRF token exists
  getCSRFToken();
  
  // Refresh token on page load
  if (!sessionStorage.getItem(CSRF_TOKEN_KEY)) {
    refreshCSRFToken();
  }
}

/**
 * Get CSRF token for form submission
 */
export function getCSRFTokenForForm(): string {
  return getCSRFToken() || '';
}

// ============================================================================
// Axios/Fetch Interceptors
// ============================================================================

/**
 * Create fetch wrapper with CSRF protection
 */
export function createCSRFProtectedFetch() {
  const originalFetch = window.fetch;
  
  return async function protectedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const options = init || {};
    const method = options.method || 'GET';
    
    // Add CSRF token for protected methods
    if (requiresCSRFProtection(method)) {
      options.headers = addCSRFToken(options.headers);
    }
    
    try {
      const response = await originalFetch(input, options);
      
      // Handle CSRF errors
      if (response.status === 403) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.clone().json();
          if (data.error?.includes('CSRF')) {
            throw new CSRFError(data.error);
          }
        }
      }
      
      return response;
    } catch (error) {
      if (isCSRFError(error)) {
        // Refresh token and retry once
        refreshCSRFToken();
        options.headers = addCSRFToken(options.headers);
        return originalFetch(input, options);
      }
      
      throw error;
    }
  };
}

// ============================================================================
// Double Submit Cookie Pattern
// ============================================================================

/**
 * Implement double-submit cookie pattern
 * Token is sent both as cookie and as header/body parameter
 */
export interface DoubleSubmitOptions {
  cookieName?: string;
  headerName?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export function setupDoubleSubmitCookie(options: DoubleSubmitOptions = {}) {
  const {
    cookieName = CSRF_COOKIE_NAME,
    headerName = CSRF_HEADER_NAME,
    secure = true,
    sameSite = 'Strict'
  } = options;
  
  // Generate token
  const token = generateCSRFToken();
  
  // Set as cookie
  const cookieOptions = [
    `${cookieName}=${token}`,
    'path=/',
    `SameSite=${sameSite}`,
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
  
  document.cookie = cookieOptions;
  
  // Store for header use
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  
  return {
    token,
    cookieName,
    headerName
  };
}

// ============================================================================
// CSRF Token Rotation
// ============================================================================

/**
 * Rotate CSRF token periodically
 */
export function startCSRFTokenRotation(intervalMs: number = 3600000): () => void {
  const intervalId = setInterval(() => {
    refreshCSRFToken();
    console.log('CSRF token rotated');
  }, intervalMs);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if CSRF protection is enabled
 */
export function isCSRFProtectionEnabled(): boolean {
  return !!getCSRFToken();
}

/**
 * Get CSRF configuration
 */
export function getCSRFConfig() {
  return {
    tokenKey: CSRF_TOKEN_KEY,
    headerName: CSRF_HEADER_NAME,
    cookieName: CSRF_COOKIE_NAME,
    token: getCSRFToken(),
    enabled: isCSRFProtectionEnabled()
  };
}

/**
 * Debug CSRF configuration
 */
export function debugCSRF(): void {
  const config = getCSRFConfig();
  console.group('CSRF Configuration');
  console.log('Token:', config.token);
  console.log('Header Name:', config.headerName);
  console.log('Cookie Name:', config.cookieName);
  console.log('Enabled:', config.enabled);
  console.groupEnd();
}
