import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { citationsFrom, localAnswer, rankChunks } from './answer.ts';
import { toBibtex, toMarkdown } from './citations.ts';
import { hashEmbed } from './embed.ts';
import { extractDocument } from './extract.ts';
import { classifyImportPath, importableZipEntries } from './import-queue.ts';
import { askVault, processSource } from './pipeline.ts';
import { chunkPassages } from './text.ts';
import { parseTranscript } from './text.ts';
import { DAWN_COLLECTIONS } from './collections.ts';
import { MemoryVault } from './vault.ts';
import type { ChunkRecord, SourceRecord } from './types.ts';

test('transcript cues keep [mm:ss] timestamps', () => {
  const passages = parseTranscript(`1
00:00:12.000 --> 00:00:18.000
The tall stick stands by the creek.

2
00:02:40.500 --> 00:02:48.000
Pantheon towers wait on the courtyard.

[11:20] Cardinal opens on the double redwood.
`);
  assert.equal(passages.length, 3);
  assert.equal(passages[0].timestamp, '0:12');
  assert.match(passages[0].text, /tall stick/);
  assert.equal(passages[1].timestamp, '2:40');
  assert.equal(passages[2].timestamp, '11:20');
});

test('pdf extraction keeps page numbers', async () => {
  const bytes = samplePdf(['Cardinal opens on the tall stick by the creek.', 'Pantheon towers wait on the courtyard for the next wave.']);
  const passages = await extractDocument(bytes, 'pdf');
  assert.ok(passages.some((passage) => passage.page === 1 && /tall stick/.test(passage.text)));
  assert.ok(passages.some((passage) => passage.page === 2 && /Pantheon/.test(passage.text)));
});

test('epub extraction reads the spine', async () => {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
  zip.file('OEBPS/content.opf', '<?xml version="1.0"?><package><manifest><item id="c1" href="c1.xhtml"/></manifest><spine><itemref idref="c1"/></spine></package>');
  zip.file('OEBPS/c1.xhtml', '<html><body><p>Dawn keeps the agents and the kits on this machine.</p></body></html>');
  const passages = await extractDocument(new Uint8Array(await zip.generateAsync({ type: 'uint8array' })), 'epub');
  assert.match(passages[0].text, /agents/);
  assert.equal(passages[0].page, 1);
});

test('chunks overlap and ranking stays inside the retrieved passages', async () => {
  const chunks = chunkPassages([{ text: 'a'.repeat(2000), page: 1, timestamp: null, startSec: null }], 1400, 180);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].text.length, 1400);
  assert.equal(chunks[1].text.slice(0, 180), chunks[0].text.slice(1220, 1400));
  const texts = [
    'Cardinal redwood stands at the creek and the episode opens on the tall stick.',
    'Pantheon towers hold the courtyard while rangers wait for the next wave.',
  ];
  const vectors = texts.map((text) => hashEmbed(text));
  const [query] = [hashEmbed('why do the pantheon towers wait')];
  const rows: ChunkRecord[] = texts.map((text, index) => ({
    id: `c${index}`,
    sourceId: 's',
    collectionId: index === 1 ? 'pantheon' : 'cardinal',
    sourceTitle: 'Notes',
    text,
    page: null,
    timestamp: index === 1 ? '11:20' : '0:12',
    startSec: null,
    chunkIndex: index,
    embedding: vectors[index],
  }));
  const ranked = rankChunks(rows, query, 2);
  assert.equal(ranked[0].timestamp, '11:20');
  const answer = localAnswer('why do the pantheon towers wait', ranked, DAWN_COLLECTIONS);
  assert.match(answer, /\[1\]/);
  assert.match(answer, /Pantheon/);
  const cites = citationsFrom(ranked.slice(0, 1), 'see [1] and [9]');
  assert.equal(cites.length, 1);
  assert.equal(cites[0].chunkId, ranked[0].id);
  assert.equal(hashEmbed('same').length, 768);
  assert.deepEqual(hashEmbed('same'), hashEmbed('same'));
});

