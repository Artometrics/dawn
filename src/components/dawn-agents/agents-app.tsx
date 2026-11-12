'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AGENT_SPRITES, defaultSpriteId } from '@/lib/credits/sprites';
import { formatUsd } from '@/lib/dawn-agents/spend';
import { recipeAttributes } from '@/lib/dawn-agents/recipes';
import { PixelAvatarView } from './pixel-avatar';
import { DataPanel } from './data-panel';
import { PublishDesk } from './publish-desk';
import { RecipesBoard } from './recipes-board';
import { api, gatewayBase, googleSignInHref, type Agent, type GatewayState } from './api';
import { ChatPane } from './chat-pane';

type Section = 'agents' | 'recipes' | 'letter' | 'data' | 'settings' | 'edit';

export function AgentsRoot() {
  const [base, setBase] = useState('');
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<GatewayState | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<Section>('agents');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [needsGoogle, setNeedsGoogle] = useState(false);
  const [queue, setQueue] = useState<GatewayState['data'] extends never ? never : { id: string; track: string; status: string; messages?: { content: string }[] }[]>([]);
  const openedLink = useRef(false);

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('section');
    if (asked === 'recipes' || asked === 'letter' || asked === 'data' || asked === 'settings' || asked === 'edit') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the static export always renders section 'agents', so a ?section= link can only be applied after hydration to keep the first client render equal to the static HTML
      setSection(asked);
    }
    void (async () => {
      const url = await gatewayBase();
      setBase(url);
      setReady(true);
      await refresh(url);
    })();
  }, []);

  function openLinkedThread(next: GatewayState) {
    if (openedLink.current) return;
    const params = new URLSearchParams(window.location.search);
    const thread = params.get('thread');
    const agent = params.get('agent');
    openedLink.current = true;
    if (thread && next.threads.some((item) => item.id === thread)) {
      setThreadId(thread);
      setSection('agents');
      return;
    }
    if (!agent) return;
    const direct = next.threads.find((item) => item.kind === 'direct' && item.agentIds[0] === agent);
    if (direct) {
      setThreadId(direct.id);
      setSection('agents');
    }
  }

  async function refresh(url = base) {
    try {
      const next = await api<GatewayState>(url, '/api/state');
      setState(next);
      openLinkedThread(next);
      const data = await api<{ queue: typeof queue }>(url, '/api/data');
      setQueue(data.queue || []);
      setNeedsGoogle(false);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The desk is offline.';
      if (message === 'Sign in with Google.') setNeedsGoogle(true);
      else setError(message);
    }
  }

  if (!ready) return <div className="dawn-agents login">Opening the desk…</div>;
  if (!state) {
    return (
      <div className="dawn-agents">
        <div className="login">
          <div>
            <p className="word">DAWN</p>
            <h1>Agents</h1>
            <p className="note">{needsGoogle ? 'One Google account. No password on this page.' : 'The agent desk is not running on this host.'}</p>
            {error && <p className="error">{error}</p>}
            {needsGoogle && <a className="primary" href={googleSignInHref()} style={{ display: 'inline-flex', alignItems: 'center' }}>Sign in with Google</a>}
            <nav className="ph-links" aria-label="Dawn" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/">Home</Link>
              <a href="/town">Town</a>
              <a href="/village">Village</a>
              <a href="/atlas">Atlas</a>
              <a href="/studio">Studio</a>
              <a href="/letter">Letter</a>
              <a href="/credits">Credits</a>
            </nav>
          </div>
        </div>
      </div>
    );
  }

  const thread = state.threads.find((item) => item.id === threadId) || null;
  const showList = section === 'agents' && !thread;

  return (
    <div className="dawn-agents">
      <div className={`desk ${showList ? 'show-side' : ''}`}>
        <aside className="side">
          <div className="topbar">
            <span className="word">DAWN</span>
            <span className="grow">Agents</span>
          </div>
          <AgentList state={state} threadId={threadId} onOpen={(id) => { setThreadId(id); setSection('agents'); }} onNew={() => setSection('edit')} />
          <div style={{ marginTop: 'auto', padding: 12 }}>
            <SpendMeter spent={state.spend.spentUsd} cap={state.spend.capUsd} />
            <nav>
              <button type="button" className="ghost" onClick={() => setSection('recipes')}>Recipes</button>
              <button type="button" className="ghost" onClick={() => setSection('letter')}>Letter</button>
              <button type="button" className="ghost" onClick={() => setSection('data')}>Data</button>
              <button type="button" className="ghost" onClick={() => setSection('settings')}>Settings</button>
              <a className="ghost" href="/desk">Bot desk</a>
            </nav>
          </div>
        </aside>
        <section className="main">
          {error && <p className="error" style={{ padding: 12 }}>{error}</p>}
          {section === 'agents' && thread && (
            <ChatPane
              base={base}
              state={state}
              threadId={thread.id}
              onBack={() => setThreadId(null)}
              onRefresh={() => refresh()}
              onError={setError}
            />
          )}
          {section === 'agents' && !thread && <div className="sheet-view mobile-only"><p className="note">Choose an agent.</p></div>}
          {section === 'edit' && <AgentEditor base={base} agents={state.agents} onDone={() => { setSection('agents'); void refresh(); }} onError={setError} />}
          {section === 'recipes' && (
            <RecipesBoard
              onEvent={async (action, recipe) => {
                await api(base, '/api/events', { method: 'POST', body: JSON.stringify({ surface: 'recipes', action, itemId: recipe.id, attributes: recipeAttributes(recipe) }) });
                await refresh();
              }}
            />
          )}
          {section === 'letter' && (
            <PublishDesk
              articles={state.articles}
              subscribers={state.subscribers}
              sends={state.sends}
              provider={state.mailProvider}
              onSave={async (article) => {
                if (article.id) await api(base, `/api/articles/${article.id}`, { method: 'PATCH', body: JSON.stringify(article) });
                else await api(base, '/api/articles', { method: 'POST', body: JSON.stringify(article) });
                await refresh();
              }}
              onPublish={async (id) => { await api(base, `/api/articles/${id}/publish`, { method: 'POST', body: '{}' }); await refresh(); }}
              onDraft={async (id, agentId, notes) => { await api(base, `/api/articles/${id}/draft`, { method: 'POST', body: JSON.stringify({ agentId, notes }) }); await refresh(); }}
              onSend={async (id) => { await api(base, `/api/articles/${id}/send`, { method: 'POST', body: JSON.stringify({ confirm: true }) }); await refresh(); }}
              onImport={async (csv) => { await api(base, '/api/subscribers/import', { method: 'POST', body: csv, headers: { 'content-type': 'text/csv' } }); await refresh(); }}
              onConfirmMail={async (id) => { await api(base, `/api/subscribers/${id}/confirm-mail`, { method: 'POST', body: '{}' }); }}
            />
          )}
          {section === 'data' && (
            <DataPanel
              counts={state.data.counts}
              queue={queue}
              room={state.data.syntheticRoom}
              onReview={async (id, action, correction) => { await api(base, '/api/data/review', { method: 'POST', body: JSON.stringify({ id, action, correction }) }); await refresh(); }}
              onChart={async (sourceUrl, chart, story) => { await api(base, '/api/data/examples', { method: 'POST', body: JSON.stringify({ track: 'chart-story', sourceUrl, chart, story }) }); await refresh(); }}
              onFact={async (claim, sourceUrl, label) => { await api(base, '/api/data/examples', { method: 'POST', body: JSON.stringify({ track: 'fact-check', claim, sourceUrl, label }) }); await refresh(); }}
              onCollect={async () => { await api(base, '/api/data/collect', { method: 'POST', body: '{}' }); await refresh(); }}
              onSynthetic={async (prompt) => { await api(base, '/api/data/synthetic', { method: 'POST', body: JSON.stringify({ prompt }) }); await refresh(); }}
              onImport={async (jsonl) => { await api(base, '/api/data/import', { method: 'POST', body: JSON.stringify({ jsonl }) }); await refresh(); }}
              onExport={async (format) => download(base, `/api/data/export?format=${format}`, `dawn-${format}.jsonl`)}
            />
          )}
          {section === 'settings' && <Settings base={base} state={state} onSaved={() => refresh()} />}
        </section>
      </div>
      <nav className="tabbar">
        <button type="button" className={section === 'agents' ? 'tab on' : 'tab'} onClick={() => { setSection('agents'); setThreadId(null); }}>Agents</button>
        <button type="button" className={section === 'recipes' ? 'tab on' : 'tab'} onClick={() => setSection('recipes')}>Recipes</button>
        <button type="button" className={section === 'letter' ? 'tab on' : 'tab'} onClick={() => setSection('letter')}>Letter</button>
        <button type="button" className={section === 'data' ? 'tab on' : 'tab'} onClick={() => setSection('data')}>Data</button>
      </nav>
    </div>
  );
}

