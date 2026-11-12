'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { AGENT_SPRITES, defaultSpriteId } from '@/lib/credits/sprites';
import { formatUsd } from '@/lib/dawn-agents/spend';
import { PixelAvatarView } from './pixel-avatar';
import { DataPanel } from './data-panel';
import { api, gatewayBase, type Agent, type GatewayState } from './api';
import { ChatPane } from './chat-pane';

type Section = 'data' | 'settings' | 'new';
const SECTIONS: Section[] = ['data', 'settings', 'new'];

export function AgentsRoot() {
  const router = useRouter();
  const params = useSearchParams();
  const [base, setBase] = useState('');
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<GatewayState | null>(null);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<{ id: string; track: string; status: string; messages?: { content: string }[] }[]>([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const linked = useRef(false);

  const asked = params.get('section');
  const section = SECTIONS.find((item) => item === asked) ?? null;
  const threadId = params.get('thread');

  useEffect(() => {
    void (async () => {
      const url = await gatewayBase();
      setBase(url);
      setReady(true);
      await refresh(url);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once; refresh only reads the address it is given
  }, []);

  useEffect(() => {
    if (asked === 'recipes') router.replace('/artifacts');
    if (asked === 'letter') router.replace('/letter');
    if (asked === 'edit') router.replace('/agents?section=new');
  }, [asked, router]);

  function openLinkedAgent(next: GatewayState) {
    if (linked.current) return;
    linked.current = true;
    const agent = params.get('agent');
    if (!agent) return;
    const direct = next.threads.find((item) => item.kind === 'direct' && item.agentIds[0] === agent);
    if (direct) router.replace(`/agents?thread=${direct.id}`);
  }

  async function refresh(url = base) {
    try {
      const next = await api<GatewayState>(url, '/api/state');
      setState(next);
      openLinkedAgent(next);
      const data = await api<{ queue: typeof queue }>(url, '/api/data');
      setQueue(data.queue || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The desk is offline.');
    }
  }

  if (!ready || !state) {
    return <p className="note" style={{ padding: 24 }}>{error || 'Opening the agent list…'}</p>;
  }

  const thread = state.threads.find((item) => item.id === threadId && !item.leftAt) || null;
  const view = thread ? 'chat' : section ? 'section' : 'list';
  const openThread = (id: string) => router.push(`/agents?thread=${id}`);

  return (
    <div className="dawn-agents ag" data-view={view}>
      <aside className="ag-list" aria-label="Agents">
        <div className="ag-head">
          <button type="button" className="primary" onClick={() => router.push('/agents?section=new')}><Plus size={18} aria-hidden /> New agent</button>
          <button type="button" className="ghost ag-outline" onClick={() => setGroupOpen((open) => !open)} aria-expanded={groupOpen}><Users size={18} aria-hidden /> New group</button>
        </div>
        {groupOpen && (
          <GroupForm
            agents={state.agents}
            onCancel={() => setGroupOpen(false)}
            onMade={async (id) => { setGroupOpen(false); await refresh(); openThread(id); }}
            onError={setError}
          />
        )}
        <SpendMeter spent={state.spend.spentUsd} cap={state.spend.capUsd} />
        <AgentList state={state} threadId={thread?.id ?? null} onOpen={openThread} />
      </aside>
      <section className="ag-main">
        {error && <p className="error ag-error" role="alert">{error}</p>}
        {thread && (
          <ChatPane
            key={thread.id}
            base={base}
            state={state}
            threadId={thread.id}
            onBack={() => router.push('/agents')}
            onRefresh={() => refresh()}
            onError={setError}
          />
        )}
        {!thread && !section && <div className="ag-empty"><p className="note">Choose an agent.</p></div>}
        {section === 'new' && !thread && <div className="ag-page"><AgentEditor base={base} agents={state.agents} onDone={() => { router.push('/agents'); void refresh(); }} onCancel={() => router.push('/agents')} onError={setError} /></div>}
        {section === 'data' && !thread && (
          <div className="ag-page">
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
          </div>
        )}
        {section === 'settings' && !thread && <div className="ag-page"><Settings base={base} state={state} onSaved={() => refresh()} /></div>}
      </section>
    </div>
  );
}

const HOSTS: Record<Agent['computer'], string> = { hetzner: 'Hetzner', mac: 'Mac', 'cloud-vm': 'Cloud VM' };

function hostOnline(state: GatewayState, computer: Agent['computer']): boolean {
  if (computer === 'hetzner') return Boolean(state.workers.linux?.online);
  if (computer === 'mac') return Boolean(state.workers.mac?.online);
  return false;
}

function AgentList({ state, threadId, onOpen }: { state: GatewayState; threadId: string | null; onOpen: (id: string) => void }) {
  const visible = state.threads.filter((thread) => !thread.leftAt);
  const directs = visible.filter((thread) => thread.kind === 'direct');
  const groups = visible.filter((thread) => thread.kind === 'group');
  return (
    <div className="ag-cards">
      <h2 className="ag-label">Agents</h2>
      {directs.length === 0 && <p className="note">No agents yet. Start with New agent.</p>}
      <ul className="ag-stack">
        {directs.map((thread, index) => {
          const agent = state.agents.find((item) => item.id === thread.agentIds[0]);
          if (!agent) return null;
          const online = hostOnline(state, agent.computer);
          return (
            <li key={thread.id} style={{ ['--i' as string]: index }}>
              <button type="button" className="ag-card" aria-current={thread.id === threadId ? 'true' : undefined} onClick={() => onOpen(thread.id)}>
                <PixelAvatarView avatar={agent.avatar} size={48} title={agent.name} />
                <span className="ag-meta">
                  <strong>{agent.name}</strong>
                  <span className="muted small">{HOSTS[agent.computer]}</span>
                </span>
                <span className="ag-status" data-online={online}>{online ? 'Online' : 'Offline'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {groups.length > 0 && <h2 className="ag-label">Groups</h2>}
      <ul className="ag-stack">
        {groups.map((thread, index) => (
          <li key={thread.id} style={{ ['--i' as string]: index }}>
            <button type="button" className="ag-card" aria-current={thread.id === threadId ? 'true' : undefined} onClick={() => onOpen(thread.id)}>
              <span className="ag-group-mark" aria-hidden><Users size={22} /></span>
              <span className="ag-meta">
                <strong>{thread.title}</strong>
                <span className="muted small">{thread.agentIds.length} agents</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GroupForm({ agents, onCancel, onMade, onError }: { agents: Agent[]; onCancel: () => void; onMade: (id: string) => Promise<void>; onError: (message: string) => void }) {
  const [title, setTitle] = useState('Studio');
  const [ids, setIds] = useState<string[]>([]);
  return (
    <form
      className="ag-card-form"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const base = await gatewayBase();
          const made = await api<{ id: string }>(base, '/api/threads', { method: 'POST', body: JSON.stringify({ title, agentIds: ids }) });
          await onMade(made.id);
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Could not start the group.');
        }
      }}
    >
      <label>Group name<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      {agents.map((agent) => (
        <label key={agent.id} className="row ag-check">
          <input type="checkbox" checked={ids.includes(agent.id)} onChange={(event) => setIds(event.target.checked ? [...ids, agent.id] : ids.filter((id) => id !== agent.id))} />
          {agent.name}
        </label>
      ))}
      <div className="actions">
        <button className="primary" type="submit" disabled={ids.length === 0}>Start group</button>
        <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function AgentEditor({ base, agents, onDone, onCancel, onError }: { base: string; agents: Agent[]; onDone: () => void; onCancel: () => void; onError: (message: string) => void }) {
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
      <p className="note">Pick a look.</p>
      <div className="sprite-pick" role="listbox" aria-label="Agent sprite">
        {AGENT_SPRITES.map((item) => (
          <button key={item.id} type="button" className={sprite === item.id ? 'on' : ''} aria-pressed={sprite === item.id} aria-label={item.name} onClick={() => setSprite(item.id)}>
            <img src={item.src} alt="" width={40} height={40} />
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="primary" type="submit">Save agent</button>
        <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
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
    <div className="ag-spend">
      <h2 className="ag-label">Spend this month</h2>
      <p className="nums ag-spend-line">{formatUsd(spent)} <span className="muted">of {formatUsd(cap)}</span></p>
      <div className={ratio > 0.8 ? 'meter warn' : 'meter'}><span style={{ width: `${ratio * 100}%` }} /></div>
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
