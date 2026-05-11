-- =====================================================================
-- AI Document Q&A — Supabase schema
-- Run this in the Supabase SQL editor (one-shot).
-- =====================================================================

-- 1. Extensions ---------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- 2. Documents ----------------------------------------------------------
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  filename      text not null,
  storage_path  text not null,
  file_size     bigint not null,
  page_count    integer,
  language      text,                       -- 'en', 'ar', 'mixed', or null
  status        text not null default 'processing',
                                            -- processing | ready | failed
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists documents_created_at_idx
  on public.documents (created_at desc);

-- 3. Chunks (with embeddings) ------------------------------------------
-- voyage-3 returns 1024-dim vectors. If you swap to a different model,
-- update the dimension and re-embed everything.
create table if not exists public.chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  chunk_index  integer not null,
  content      text not null,
  page_number  integer,
  token_count  integer,
  embedding    vector(1024),
  created_at   timestamptz not null default now()
);

create index if not exists chunks_document_id_idx
  on public.chunks (document_id);

-- IVFFlat cosine index. Re-run ANALYZE after bulk inserts.
create index if not exists chunks_embedding_idx
  on public.chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Conversations + messages ------------------------------------------
create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  title        text,
  created_at   timestamptz not null default now()
);

create index if not exists conversations_document_id_idx
  on public.conversations (document_id, created_at desc);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  citations       jsonb,        -- [{chunk_id, page_number, snippet, similarity}]
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id, created_at);

-- 5. Vector search RPC -------------------------------------------------
-- Returns the top-N most similar chunks to the query embedding,
-- restricted to a single document.
create or replace function public.match_chunks(
  query_embedding    vector(1024),
  document_id_filter uuid,
  match_count        int default 6
)
returns table (
  id          uuid,
  document_id uuid,
  chunk_index integer,
  content     text,
  page_number integer,
  similarity  float
)
language sql stable as $$
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.page_number,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  where c.document_id = document_id_filter
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 6. Storage bucket ----------------------------------------------------
-- Create the bucket (idempotent).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 7. Row Level Security ------------------------------------------------
-- This starter app has no auth; the server uses the service role key,
-- which bypasses RLS. We still enable RLS on every table so that the
-- anon key cannot read or write anything by accident.
alter table public.documents     enable row level security;
alter table public.chunks        enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- No policies = no access for anon/authenticated. Service role bypasses RLS.

-- =====================================================================
-- Done. Verify with:
--   select extname from pg_extension where extname = 'vector';
--   select * from public.documents limit 1;
-- =====================================================================
