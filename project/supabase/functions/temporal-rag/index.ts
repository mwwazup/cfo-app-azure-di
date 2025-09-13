import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import OpenAI from 'https://deno.land/x/openai@v4.24.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, monthsBack = 6, hops = 1, k = 5 } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    // Get embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Perform vector similarity search
    const { data: chunks, error } = await supabaseClient.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: k,
    });

    if (error) throw error;

    // Format context from matched chunks
    const context = chunks
      .map((chunk: any) => `[Document ID: ${chunk.document_id}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    // Generate response using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions based on the provided context. \
            Use only the information from the context below. If you don't know the answer, say so.\n\nContext:\n${context}`,
        },
        { role: 'user', content: query },
      ],
      temperature: 0.7,
    });

    return new Response(
      JSON.stringify({
        answer: completion.choices[0].message.content,
        used_nodes: chunks,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in temporal-rag:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
