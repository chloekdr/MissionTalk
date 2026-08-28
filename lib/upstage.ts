const UPSTAGE_EMBEDDINGS_URL = 'https://api.upstage.ai/v1/embeddings';
export const EMBEDDING_DIMENSIONS = 1024;

export type EmbeddingRole = 'query' | 'passage';

type UpstageEmbeddingResponse = {
  data?: Array<{ embedding?: number[]; index?: number }>;
  error?: { message?: string };
};

export async function createUpstageEmbeddings(
  input: string[],
  role: EmbeddingRole,
  apiKey: string,
): Promise<number[][]> {
  if (input.length === 0) return [];

  const response = await fetch(UPSTAGE_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: `solar-embedding-2-${role}`,
      input,
    }),
  });

  const payload = (await response.json()) as UpstageEmbeddingResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `Upstage embedding 오류 (${response.status})`);
  }

  const ordered = [...(payload.data || [])].sort((a, b) => (a.index || 0) - (b.index || 0));
  const embeddings = ordered.map((item) => item.embedding || []);

  if (embeddings.length !== input.length || embeddings.some((item) => item.length !== EMBEDDING_DIMENSIONS)) {
    throw new Error('Upstage 임베딩 응답의 개수 또는 차원이 예상과 다릅니다.');
  }

  return embeddings;
}

export async function createQueryEmbedding(input: string, apiKey: string): Promise<number[]> {
  const [embedding] = await createUpstageEmbeddings([input], 'query', apiKey);
  return embedding;
}
