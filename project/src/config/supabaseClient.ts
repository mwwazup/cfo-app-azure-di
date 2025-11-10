// src/config/supabaseClient.ts
// Exports:
//   - supabase (browser client using ANON key)
//   - SUPABASE_URL, SUPABASE_ANON_KEY (envs)
//   - STORAGE_BUCKETS
//   - storage helpers (uploadFile, getPublicUrl)
//   - server-proxy helpers for DB calls

import { createClient } from '@supabase/supabase-js';
import { 
  revenueEntrySchema, 
  upsertKPIRequestSchema, 
  safeValidateData,
  formatValidationErrors 
} from '../types/validation';
import { 
  createApiErrorFromResponse,
  createNetworkError,
  createValidationError
} from '../utils/errors';
import { addCSRFToken } from '../utils/csrf';
import { fetchWithTimeout } from '../utils/polling';

/* =========================
   ENV SETUP (Vite: must start with VITE_)
   ========================= */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Fail fast if envs missing
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const msg =
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your .env[.local]. ' +
    'These MUST be defined for the browser client.';
  console.error(msg, { SUPABASE_URL, hasAnonKey: Boolean(SUPABASE_ANON_KEY) });
  throw new Error(msg);
}

/* =========================
   BROWSER SUPABASE CLIENT
   ========================= */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-application-name': 'BigFigCFO',
    },
  },
});

export const STORAGE_BUCKETS = {
  documents: import.meta.env.VITE_SUPABASE_BUCKET_DOCUMENTS || 'documents',
  uploads: import.meta.env.VITE_SUPABASE_BUCKET_UPLOADS || 'uploads',
} as const;

/* =========================
   STORAGE HELPERS
   ========================= */
export async function uploadFile(
  bucket: keyof typeof STORAGE_BUCKETS | string,
  path: string,
  file: File | Blob,
  opts?: { upsert?: boolean; contentType?: string }
) {
  const bucketName = typeof bucket === 'string' ? bucket : STORAGE_BUCKETS[bucket];
  return supabase.storage.from(bucketName).upload(path, file, {
    upsert: opts?.upsert ?? true,
    contentType: opts?.contentType,
  });
}

export function getPublicUrl(
  bucket: keyof typeof STORAGE_BUCKETS | string,
  path: string
): string | null {
  const bucketName = typeof bucket === 'string' ? bucket : STORAGE_BUCKETS[bucket];
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/* =========================
   SERVER-PROXY HELPERS (DB)
   ========================= */
async function getJSON<T>(path: string, timeout: number = 30000) {
  try {
    const resp = await fetchWithTimeout(`${API_BASE}${path}`, {
      credentials: 'include',
      timeout
    });
    if (!resp.ok) {
      throw await createApiErrorFromResponse(resp, path, 'GET');
    }
    return (await resp.json()) as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw createNetworkError(path, 'GET', error);
    }
    throw error;
  }
}

async function sendJSON<T>(path: string, method: 'POST' | 'DELETE' | 'PUT', body?: any, timeout: number = 30000) {
  try {
    // Add CSRF protection for state-changing operations
    const headers = addCSRFToken({ 'Content-Type': 'application/json' });
    
    const resp = await fetchWithTimeout(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      timeout
    });
    if (!resp.ok) {
      throw await createApiErrorFromResponse(resp, path, method);
    }
    return (await resp.json()) as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw createNetworkError(path, method, error);
    }
    throw error;
  }
}

// === High-level API used by your UI ===
export async function getAvailableYears(userId: string) {
  const q = new URLSearchParams({ userId });
  return getJSON<{ years: number[] }>(`/api/revenue-entries/years?${q.toString()}`);
}

export async function getRevenueEntries(userId: string, year: number, month?: number) {
  const q = new URLSearchParams({ userId, year: String(year) });
  if (month != null) q.set('month', String(month));
  return getJSON<{ rows: any[] }>(`/api/revenue-entries?${q.toString()}`);
}

export async function upsertMonthlyRevenue(payload: {
  userId: string;
  year: number;
  month: number;
  actualRevenue?: number | null;
  desiredRevenue?: number | null;
  targetRevenue?: number | null;
  profitMargin?: number | null;
  ownerDraws?: number | null;
  isLocked?: boolean | null;
  notes?: string | null;
}) {
  // Validate payload before sending to backend
  const validationResult = safeValidateData(revenueEntrySchema, payload);
  
  if (!validationResult.success) {
    const errors = formatValidationErrors(validationResult.error);
    const fields = validationResult.error.issues.reduce((acc, issue) => {
      const path = issue.path.join('.');
      acc[path] = issue.message;
      return acc;
    }, {} as Record<string, string>);
    throw createValidationError(
      `Validation failed: ${errors.join(', ')}`,
      fields,
      { payload }
    );
  }
  
  return sendJSON<{ ok: true; row: any }>(`/api/revenue-entries`, 'POST', validationResult.data);
}

export async function getRevenueKpis(userId: string, year: number) {
  const q = new URLSearchParams({ userId, year: String(year) });
  return getJSON<{ rows: any[] }>(`/api/revenue-kpis?${q.toString()}`);
}

export async function getKpiRecords(userId: string, period?: string) {
  const q = new URLSearchParams({ userId });
  if (period) q.set('period', period);
  // Add timestamp to bust HTTP cache
  q.set('_t', Date.now().toString());
  return getJSON<{ rows: any[] }>(`/api/kpi-records?${q.toString()}`);
}

export async function upsertKpiRecord(userId: string, kpiData: any) {
  const payload = { userId, kpiData };
  
  // Validate payload before sending to backend
  const validationResult = safeValidateData(upsertKPIRequestSchema, payload);
  
  if (!validationResult.success) {
    const errors = formatValidationErrors(validationResult.error);
    const fields = validationResult.error.issues.reduce((acc, issue) => {
      const path = issue.path.join('.');
      acc[path] = issue.message;
      return acc;
    }, {} as Record<string, string>);
    throw createValidationError(
      `Validation failed: ${errors.join(', ')}`,
      fields,
      { payload }
    );
  }
  
  return sendJSON<{ ok: true; record: any }>(`/api/kpi-records`, 'POST', validationResult.data);
}

export async function deleteKpiByName(userId: string, kpiName: string) {
  const q = new URLSearchParams({ userId, kpi_name: kpiName });
  return sendJSON<{ ok: true }>(`/api/kpi-records?${q.toString()}`, 'DELETE');
}

export async function updateKpiGoal(kpiId: string, newGoal: number) {
  const payload = { kpiId, goalValue: newGoal };
  return sendJSON<{ ok: true }>(`/api/kpi-records/goal`, 'PUT', payload);
}

// Default export (optional)
const exported = {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STORAGE_BUCKETS,
  uploadFile,
  getPublicUrl,
  getAvailableYears,
  getRevenueEntries,
  upsertMonthlyRevenue,
  getRevenueKpis,
  getKpiRecords,
  upsertKpiRecord,
  deleteKpiByName,
};
export default exported;
