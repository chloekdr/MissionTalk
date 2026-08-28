import { getServerEnv } from './env';
import { createServerSupabase } from './supabase';
import { createQueryEmbedding } from './upstage';

export type RagMatch = {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export async function retrieveChurchContext(query: string): Promise<RagMatch[]> {
  const env = getServerEnv();
  const embedding = await createQueryEmbedding(query, env.UPSTAGE_API_KEY);
  const supabase = createServerSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase.rpc('match_rag_documents', {
    query_embedding: embedding,
    match_threshold: env.RAG_MATCH_THRESHOLD,
    match_count: env.RAG_MATCH_COUNT,
  });

  if (error) throw new Error(`Supabase 검색 오류: ${error.message}`);
  return (data || []) as RagMatch[];
}

export function formatContext(matches: RagMatch[]): string {
  return matches
    .map((match, index) => {
      const source = String(match.metadata?.source_file || '교회 자료');
      return `[자료 ${index + 1} | ${source} | 유사도 ${match.similarity.toFixed(3)}]\n${match.content}`;
    })
    .join('\n\n');
}
