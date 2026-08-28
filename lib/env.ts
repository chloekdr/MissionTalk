type ServerEnv = {
  UPSTAGE_API_KEY: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RAG_MATCH_THRESHOLD: number;
  RAG_MATCH_COUNT: number;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

function boundedNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const value = raw ? Number(raw) : fallback;
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function getServerEnv(): ServerEnv {
  return {
    UPSTAGE_API_KEY: required('UPSTAGE_API_KEY'),
    OPENAI_API_KEY: required('OPENAI_API_KEY'),
    OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini',
    SUPABASE_URL: required('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
    RAG_MATCH_THRESHOLD: boundedNumber('RAG_MATCH_THRESHOLD', 0.35, 0, 1),
    RAG_MATCH_COUNT: Math.round(boundedNumber('RAG_MATCH_COUNT', 5, 1, 10)),
  };
}
