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
    
    // Compile the TypeScript file first
    const compileResult = await execPromise('npx tsc src/api/documentAnalysis.ts --outDir dist --target ES2020 --module CommonJS');
    
    // Import the compiled JavaScript version
    const { analyzeFinancialDocument } = await import(join(__dirname, 'dist', 'documentAnalysis.js'));
    
    // Process all files (in a real implementation, you might want to process them in parallel)
    const results = [];
    for (const base64File of files) {
      // Extract base64 data from data URL
      const base64Data = base64File.split(',')[1] || base64File;
      const result = await analyzeFinancialDocument(base64Data);
      results.push(result);
    }
    
    // Return the results of all files
    res.json({
      success: results.every(r => r.success),
      results
    });
  } catch (error) {
    console.error('Error in document analysis endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
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
    
    // Import the compiled JavaScript version
    const { confirmUserEmail } = await import(join(__dirname, 'dist', 'userConfirmation.js'));
    
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
