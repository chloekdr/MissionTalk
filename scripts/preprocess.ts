import './load-env';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chunkText, normalizeExtractedText, stripHtml } from './lib/chunking';

const DOCUMENT_PARSE_URL = 'https://api.upstage.ai/v1/document-digitization';
const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.xlsx', '.hwp', '.hwpx', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.heic']);
const projectRoot = path.resolve(process.cwd());
const datasetDir = path.resolve(projectRoot, '..', 'Dataset');
const parsedDir = path.join(projectRoot, 'data', 'parsed');
const outputPath = path.join(projectRoot, 'data', 'chunks.jsonl');

type ParsedPayload = {
  content?: { text?: string; markdown?: string; html?: string };
  elements?: Array<{ content?: { text?: string; markdown?: string; html?: string } }>;
  error?: { message?: string };
};

type ChunkRecord = {
  source_file: string;
  source_hash: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown>;
};

function getArgValue(name: string): string | undefined {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function extractPayloadText(payload: ParsedPayload): string {
  const direct = payload.content?.text || payload.content?.markdown || payload.content?.html;
  if (direct) return direct.includes('<') ? stripHtml(direct) : direct;
  const fromElements = (payload.elements || [])
    .map((item) => item.content?.text || item.content?.markdown || item.content?.html || '')
    .map((item) => (item.includes('<') ? stripHtml(item) : item))
    .filter(Boolean)
    .join('\n\n');
  if (!fromElements) throw new Error('Upstage 파싱 결과에서 텍스트를 찾지 못했습니다.');
  return fromElements;
}

async function parseWithUpstage(filePath: string, apiKey: string): Promise<ParsedPayload> {
  const bytes = await readFile(filePath);
  const form = new FormData();
  form.append('document', new Blob([bytes]), path.basename(filePath));
  form.append('model', 'document-parse-260630');
  form.append('output_formats', JSON.stringify(['text', 'html']));

  const response = await fetch(DOCUMENT_PARSE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const payload = (await response.json()) as ParsedPayload;
  if (!response.ok) throw new Error(payload.error?.message || `HTTP ${response.status}`);
  return payload;
}

async function main() {
  const apiKey = process.env.UPSTAGE_API_KEY?.trim();
  if (!apiKey) throw new Error('UPSTAGE_API_KEY 환경변수가 필요합니다.');

  const force = process.argv.includes('--force');
  const limit = Number(getArgValue('--limit') || 0);
  await mkdir(parsedDir, { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });

  const names = (await readdir(datasetDir))
    .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'ko'));
  const selectedNames = limit > 0 ? names.slice(0, limit) : names;
  const seenHashes = new Set<string>();
  const seenContentHashes = new Set<string>();
  const records: ChunkRecord[] = [];
  const failures: string[] = [];

  for (const [fileIndex, rawName] of selectedNames.entries()) {
    const sourceFile = rawName.normalize('NFC');
    const filePath = path.join(datasetDir, rawName);
    const bytes = await readFile(filePath);
    const sourceHash = createHash('sha256').update(bytes).digest('hex');

    if (seenHashes.has(sourceHash)) {
      console.log(`[${fileIndex + 1}/${selectedNames.length}] 중복 제외: ${sourceFile}`);
      continue;
    }
    seenHashes.add(sourceHash);

    const cachePath = path.join(parsedDir, `${sourceHash}.json`);
    try {
      let payload: ParsedPayload;
      if (!force) {
        try {
          payload = JSON.parse(await readFile(cachePath, 'utf8')) as ParsedPayload;
        } catch {
          payload = await parseWithUpstage(filePath, apiKey);
          await writeFile(cachePath, JSON.stringify(payload), { mode: 0o600 });
        }
      } else {
        payload = await parseWithUpstage(filePath, apiKey);
        await writeFile(cachePath, JSON.stringify(payload), { mode: 0o600 });
      }

      const text = normalizeExtractedText(extractPayloadText(payload));
      const contentHash = createHash('sha256').update(text).digest('hex');
      if (seenContentHashes.has(contentHash)) {
        console.log(`[${fileIndex + 1}/${selectedNames.length}] 본문 중복 제외: ${sourceFile}`);
        continue;
      }
      seenContentHashes.add(contentHash);
      const chunks = chunkText(text);
      records.push(...chunks.map((chunk) => ({
        source_file: sourceFile,
        source_hash: sourceHash,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        metadata: {
          source_file: sourceFile,
          extension: path.extname(sourceFile).toLowerCase(),
          parser: 'upstage-document-parse-260630',
          language: 'ko-en',
        },
      })));
      console.log(`[${fileIndex + 1}/${selectedNames.length}] ${sourceFile}: ${chunks.length}개 청크`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${sourceFile}: ${reason}`);
      console.error(`[${fileIndex + 1}/${selectedNames.length}] 실패: ${sourceFile}`);
    }
  }

  const glossaryPath = path.join(projectRoot, 'data', 'glossary.json');
  const glossary = JSON.parse(await readFile(glossaryPath, 'utf8')) as Array<{ korean: string; english: string; note?: string }>;
  const glossaryText = glossary.map((item) => `${item.korean}: ${item.english}${item.note ? ` (${item.note})` : ''}`).join('\n');
  records.unshift({
    source_file: '교회 핵심 용어집',
    source_hash: createHash('sha256').update(glossaryText).digest('hex'),
    chunk_index: 0,
    content: `서초예수사랑교회 선교 영어 핵심 용어\n${glossaryText}`,
    metadata: { source_file: '교회 핵심 용어집', type: 'curated_glossary', language: 'ko-en' },
  });

  await writeFile(outputPath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`, { mode: 0o600 });
  console.log(`완료: ${records.length}개 청크 → ${outputPath}`);

  if (failures.length) {
    console.error(`파싱 실패 ${failures.length}개:\n${failures.join('\n')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
