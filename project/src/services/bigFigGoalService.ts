import { env } from '../config/env';
import { addCSRFToken } from '../utils/csrf';
import { fetchWithTimeout } from '../utils/polling';
import { 
  createApiErrorFromResponse, 
  createNetworkError,
  ErrorCodes,
  ApiError,
} from '../utils/errors';

const API_BASE = env.backendUrl || 'http://localhost:8000';

export interface LighthouseGoal {
  id: string;
  userId: string;
  targetAnnualRevenue: number;
  targetOwnerPay?: number | null;
  targetProfitMargin?: number | null;
  yearsToGoal?: number | null;
  targetYear: number;
  targetMonth: number;
  avgJobValue?: number | null;
  jobsPerCrewPerMonth?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LighthouseGoalPayload {
  targetAnnualRevenue: number;
  yearsToGoal: number;
  targetOwnerPay?: number | null;
  targetProfitMargin?: number | null;
  avgJobValue?: number | null;
  jobsPerCrewPerMonth?: number | null;
  notes?: string | null;
}

export interface LighthousePlan {
  currentAnnualRevenue: number;
  targetAnnualRevenue: number;
  yearsToGoal: number;
  targetYear: number;
  targetMonth: number;
  requiredAnnualIncrease: number;
  requiredMonthlyIncrease: number;
}

async function getJSON<T>(path: string, timeout: number = 30000): Promise<T> {
  try {
    const resp = await fetchWithTimeout(`${API_BASE}${path}`, {
      credentials: 'include',
      timeout,
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

async function sendJSON<T>(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: any,
  timeout: number = 30000
): Promise<T> {
  try {
    const headers = addCSRFToken({ 'Content-Type': 'application/json' });

    const resp = await fetchWithTimeout(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      timeout,
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

export async function getLighthouseGoal(userId: string): Promise<LighthouseGoal | null> {
  const q = new URLSearchParams({ userId });
  try {
    const result = await getJSON<LighthouseGoal | null>(`/api/big-fig/goal?${q.toString()}`);
    return result;
  } catch (error: any) {
    if (error instanceof ApiError) {
      if (error.statusCode === 404 || error.code === ErrorCodes.RECORD_NOT_FOUND) {
        return null;
      }
    }
    throw error;
  }
}

export async function upsertLighthouseGoal(
  userId: string,
  payload: LighthouseGoalPayload
): Promise<LighthouseGoal> {
  const body = {
    userId,
    targetAnnualRevenue: payload.targetAnnualRevenue,
    yearsToGoal: payload.yearsToGoal,
    targetOwnerPay: payload.targetOwnerPay ?? null,
    targetProfitMargin: payload.targetProfitMargin ?? null,
    avgJobValue: payload.avgJobValue ?? null,
    jobsPerCrewPerMonth: payload.jobsPerCrewPerMonth ?? null,
    notes: payload.notes ?? null,
  };

  return sendJSON<LighthouseGoal>(`/api/big-fig/goal`, 'POST', body);
}

export async function getLighthousePlan(userId: string): Promise<LighthousePlan | null> {
  const q = new URLSearchParams({ userId });
  try {
    return await getJSON<LighthousePlan>(`/api/big-fig/plan?${q.toString()}`);
  } catch (error: any) {
    if (error instanceof ApiError) {
      if (error.statusCode === 404 || error.code === ErrorCodes.RECORD_NOT_FOUND) {
        return null;
      }
    }
    throw error;
  }
}

// ============================================================================
// Step Overrides (per-year customizations)
// ============================================================================

export interface MilestoneItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface StepOverride {
  id: string;
  userId: string;
  yearIndex: number;
  yearLabel: string;
  targetRevenue: number | null;
  themeIndex: number | null;
  milestones: MilestoneItem[];
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StepOverridePayload {
  yearIndex: number;
  yearLabel: string;
  targetRevenue: number | null;
  themeIndex: number | null;
  milestones: MilestoneItem[];
  approved: boolean;
}

export interface BulkStepOverridesResponse {
  planStatus: 'draft' | 'committed';
  steps: StepOverride[];
}

/**
 * Get all step overrides for a user's Lighthouse plan.
 */
export async function getStepOverrides(userId: string): Promise<BulkStepOverridesResponse> {
  const q = new URLSearchParams({ userId });
  try {
    return await getJSON<BulkStepOverridesResponse>(`/api/big-fig/step-overrides?${q.toString()}`);
  } catch (error: any) {
    if (error instanceof ApiError) {
      if (error.statusCode === 404 || error.code === ErrorCodes.RECORD_NOT_FOUND) {
        return { planStatus: 'draft', steps: [] };
      }
    }
    throw error;
  }
}

/**
 * Save step overrides for a user's Lighthouse plan.
 * Does NOT affect Master Revenue or FIR calculations.
 */
export async function saveStepOverrides(
  userId: string,
  planStatus: 'draft' | 'committed',
  steps: StepOverridePayload[]
): Promise<BulkStepOverridesResponse> {
  const body = {
    userId,
    planStatus,
    steps,
  };
  return sendJSON<BulkStepOverridesResponse>(`/api/big-fig/step-overrides`, 'POST', body);
}

/**
 * Delete all step overrides for a user (reset to calculated defaults).
 */
export async function deleteStepOverrides(userId: string): Promise<{ message: string; planStatus: string }> {
  const q = new URLSearchParams({ userId });
  return sendJSON<{ message: string; planStatus: string }>(`/api/big-fig/step-overrides?${q.toString()}`, 'DELETE');
}
