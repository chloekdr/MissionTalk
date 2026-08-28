import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { generateMissionEnglish } from '@/lib/openai';
import { formatContext, retrieveChurchContext } from '@/lib/rag';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) return NextResponse.json({ error: '문장을 입력해 주세요.' }, { status: 400 });
    if (message.length > 2000) {
      return NextResponse.json({ error: '문장은 2,000자 이하로 입력해 주세요.' }, { status: 400 });
    }

    const env = getServerEnv();
    const matches = await retrieveChurchContext(message);
    const answer = await generateMissionEnglish({
      message,
      context: formatContext(matches),
      hasChurchContext: matches.length > 0,
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
    });

    return NextResponse.json(answer, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '답변을 만들지 못했습니다.';
    const configurationError = message.includes('환경변수가 필요합니다');
    console.error('[chat]', configurationError ? 'server configuration missing' : message);
    return NextResponse.json(
      { error: configurationError ? '서버 설정이 아직 완료되지 않았어요.' : '잠시 후 다시 시도해 주세요.' },
      { status: configurationError ? 503 : 500 },
    );
  }
}
