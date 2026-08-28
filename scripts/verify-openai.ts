import './load-env';
import { generateMissionEnglish } from '../lib/openai';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

async function main() {
  const answer = await generateMissionEnglish({
    message: '이 책에는 인생의 해답이 담겨 있어요.',
    context: '교회 자료에서는 복음 안내 책자를 영어로 gospel booklet이라고 부릅니다.',
    hasChurchContext: true,
    apiKey: required('OPENAI_API_KEY'),
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini',
  });

  if (!answer.english || answer.words.length === 0) throw new Error('구조화 답변 검증에 실패했습니다.');
  console.log(`OpenAI 구조화 답변 검증 완료: ${answer.english}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