function AgentList({ state, threadId, onOpen, onNew }: { state: GatewayState; threadId: string | null; onOpen: (id: string) => void; onNew: () => void }) {
  const visible = state.threads.filter((thread) => !thread.leftAt);
  const directs = visible.filter((thread) => thread.kind === 'direct');
  const groups = visible.filter((thread) => thread.kind === 'group');
  return (
    <div className="list" style={{ overflow: 'auto' }}>
      {directs.map((thread) => {
        const agent = state.agents.find((item) => item.id === thread.agentIds[0]);
        if (!agent) return null;
        return (
          <button key={thread.id} type="button" className={thread.id === threadId ? 'agent-row on' : 'agent-row'} onClick={() => onOpen(thread.id)}>
            <PixelAvatarView avatar={agent.avatar} title={agent.name} />
            <span>
              <strong>{agent.name}</strong>
              <span className="muted small" style={{ display: 'block' }}>{agent.computer === 'hetzner' ? 'Hetzner' : agent.computer === 'mac' ? 'Mac' : 'Cloud VM'}</span>
            </span>
          </button>
        );
      })}
      {groups.map((thread) => (
        <button key={thread.id} type="button" className={thread.id === threadId ? 'agent-row on' : 'agent-row'} onClick={() => onOpen(thread.id)}>
          <span><strong>{thread.title}</strong><span className="muted small" style={{ display: 'block' }}>Group</span></span>
        </button>
      ))}
      {directs.length === 0 && <p className="note" style={{ padding: 14 }}>No agents yet.</p>}
      <div className="actions" style={{ padding: 12 }}>
        <button type="button" className="primary" onClick={onNew}>New agent</button>
        <GroupButton state={state} />
      </div>
    </div>
  );
}

