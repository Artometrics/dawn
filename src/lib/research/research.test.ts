import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { citationsFrom, localAnswer, rankChunks } from './answer';
import { toBibtex, toMarkdown } from './citations';
import { SEED_COLLECTIONS } from './collections';
import { ANSWER_CAP, SOURCE_CAP, addSource, parseResearch, saveAnswer } from './desk';
import { hashEmbed } from './embed';
import { extractDocument } from './extract';
import { classifyImportPath, importableZipEntries } from './import-queue';
import { askResearch, localEmbedder, processSource } from './pipeline';
import { MemoryStore } from './store';
import { chunkPassages, parseTranscript } from './text';
import { DESK_PAYLOAD_MAX } from '../desks/store';
import type { ChunkRecord, DeskAnswer, DeskSource } from './types';

test('transcript cues keep [mm:ss] timestamps', () => {
  const passages = parseTranscript(`1
00:00:12.000 --> 00:00:18.000
Cardinal red wants a ten minute hold at cone six.

2
00:02:40.500 --> 00:02:48.000
The March tile used 8 percent iron and 2 percent tin.

[11:20] Silica glaze crazes when the cool is too fast.
`);
  assert.equal(passages.length, 3);
  assert.equal(passages[0].timestamp, '0:12');
  assert.match(passages[0].text, /cone six/);
  assert.equal(passages[1].timestamp, '2:40');
  assert.equal(passages[2].timestamp, '11:20');
});

test('chunks overlap by 180 characters', () => {
  const text = 'silica '.repeat(400);
  const chunks = chunkPassages([{ text, page: 1, timestamp: null, startSec: null }], 1400, 180);
  assert.ok(chunks.length >= 2);
  const overlap = chunks[0].text.slice(-180);
  assert.ok(chunks[1].text.startsWith(overlap.trim()) || chunks[1].text.includes(overlap.trim().slice(0, 40)));
});

test('pdf extraction keeps page numbers', async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page1 = pdf.addPage();
  page1.drawText('Cardinal glaze log. The red wants a hold.', { x: 50, y: 700, size: 16, font });
  const page2 = pdf.addPage();
  page2.drawText('Tin test at eight percent iron lives on page two.', { x: 50, y: 700, size: 16, font });
  const bytes = await pdf.save();
  const passages = await extractDocument(Buffer.from(bytes), 'pdf');
  assert.ok(passages.some((passage) => passage.page === 1 && /hold/.test(passage.text)));
  assert.ok(passages.some((passage) => passage.page === 2 && /Tin test/.test(passage.text)));
});

test('epub extraction reads the spine', async () => {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
  zip.file('OEBPS/content.opf', '<?xml version="1.0"?><package><manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>');
  zip.file('OEBPS/c1.xhtml', '<html><body><p>Ivory porcelain is translucent at two millimeters.</p></body></html>');
  const passages = await extractDocument(Buffer.from(await zip.generateAsync({ type: 'nodebuffer' })), 'epub');
  assert.match(passages[0].text, /translucent/);
  assert.equal(passages[0].page, 1);
});

test('local embeddings rank the silica passage first', async () => {
  const texts = [
    'Cardinal red wants a ten minute hold at cone six.',
    'Silica glaze crazes when the body and the glaze cool at different rates.',
  ];
  const vectors = texts.map((text) => hashEmbed(text));
  const [query] = [hashEmbed('why does the silica glaze craze')];
  const chunks: ChunkRecord[] = texts.map((text, index) => ({
    id: `c${index}`,
    sourceId: 's',
    collectionId: index === 1 ? 'cardinal' : 'dawn',
    sourceTitle: 'Kiln notes',
    text,
    page: null,
    timestamp: index === 1 ? '11:20' : '0:12',
    startSec: null,
    chunkIndex: index,
    embedding: vectors[index],
  }));
  const ranked = rankChunks(chunks, query, 2);
  assert.equal(ranked[0].timestamp, '11:20');
  assert.match(localAnswer('why does the silica glaze craze', ranked, SEED_COLLECTIONS), /\[1\]/);
  assert.equal(hashEmbed('same').length, 768);
  const cited = citationsFrom(ranked.slice(0, 1), 'See [1] and [9] and [0].');
  assert.equal(cited.length, 1);
  assert.equal(cited[0].chunkId, ranked[0].id);
  assert.equal(cited.some((item) => item.chunkId === 'missing'), false);
});

