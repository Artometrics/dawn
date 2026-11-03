'use client';

import { useState } from 'react';

const TRACKS = ['chart-story', 'fact-check', 'visual-taste', 'agent-task', 'taste-signals', 'chat', 'writing', 'preference', 'synthetic'];

export function DataPanel({
  counts,
  queue,
  room,
  onReview,
  onChart,
  onFact,
  onCollect,
  onSynthetic,
  onImport,
  onExport,
}: {
  counts: Record<string, number>;
  queue: { id: string; track: string; status: string; messages?: { content: string }[] }[];
  room: number;
  onReview: (id: string, action: 'approve' | 'fix' | 'reject', correction?: string) => Promise<void>;
  onChart: (sourceUrl: string, chart: string, story: string) => Promise<void>;
  onFact: (claim: string, sourceUrl: string, label: 'true' | 'false') => Promise<void>;
  onCollect: () => Promise<void>;
  onSynthetic: (prompt: string) => Promise<void>;
  onImport: (jsonl: string) => Promise<void>;
  onExport: (format: 'sft' | 'dpo' | 'taste') => Promise<void>;
}) {
  const [source, setSource] = useState('');
  const [chart, setChart] = useState('');
  const [story, setStory] = useState('');
  const [claim, setClaim] = useState('');
  const [label, setLabel] = useState<'true' | 'false'>('true');
  const [prompt, setPrompt] = useState('');
  const [jsonl, setJsonl] = useState('');
  const [fix, setFix] = useState('');
  return (
    <div className="sheet-view">
      <h2>Data</h2>
      <p className="note">Owner only. Synthetic rows stay under half the real set ({room} slots open) and inside the monthly cap.</p>
      <table>
        <tbody>
          {TRACKS.map((track) => (
            <tr key={track}>
              <td>{track}</td>
              <td className="nums">{counts[track] || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="actions">
        <button type="button" className="ghost" onClick={onCollect}>Collect now</button>
        <button type="button" className="ghost" onClick={() => onExport('sft')}>Export SFT</button>
        <button type="button" className="ghost" onClick={() => onExport('dpo')}>Export DPO</button>
        <button type="button" className="ghost" onClick={() => onExport('taste')}>Export taste pairs</button>
      </div>
      <h3>Review</h3>
      {queue.length === 0 && <p className="note">The queue is empty.</p>}
      {queue.map((item) => (
        <article key={item.id} className="tool">
          <header><span>{item.track}</span><span>{item.status}</span></header>
          <p>{item.messages?.[1]?.content || item.messages?.[0]?.content || item.id}</p>
          <label>Fix<textarea value={fix} onChange={(event) => setFix(event.target.value)} /></label>
          <div className="actions">
            <button type="button" className="primary" onClick={() => onReview(item.id, 'approve')}>Approve</button>
            <button type="button" className="ghost" onClick={() => onReview(item.id, 'fix', fix)}>Fix</button>
            <button type="button" className="danger" onClick={() => onReview(item.id, 'reject')}>Reject</button>
          </div>
        </article>
      ))}
      <h3>Chart to story</h3>
      <label>Source URL<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="https://" /></label>
      <label>Chart<textarea value={chart} onChange={(event) => setChart(event.target.value)} /></label>
      <label>Story<textarea value={story} onChange={(event) => setStory(event.target.value)} /></label>
      <button type="button" className="primary" onClick={() => onChart(source, chart, story)}>Add sourced story</button>
      <h3>Fact check</h3>
      <label>Claim<input value={claim} onChange={(event) => setClaim(event.target.value)} /></label>
      <label>
        Label
        <select value={label} onChange={(event) => setLabel(event.target.value === 'false' ? 'false' : 'true')}>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </label>
      <button type="button" className="primary" onClick={() => onFact(claim, source, label)}>Add fact</button>
      <h3>Synthetic</h3>
      <label>Topic<input value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
      <button type="button" className="ghost" onClick={() => onSynthetic(prompt)}>Generate one</button>
      <h3>Backfill JSONL</h3>
      <label>Paste chat-format JSONL<textarea value={jsonl} onChange={(event) => setJsonl(event.target.value)} /></label>
      <button type="button" className="ghost" onClick={() => onImport(jsonl)}>Import</button>
    </div>
  );
}