function GroupButton({ state }: { state: GatewayState }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Studio');
  const [ids, setIds] = useState<string[]>([]);
  if (!open) return <button type="button" className="ghost" onClick={() => setOpen(true)}>New group</button>;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const base = await gatewayBase();
        await api(base, '/api/threads', { method: 'POST', body: JSON.stringify({ title, agentIds: ids }) });
        location.reload();
      }}
    >
      <label>Group<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      {state.agents.map((agent) => (
        <label key={agent.id} className="row">
          <input type="checkbox" checked={ids.includes(agent.id)} onChange={(event) => setIds(event.target.checked ? [...ids, agent.id] : ids.filter((id) => id !== agent.id))} />
          {agent.name}
        </label>
      ))}
      <button className="primary" type="submit">Start group</button>
    </form>
  );
}

function AgentEditor({ base, agents, onDone, onError }: { base: string; agents: Agent[]; onDone: () => void; onError: (message: string) => void }) {
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('You are a careful studio partner. You keep answers short and you use tools when Kyle asks.');
  const [model, setModel] = useState('gemini-3.8-flash');
  const [computer, setComputer] = useState<'hetzner' | 'mac' | 'cloud-vm'>('hetzner');
  const [sprite, setSprite] = useState(defaultSpriteId('dawn'));
  const [editing, setEditing] = useState<string>('');
  return (
    <form
      className="sheet-view"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const avatar = { sprite };
          if (editing) await api(base, `/api/agents/${editing}`, { method: 'PATCH', body: JSON.stringify({ name, instructions, model, computer, avatar }) });
          else await api(base, '/api/agents', { method: 'POST', body: JSON.stringify({ name, instructions, model, computer, avatar }) });
          onDone();
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Could not save the agent.');
        }
      }}
    >
      <h2>{editing ? 'Edit agent' : 'New agent'}</h2>
      {agents.length > 0 && (
        <label>
          Edit existing
          <select value={editing} onChange={(event) => {
            const id = event.target.value;
            setEditing(id);
            const agent = agents.find((item) => item.id === id);
            if (!agent) return;
            setName(agent.name);
            setInstructions(agent.instructions);
            setModel(agent.model);
            setComputer(agent.computer);
            setSprite(agent.avatar.sprite || defaultSpriteId(agent.name));
          }}>
            <option value="">New</option>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
        </label>
      )}
      <label>Name<input value={name} onChange={(event) => { setName(event.target.value); if (!editing) setSprite(defaultSpriteId(event.target.value || 'dawn')); }} /></label>
      <label>Instructions<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
      <label>
        Model
        <select value={model} onChange={(event) => setModel(event.target.value)}>
          <option value="gemini-3.8-flash">Gemini flash</option>
          <option value="gemini-3.1-pro-preview">Gemini pro</option>
          <option value="x-ai/grok-4.7">Grok</option>
        </select>
      </label>
      <label>
        Computer
        <select value={computer} onChange={(event) => setComputer(event.target.value as 'hetzner' | 'mac' | 'cloud-vm')}>
          <option value="hetzner">Hetzner</option>
          <option value="mac">Mac</option>
          <option value="cloud-vm" disabled>Cloud VM later</option>
        </select>
      </label>
      <p className="note">16-bit characters from Kenney, CC0.</p>
      <div className="sprite-pick" role="listbox" aria-label="Agent sprite">
        {AGENT_SPRITES.map((item) => (
          <button key={item.id} type="button" className={sprite === item.id ? 'on' : ''} aria-pressed={sprite === item.id} aria-label={item.name} onClick={() => setSprite(item.id)}>
            <img src={item.src} alt="" width={40} height={40} />
          </button>
        ))}
      </div>
      <button className="primary" type="submit">Save agent</button>
    </form>
  );
}

