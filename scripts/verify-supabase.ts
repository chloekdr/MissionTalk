import './load-env';
import { createClient } from '@supabase/supabase-js';
import { createQueryEmbedding } from '../lib/upstage';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

async function main() {
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const embedding = await createQueryEmbedding('예수님은 그리스도입니다.', required('UPSTAGE_API_KEY'));
  const { data, error } = await supabase.rpc('match_rag_documents', {
    query_embedding: embedding,
    match_threshold: 0.2,
    match_count: 3,
  });
  if (error) throw new Error(`검색 검증 실패: ${error.message}`);
  if (!Array.isArray(data) || data.length === 0) throw new Error('검색 결과가 없습니다. 데이터 적재를 확인하세요.');
  console.log(`Supabase RAG 검색 검증 완료: ${data.length}건`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
