// server.js (ESM)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';
import { mapLabel, parseMonetaryValue, calculateKPIs } from './src/utils/labelMapping.ts';

// Convert this file's URL to a path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Promisified exec
const execPromise = promisify(exec);

// ===== Load server-only environment vars from backend.env =====
dotenv.config({ path: join(__dirname, '../backend/.env') });

// ===== Env validation (server-only) =====
// Must exist in backend.env:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// Optional (for Azure DI): DI_ENDPOINT, DI_KEY, DI_MODEL_ID, DI_API_VERSION
function requireVar(name, value) {
  if (!value || String(value).trim() === '') {
    console.error(`❌ Missing required env: ${name}`);
    throw new Error(`Missing required env: ${name}`);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
requireVar('SUPABASE_URL', SUPABASE_URL);
requireVar('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);

// ✅ Initialize Supabase **server admin** client (service role bypasses RLS; never expose to browser)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
const PORT = Number(process.env.PORT || 5180);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

// Link Clerk user to Supabase (ensures a UUID-backed account exists)
app.post('/api/auth/supabase-link', async (req, res) => {
  try {
    const { clerkUserId, email, firstName, lastName } = req.body ?? {};

    if (!clerkUserId) {
      return res.status(400).json({ error: 'clerkUserId is required' });
    }
    if (!email) {
      return res.status(400).json({ error: 'email is required to provision Supabase user' });
    }

    const normalizedEmail = String(email).toLowerCase();

    // Check if a profile already exists for this email
    const { data: existingProfile, error: profileLookupError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    let supabaseUserId = existingProfile?.id ?? null;

    if (!supabaseUserId) {
      // Attempt to create a Supabase auth user using the service role key
      const provisionalPassword = `${randomUUID()}Aa!1`;
      const adminResult = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        password: provisionalPassword,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          clerk_user_id: clerkUserId,
        },
      });

      if (adminResult.error) {
        if (adminResult.error.code === 'email_exists') {
          // Email already tied to a Supabase auth user. Fetch the existing record.
          const listResult = await supabase.auth.admin.listUsers();
          if (listResult.error) throw listResult.error;

          const existingUser = listResult.data?.users?.find(
            (user) => user.email?.toLowerCase() === normalizedEmail
          );

          supabaseUserId = existingUser?.id ?? null;
        } else {
          throw adminResult.error;
        }
      } else {
        supabaseUserId = adminResult.data.user?.id ?? null;
      }

      if (!supabaseUserId) {
        return res.status(500).json({ error: 'Unable to resolve Supabase user ID for Clerk account' });
      }

      // Ensure a profile row exists for downstream services (id references auth.users)
      const { error: upsertProfileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: supabaseUserId,
            email: normalizedEmail,
            first_name: firstName ?? null,
            last_name: lastName ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (upsertProfileError) throw upsertProfileError;
    }

    const responsePayload = { supabaseUserId };

    // Attempt to store the Supabase UUID in Clerk metadata for future lookups
    try {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (clerkSecretKey) {
        const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${clerkSecretKey}`,
          },
          body: JSON.stringify({
            public_metadata: { supabaseId: supabaseUserId },
          }),
        });

        if (!clerkResponse.ok) {
          const clerkErrorText = await clerkResponse.text();
          console.warn('Failed to update Clerk metadata with Supabase UUID:', clerkErrorText);
          responsePayload.metadataWarning = 'Clerk metadata update failed';
        }
      } else {
        responsePayload.metadataWarning = 'CLERK_SECRET_KEY missing; Supabase UUID not stored in Clerk metadata';
      }
    } catch (metadataError) {
      console.warn('Error while attempting to sync Supabase UUID to Clerk metadata:', metadataError);
      responsePayload.metadataWarning = 'Clerk metadata update error';
    }

    return res.json(responsePayload);
  } catch (error) {
    console.error('Error linking Clerk user to Supabase:', error);
    return res.status(500).json({ error: error?.message ?? 'Failed to link Supabase user' });
  }
});

// Document analysis endpoint
app.post('/api/documentAnalysis', async (req, res) => {
  try {
    const { files, userId } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const results = [];

    for (const base64File of files) {
      try {
        const base64Data = base64File.includes(',') ? base64File.split(',')[1] : base64File;

        const analyzeUrl = `${process.env.DI_ENDPOINT}/documentintelligence/documentModels/${process.env.DI_MODEL_ID || 'prebuilt-document'}:analyze?api-version=${process.env.DI_API_VERSION || '2024-11-30'}`;

        const submitResponse = await fetch(analyzeUrl, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.DI_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ base64Source: base64Data }),
        });

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          throw new Error(`Azure API error: ${submitResponse.status} ${submitResponse.statusText} - ${errorText}`);
        }

        const operationLocation = submitResponse.headers.get('Operation-Location');
        if (!operationLocation) throw new Error('No Operation-Location header received from Azure');

        let analysisResult = null;
        const maxAttempts = 30;
        const pollInterval = 2000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const pollResponse = await fetch(operationLocation, {
            headers: { 'Ocp-Apim-Subscription-Key': process.env.DI_KEY },
          });
          if (!pollResponse.ok) throw new Error(`Polling error: ${pollResponse.status} ${pollResponse.statusText}`);

          const pollResult = await pollResponse.json();
          if (pollResult.status === 'succeeded') {
            analysisResult = pollResult;
            break;
          } else if (pollResult.status === 'failed') {
            throw new Error(`Azure analysis failed: ${pollResult.error?.message || 'Unknown error'}`);
          }

          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        }

        if (!analysisResult) throw new Error('Azure Document Intelligence analysis timed out');

        results.push({ success: true, data: analysisResult });
      } catch (error) {
        console.error('❌ Azure Document Intelligence error:', error.message);
        throw new Error(
          `Azure Document Intelligence failed: ${error.message}. Please check your Azure credentials and configuration.`
        );
      }
    }

    const firstResult = results[0];
    res.json({
      success: results.every((r) => r.success),
      data: firstResult?.data || null,
      results,
    });
  } catch (error) {
    console.error('Error in document analysis endpoint:', error);
    res.status(500).json({ success: false, error: error.message || 'Document analysis failed' });
  }
});

// User email confirmation endpoint
app.post('/api/confirmUser', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Compile TS then import compiled JS
    const compileResult = await execPromise(
      'npx tsc src/api/userConfirmation.ts --outDir dist --target ES2020 --module CommonJS'
    );

    const userModulePath = join(__dirname, 'dist', 'userConfirmation.js');
    const userModuleUrl = `file://${userModulePath.replace(/\\/g, '/')}`;
    const { confirmUserEmail } = await import(userModuleUrl);

    const result = await confirmUserEmail(userId);
    res.json({ success: result });
  } catch (error) {
    console.error('Error in user confirmation endpoint:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/di/ingest - Server-side document ingestion with precomputed KPIs
app.post('/api/di/ingest', async (req, res) => {
  try {
    const { file, userId, documentType = 'profit_loss' } = req.body;
    if (!file || !userId) {
      return res.status(400).json({ success: false, error: 'File and userId are required' });
    }

    const base64Data = file.includes(',') ? file.split(',')[1] : file;

    const analyzeUrl = `${process.env.DI_ENDPOINT}/documentintelligence/documentModels/${process.env.DI_MODEL_ID || 'prebuilt-document'}:analyze?api-version=${process.env.DI_API_VERSION || '2024-11-30'}`;

    const submitResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.DI_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Source: base64Data }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Azure API error: ${submitResponse.status} - ${errorText}`);
    }

    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) throw new Error('No Operation-Location header received');

    let analysisResult = null;
    const maxAttempts = 30;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const pollResponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': process.env.DI_KEY },
      });
      if (!pollResponse.ok) throw new Error(`Polling error: ${pollResponse.status}`);

      const pollResult = await pollResponse.json();
      if (pollResult.status === 'succeeded') {
        analysisResult = pollResult;
        break;
      } else if (pollResult.status === 'failed') {
        throw new Error(`Analysis failed: ${pollResult.error?.message || 'Unknown error'}`);
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!analysisResult) throw new Error('Analysis timed out');

    // Create financial document record
    const { data: document, error: docError } = await supabase
      .from('financial_documents')
      .insert({
        user_id: userId,
        document_type: documentType,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        source: 'azure_document_intelligence',
      })
      .select()
      .single();

    if (docError) throw new Error(`Database error: ${docError.message}`);

    // Process extracted fields
    const metrics = [];
    const analyzeResult = analysisResult.analyzeResult;

    if (analyzeResult.documents && analyzeResult.documents.length > 0) {
      const doc = analyzeResult.documents[0];
      Object.entries(doc.fields || {}).forEach(([fieldName, field]) => {
        const mapping = mapLabel(fieldName);
        if (mapping) {
          const value = parseMonetaryValue(field.value || field.valueNumber || field.content || 0);
          metrics.push({
            document_id: document.id,
            metric_type: mapping.type,
            metric_key: mapping.key,
            label: fieldName,
            value,
            confidence: field.confidence || 0.85,
          });
        }
      });
    }

    if (analyzeResult.keyValuePairs) {
      analyzeResult.keyValuePairs.forEach((kvp) => {
        const mapping = mapLabel(kvp.key.content);
        if (mapping) {
          const value = parseMonetaryValue(kvp.value.content);
          metrics.push({
            document_id: document.id,
            metric_type: mapping.type,
            metric_key: mapping.key,
            label: kvp.key.content,
            value,
            confidence: kvp.confidence || 0.85,
          });
        }
      });
    }

    if (metrics.length > 0) {
      const { error: metricsError } = await supabase.from('document_metrics').insert(metrics);
      if (metricsError) throw new Error(`Metrics insert error: ${metricsError.message}`);
    }

    const kpis = calculateKPIs(metrics);
    const { error: kpisError } = await supabase.from('document_kpis').insert({
      document_id: document.id,
      ...kpis,
    });
    if (kpisError) throw new Error(`KPIs insert error: ${kpisError.message}`);

    res.json({ success: true, docId: document.id, metricsCount: metrics.length, kpis });
  } catch (error) {
    console.error('❌ Document ingestion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/docs/meta - Fetch document metadata only
app.get('/api/docs/meta', async (req, res) => {
  try {
    const { user: userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const { data: docs, error } = await supabase
      .from('financial_documents')
      .select('id, document_type, start_date, end_date, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Database error: ${error.message}`);

    const docsWithLabels = docs.map((doc) => ({
      ...doc,
      label: `${doc.document_type.replace('_', ' ').toUpperCase()} - ${doc.start_date} to ${doc.end_date}`,
    }));

    res.json({ success: true, docs: docsWithLabels });
  } catch (error) {
    console.error('❌ Docs meta error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/docs/kpis - Fetch precomputed KPIs for a document
app.get('/api/docs/kpis', async (req, res) => {
  try {
    const { id: docId } = req.query;
    if (!docId) {
      return res.status(400).json({ success: false, error: 'Document ID is required' });
    }

    const { data: kpis, error } = await supabase.from('document_kpis').select('*').eq('document_id', docId).single();
    if (error) throw new Error(`Database error: ${error.message}`);

    res.json({ success: true, kpis });
  } catch (error) {
    console.error('❌ KPIs fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/docs/metrics - Fetch detailed metrics for a document
app.get('/api/docs/metrics', async (req, res) => {
  try {
    const { id: docId } = req.query;
    if (!docId) {
      return res.status(400).json({ success: false, error: 'Document ID is required' });
    }

    const { data: metrics, error } = await supabase
      .from('document_metrics')
      .select('*')
      .eq('document_id', docId)
      .order('metric_type', { ascending: true })
      .order('label', { ascending: true });

    if (error) throw new Error(`Database error: ${error.message}`);

    const groupedMetrics = {
      revenue: metrics.filter((m) => m.metric_type === 'revenue'),
      expenses: metrics.filter((m) => m.metric_type === 'expense'),
      kpis: metrics.filter((m) => m.metric_type === 'kpi'),
    };

    res.json({ success: true, metrics: groupedMetrics, total: metrics.length });
  } catch (error) {
    console.error('❌ Metrics fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
