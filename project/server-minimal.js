// Minimal server.js to isolate the path-to-regexp issue
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Convert this file's URL to a path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment vars
dotenv.config({ path: join(__dirname, '../backend/.env') });

// Environment validation
function requireVar(name, value) {
  if (!value || String(value).trim() === '') {
    console.error(`❌ Missing required env: ${name}`);
    throw new Error(`Missing required env: ${name}`);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

requireVar('SUPABASE_URL', SUPABASE_URL);
requireVar('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Express app
const app = express();
const PORT = Number(process.env.PORT || 5180);

// Basic middleware
app.use(express.json());
app.use(cors({
  origin: ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Minimal server running' });
});

// Helper function
async function getSupabaseUuidForClerkId(clerkUserId) {
  if (!clerkUserId) return null;
  
  console.log(`🔍 Looking up Supabase UUID for Clerk ID: ${clerkUserId}`);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, clerk_user_id, email')
    .eq('clerk_user_id', clerkUserId)
    .single();
  
  if (error) {
    console.error('❌ Profiles lookup error:', error);
    console.log('💡 This user may not have a profile record yet');
    return null;
  }
  
  console.log(`✅ Found profile:`, data);
  return data?.id ?? null;
}

// Debug endpoint to check user mapping
app.get('/api/debug/user-mapping', async (req, res) => {
  try {
    const clerkUserId = String(req.query.userId || '');
    if (!clerkUserId) return res.status(400).json({ error: 'userId required' });
    
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    
    res.json({
      clerkUserId,
      supabaseUuid: uid,
      hasMapping: !!uid,
      message: uid ? 'User mapping found' : 'No profile found for this Clerk user'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Revenue entries endpoints
app.get('/api/revenue-entries/years', async (req, res) => {
  try {
    const clerkUserId = String(req.query.userId || '');
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });

    const { data, error } = await supabase
      .from('revenue_entries')
      .select('year')
      .eq('user_id', uid)
      .order('year', { ascending: false });

    if (error) throw error;

    const years = Array.from(new Set((data ?? []).map(r => r.year))).sort((a, b) => b - a);
    res.json({ years });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

app.get('/api/revenue-entries', async (req, res) => {
  try {
    const clerkUserId = String(req.query.userId || '');
    const year = Number(req.query.year);
    const month = req.query.month ? Number(req.query.month) : null;

    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });
    if (!year) return res.status(400).json({ error: 'year is required' });

    let q = supabase
      .from('revenue_entries')
      .select('*')
      .eq('user_id', uid)
      .eq('year', year)
      .order('month', { ascending: true });

    if (month != null) q = q.eq('month', month);

    const { data, error } = await q;
    if (error) throw error;

    res.json({ rows: data ?? [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

app.post('/api/revenue-entries', async (req, res) => {
  try {
    const {
      userId: clerkUserId,
      year, month,
      actualRevenue, desiredRevenue, targetRevenue,
      profitMargin, ownerDraws, isLocked, notes
    } = req.body || {};

    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });
    if (!year || !month) return res.status(400).json({ error: 'year and month required' });

    // Build the upsert object dynamically to avoid column issues
    const upsertData = {
      user_id: uid,
      year,
      month,
      updated_at: new Date().toISOString(),
    };

    // Only add fields that have values
    if (actualRevenue !== undefined && actualRevenue !== null) upsertData.actual_revenue = actualRevenue;
    if (desiredRevenue !== undefined && desiredRevenue !== null) upsertData.desired_revenue = desiredRevenue;
    if (targetRevenue !== undefined && targetRevenue !== null) upsertData.target_revenue = targetRevenue;
    if (profitMargin !== undefined && profitMargin !== null) upsertData.profit_margin = profitMargin;
    if (ownerDraws !== undefined && ownerDraws !== null) upsertData.owner_draws = ownerDraws;
    if (isLocked !== undefined && isLocked !== null) upsertData.is_locked = isLocked;
    if (notes !== undefined && notes !== null) upsertData.notes = notes;

    const { data, error } = await supabase
      .from('revenue_entries')
      .upsert(upsertData, { onConflict: 'user_id,year,month' })
      .select()
      .single();

    if (error) throw error;

    res.json({ ok: true, row: data });
  } catch (e) {
    console.error('Revenue upsert error:', e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

// Revenue KPIs endpoint (legacy - redirects to kpi-records)
app.get('/api/revenue-kpis', async (req, res) => {
  try {
    const clerkUserId = String(req.query.userId || '');
    const year = Number(req.query.year);
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });
    if (!year) return res.status(400).json({ error: 'year is required' });

    // Get all KPI records for this user and filter by year in JavaScript
    const { data, error } = await supabase
      .from('kpi_records')
      .select('*')
      .eq('user_id', uid);

    if (error) {
      console.error('Revenue KPIs error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Filter by year in JavaScript to avoid PostgreSQL type issues
    const yearData = (data ?? []).filter(record => {
      const period = record.period;
      if (!period) return false;
      
      // Handle different period formats
      const periodStr = String(period);
      return periodStr.includes(String(year)) || periodStr.startsWith(String(year));
    });

    res.json({ rows: yearData });
  } catch (e) {
    console.error('Revenue KPIs error:', e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

// KPI endpoints
app.get('/api/kpi-records', async (req, res) => {
  try {
    const clerkUserId = String(req.query.userId || '');
    const period = req.query.period ? String(req.query.period) : null;
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });

    let q = supabase
      .from('kpi_records')
      .select('*')
      .eq('user_id', uid)
      .order('period', { ascending: false });

    if (period) q = q.eq('period', period);

    const { data, error } = await q;
    if (error) throw error;

    res.json({ rows: data ?? [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

app.post('/api/kpi-records', async (req, res) => {
  try {
    const { userId: clerkUserId, kpiData } = req.body || {};
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });
    if (!kpiData) return res.status(400).json({ error: 'kpiData required' });

    const { data, error } = await supabase
      .from('kpi_records')
      .upsert({
        user_id: uid,
        ...kpiData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,kpi_name,period' })
      .select()
      .single();

    if (error) throw error;

    res.json({ ok: true, record: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

app.delete('/api/kpi-records', async (req, res) => {
  try {
    const clerkUserId = String(req.query.userId || '');
    const kpiName = String(req.query.kpi_name || '');
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });
    if (!kpiName) return res.status(400).json({ error: 'kpi_name required' });

    const { error } = await supabase
      .from('kpi_records')
      .delete()
      .eq('user_id', uid)
      .eq('kpi_name', kpiName);

    if (error) throw error;

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

// Financial documents endpoints
app.get('/api/financial-documents', async (req, res) => {
  try {
    const clerkUserId = String(req.query.userId || '');
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });

    // For now, return empty array since table might not exist
    res.json({ data: [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`✅ CORS origin: ${ORIGIN}`);
  console.log(`✅ Supabase URL: ${SUPABASE_URL}`);
});
