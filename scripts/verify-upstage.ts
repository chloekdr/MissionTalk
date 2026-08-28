import './load-env';
import { createUpstageEmbeddings, EMBEDDING_DIMENSIONS } from '../lib/upstage';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

async function main() {
  const apiKey = required('UPSTAGE_API_KEY');
  const [query, passage] = await Promise.all([
    createUpstageEmbeddings(['예수님은 우리를 사랑하십니다.'], 'query', apiKey),
    createUpstageEmbeddings(['Jesus loves us.'], 'passage', apiKey),
  ]);

  if (query[0].length !== EMBEDDING_DIMENSIONS || passage[0].length !== EMBEDDING_DIMENSIONS) {
    throw new Error('임베딩 차원 검증에 실패했습니다.');
  }
  console.log(`Upstage 임베딩 검증 완료: query/passage 각 ${EMBEDDING_DIMENSIONS}차원`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
