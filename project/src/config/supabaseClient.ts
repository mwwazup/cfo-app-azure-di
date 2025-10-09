// src/config/supabaseClient.ts
// Exports:
//   - supabase (browser client using ANON key)
//   - SUPABASE_URL, SUPABASE_ANON_KEY (envs)
//   - STORAGE_BUCKETS, TABLES
//   - storage helpers (uploadFile, getPublicUrl)
//   - server-proxy helpers for DB calls

import { createClient } from '@supabase/supabase-js';

/* =========================
   ENV SETUP (Vite: must start with VITE_)
   ========================= */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5180';

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

/* =========================
   CANONICAL NAMES
   ========================= */
export const TABLES = {
  PROFILES: 'profiles',
  profiles: 'profiles',
  REVENUE_ENTRIES: 'revenue_entries',
  revenueEntries: 'revenue_entries',
  REVENUE_DATA: 'revenue_data',
  revenueData: 'revenue_data',
  COACHING_MOMENTS: 'coaching_moments',
  coachingMoments: 'coaching_moments',
  KPI_RECORDS: 'kpi_records',
  kpiRecords: 'kpi_records',
  MOMENTUM_ENTRIES: 'momentum_entries',
  momentumEntries: 'momentum_entries',
  FINANCIAL_STATEMENTS: 'financial_documents',
  financialDocuments: 'financial_documents',
  DOCUMENT_METRICS: 'document_metrics',
  documentMetrics: 'document_metrics',
  DOCUMENT_KPIS: 'document_kpis',
  documentKpis: 'document_kpis',
  REVENUE_KPIS: 'revenue_kpis',
  revenueKpis: 'revenue_kpis',
} as const;

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
async function getJSON<T>(path: string) {
  const resp = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText} - ${await resp.text()}`);
  return (await resp.json()) as T;
}

async function sendJSON<T>(path: string, method: 'POST' | 'DELETE', body?: any) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText} - ${await resp.text()}`);
  return (await resp.json()) as T;
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
  return sendJSON<{ ok: true; row: any }>(`/api/revenue-entries`, 'POST', payload);
}

export async function getRevenueKpis(userId: string, year: number) {
  const q = new URLSearchParams({ userId, year: String(year) });
  return getJSON<{ rows: any[] }>(`/api/revenue-kpis?${q.toString()}`);
}

export async function getKpiRecords(userId: string, period?: string) {
  const q = new URLSearchParams({ userId });
  if (period) q.set('period', period);
  return getJSON<{ rows: any[] }>(`/api/kpi-records?${q.toString()}`);
}

export async function deleteKpiByName(userId: string, kpiName: string) {
  const q = new URLSearchParams({ userId, kpi_name: kpiName });
  return sendJSON<{ ok: true }>(`/api/kpi-records?${q.toString()}`, 'DELETE');
}

// Default export (optional)
const exported = {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  TABLES,
  STORAGE_BUCKETS,
  uploadFile,
  getPublicUrl,
  getAvailableYears,
  getRevenueEntries,
  upsertMonthlyRevenue,
  getRevenueKpis,
  getKpiRecords,
  deleteKpiByName,
};
export default exported;
