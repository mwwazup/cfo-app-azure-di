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

// Environment validation with graceful fallback
function requireVar(name, value) {
  if (!value || String(value).trim() === '') {
    console.warn(`⚠️ Missing env: ${name} - using fallback mode`);
    return false;
  }
  return true;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

const hasSupabaseUrl = requireVar('SUPABASE_URL', SUPABASE_URL);
const hasSupabaseKey = requireVar('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
const hasSupabaseConfig = hasSupabaseUrl && hasSupabaseKey;

// Initialize Supabase (only if config available)
let supabase = null;
if (hasSupabaseConfig) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️ Running in fallback mode without Supabase');
}

// Express app
const app = express();
const PORT = Number(process.env.PORT || 5180);

// Basic middleware
app.use(express.json());
app.use(cors({
  origin: ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID'],
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Minimal server running', timestamp: new Date().toISOString() });
});

// Test endpoint to check table access
app.get('/api/test-tables', async (req, res) => {
  if (!supabase) {
    return res.json({ error: 'No Supabase connection' });
  }
  
  const results = {};
  
  // Test each table
  const tables = ['document_kpis', 'document_metrics', 'financial_documents', 'financial_insights', 'financial_milestones'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      results[table] = error ? `ERROR: ${error.message}` : 'ACCESSIBLE';
    } catch (e) {
      results[table] = `EXCEPTION: ${e.message}`;
    }
  }
  
  res.json({ tables: results });
});

// Test minimal insert to financial_documents to see what columns work
app.get('/api/test-financial-docs-schema', async (req, res) => {
  if (!supabase) {
    return res.json({ error: 'No Supabase connection' });
  }
  
  try {
    // Try inserting with minimal data to see what's required/allowed
    const testData = {
      user_id: 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f', // Your actual UUID
      document_type: 'test'
    };
    
    const { data, error } = await supabase
      .from('financial_documents')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      res.json({ 
        success: false, 
        error: error.message,
        details: error,
        attempted_fields: Object.keys(testData)
      });
    } else {
      // Clean up the test record
      await supabase.from('financial_documents').delete().eq('id', data.id);
      res.json({ 
        success: true, 
        message: 'Test insert successful',
        returned_fields: Object.keys(data),
        attempted_fields: Object.keys(testData)
      });
    }
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Helper function
async function getSupabaseUuidForClerkId(clerkUserId) {
  if (!clerkUserId) return null;
  
  // If no Supabase config, return the Clerk ID as-is for fallback mode
  if (!supabase) {
    console.log(`⚠️ Fallback mode: using Clerk ID directly: ${clerkUserId}`);
    return clerkUserId;
  }
  
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

    // Fallback mode - return mock years
    if (!supabase) {
      console.log('⚠️ Fallback mode: returning mock years');
      return res.json({ years: [2024, 2023] });
    }

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

    // If no Supabase connection, return empty array
    if (!supabase) {
      console.log('⚠️ Fallback mode: returning empty documents array');
      return res.json({ data: [] });
    }

    // Fetch from Supabase financial_documents table (correct table name)
    const { data, error } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Documents fetch error:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} documents for user ${uid}`);
    res.json({ data: data || [] });
  } catch (e) {
    console.error('❌ Documents fetch error:', e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

app.post('/api/financial-documents', async (req, res) => {
  try {
    console.log('📥 Received P&L save request:', {
      userId: req.body.userId,
      document_type: req.body.document_type,
      start_date: req.body.start_date,
      end_date: req.body.end_date
    });

    const clerkUserId = req.body.userId;
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });

    // If no Supabase connection, return mock data
    if (!supabase) {
      console.log('⚠️ Fallback mode: returning mock document');
      const mockDoc = {
        id: `doc_${Date.now()}`,
        user_id: uid,
        ...req.body,
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      return res.json({ data: mockDoc });
    }

    // Save to Supabase financial_documents table (matching actual schema)
    const documentData = {
      user_id: uid,
      filename: req.body.filename || `manual_pnl_${Date.now()}.json`, // Required
      original_filename: req.body.filename || `manual_pnl_${Date.now()}.json`, // Required
      file_size: req.body.file_size || 1024, // Required - mock size for manual entry
      mime_type: 'application/json', // Required
      document_type: req.body.document_type || 'pnl',
      status: 'uploaded', // Default value
      analysis_result: {
        raw_json: req.body.raw_json || {},
        summary_metrics: req.body.summary_metrics || {},
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        source: req.body.source || 'manual_entry'
      } // Store our data in the analysis_result JSONB field
    };

    console.log('💾 Attempting to save document data to financial_documents:', documentData);

    const { data, error } = await supabase
      .from('financial_documents')
      .insert(documentData)
      .select()
      .single();

    if (error) {
      console.error('❌ Document insert error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ P&L document saved to financial_documents table:', data.id);

    // Auto-integrate P&L data into revenue_entries for KPI calculations
    try {
      const startDate = new Date(req.body.start_date);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1; // JavaScript months are 0-indexed
      const summaryMetrics = req.body.summary_metrics || {};

      const revenueEntryData = {
        user_id: uid,
        year: year,
        month: month,
        actual_revenue: summaryMetrics.totalRevenue || 0,
        desired_revenue: summaryMetrics.totalRevenue || 0, // Use actual as desired for now
        target_revenue: summaryMetrics.totalRevenue || 0,  // Use actual as target for now
        profit_margin: summaryMetrics.totalRevenue > 0 ? 
          ((summaryMetrics.netProfit || 0) / summaryMetrics.totalRevenue * 100) : 0,
        owner_draws: 0, // Default - can be updated later
        is_locked: false,
        notes: `Auto-generated from P&L document (${data.id}) - Net Profit: $${summaryMetrics.netProfit || 0}`,
        updated_at: new Date().toISOString()
      };

      console.log('🔄 Auto-updating revenue_entries with P&L data:', {
        year, month, 
        revenue: summaryMetrics.totalRevenue,
        profit: summaryMetrics.netProfit,
        margin: revenueEntryData.profit_margin.toFixed(2) + '%'
      });

      const { data: revenueData, error: revenueError } = await supabase
        .from('revenue_entries')
        .upsert(revenueEntryData, { onConflict: 'user_id,year,month' })
        .select()
        .single();

      if (revenueError) {
        console.error('⚠️ Revenue entry update failed:', revenueError);
      } else {
        console.log('✅ Revenue entry updated successfully:', revenueData.id);
        console.log('💡 KPIs will be automatically recalculated based on this data');
      }
    } catch (integrationError) {
      console.error('⚠️ P&L-KPI integration error:', integrationError);
      // Don't fail the main request if integration fails
    }

    res.json({ data: { ...data, id: data.id, document_type: 'pnl' } });
  } catch (e) {
    console.error('❌ Document save error:', e);
    res.status(500).json({ error: e.message || 'failed', details: e.details || 'No additional details' });
  }
});
app.put('/api/financial-documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const clerkUserId = String(req.body.userId || '');
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    
    console.log('📝 Updating financial document:', {
      documentId,
      clerkUserId,
      supabaseUuid: uid,
      updateData: req.body
    });
    
    if (!uid) return res.status(400).json({ error: 'Unknown user' });
    if (!supabase) return res.status(500).json({ error: 'Database not available' });
    
    // Build the analysis_result structure
    const analysisResult = {
      source: req.body.source || "manual_entry",
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      summary_metrics: req.body.summary_metrics,
      raw_json: req.body.raw_json || {}
    };
    
    // Update the document
    const { data, error } = await supabase
      .from('financial_documents')
      .update({
        document_type: req.body.document_type,
        status: req.body.status,
        analysis_result: analysisResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('user_id', uid)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Update error:', error);
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Document not found or no permission to update' });
    }
    
    console.log('✅ Document updated successfully:', data.id);
    res.json({ data, success: true });
    
  } catch (e) {
    console.error('❌ Document update error:', e);
    res.status(500).json({ error: e.message || 'failed', details: e.details || 'No additional details' });
  }
});

app.delete('/api/financial-documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    console.log(`Deleting document: ${documentId}`);
    
    // Mock deletion for now
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

// Document processing endpoints (replacing Azure functionality)
app.get('/api/docs/meta', async (req, res) => {
  try {
    const clerkUserId = String(req.query.user_id || '');
    const uid = await getSupabaseUuidForClerkId(clerkUserId);
    if (!uid) return res.status(400).json({ error: 'Unknown user' });

    // Mock document metadata
    const mockMetadata = [
      {
        id: 'doc_1',
        document_type: 'pnl',
        filename: 'profit_loss_2024.pdf',
        uploaded_at: new Date().toISOString(),
        status: 'approved',
        confidence_score: 0.85
      }
    ];

    res.json({ data: mockMetadata });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

app.get('/api/docs/kpis', async (req, res) => {
  try {
    const documentId = String(req.query.document_id || '');
    if (!documentId) return res.status(400).json({ error: 'document_id required' });

    // Mock KPI data for document
    const mockKpis = [
      { name: 'Total Revenue', value: 150000, category: 'Revenue' },
      { name: 'Total Expenses', value: 120000, category: 'Expenses' },
      { name: 'Net Profit', value: 30000, category: 'Profit' },
      { name: 'Profit Margin', value: 20.0, category: 'Ratio' }
    ];

    res.json({ data: mockKpis });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

app.get('/api/docs/metrics', async (req, res) => {
  try {
    const documentId = String(req.query.document_id || '');
    if (!documentId) return res.status(400).json({ error: 'document_id required' });

    // Mock detailed metrics
    const mockMetrics = [
      { label: 'Total Revenue', value: 150000, category: 'pnl', is_verified: true },
      { label: 'Cost of Goods Sold', value: 90000, category: 'pnl', is_verified: true },
      { label: 'Gross Profit', value: 60000, category: 'pnl', is_verified: true },
      { label: 'Operating Expenses', value: 30000, category: 'pnl', is_verified: true },
      { label: 'Net Income', value: 30000, category: 'pnl', is_verified: true }
    ];

    res.json({ data: mockMetrics });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`✅ CORS origin: ${ORIGIN}`);
  if (hasSupabaseConfig) {
    console.log(`✅ Supabase URL: ${SUPABASE_URL}`);
    console.log(`✅ Database mode: Connected`);
  } else {
    console.log(`⚠️ Database mode: Fallback (mock data)`);
  }
  console.log(`📋 Available endpoints:`);
  console.log(`   - GET /api/health`);
  console.log(`   - GET /api/docs/meta`);
  console.log(`   - GET /api/docs/kpis`);
  console.log(`   - GET /api/docs/metrics`);
  console.log(`   - GET /api/financial-documents`);
  console.log(`   - POST /api/financial-documents`);
  console.log(`   - PUT /api/financial-documents/:id`);
  console.log(`   - DELETE /api/financial-documents/:id`);
});
