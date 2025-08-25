import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';
import { mapLabel, parseMonetaryValue, calculateKPIs } from './src/utils/labelMapping.js';

// Convert this file's URL to a path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use promisify to convert exec to a promise-based function
const execPromise = promisify(exec);

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const PORT = process.env.PORT || 5180;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

// Document analysis endpoint
app.post('/api/documentAnalysis', async (req, res) => {
  try {
    const { files, userId } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files provided' 
      });
    }
    
    // Use the actual Azure Document Intelligence API
    const results = [];
    
    for (const base64File of files) {
      try {
        // Extract base64 data from data URL if needed
        const base64Data = base64File.includes(',') ? base64File.split(',')[1] : base64File;
        
        // Call Azure Document Intelligence directly (using new API path)
        const analyzeUrl = `${process.env.DI_ENDPOINT}/documentintelligence/documentModels/${process.env.DI_MODEL_ID || 'prebuilt-document'}:analyze?api-version=${process.env.DI_API_VERSION || '2024-11-30'}`;
        
        console.log('🔍 Calling Azure Document Intelligence API...');
        console.log('📍 Endpoint:', process.env.DI_ENDPOINT);
        console.log('📋 Model ID:', process.env.DI_MODEL_ID || 'prebuilt-document');
        console.log('🔗 Full URL:', analyzeUrl);
        
        // Submit document for analysis
        const submitResponse = await fetch(analyzeUrl, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.DI_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            base64Source: base64Data
          }),
        });

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          throw new Error(`Azure API error: ${submitResponse.status} ${submitResponse.statusText} - ${errorText}`);
        }

        const operationLocation = submitResponse.headers.get('Operation-Location');
        if (!operationLocation) {
          throw new Error('No Operation-Location header received from Azure');
        }

        console.log('📋 Document submitted, polling for results...');

        // Poll for results
        let analysisResult = null;
        const maxAttempts = 30;
        const pollInterval = 2000; // 2 seconds

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const pollResponse = await fetch(operationLocation, {
            headers: {
              'Ocp-Apim-Subscription-Key': process.env.DI_KEY
            }
          });

          if (!pollResponse.ok) {
            throw new Error(`Polling error: ${pollResponse.status} ${pollResponse.statusText}`);
          }

          const pollResult = await pollResponse.json();
          console.log(`📊 Polling attempt ${attempt}: ${pollResult.status}`);

          if (pollResult.status === 'succeeded') {
            analysisResult = pollResult;
            break;
          } else if (pollResult.status === 'failed') {
            throw new Error(`Azure analysis failed: ${pollResult.error?.message || 'Unknown error'}`);
          }

          // Still running, wait and try again
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
        }

        if (!analysisResult) {
          throw new Error('Azure Document Intelligence analysis timed out');
        }

        console.log('✅ Azure Document Intelligence analysis completed successfully');
        
        results.push({
          success: true,
          data: analysisResult
        });

      } catch (error) {
        console.error('❌ Azure Document Intelligence error:', error.message);
        
        // Don't use mock data - fail fast with clear error message
        throw new Error(`Azure Document Intelligence failed: ${error.message}. Please check your Azure credentials and configuration.`);
      }
    }
    
    // Return the results of all files - frontend expects 'data' not 'results'
    const firstResult = results[0];
    console.log('🔍 First result structure:', JSON.stringify(firstResult, null, 2));
    
    res.json({
      success: results.every(r => r.success),
      data: firstResult?.data || null, // Extract the actual data from the first result
      results // Keep for debugging
    });
  } catch (error) {
    console.error('Error in document analysis endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Document analysis failed'
    });
  }
});

