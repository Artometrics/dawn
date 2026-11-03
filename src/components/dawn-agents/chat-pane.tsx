'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ChevronLeft, Mic, Phone, Plus } from 'lucide-react';
import { PixelAvatarView } from './pixel-avatar';
import { api, readSse, type Agent, type ChatMessage, type GatewayState, type ToolCall } from './api';
import { ChatWallpaper, WALLPAPERS, readWallpaper, writeWallpaper, type WallpaperId } from './chat-wallpaper';

const SEEN_KEY = 'dawn-chat-seen';

export function ChatPane({ base, state, threadId, onBack, onRefresh, onError }: { base: string; state: GatewayState; threadId: string; onBack: () => void; onRefresh: () => Promise<void>; onError: (message: string) => void }) {
  const thread = state.threads.find((item) => item.id === threadId);
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [recipeId, setRecipeId] = useState('');
  const [menu, setMenu] = useState(false);
  const [wallpaper, setWallpaper] = useState<WallpaperId>('town');
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messages = useMemo(() => {
    const saved = state.messages.filter((message) => message.threadId === threadId);
    const extra = live.filter((message) => !saved.some((item) => item.id === message.id));
    return [...saved, ...extra];
  }, [state.messages, live, threadId]);
  const title = thread?.title || 'Chat';
  const members = (thread?.agentIds || [])
    .map((id) => state.agents.find((agent) => agent.id === id))
    .filter((agent): agent is Agent => Boolean(agent))
    .slice(0, 3);
  const unread = unreadElsewhere(state, threadId);

  useEffect(() => {
    setWallpaper(readWallpaper());
    seedSeen(state);
    const latest = state.messages.filter((message) => message.threadId === threadId).reduce((max, message) => Math.max(max, message.createdAt), Date.now());
    markSeen(threadId, latest);
  }, [threadId, state]);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, streaming]);

  async function send(path: string, body: Record<string, unknown>) {
    setStreaming(true);
    try {
      const response = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        credentials: 'include',
        redirect: 'manual',
        body: JSON.stringify(body),
      });
      if (response.status === 401 || response.status === 302 || response.status === 303) throw new Error('Sign in with Google.');
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'Chat failed.');
      }
      await readSse(response, (event, data) => {
        if (event === 'error') onError(String(data.message || 'Chat failed.'));
        if (event === 'user' || event === 'assistant' || event === 'done') {
          const message = data.message as ChatMessage | undefined;
          if (!message) return;
          setLive((current) => {
            const index = current.findIndex((item) => item.id === message.id);
            if (index === -1) return [...current, message];
            const next = current.slice();
            next[index] = { ...next[index], ...message };
            return next;
          });
        }
        if (event === 'delta') {
          setLive((current) => current.map((message) => (message.id === data.messageId ? { ...message, content: String(data.text || '') } : message)));
        }
        if (event === 'tool') {
          const tool = data.tool as ToolCall;
          setLive((current) => current.map((message) => {
            if (message.id !== data.messageId) return message;
            const tools = message.tools ? message.tools.slice() : [];
            const index = tools.findIndex((item) => item.id === tool.id);
            if (index === -1) tools.push(tool);
            else tools[index] = tool;
            return { ...message, tools };
          }));
        }
      });
      setLive([]);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Chat failed.');
    } finally {
      setStreaming(false);
    }
  }

  function submitText(value = text) {
    const body = value.trim();
    const line = subject.trim();
    if ((!body && !line) || streaming) return;
    const content = line ? `Subject: ${line}\n\n${body}` : body;
    setText('');
    setSubject('');
    setMenu(false);
    void send(`/api/threads/${threadId}/messages`, { text: content, recipeId: recipeId || undefined });
  }

  function cycleWallpaper() {
    const index = WALLPAPERS.findIndex((item) => item.id === wallpaper);
    const next = WALLPAPERS[(index + 1) % WALLPAPERS.length];
    setWallpaper(next.id);
    writeWallpaper(next.id);
    setMenu(false);
  }

  async function attachPhoto(file: File) {
    const url = await shrinkPhoto(file);
    if (!url) {
      onError('That photo is too large to send.');
      return;
    }
    setMenu(false);
    void send(`/api/threads/${threadId}/messages`, { text: `![photo](${url})`, recipeId: recipeId || undefined });
  }

  function dictate() {
    const host = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition;
    if (!Ctor) {
      setToast('This browser has no dictation.');
      return;
    }
    const recog = new Ctor();
    recog.lang = 'en-US';
    setListening(true);
    recog.onresult = (event) => {
      const said = event.results?.[0]?.[0]?.transcript || '';
      if (said) setText((current) => (current ? `${current} ${said}` : said));
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);
    recog.start();
  }

  const ready = Boolean(text.trim() || subject.trim());

  return (
    <div className="imessage">
      <ChatWallpaper scene={wallpaper} />
      <header className="im-top">
        <button type="button" className="im-pill" onClick={onBack}>
          <ChevronLeft aria-hidden />
          {unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}
          <span className="im-sr">Back</span>
        </button>
        <div className="im-center">
          <div className="im-faces" aria-hidden>
            {members.map((agent) => (
              <PixelAvatarView key={agent.id} avatar={agent.avatar} size={members.length > 1 ? 28 : 36} title={agent.name} />
            ))}
          </div>
          <div className="im-name">{title}</div>
        </div>
        <button type="button" className="im-call" aria-label="Call" onClick={() => setToast('Calls are not on this desk.')}>
          <Phone aria-hidden />
        </button>
      </header>
      {toast && <p className="im-toast" role="status">{toast}</p>}
      <div className="im-scroll" ref={scroller}>
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const time = timeLabel(message.createdAt, previous?.createdAt);
          return (
            <div key={message.id}>
              {time && <p className="im-time">{time}</p>}
              <MessageView message={message} agents={state.agents} streaming={streaming} base={base} onRefresh={onRefresh} showName={!previous || previous.agentId !== message.agentId || previous.role !== message.role} />
            </div>
          );
        })}
      </div>
      {menu && (
        <div className="im-menu">
          <button type="button" onClick={() => fileRef.current?.click()}>Photo</button>
          <button type="button" onClick={cycleWallpaper}>Wallpaper · {WALLPAPERS.find((item) => item.id === wallpaper)?.name}</button>
          <label>
            Style recipe
            <select value={recipeId} onChange={(event) => setRecipeId(event.target.value)} aria-label="Apply a Style Recipe">
              <option value="">None</option>
              {state.recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
            </select>
          </label>
          <button type="button" disabled={streaming || !text.trim()} onClick={() => { const value = text.trim(); setText(''); setSubject(''); setMenu(false); void send(`/api/threads/${threadId}/ab`, { text: value }); }}>Compare two answers</button>
          <MemoryPanel base={base} state={state} agentId={thread?.agentIds[0]} onRefresh={onRefresh} />
        </div>
      )}
      <form
        className="im-compose"
        onSubmit={(event) => {
          event.preventDefault();
          submitText();
        }}
      >
        <button type="button" className="im-plus" aria-label="Add" aria-expanded={menu} onClick={() => setMenu((open) => !open)}>
          <Plus aria-hidden />
        </button>
        <div className="im-field">
          <input
            className="im-subject"
            aria-label="Subject"
            placeholder="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
          <textarea
            aria-label="Message"
            placeholder="Message"
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitText();
              }
            }}
          />
          {ready ? (
            <button type="submit" className="im-send" aria-label="Send" disabled={streaming}>
              <ArrowUp aria-hidden />
            </button>
          ) : (
            <button type="button" className={listening ? 'im-mic on' : 'im-mic'} aria-label="Dictate" aria-pressed={listening} onClick={dictate}>
              <Mic aria-hidden />
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void attachPhoto(file);
          }}
        />
      </form>
    </div>
  );
}

