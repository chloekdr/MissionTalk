create extension if not exists vector with schema extensions;

create table if not exists public.rag_documents (
  id bigint generated always as identity primary key,
  source_file text not null,
  source_hash text not null,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) between 1 and 10000),
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1024) not null,
  embedding_model text not null default 'solar-embedding-2-passage',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rag_documents_source_chunk_key unique (source_hash, chunk_index)
);

alter table public.rag_documents enable row level security;
alter table public.rag_documents force row level security;

grant usage on schema public, extensions to service_role;
revoke all on table public.rag_documents from public, anon, authenticated;
revoke all on sequence public.rag_documents_id_seq from public, anon, authenticated;
grant select, insert, update on table public.rag_documents to service_role;
grant usage, select on sequence public.rag_documents_id_seq to service_role;

create index if not exists rag_documents_embedding_hnsw_idx
  on public.rag_documents
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists rag_documents_metadata_gin_idx
  on public.rag_documents
  using gin (metadata);

create or replace function public.set_rag_documents_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_rag_documents_updated_at on public.rag_documents;
create trigger set_rag_documents_updated_at
before update on public.rag_documents
for each row execute function public.set_rag_documents_updated_at();

create or replace function public.match_rag_documents(
  query_embedding extensions.vector(1024),
  match_threshold double precision default 0.35,
  match_count integer default 5
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    document.id,
    document.content,
    document.metadata,
    1 - (document.embedding <=> query_embedding) as similarity
  from public.rag_documents as document
  where 1 - (document.embedding <=> query_embedding) >= greatest(0, least(1, match_threshold))
  order by document.embedding <=> query_embedding
  limit greatest(1, least(10, match_count));
$$;

revoke all on function public.match_rag_documents(extensions.vector, double precision, integer)
  from public, anon, authenticated;
grant execute on function public.match_rag_documents(extensions.vector, double precision, integer)
  to service_role;

revoke all on function public.set_rag_documents_updated_at() from public, anon, authenticated;
