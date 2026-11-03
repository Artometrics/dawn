'use client';

import { useState } from 'react';
import type { Article, Subscriber } from './api';
import { RECIPES } from '@/lib/dawn-agents/recipes';

export function PublishDesk({
  articles,
  subscribers,
  sends,
  provider,
  onSave,
  onPublish,
  onDraft,
  onSend,
  onImport,
  onConfirmMail,
}: {
  articles: Article[];
  subscribers: Subscriber[];
  sends: { id: string; articleId: string; recipients: number; opens: number; clicks: number }[];
  provider: string;
  onSave: (article: Partial<Article> & { id?: string }) => Promise<void>;
  onPublish: (id: string) => Promise<void>;
  onDraft: (id: string, agentId: string, notes: string) => Promise<void>;
  onSend: (id: string) => Promise<void>;
  onImport: (csv: string) => Promise<void>;
  onConfirmMail: (id: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState<Partial<Article>>(articles[0] || { title: '', dek: '', subject: '', body: '', recipeId: 'pixel-billboard' });
  const [notes, setNotes] = useState('');
  const [agentId, setAgentId] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);
  const [csv, setCsv] = useState('');
  const confirmed = subscribers.filter((row) => row.status === 'confirmed').length;
  const pending = subscribers.filter((row) => row.status === 'pending').length;
  return (
    <div className="sheet-view">
      <h2>Letter</h2>
      <p className="note">Mail provider: {provider}. Nothing is mailed until you press the button.</p>
      <label>Title<input value={current.title || ''} onChange={(event) => setCurrent({ ...current, title: event.target.value })} /></label>
      <label>Dek<input value={current.dek || ''} onChange={(event) => setCurrent({ ...current, dek: event.target.value })} /></label>
      <label>Subject<input value={current.subject || ''} onChange={(event) => setCurrent({ ...current, subject: event.target.value })} /></label>
      <label>
        Style recipe
        <select value={current.recipeId || ''} onChange={(event) => setCurrent({ ...current, recipeId: event.target.value })}>
          <option value="">None</option>
          {RECIPES.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
          ))}
        </select>
      </label>
      <label>Body<textarea value={current.body || ''} onChange={(event) => setCurrent({ ...current, body: event.target.value })} /></label>
      <label>Notes for a draft<input value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <label>Agent id for the draft<input value={agentId} placeholder="Leave blank to use the first agent" onChange={(event) => setAgentId(event.target.value)} /></label>
      <div className="actions">
        <button type="button" className="primary" onClick={() => onSave(current)}>Save draft</button>
        {current.id && <button type="button" className="ghost" onClick={() => onDraft(current.id || '', agentId, notes)}>Draft with agent</button>}
        {current.id && <button type="button" className="ghost" onClick={() => onPublish(current.id || '')}>Publish page</button>}
      </div>
      <label className="row">
        <input type="checkbox" checked={confirmSend} onChange={(event) => setConfirmSend(event.target.checked)} />
        I mean to send this to {confirmed} confirmed subscribers.
      </label>
      <button type="button" className="primary" disabled={!confirmSend || !current.id} onClick={() => current.id && onSend(current.id)}>
        Send now
      </button>
      <h3>Letters</h3>
      <ul className="list">
        {articles.map((article) => (
          <li key={article.id}>
            <button type="button" className="row" onClick={() => setCurrent(article)}>
              <span className="grow">{article.title}</span>
              <span className="muted small">{article.status}</span>
            </button>
          </li>
        ))}
      </ul>
      <h3>Subscribers</h3>
      <p className="note nums">{confirmed} confirmed · {pending} waiting · {subscribers.length} total</p>
      <label>Import CSV<textarea value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="email" /></label>
      <div className="actions">
        <button type="button" className="ghost" onClick={() => onImport(csv)}>Import</button>
        <a className="ghost" href="#" onClick={(event) => { event.preventDefault(); void downloadSubs(); }}>Export CSV</a>
      </div>
      <table>
        <tbody>
          {subscribers.map((row) => (
            <tr key={row.id}>
              <td>{row.email}</td>
              <td>{row.status}</td>
              <td>{row.status === 'pending' && <button type="button" className="ghost" onClick={() => onConfirmMail(row.id)}>Send confirmation</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Sends</h3>
      <table>
        <tbody>
          {sends.map((send) => (
            <tr key={send.id}>
              <td className="nums">{send.recipients} sent</td>
              <td className="nums">{send.opens} opens</td>
              <td className="nums">{send.clicks} clicks</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function downloadSubs() {
  const base = (await import('./api')).gatewayBase;
  const token = (await import('./api')).token;
  const url = await base();
  const response = await fetch(`${url}/api/subscribers/export.csv`, { headers: { authorization: `Bearer ${token()}` } });
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'subscribers.csv';
  link.click();
}