function MessageView({ message, agents, streaming, base, onRefresh, showName }: { message: ChatMessage; agents: Agent[]; streaming: boolean; base: string; onRefresh: () => Promise<void>; showName: boolean }) {
  const agent = agents.find((item) => item.id === message.agentId);
  const [correction, setCorrection] = useState(message.correction || '');
  const [reason, setReason] = useState('');
  const parts = messageParts(message.content);
  const mine = message.role === 'user';
  return (
    <article className={mine ? 'im-row out' : 'im-row in'}>
      {!mine && (
        <div className="im-ava">
          {agent && <PixelAvatarView avatar={agent.avatar} size={28} title={agent.name} />}
        </div>
      )}
      <div className="im-stack">
        {!mine && showName && <p className="im-sender">{agent?.name || 'Agent'}{message.usage?.provider === 'stand-in' ? ' · stand-in' : ''}</p>}
        {parts.map((part, index) => (
          part.kind === 'image' ? (
            <img key={index} className="im-photo" src={part.value} alt="" />
          ) : (
            <div key={index} className={mine ? 'im-bubble me' : 'im-bubble them'}>
              {part.subject && <strong className="im-sub">{part.subject}</strong>}
              {part.value}
              {streaming && index === parts.length - 1 && !part.value.endsWith('.') ? <span className="caret" /> : null}
            </div>
          )
        ))}
        {message.tools?.map((tool) => (
          <div key={tool.id} className="tool">
            <header><span>{tool.name}</span><span>{tool.state.replace('_', ' ')}</span></header>
            <pre>{JSON.stringify(tool.output || tool.input, null, 2)}</pre>
            {tool.state === 'needs_confirm' && (
              <div className="actions">
                <button type="button" className="primary" onClick={() => decide(base, message.id, tool.id, true, onRefresh)}>Allow</button>
                <button type="button" className="ghost" onClick={() => decide(base, message.id, tool.id, false, onRefresh)}>Don't run</button>
              </div>
            )}
          </div>
        ))}
        {!mine && (
          <details className="im-train">
            <summary>Train</summary>
            <div className="actions">
              <button type="button" className="ghost" aria-pressed={message.feedback === 'up'} onClick={() => feedback(base, message.id, message.feedback === 'up' ? null : 'up', onRefresh)}>Up</button>
              <button type="button" className="ghost" aria-pressed={message.feedback === 'down'} onClick={() => feedback(base, message.id, message.feedback === 'down' ? null : 'down', onRefresh)}>Down</button>
            </div>
            <label>Correction<textarea value={correction} onChange={(event) => setCorrection(event.target.value)} /></label>
            <button type="button" className="ghost" onClick={() => feedback(base, message.id, message.feedback || 'down', onRefresh, correction)}>Save correction</button>
            <label>Why this reply<input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <button type="button" className="ghost" onClick={() => pick(base, message, reason, onRefresh)}>Prefer this reply</button>
            {message.correction && <p className="note">Your correction is saved for training.</p>}
          </details>
        )}
      </div>
    </article>
  );
}

