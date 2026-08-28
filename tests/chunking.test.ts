import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkText, normalizeExtractedText, stripHtml } from '../scripts/lib/chunking';

test('normalizes whitespace and Korean text', () => {
  assert.equal(normalizeExtractedText('  예수님은   그리스도입니다.\r\n\r\n  복음입니다.  '), '예수님은 그리스도입니다.\n\n복음입니다.');
});

test('strips common document parse HTML', () => {
  assert.match(normalizeExtractedText(stripHtml('<p>복음은 <strong>기쁜 소식</strong>입니다.</p><p>Jesus is the Christ.</p>')), /복음은 기쁜 소식입니다\.\nJesus is the Christ\./);
});

test('creates bounded chunks while preserving content', () => {
  const input = Array.from({ length: 12 }, (_, index) => `문단 ${index + 1}. 예수님은 그리스도입니다. Jesus is the Christ.`).join('\n\n');
  const chunks = chunkText(input, 180, 30);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.content.length <= 180));
  assert.equal(chunks[0].chunkIndex, 0);
  assert.match(chunks.map((chunk) => chunk.content).join(' '), /예수님은 그리스도입니다/);
});
