// Environment variables for Azure Document Intelligence
const AZURE_ENDPOINT = process.env.DI_ENDPOINT;
const AZURE_API_KEY = process.env.DI_KEY;
const AZURE_MODEL_ID = process.env.DI_MODEL_ID || 'prebuilt-document';
const AZURE_API_VERSION = process.env.DI_API_VERSION || '2024-07-31';

interface AnalyzeDocumentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Submit document to Azure Document Intelligence for analysis
 */
async function submitDocumentToAzure(base64Data: string): Promise<string> {
  if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
    throw new Error('Azure Document Intelligence is not properly configured');
  }

  const analyzeUrl = `${AZURE_ENDPOINT}/formrecognizer/documentModels/${AZURE_MODEL_ID}:analyze?api-version=${AZURE_API_VERSION}`;

  const response = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      base64Source: base64Data
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Document Intelligence error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const operationLocation = response.headers.get('Operation-Location');
  if (!operationLocation) {
    throw new Error('No Operation-Location header received from Azure');
  }

  return operationLocation;
}

/**
 * Poll Azure for analysis results
 */
async function pollAzureForResults(operationLocation: string): Promise<any> {
  if (!AZURE_API_KEY) {
    throw new Error('Azure Document Intelligence is not properly configured');
  }

  const maxAttempts = 30; // 30 attempts with 2-second intervals = 1 minute max
  const pollInterval = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(operationLocation, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure polling error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    if (result.status === 'succeeded') {
      return result;
    }

    if (result.status === 'failed') {
      throw new Error('Azure Document Intelligence analysis failed');
    }

    // Still running, wait and try again
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('Azure Document Intelligence analysis timed out');
}

/**
 * Analyze a financial document using Azure Document Intelligence
 * This function should be called from a backend API route
 */
export async function analyzeFinancialDocument(
  base64Data: string
): Promise<AnalyzeDocumentResponse> {
  try {
    // Check if Azure is configured
    if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
      throw new Error('Azure Document Intelligence is not configured. Please set AZURE_ENDPOINT and AZURE_API_KEY environment variables.');
    }

    // Step 1: Submit document for analysis
    const operationLocation = await submitDocumentToAzure(base64Data);
    
    // Step 2: Poll for results
    const result = await pollAzureForResults(operationLocation);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('❌ Azure Document Intelligence error:', error);
    throw new Error(`Document analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
