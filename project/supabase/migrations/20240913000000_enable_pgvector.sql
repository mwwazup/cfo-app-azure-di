-- Enable pgvector extension
create extension if not exists vector with schema public;

-- Create a table for document chunks with vector embeddings
create table if not exists document_chunks (
  id bigserial primary key,
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  metadata jsonb,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Create index for vector similarity search
create index on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Function for similarity search
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_document_id uuid default null
)
returns table (
  id bigint,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1=1
    and (filter_document_id is null or document_chunks.document_id = filter_document_id)
    and (document_chunks.embedding <=> query_embedding) < 1 - match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- Grant necessary permissions
grant select, insert, update, delete on document_chunks to authenticated;
grant usage on sequence document_chunks_id_seq to authenticated;
