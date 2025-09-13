import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface MatchChunksParams {
  queryEmbedding: number[];
  matchThreshold?: number;
  matchCount?: number;
  documentId?: string;
}

export async function matchDocumentChunks(
  supabase: SupabaseClient,
  params: MatchChunksParams
) {
  const {
    queryEmbedding,
    matchThreshold = 0.7,
    matchCount = 5,
    documentId,
  } = params;

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_document_id: documentId || null,
  });

  if (error) {
    console.error('Error matching document chunks:', error);
    throw error;
  }

  return data;
}

// Helper to get embedding from text using OpenAI
export async function getEmbedding(text: string, openaiApiKey: string) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get embedding: ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