// User email confirmation endpoint
app.post('/api/confirmUser', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }
    
    // Compile the TypeScript file first
    const compileResult = await execPromise('npx tsc src/api/userConfirmation.ts --outDir dist --target ES2020 --module CommonJS');
    
    // Import the compiled JavaScript version (use file:// URL for Windows compatibility)
    const userModulePath = join(__dirname, 'dist', 'userConfirmation.js');
    const userModuleUrl = `file://${userModulePath.replace(/\\/g, '/')}`;
    const { confirmUserEmail } = await import(userModuleUrl);
    
    // Confirm user email
    const result = await confirmUserEmail(userId);
    
    res.json({
      success: result
    });
  } catch (error) {
    console.error('Error in user confirmation endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/di/ingest - Server-side document ingestion with precomputed KPIs
app.post('/api/di/ingest', async (req, res) => {
  try {
    const { file, userId, documentType = 'profit_loss' } = req.body;
    
    if (!file || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'File and userId are required' 
      });
    }
    
    // Extract base64 data
    const base64Data = file.includes(',') ? file.split(',')[1] : file;
    
    // Call Azure Document Intelligence
    const analyzeUrl = `${process.env.DI_ENDPOINT}/documentintelligence/documentModels/${process.env.DI_MODEL_ID || 'prebuilt-document'}:analyze?api-version=${process.env.DI_API_VERSION || '2024-11-30'}`;
    
    console.log('🔍 Processing document with Azure DI...');
    
    // Submit for analysis
    const submitResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.DI_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ base64Source: base64Data }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Azure API error: ${submitResponse.status} - ${errorText}`);
    }

    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No Operation-Location header received');
    }

    // Poll for results
    let analysisResult = null;
    const maxAttempts = 30;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const pollResponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': process.env.DI_KEY }
      });

      if (!pollResponse.ok) {
        throw new Error(`Polling error: ${pollResponse.status}`);
      }

      const pollResult = await pollResponse.json();
      
      if (pollResult.status === 'succeeded') {
        analysisResult = pollResult;
        break;
      } else if (pollResult.status === 'failed') {
        throw new Error(`Analysis failed: ${pollResult.error?.message || 'Unknown error'}`);
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!analysisResult) {
      throw new Error('Analysis timed out');
    }

    // Create financial document record
    const { data: document, error: docError } = await supabase
      .from('financial_documents')
      .insert({
        user_id: userId,
        document_type: documentType,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        source: 'azure_document_intelligence'
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Database error: ${docError.message}`);
    }

    // Process and normalize extracted fields
    const metrics = [];
    const analyzeResult = analysisResult.analyzeResult;
    
    // Process documents fields
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
            confidence: field.confidence || 0.85
          });
        } else if (process.env.NODE_ENV === 'development') {
          console.debug(`❌ NO MATCH for field: "${fieldName}"`);
        }
      });
    }

    // Process key-value pairs
    if (analyzeResult.keyValuePairs) {
      analyzeResult.keyValuePairs.forEach(kvp => {
        const mapping = mapLabel(kvp.key.content);
        if (mapping) {
          const value = parseMonetaryValue(kvp.value.content);
          
          metrics.push({
            document_id: document.id,
            metric_type: mapping.type,
            metric_key: mapping.key,
            label: kvp.key.content,
            value,
            confidence: kvp.confidence || 0.85
          });
        }
      });
    }

    // Insert metrics
    if (metrics.length > 0) {
      const { error: metricsError } = await supabase
        .from('document_metrics')
        .insert(metrics);

      if (metricsError) {
        throw new Error(`Metrics insert error: ${metricsError.message}`);
      }
    }

    // Calculate and store KPIs
    const kpis = calculateKPIs(metrics);
    
    const { error: kpisError } = await supabase
      .from('document_kpis')
      .insert({
        document_id: document.id,
        ...kpis
      });

    if (kpisError) {
      throw new Error(`KPIs insert error: ${kpisError.message}`);
    }

    console.log(`✅ Document processed: ${metrics.length} metrics, KPIs computed`);
    
    res.json({
      success: true,
      docId: document.id,
      metricsCount: metrics.length,
      kpis
    });

  } catch (error) {
    console.error('❌ Document ingestion error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/docs/meta - Fetch document metadata only
app.get('/api/docs/meta', async (req, res) => {
  try {
    const { user: userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    const { data: docs, error } = await supabase
      .from('financial_documents')
      .select('id, document_type, start_date, end_date, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Add display labels
    const docsWithLabels = docs.map(doc => ({
      ...doc,
      label: `${doc.document_type.replace('_', ' ').toUpperCase()} - ${doc.start_date} to ${doc.end_date}`
    }));

    res.json({
      success: true,
      docs: docsWithLabels
    });

  } catch (error) {
    console.error('❌ Docs meta error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/docs/kpis - Fetch precomputed KPIs for a document
app.get('/api/docs/kpis', async (req, res) => {
  try {
    const { id: docId } = req.query;
    
    if (!docId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Document ID is required' 
      });
    }

    const { data: kpis, error } = await supabase
      .from('document_kpis')
      .select('*')
      .eq('document_id', docId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    res.json({
      success: true,
      kpis
    });

  } catch (error) {
    console.error('❌ KPIs fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/docs/metrics - Fetch detailed metrics for a document
app.get('/api/docs/metrics', async (req, res) => {
  try {
    const { id: docId } = req.query;
    
    if (!docId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Document ID is required' 
      });
    }

    const { data: metrics, error } = await supabase
      .from('document_metrics')
      .select('*')
      .eq('document_id', docId)
      .order('metric_type', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Group by type for easier consumption
    const groupedMetrics = {
      revenue: metrics.filter(m => m.metric_type === 'revenue'),
      expenses: metrics.filter(m => m.metric_type === 'expense'),
      kpis: metrics.filter(m => m.metric_type === 'kpi')
    };

    res.json({
      success: true,
      metrics: groupedMetrics,
      total: metrics.length
    });

  } catch (error) {
    console.error('❌ Metrics fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
