import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';

// Convert this file's URL to a path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use promisify to convert exec to a promise-based function
const execPromise = promisify(exec);

// Load environment variables
dotenv.config();

// Load environment variables
dotenv.config();

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

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
