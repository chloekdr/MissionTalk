# 미션톡 RAG 챗봇

Upstage Document Parse와 Solar Embedding 2로 교회 자료를 처리하고, Supabase pgvector에서 관련 문장을 검색한 뒤 OpenAI Responses API로 쉬운 선교 영어를 생성합니다.

## 준비

1. `.env.example`을 복사해 `.env.local`을 만들고 서버 전용 키를 입력합니다.
2. Supabase SQL Editor에서 `supabase/schemas/01_rag.sql`을 실행합니다.
3. `pnpm data:setup`으로 자료 파싱, 임베딩, 적재, 검색 검증을 실행합니다.
4. `pnpm dev`로 로컬 챗봇을 실행합니다.

필수 환경변수:

- `UPSTAGE_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

API 키는 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다. `.env.local`은 Git에서 제외됩니다.

## 데이터 처리

- 원본: 상위 폴더의 `Dataset/`
- 파싱 캐시: `data/parsed/`
- 임베딩 전 청크: `data/chunks.jsonl`
- 고정 용어: `data/glossary.json`

현재 전체 전처리 결과는 중복 파일 1개를 제외한 교회 자료 26개와 고정 용어집을 합쳐 242개 청크입니다.

부분 테스트는 `pnpm data:preprocess -- --limit=1`로 실행할 수 있습니다. 전체 자료를 다시 파싱하려면 `--force`를 추가합니다.

## 품질 검사

```sh
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

외부 API만 따로 확인하려면 `pnpm api:verify:upstage`와 `pnpm api:verify:openai`를 실행합니다.

## Vercel 배포

이 프로젝트는 표준 Next.js App Router 구조이며 Vercel에서 `Next.js` 프레임워크로 배포합니다.

- Root Directory: `./`
- Build Command: 기본값 (`pnpm build`)
- Node.js: 22.x
- 필수 환경변수: 위의 서버 전용 환경변수 4개

환경변수는 Production과 Preview에 설정하고 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다. 특히 `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용합니다.
