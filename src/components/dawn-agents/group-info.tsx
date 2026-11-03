'use client';

import { useState } from 'react';
import { ChevronLeft, Download, Mail, Phone, Plus, Video } from 'lucide-react';
import { PLAYER_SRC } from '@/lib/home/overworld';
import { AGENT_SPRITES } from '@/lib/credits/sprites';
import { PixelAvatarView } from './pixel-avatar';
import { api, type Agent, type ChatMessage, type GatewayState, type Thread } from './api';
import { WALLPAPERS, type WallpaperId } from './chat-wallpaper';

type Tab = 'info' | 'backgrounds' | 'photos' | 'links' | 'documents';
type AddMode = null | 'person' | 'agent' | 'figure';

const TABS: { id: Tab; label: string }[] = [
  { id: 'info', label: 'Info' },
  { id: 'backgrounds', label: 'Backgrounds' },
  { id: 'photos', label: 'Photos' },
  { id: 'links', label: 'Links' },
  { id: 'documents', label: 'Documents' },
];

export function GroupInfo({
  base,
  state,
  thread,
  messages,
  wallpaper,
  onWallpaper,
  onClose,
  onLeft,
  onRefresh,
  onError,
}: {
  base: string;
  state: GatewayState;
  thread: Thread;
  messages: ChatMessage[];
  wallpaper: WallpaperId;
  onWallpaper: (id: WallpaperId) => void;
  onClose: () => void;
  onLeft: () => void;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('info');
  const [add, setAdd] = useState<AddMode>(null);
  const [note, setNote] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [figureName, setFigureName] = useState('');
  const [persona, setPersona] = useState('');
  const [sprite, setSprite] = useState('elder');
  const members = thread.agentIds
    .map((id) => state.agents.find((agent) => agent.id === id))
    .filter((agent): agent is Agent => Boolean(agent));
  const available = state.agents.filter((agent) => !thread.agentIds.includes(agent.id));
  const photos = messages.flatMap((message) => imageUrls(message.content));
  const links = messages.flatMap((message) => linkUrls(message.content));
  const documents = links.filter((url) => /\.(pdf|docx?|txt|md|csv|json)(\?|$)/i.test(url));

  async function patch(body: Record<string, unknown>) {
    setNote('');
    try {
      const result = await api<{ thread: Thread; delivered?: boolean; error?: string }>(base, `/api/threads/${thread.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      await onRefresh();
      return result;
    } catch (error) {
      onError(error instanceof Error ? error.message : 'That did not save.');
      return null;
    }
  }

  async function invitePerson() {
    const result = await patch({ invite: { name: personName, email: personEmail } });
    if (!result) return;
    // TODO: the server stores the person and does not send mail.
    setNote('Saved on this chat. No invitation is sent.');
    setPersonName('');
    setPersonEmail('');
    setAdd(null);
  }

  async function summon() {
    const result = await patch({ summon: { name: figureName, persona, sprite } });
    if (!result) return;
    setFigureName('');
    setPersona('');
    setAdd(null);
  }

  function writeMail() {
    const emails = (thread.humans || []).map((human) => human.email).filter((email): email is string => Boolean(email));
    // TODO: Dawn does not send group mail. This only opens the owner's mail app.
    if (!emails.length) {
      setNote('No address to write to.');
      return;
    }
    window.location.href = `mailto:${emails.join(',')}`;
  }

  function exportChat() {
    const lines = [`${thread.title}`, ''];
    for (const message of messages) {
      const who = message.role === 'user' ? 'You' : state.agents.find((agent) => agent.id === message.agentId)?.name || 'Agent';
      const when = new Date(message.createdAt).toLocaleString();
      lines.push(`${who} · ${when}`, message.content, '');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${thread.title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'chat'}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="gi" aria-label={`${thread.title} details`}>
      <header className="gi-bar">
        <button type="button" className="im-pill" onClick={onClose} aria-label="Back to chat">
          <ChevronLeft aria-hidden />
        </button>
        <h1>{thread.title}</h1>
      </header>
      <div className="gi-actions">
        <button type="button" onClick={() => setNote('Calls are not on this desk.')}><Phone aria-hidden /> Call</button>
        <button type="button" onClick={() => setNote('Video is not on this desk.')}><Video aria-hidden /> Video</button>
        <button type="button" onClick={writeMail}><Mail aria-hidden /> Mail</button>
      </div>
      {note && <p className="gi-note" role="status">{note}</p>}
      <div className="gi-tabs" role="tablist">
        {TABS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'on' : ''} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'info' && (
        <div className="gi-body">
          <div className="gi-grid">
            <div className="gi-member">
              <img src={PLAYER_SRC} alt="" width={64} height={64} />
              <span>You</span>
              <small>Person</small>
            </div>
            {(thread.humans || []).map((human) => (
              <div key={human.id} className="gi-member">
                <span className="gi-initials" aria-hidden>{initials(human.name)}</span>
                <span>{human.name}</span>
                <small>Invited</small>
              </div>
            ))}
            {members.map((agent) => (
              <div key={agent.id} className="gi-member">
                <PixelAvatarView avatar={agent.avatar} size={64} title={agent.name} />
                <span>{agent.name}</span>
                <small>{agent.figure ? 'Figure' : 'Agent'}</small>
              </div>
            ))}
            <button type="button" className="gi-member gi-add" onClick={() => setAdd('person')}>
              <span className="gi-plus" aria-hidden><Plus /></span>
              <span>Add</span>
            </button>
          </div>
          <div className="gi-list">
            <label className="gi-toggle">
              <span>Hide Alerts<small>Saved for this chat. Dawn has no push alerts yet.</small></span>
              <input
                type="checkbox"
                checked={Boolean(thread.hideAlerts)}
                onChange={(event) => void patch({ hideAlerts: event.target.checked })}
              />
            </label>
            <label className="gi-toggle">
              <span>Save to training data<small>When off, this chat stays out of the training export.</small></span>
              <input
                type="checkbox"
                checked={thread.saveTraining !== false}
                onChange={(event) => void patch({ saveTraining: event.target.checked })}
              />
            </label>
            <button type="button" className="gi-leave" onClick={() => (leaving ? void patch({ leave: true }).then((result) => result && onLeft()) : setLeaving(true))}>
              {leaving ? 'Leave this conversation?' : 'Leave conversation'}
            </button>
            <button type="button" className="gi-export" onClick={exportChat}><Download aria-hidden /> Export chat</button>
          </div>
        </div>
      )}
      {tab === 'backgrounds' && (
        <div className="gi-cards">
          {WALLPAPERS.map((item) => (
            <button key={item.id} type="button" className={item.id === wallpaper ? 'on' : ''} onClick={() => onWallpaper(item.id)}>
              {item.name}
            </button>
          ))}
        </div>
      )}
      {tab === 'photos' && (
        <div className="gi-photos">
          {photos.length === 0 && <p className="gi-note">No photos yet.</p>}
          {photos.map((url) => <img key={url} src={url} alt="" />)}
        </div>
      )}
      {tab === 'links' && (
        <ul className="gi-links">
          {links.length === 0 && <li className="gi-note">No links yet.</li>}
          {links.map((url) => <li key={url}><a href={url}>{url}</a></li>)}
        </ul>
      )}
      {tab === 'documents' && (
        <ul className="gi-links">
          {documents.length === 0 && <li className="gi-note">No documents in this chat.</li>}
          {documents.map((url) => <li key={url}><a href={url}>{url}</a></li>)}
        </ul>
      )}
      {add && (
        <div className="gi-sheet" role="dialog" aria-label="Add to the chat">
          <div className="gi-sheet-card">
            <header>
              <strong>Add</strong>
              <button type="button" onClick={() => setAdd(null)}>Close</button>
            </header>
            <div className="gi-choices">
              <button type="button" className={add === 'person' ? 'on' : ''} onClick={() => setAdd('person')}>Invite a person</button>
              <button type="button" className={add === 'agent' ? 'on' : ''} onClick={() => setAdd('agent')}>Add an agent</button>
              <button type="button" className={add === 'figure' ? 'on' : ''} onClick={() => setAdd('figure')}>Summon a historical figure</button>
            </div>
            {add === 'person' && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void invitePerson();
                }}
              >
                <p className="gi-note">Saved on this chat only. Dawn does not send the invitation.</p>
                <label>Name<input value={personName} onChange={(event) => setPersonName(event.target.value)} required /></label>
                <label>Email<input type="email" value={personEmail} onChange={(event) => setPersonEmail(event.target.value)} placeholder="Optional" /></label>
                <button className="primary" type="submit">Save person</button>
              </form>
            )}
            {add === 'agent' && (
              <ul className="gi-links">
                {available.length === 0 && <li className="gi-note">Every agent is already here.</li>}
                {available.map((agent) => (
                  <li key={agent.id}>
                    <button
                      type="button"
                      onClick={() => {
                        void patch({ addAgentId: agent.id }).then((result) => result && setAdd(null));
                      }}
                    >
                      <PixelAvatarView avatar={agent.avatar} size={28} title={agent.name} />
                      {agent.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {add === 'figure' && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void summon();
                }}
              >
                <label>Name<input value={figureName} onChange={(event) => setFigureName(event.target.value)} required /></label>
                <label>Persona<input value={persona} onChange={(event) => setPersona(event.target.value)} required placeholder="Who they are, and how they speak" /></label>
                <label>
                  Sprite
                  <select value={sprite} onChange={(event) => setSprite(event.target.value)}>
                    {AGENT_SPRITES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <button className="primary" type="submit">Summon</button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

function imageUrls(content: string) {
  return [...content.matchAll(/!\[[^\]]*]\(([^)\s]+)\)/g)].map((match) => match[1]);
}

function linkUrls(content: string) {
  const withoutImages = content.replace(/!\[[^\]]*]\(([^)\s]+)\)/g, ' ');
  return [...withoutImages.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]);
}