function MemoryPanel({ base, state, agentId, onRefresh }: { base: string; state: GatewayState; agentId?: string; onRefresh: () => Promise<void> }) {
  const [text, setText] = useState('');
  const memories = state.memories.filter((memory) => memory.agentId === agentId);
  if (!agentId) return null;
  return (
    <details className="im-memory">
      <summary>Memory ({memories.length})</summary>
      <ul>{memories.map((memory) => <li key={memory.id}>{memory.text}</li>)}</ul>
      <form className="actions" onSubmit={async (event) => { event.preventDefault(); if (!text.trim()) return; await api(base, '/api/memories', { method: 'POST', body: JSON.stringify({ agentId, text }) }); setText(''); await onRefresh(); }}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Remember this" aria-label="New memory" />
        <button className="ghost" type="submit">Save</button>
      </form>
    </details>
  );
}

async function decide(base: string, messageId: string, toolCallId: string, allow: boolean, onRefresh: () => Promise<void>) {
  await api(base, '/api/confirm', { method: 'POST', body: JSON.stringify({ messageId, toolCallId, allow }) });
  await onRefresh();
}

async function feedback(base: string, messageId: string, value: 'up' | 'down' | null, onRefresh: () => Promise<void>, correction?: string) {
  await api(base, `/api/messages/${messageId}/feedback`, { method: 'POST', body: JSON.stringify({ feedback: value, correction }) });
  await onRefresh();
}

async function pick(base: string, message: ChatMessage, reason: string, onRefresh: () => Promise<void>) {
  const fresh = await api<GatewayState>(base, '/api/state');
  const others = fresh.messages.filter((item) => item.threadId === message.threadId && item.role === 'assistant' && item.id !== message.id);
  const rejected = others.at(-1);
  if (!rejected) return;
  const user = fresh.messages.filter((item) => item.threadId === message.threadId && item.role === 'user').at(-1);
  await api(base, '/api/preferences', { method: 'POST', body: JSON.stringify({ prompt: user?.content || 'Which reply is better?', chosenMessageId: message.id, rejectedMessageId: rejected.id, reason }) });
  await onRefresh();
}

type Piece = { kind: 'text'; value: string; subject?: string } | { kind: 'image'; value: string };

function messageParts(content: string): Piece[] {
  const subjectMatch = content.match(/^Subject: ([^\n]+)\n\n([\s\S]*)$/);
  const subject = subjectMatch?.[1];
  const body = subjectMatch ? subjectMatch[2] : content;
  const parts: Piece[] = [];
  const pattern = /!\[[^\]]*]\(([^)\s]+)\)|(https?:\/\/\S+\.(?:png|jpe?g|gif|webp)(?:\?\S*)?)/gi;
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const index = match.index ?? 0;
    const before = body.slice(cursor, index).trim();
    if (before) parts.push({ kind: 'text', value: before, subject: parts.length === 0 ? subject : undefined });
    parts.push({ kind: 'image', value: match[1] || match[2] });
    cursor = index + match[0].length;
  }
  const rest = body.slice(cursor).trim();
  if (rest || parts.length === 0) parts.push({ kind: 'text', value: rest, subject: parts.length === 0 ? subject : undefined });
  return parts;
}

function timeLabel(at: number, previous?: number): string | null {
  if (!at) return null;
  if (previous && at - previous < 5 * 60 * 1000) return null;
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === new Date().toDateString()) return `Today ${time}`;
  return `${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`;
}

function seedSeen(state: GatewayState) {
  if (localStorage.getItem(SEEN_KEY)) return;
  const seen: Record<string, number> = {};
  for (const message of state.messages) seen[message.threadId] = Math.max(seen[message.threadId] || 0, message.createdAt);
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

function readSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function markSeen(threadId: string, at: number) {
  const seen = readSeen();
  seen[threadId] = Math.max(seen[threadId] || 0, at);
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

function unreadElsewhere(state: GatewayState, threadId: string): number {
  if (!localStorage.getItem(SEEN_KEY)) return 0;
  const seen = readSeen();
  return state.messages.filter((message) => message.threadId !== threadId && message.createdAt > (seen[message.threadId] || 0)).length;
}

async function shrinkPhoto(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const max = 480;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.72);
  return url.length > 180_000 ? null : url;
}

type SpeechCtor = new () => {
  lang: string;
  onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};