test('process and ask cite only retrieved passages, and a cap mid-source keeps chunks', async () => {
  const store = new MemoryStore();
  await store.saveCollections([
    { id: 'ivory', name: 'Ivory', blurb: 'Porcelain notes.', sort: 0 },
    { id: 'cardinal', name: 'Cardinal', blurb: 'The book.', sort: 1 },
  ]);
  const transcript = '[00:11:20] Silica glaze crazes when the cool is too fast. A slower kiln cool stopped the crackle.';
  await store.putSource({
    id: 'src-silica-1',
    collectionId: 'cardinal',
    title: 'Cooling notes',
    kind: 'transcript',
    fileName: 'cool.txt',
    contentType: 'text/plain',
    size: transcript.length,
    status: 'uploaded',
    error: null,
    createdAt: new Date().toISOString(),
    pageCount: null,
    chunkCount: null,
  });
  await store.writeFile('src-silica-1', Buffer.from(transcript));
  const batches: number[] = [];
  const processed = await processSource(store, 'src-silica-1', localEmbedder(), {
    beforeBatch: async () => null,
    afterBatch: async (texts) => { batches.push(texts.length); },
  });
  assert.equal(processed.status, 'ready');
  assert.equal(batches.length, 1);
  const answer = await askResearch(store, 'cardinal', 'Why does the silica glaze craze?', localEmbedder(), null);
  assert.equal(answer.mode, 'local');
  assert.ok(answer.citations.length > 0);
  assert.equal(answer.citations[0].timestamp, '11:20');
  assert.ok(answer.citations.every((citation) => citation.chunkId.startsWith('src-silica-1')));
  assert.match(answer.answer, /crazes|crackle|cool/i);

  async function file(id: string, collectionId: string, title: string, body: string) {
    await store.putSource({
      id,
      collectionId,
      title,
      kind: 'transcript',
      fileName: `${id}.txt`,
      contentType: 'text/plain',
      size: body.length,
      status: 'uploaded',
      error: null,
      createdAt: new Date().toISOString(),
      pageCount: null,
      chunkCount: null,
    });
    await store.writeFile(id, Buffer.from(body));
    await processSource(store, id, localEmbedder(), { beforeBatch: async () => null, afterBatch: async () => {} });
  }
  await file('src-ivory', 'ivory', 'Porcelain body', 'The ivory porcelain shows translucency when the slab is thin.');
  const across = await askResearch(store, 'everything', 'How does the porcelain show translucency?', localEmbedder(), null);
  assert.equal(across.collectionId, 'everything');
  assert.equal(across.citations[0]?.collectionId, 'ivory');
  assert.match(across.answer, /Ivory/);
  const scoped = await askResearch(store, 'cardinal', 'How does the porcelain show translucency?', localEmbedder(), null);
  assert.ok(scoped.citations.every((citation) => citation.collectionId === 'cardinal'));

  const long = Array.from({ length: 17 }, (_, index) => `[${index}:10] Distinct kiln note ${index} about a unique mineral sample ${index}.`).join('\n\n');
  await store.putSource({
    id: 'src-long',
    collectionId: 'cardinal',
    title: 'Long',
    kind: 'transcript',
    fileName: 'long.txt',
    contentType: 'text/plain',
    size: long.length,
    status: 'uploaded',
    error: null,
    createdAt: new Date().toISOString(),
    pageCount: null,
    chunkCount: null,
  });
  await store.writeFile('src-long', Buffer.from(long));
  let batch = 0;
  const partial = await processSource(store, 'src-long', localEmbedder(), {
    beforeBatch: async () => {
      batch += 1;
      return batch > 1 ? 'Spend cap reached ($20.00 of $20.00 this UTC month). Raise it in Settings.' : null;
    },
    afterBatch: async () => {},
  });
  assert.equal(partial.status, 'error');
  assert.match(partial.error || '', /Spend cap reached/);
  const kept = await store.listChunks('cardinal');
  assert.ok(kept.some((chunk) => chunk.sourceId === 'src-long'));
});