test('process and ask cite only the collection that was filed', async () => {
  const store = new MemoryVault();
  await file(store, 'src-pantheon', 'pantheon', 'Courtyard', '[00:11:20] Pantheon towers hold the courtyard while rangers wait.');
  await file(store, 'src-cardinal', 'cardinal', 'Tall stick', '[00:00:12] Cardinal opens on the tall stick by the creek.');
  const across = await askVault(store, 'everything', 'Where do the pantheon towers wait?', localOptions());
  assert.equal(across.collectionId, 'everything');
  assert.equal(across.citations[0]?.collectionId, 'pantheon');
  assert.match(across.answer, /Pantheon/);
  assert.match(across.citations[0]?.excerpt ?? '', /courtyard|towers|rangers/i);
  const scoped = await askVault(store, 'cardinal', 'Where do the pantheon towers wait?', localOptions());
  assert.ok(scoped.citations.every((citation) => citation.collectionId === 'cardinal'));
});

test('exports drop paths, uids, and embeddings, and a zip keeps readable files', async () => {
  const markdown = toMarkdown([
    {
      question: 'Where does Cardinal open?',
      collectionId: 'cardinal',
      email: 'someone@example.com',
      createdBy: 'user01',
      storagePath: 'sources/user01/src/secret.pdf',
      citations: [{ sourceTitle: 'Tall stick', page: 2, timestamp: null, excerpt: 'The creek.', collectionId: 'cardinal', embedding: [0.1, 0.2], storagePath: 'sources/user01/src/secret.pdf' }],
    },
  ], 'Cardinal', DAWN_COLLECTIONS);
  const bibtex = toBibtex([{
    question: 'Where does Cardinal open?',
    collectionId: 'cardinal',
    citations: [{ sourceTitle: 'Tall stick', page: 2, timestamp: null, excerpt: 'The creek.', collectionId: 'cardinal' }],
  }], DAWN_COLLECTIONS);
  assert.match(markdown, /Where does Cardinal open/);
  assert.match(markdown, /p\. 2/);
  assert.match(bibtex, /booktitle = \{Cardinal\}/);
  for (const output of [markdown, bibtex]) {
    assert.equal(output.includes('someone@example.com'), false);
    assert.equal(output.includes('user01'), false);
    assert.equal(output.includes('sources/'), false);
    assert.equal(output.includes('embedding'), false);
    assert.equal(output.includes('secret.pdf'), false);
  }
  const zip = new JSZip();
  zip.file('notes/hold.txt', 'ten minute note');
  zip.file('notes/body.epub', 'epub');
  zip.file('notes/log.pdf', 'pdf');
  zip.file('notes/clip.html', '<p>clip</p>');
  zip.file('notes/photo.jpg', 'image');
  zip.file('notes/plate-wm.jpg', 'watermark');
  zip.file('__MACOSX/notes/._hold.txt', 'apple');
  zip.file('.DS_Store', 'junk');
  const entries = await importableZipEntries(await zip.generateAsync({ type: 'uint8array' }));
  assert.deepEqual(entries.map((entry) => entry.name).sort(), ['body.epub', 'clip.html', 'hold.txt', 'log.pdf']);
  assert.equal(classifyImportPath('notes/read.epub')?.kind, 'epub');
  assert.equal(classifyImportPath('__MACOSX/notes/read.epub'), null);
});

function localOptions() {
  return {
    embeddingsEnabled: false,
    canSpend: () => true,
    capMessage: 'Spend cap reached.',
    recordBatch: async () => undefined,
    names: DAWN_COLLECTIONS,
  };
}

async function file(store: MemoryVault, id: string, collectionId: string, title: string, body: string) {
  const source: SourceRecord = {
    id,
    collectionId,
    title,
    kind: 'transcript',
    fileName: `${id}.txt`,
    contentType: 'text/plain',
    status: 'uploaded',
    error: null,
    createdAt: new Date().toISOString(),
    pageCount: null,
    chunkCount: null,
    size: body.length,
  };
  await store.addSource(source, Buffer.from(body));
  await processSource(store, id, localOptions());
}

function samplePdf(pages: string[]): Uint8Array {
  const pageIds = pages.map((_, index) => 3 + index);
  const contentIds = pages.map((_, index) => 3 + pages.length + index);
  const font = 3 + pages.length * 2;
  const objs: string[] = [];
  objs.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objs.push(`2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);
  pages.forEach((text, index) => {
    objs.push(`${pageIds[index]} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[index]} 0 R /Resources << /Font << /F1 ${font} 0 R >> >> >>\nendobj\n`);
  });
  pages.forEach((text, index) => {
    const content = `BT /F1 16 Tf 50 700 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;
    objs.push(`${contentIds[index]} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  });
  objs.push(`${font} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += obj;
  }
  const xref = Buffer.byteLength(body, 'latin1');
  let table = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i += 1) table += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  body += table;
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, 'latin1'));
}