function Settings({ base, state, onSaved }: { base: string; state: GatewayState; onSaved: () => void }) {
  const [cap, setCap] = useState(String(state.spend.capUsd));
  const providers = state.training.providers;
  async function save(patch: Record<string, unknown>) {
    await api(base, '/api/settings', { method: 'PATCH', body: JSON.stringify(patch) });
    onSaved();
  }
  const ratio = state.spend.capUsd > 0 ? Math.min(1, state.spend.spentUsd / state.spend.capUsd) : 0;
  return (
    <div className="sheet-view">
      <h2>Settings</h2>
      <p className="nums">{formatUsd(state.spend.spentUsd)} of {formatUsd(state.spend.capUsd)} in {state.spend.month} UTC</p>
      <div className={ratio > 0.8 ? 'meter warn' : 'meter'}><span style={{ width: `${ratio * 100}%` }} /></div>
      <label>Monthly cap (USD)<input value={cap} onChange={(event) => setCap(event.target.value)} /></label>
      <button type="button" className="primary" onClick={() => save({ spendCapUsd: Number(cap) })}>Save cap</button>
      <h3>Training log</h3>
      <label className="row"><input type="checkbox" checked={state.training.enabled} onChange={(event) => save({ trainingEnabled: event.target.checked })} /> Keep a training log</label>
      <p className="note">Some providers&apos; terms restrict training on outputs. Turn a provider off to leave it out of the export.</p>
      {Object.keys(providers).map((id) => (
        <label key={id} className="row">
          <input type="checkbox" checked={providers[id]} onChange={(event) => save({ trainingProviders: { ...providers, [id]: event.target.checked } })} />
          {id}
        </label>
      ))}
      <p className="note nums">{state.training.exportable} of {state.training.count} calls are in the next export.</p>
      <button type="button" className="ghost" onClick={() => download(base, '/api/training/export.jsonl', 'dawn-agents-train.jsonl')}>Export training JSONL</button>
      <h3>Keys and workers</h3>
      <p className="note">Gemini {state.keys.gemini ? 'set' : 'missing'} · xAI {state.keys.xai ? 'set' : 'missing'} · OpenRouter {state.keys.openrouter ? 'set' : 'missing'}</p>
      <p className="note">Hetzner {state.workers.linux?.online ? `online · ${state.workers.linux.host}` : 'offline'} · Mac {state.workers.mac?.online ? 'online' : 'offline'}</p>
      <p className="note">Editor token {state.editorTokenSet ? 'set' : 'missing'}</p>
      <table>
        <tbody>
          {state.spend.entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.model}</td>
              <td className="nums">{entry.promptTokens + entry.completionTokens}</td>
              <td className="nums">{formatUsd(entry.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Routines</h3>
      <Routines base={base} state={state} onSaved={onSaved} />
      <p><a href="/credits">Credits & licenses</a></p>
      <a className="ghost" href="/oauth2/sign_out?rd=/">Sign out</a>
    </div>
  );
}

function Routines({ base, state, onSaved }: { base: string; state: GatewayState; onSaved: () => void }) {
  const [agentId, setAgentId] = useState(state.agents[0]?.id || '');
  const [name, setName] = useState('Morning');
  const [cron, setCron] = useState('0 8 * * *');
  const [prompt, setPrompt] = useState('What is worth doing today?');
  return (
    <form onSubmit={async (event) => { event.preventDefault(); await api(base, '/api/routines', { method: 'POST', body: JSON.stringify({ agentId, name, cron, prompt }) }); onSaved(); }}>
      <label>Agent<select value={agentId} onChange={(event) => setAgentId(event.target.value)}>{state.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Cron UTC<input value={cron} onChange={(event) => setCron(event.target.value)} /></label>
      <label>Prompt<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
      <button className="primary" type="submit">Add routine</button>
      <ul>
        {state.routines.map((routine) => (
          <li key={routine.id} className="row">
            <span className="grow">{routine.name} · {routine.cron}</span>
            <button type="button" className="ghost" onClick={async () => {
              const response = await fetch(`${base}/api/routines/${routine.id}/run`, { method: 'POST', credentials: 'include', redirect: 'manual' });
              await response.text();
              onSaved();
            }}>Run now</button>
          </li>
        ))}
      </ul>
    </form>
  );
}

function SpendMeter({ spent, cap }: { spent: number; cap: number }) {
  const ratio = cap > 0 ? Math.min(1, spent / cap) : 0;
  return (
    <div>
            <p className="small nums">{formatUsd(spent)} / {formatUsd(cap)}</p>
      <div className={ratio > 0.8 ? 'meter warn' : 'meter'}><span style={{ width: `${ratio * 100}%` }} /></div>
      <p className="small"><a href="/credits">Credits & licenses</a></p>
    </div>
  );
}

async function download(base: string, path: string, filename: string) {
  const response = await fetch(`${base}${path}`, { credentials: 'include', redirect: 'manual' });
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