test('citation export drops paths, uids, and embeddings', () => {
  const answers = [{
    question: 'What hold does cardinal red want?',
    collectionId: 'cardinal',
    email: 'kylesmcauliffe@gmail.com',
    createdBy: 'kyleUser01',
    storagePath: 'sources/kyleUser01/src/secret.pdf',
    citations: [{
      sourceTitle: 'Glaze log',
      page: 2,
      timestamp: null,
      excerpt: 'Tin test at cone six.',
      collectionId: 'cardinal',
      embedding: [0.1, 0.2],
      storagePath: 'sources/kyleUser01/src/secret.pdf',
    }],
  }];
  const markdown = toMarkdown(answers, 'Cardinal');
  const bibtex = toBibtex(answers);
  assert.match(markdown, /What hold does cardinal red want/);
  assert.match(markdown, /Glaze log/);
  assert.match(markdown, /p\. 2/);
  assert.match(markdown, /Tin test at cone six/);
  assert.match(bibtex, /@misc\{research-glaze-log-p2-1/);
  assert.match(bibtex, /booktitle = \{Cardinal\}/);
  assert.match(bibtex, /pages = \{2\}/);
  for (const output of [markdown, bibtex]) {
    assert.equal(output.includes('kylesmcauliffe'), false);
    assert.equal(output.includes('kyleUser01'), false);
    assert.equal(output.includes('sources/'), false);
    assert.equal(output.includes('embedding'), false);
    assert.equal(output.includes('secret.pdf'), false);
  }
});

test('a zip queues readable sources and skips junk', async () => {
  const zip = new JSZip();
  zip.file('kiln/hold.txt', 'ten minute hold');
  zip.file('kiln/body.epub', 'epub');
  zip.file('kiln/log.pdf', 'pdf');
  zip.file('kiln/clip.html', '<p>clip</p>');
  zip.file('kiln/photo.jpg', 'image');
  zip.file('kiln/plate-wm.jpg', 'watermark');
  zip.file('__MACOSX/kiln/._hold.txt', 'apple');
  zip.file('.DS_Store', 'junk');
  const entries = await importableZipEntries(await zip.generateAsync({ type: 'uint8array' }));
  assert.deepEqual(entries.map((entry) => entry.name).sort(), ['body.epub', 'clip.html', 'hold.txt', 'log.pdf']);
  assert.equal(classifyImportPath('notes/read.epub')?.kind, 'epub');
  assert.equal(classifyImportPath('__MACOSX/notes/read.epub'), null);
  assert.equal(classifyImportPath('bowl-wm.jpg'), null);
});

test('300 sources and 100 answers stay under the desk cap, and the 301st source is refused', () => {
  let data = parseResearch({ collections: SEED_COLLECTIONS });
  for (let i = 0; i < SOURCE_CAP; i += 1) {
    const source: DeskSource = { id: `s${i}`, title: `Note ${i}`, kind: 'transcript', status: 'ready', size: 100 + i, collectionId: 'cardinal', createdAt: '2026-01-01T00:00:00.000Z' };
    const added = addSource(data, source);
    assert.equal(added.ok, true);
    if (added.ok) data = added.data;
  }
  for (let i = 0; i < ANSWER_CAP; i += 1) {
    const answer: DeskAnswer = {
      id: `a${i}`,
      collectionId: 'cardinal',
      question: `Question ${i}?`,
      answer: `A short cited answer ${i}.`,
      citations: [{ chunkId: 'c', sourceId: 's0', sourceTitle: 'Note', page: 1, timestamp: null, excerpt: 'A line.', collectionId: 'cardinal' }],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const saved = saveAnswer(data, answer);
    assert.equal(saved.ok, true);
    if (saved.ok) data = saved.data;
  }
  assert.ok(JSON.stringify(data).length < DESK_PAYLOAD_MAX);
  const refused = addSource(data, { id: 'overflow', title: 'No', kind: 'pdf', status: 'uploaded', size: 1, collectionId: 'cardinal', createdAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(refused.ok, false);
});
