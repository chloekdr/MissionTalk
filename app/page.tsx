'use client';

import { FormEvent, useMemo, useState } from 'react';

type WordMeaning = { word: string; meaning: string };
type ChatAnswer = {
  english: string;
  words: WordMeaning[];
  tip?: string;
  source: 'church_dataset' | 'general';
};

const examples = [
  '그리스도는 하나님의 능력이에요.',
  '예수님은 우리의 구원자입니다.',
  '제가 당신을 위해 기도해도 될까요?',
];

const initialAnswer: ChatAnswer = {
  english: 'There is a spiritual world we cannot see.',
  words: [
    { word: 'spiritual', meaning: '영적인' },
    { word: 'world', meaning: '세계' },
    { word: 'cannot see', meaning: '볼 수 없다' },
  ],
  source: 'church_dataset',
};

function isChatAnswer(value: unknown): value is ChatAnswer {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChatAnswer>;
  return typeof candidate.english === 'string' && Array.isArray(candidate.words);
}

export default function Home() {
  const [input, setInput] = useState('이 세상에는 보이지 않는 영적 세계가 있어요.');
  const [question, setQuestion] = useState(input);
  const [answer, setAnswer] = useState<ChatAnswer>(initialAnswer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sourceLabel = useMemo(
    () => (answer.source === 'church_dataset' ? '교회 자료 반영' : '일반 선교 영어'),
    [answer.source],
  );

  async function ask(value: string) {
    const message = value.trim();
    if (!message || loading) return;

    setQuestion(message);
    setInput(message);
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const apiError = data && typeof data === 'object' && 'error' in data
          ? String((data as { error: unknown }).error)
          : '답변을 만들지 못했어요.';
        throw new Error(apiError);
      }
      if (!isChatAnswer(data)) throw new Error('답변 형식이 올바르지 않아요.');
      setAnswer(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  async function copyEnglish() {
    await navigator.clipboard.writeText(answer.english);
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <div className="brand-mark" aria-hidden="true">EN</div>
        <div>
          <p className="provider">서초예수사랑교회 제1여전도회</p>
          <h1>미션톡</h1>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">선교 현장에서 바로 물어보는 나만의 영어 선생님</p>
        <h2 id="hero-title">한국말로 편하게 입력하세요</h2>
        <p>바로 말할 수 있는 쉬운 영어와 꼭 필요한 단어 뜻을 알려드려요.</p>

        <div className="example-list" aria-label="문장 예시">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => void ask(example)}>
              {example}
            </button>
          ))}
        </div>
      </section>

      <section className="conversation" aria-live="polite">
        <div className="user-message">
          <span>나</span>
          <p>{question}</p>
        </div>

        <article className="answer-card">
          <div className="answer-meta">
            <span className="teacher-label">영어 선생님</span>
            <span className="source-badge">{sourceLabel}</span>
          </div>

          <p className="english-answer">
            {loading ? '쉬운 영어로 바꾸고 있어요…' : answer.english}
          </p>

          {!loading && (
            <>
              <div className="word-list">
                <h3>단어 뜻</h3>
                <dl>
                  {answer.words.map(({ word, meaning }) => (
                    <div key={`${word}-${meaning}`}>
                      <dt>{word}</dt>
                      <dd>{meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {answer.tip && <p className="tip">팁 · {answer.tip}</p>}

              <div className="answer-actions">
                <button type="button" onClick={() => void copyEnglish()}>영어 복사</button>
                <button type="button" onClick={() => void ask(`${question}\n더 쉽게 말해 줘.`)}>더 쉽게</button>
                <button type="button" onClick={() => void ask(`${question}\n다른 쉬운 표현으로 말해 줘.`)}>다른 표현</button>
              </div>
            </>
          )}
        </article>

        {error && <p className="error-message" role="alert">{error}</p>}
      </section>

      <form className="chat-form" onSubmit={submit}>
        <label htmlFor="chat-input">한국어 문장</label>
        <div className="input-row">
          <textarea
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="예: 그리스도는 하나님의 능력이에요."
            rows={2}
            maxLength={2000}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? '생성 중' : '영어로'}
          </button>
        </div>
        <p>개인정보나 민감한 상담 내용은 입력하지 마세요.</p>
      </form>
    </main>
  );
}
