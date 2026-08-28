export type TextChunk = {
  content: string;
  chunkIndex: number;
};

export function normalizeExtractedText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];
  const sentences = paragraph.split(/(?<=[.!?。！？]|다\.|요\.)\s+/u).filter(Boolean);
  const parts: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length > maxChars && current) {
      parts.push(current);
      current = sentence;
    } else {
      current = (current + ' ' + sentence).trim();
    }
  }
  if (current) parts.push(current);
  return parts.length ? parts : paragraph.match(new RegExp(`.{1,${maxChars}}`, 'gs')) || [];
}

export function chunkText(input: string, maxChars = 1100, overlapChars = 140): TextChunk[] {
  const normalized = normalizeExtractedText(input);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}|\n(?=(?:\d+[.)]|[-•]|[가-힣A-Z][^\n]{0,60}:))/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => splitLongParagraph(item, maxChars));

  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);
    const overlap = current.slice(-overlapChars).replace(/^\S*\s/, '').trim();
    current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
    if (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(Math.max(0, maxChars - overlapChars));
    }
  }
  if (current) chunks.push(current);

  return chunks
    .map((content, chunkIndex) => ({ content: content.trim(), chunkIndex }))
    .filter((item) => item.content.length >= 30);
}
