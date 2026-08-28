import './load-env';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createUpstageEmbeddings } from '../lib/upstage';

type ChunkRecord = {
  source_file: string;
  source_hash: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown>;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

function batches<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function main() {
  const upstageApiKey = required('UPSTAGE_API_KEY');
  const supabaseUrl = required('SUPABASE_URL');
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const chunksPath = path.join(process.cwd(), 'data', 'chunks.jsonl');
  const lines = (await readFile(chunksPath, 'utf8')).split('\n').filter(Boolean);
  const chunks = lines.map((line) => JSON.parse(line) as ChunkRecord);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let completed = 0;
  for (const batch of batches(chunks, 20)) {
    const embeddings = await createUpstageEmbeddings(batch.map((item) => item.content), 'passage', upstageApiKey);
    const rows = batch.map((item, index) => ({
      source_file: item.source_file,
      source_hash: item.source_hash,
      chunk_index: item.chunk_index,
      content: item.content,
      metadata: item.metadata,
      embedding: embeddings[index],
      embedding_model: 'solar-embedding-2-passage',
    }));

    const { error } = await supabase
      .from('rag_documents')
      .upsert(rows, { onConflict: 'source_hash,chunk_index', ignoreDuplicates: false });
    if (error) throw new Error(`Supabase 적재 오류: ${error.message}`);

    completed += batch.length;
    console.log(`임베딩 및 적재: ${completed}/${chunks.length}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
