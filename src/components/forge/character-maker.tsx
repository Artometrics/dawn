'use client';

import { useMemo, useRef, useState } from 'react';
import { Castle, Download, FileUp, ImageDown, Trash2 } from 'lucide-react';
import { AGENTS } from '@/lib/agents';
import { useDawn } from '@/components/dawn/dawn-provider';
import { ForgeViewport } from '@/components/forge/forge-viewport';
import { EPITHET_MAX, NAME_MAX, ROSTER_MAX, type AgentSlot } from '@/lib/forge/catalog';
import { exportCharacterJson, fileSafeName, importCharacterJson, slugFromName } from '@/lib/forge/codec';
import { blankCharacter, PRESETS } from '@/lib/forge/presets';
import { CATALOG, validateCharacter, type ColorKey, type ForgeCharacter, type PartGroup } from '@/lib/forge/schema';
import { POSES, type PoseName } from '@/lib/forge/engine/bones';
import type { ForgeStage } from '@/lib/forge/engine/stage';

const PART_GROUPS = Object.keys(CATALOG) as PartGroup[];

const SLOT_LABEL: Record<PartGroup, string> = {
  head: 'Head',
  face: 'Face',
  hair: 'Hair',
  outfit: 'Outfit',
  accessory: 'Accessory',
};

const COLOR_LABEL: Record<ColorKey, string> = { skin: 'Skin', hair: 'Hair', cloth: 'Cloth', trim: 'Trim' };
const COLOR_KEYS = Object.keys(COLOR_LABEL) as ColorKey[];
const POSE_LABEL: Record<PoseName, string> = { idle: 'Idle', guard: 'Guard' };
function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function CharacterMaker({ onOpenVillage }: { onOpenVillage: () => void }) {
  const { roster } = useDawn();
  const [draft, setDraft] = useState<ForgeCharacter>(() => structuredClone(PRESETS[0]));
  const [draftId, setDraftId] = useState<string | null>(null);
  const [pose, setPose] = useState<PoseName>('idle');
  const [turntable, setTurntable] = useState(true);
  const [skeleton, setSkeleton] = useState(false);
  const [busy, setBusy] = useState<'save' | 'png' | 'glb' | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const stageRef = useRef<ForgeStage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const full = roster.characters.length >= ROSTER_MAX && !roster.characters.some((item) => item.id === draftId);
  const checked = useMemo(() => validateCharacter(draft), [draft]);

  function edit(change: (next: ForgeCharacter) => void) {
    setDraft((current) => {
      const next = structuredClone(current);
      change(next);
      return next;
    });
    setMessage(null);
  }

  function rename(name: string) {
    edit((next) => {
      const followsName = next.id === 'new-character' || next.id === slugFromName(next.name);
      next.name = name;
      if (followsName) next.id = slugFromName(name);
    });
  }

  function say(text: string, bad = false) {
    setMessage({ text, bad });
  }

  function load(character: ForgeCharacter, id: string | null) {
    setDraft(structuredClone(character));
    setDraftId(id);
    setPose('idle');
    setMessage(null);
  }

  async function save() {
    if (busy || !checked.ok) return;
    setBusy('save');
    try {
      const { renderShots } = await import('@/lib/forge/engine/outputs');
      const shots = await renderShots(checked.character);
      const id = draftId ?? crypto.randomUUID();
      const result = roster.saveCharacter({ id, character: checked.character, portrait: shots.portrait, sprite: shots.sprite });
      if (!result.ok) {
        say(result.error, true);
        return;
      }
      setDraftId(id);
      say(`${checked.character.name} is in your roster.`);
    } catch {
      say('Could not draw the portrait on this browser.', true);
    } finally {
      setBusy(null);
    }
  }

  async function savePng() {
    if (busy || !checked.ok) return;
    setBusy('png');
    try {
      const { renderPortraitBlob } = await import('@/lib/forge/engine/outputs');
      download(`${fileSafeName(checked.character)}-portrait.png`, await renderPortraitBlob(checked.character));
      say('Portrait saved.');
    } catch {
      say('Could not draw the portrait on this browser.', true);
    } finally {
      setBusy(null);
    }
  }

  async function saveGlb() {
    if (busy || !checked.ok) return;
    setBusy('glb');
    try {
      const { exportGlb } = await import('@/lib/forge/engine/outputs');
      const buffer = await exportGlb(checked.character);
      download(`${fileSafeName(checked.character)}.glb`, new Blob([buffer], { type: 'model/gltf-binary' }));
      say('glTF saved with the idle and guard clips.');
    } catch {
      say('Could not make the glTF file.', true);
    } finally {
      setBusy(null);
    }
  }

  function saveJson() {
    if (!checked.ok) return;
    download(`${fileSafeName(checked.character)}.json`, new Blob([exportCharacterJson(checked.character)], { type: 'application/json' }));
    say('JSON saved.');
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const parsed = importCharacterJson(await file.text());
    if (!parsed.ok) {
      say(parsed.error, true);
      return;
    }
    load(parsed.character, null);
    say(`${parsed.character.name} is loaded. Save it to keep it.`);
  }

  const heldBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of AGENTS) map.set(agent.id, agent.name);
    return map;
  }, []);

  return (
    <div data-forge-scroll className="flex h-full min-h-0 flex-col overflow-y-auto px-4 pt-3 pb-28">
      <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="min-w-0 md:sticky md:top-0 md:self-start">
          <div className="h-[min(56dvh,460px)] min-h-[300px] md:h-[min(64dvh,560px)]">
            <ForgeViewport
              character={draft}
              pose={pose}
              turntable={turntable}
              onTurntable={setTurntable}
              skeleton={skeleton}
              stageRef={stageRef}
            />
          </div>
          <div className="dw-actions mt-3" role="group" aria-label="Pose and view">
            {POSES.map((name) => (
              <button key={name} type="button" className="dw-btn dw-btn--chip" aria-pressed={pose === name} onClick={() => setPose(name)}>
                {POSE_LABEL[name]}
              </button>
            ))}
            <button type="button" className="dw-btn dw-btn--chip" aria-pressed={turntable} onClick={() => setTurntable((on) => !on)}>Turntable</button>
            <button type="button" className="dw-btn dw-btn--chip" aria-pressed={skeleton} onClick={() => setSkeleton((on) => !on)}>Skeleton</button>
            <button type="button" className="dw-btn dw-btn--chip" onClick={() => stageRef.current?.resetView()}>Reset view</button>
          </div>
        </div>

        <div className="min-w-0">
          <section aria-labelledby="forge-start">
            <h2 id="forge-start" className="dw-eyebrow">Start from</h2>
            <div className="dw-actions mt-2">
              {PRESETS.map((preset) => (
                <button key={preset.id} type="button" className="dw-btn dw-btn--chip" aria-pressed={draftId === null && draft.id === preset.id} onClick={() => load(preset, null)}>
                  {preset.name}
                </button>
              ))}
              <button type="button" className="dw-btn dw-btn--chip" onClick={() => load(blankCharacter(), null)}>Blank</button>
            </div>
          </section>

          <section className="mt-6 flex flex-col gap-4" aria-label="Name and epithet">
            <label className="dw-label">
              Name
              <input
                id="forge-name-input"
                value={draft.name}
                maxLength={NAME_MAX}
                onChange={(event) => rename(event.target.value)}
                className="dw-field"
                autoComplete="off"
              />
            </label>
            <label className="dw-label">
              Epithet
              <input
                id="forge-epithet-input"
                value={draft.epithet}
                maxLength={EPITHET_MAX}
                onChange={(event) => edit((next) => { next.epithet = event.target.value; })}
                className="dw-field"
                autoComplete="off"
              />
            </label>
          </section>

          {PART_GROUPS.map((group) => (
            <section key={group} className="mt-6" aria-labelledby={`forge-${group}`}>
              <h2 id={`forge-${group}`} className="dw-eyebrow">{SLOT_LABEL[group]}</h2>
              <div className="dw-actions mt-2">
                {CATALOG[group].map((option) => (
                  <button key={option.id} type="button" className="dw-btn dw-btn--chip" aria-pressed={draft.parts[group] === option.id} onClick={() => edit((next) => { next.parts[group] = option.id; })}>
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          ))}

          <section className="mt-6">
            <h2 className="dw-eyebrow">Body</h2>
            {(['height', 'build'] as const).map((key) => (
              <label key={key} className="mt-2 flex min-h-11 items-center gap-3 text-[15px] first:mt-2">
                <span className="w-16 shrink-0 capitalize">{key}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={draft.body[key]}
                  onChange={(event) => edit((next) => { next.body[key] = Number(event.target.value); })}
                  className="h-11 min-w-0 flex-1 accent-[var(--dawn-accent)]"
                />
                <span className="w-10 shrink-0 text-right text-[13px] tabular-nums text-[var(--dawn-muted)]">{draft.body[key].toFixed(2)}</span>
              </label>
            ))}
          </section>

          <section className="mt-6">
            <h2 className="dw-eyebrow">Color</h2>
            <div className="mt-2 flex flex-wrap gap-4">
              {COLOR_KEYS.map((key) => (
                <label key={key} className="flex flex-col items-center gap-1 text-[13px] text-[var(--dawn-secondary)]">
                  <input
                    type="color"
                    value={draft.colors[key]}
                    onChange={(event) => edit((next) => { next.colors[key] = event.target.value.toLowerCase(); })}
                    className="h-11 w-11 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                  />
                  {COLOR_LABEL[key]}
                </label>
              ))}
            </div>
            <div className="dw-actions mt-3">
              <button type="button" className="dw-btn dw-btn--chip" aria-pressed={draft.paintOverlay} onClick={() => edit((next) => { next.paintOverlay = !next.paintOverlay; })}>Brush texture</button>
            </div>
          </section>

          <section className="mt-8">
            <button
              type="button"
             onClick={() => void save()}
              disabled={busy !== null || full || !checked.ok}
              className="dw-btn dw-btn--primary dw-btn--block"
            >
              {busy === 'save' ? 'Saving…' : draftId ? 'Save changes' : 'Save to roster'}
            </button>
            {!checked.ok && <p className="mt-2 text-[13px] text-[var(--dawn-accent)]">{checked.errors[0]}</p>}
            {full && <p className="mt-2 text-[13px] text-[var(--dawn-accent)]">The roster holds {ROSTER_MAX} characters. Remove one to add another.</p>}
            <div className="dw-actions mt-3">
              <button type="button" className="dw-btn" onClick={saveJson} disabled={!checked.ok}><Download aria-hidden />JSON</button>
              <button type="button" className="dw-btn" onClick={() => fileRef.current?.click()}><FileUp aria-hidden />Import</button>
              <button type="button" className="dw-btn" onClick={() => void savePng()} disabled={busy !== null || !checked.ok}><ImageDown aria-hidden />PNG</button>
              <button type="button" className="dw-btn" onClick={() => void saveGlb()} disabled={busy !== null || !checked.ok}><Download aria-hidden />glTF</button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              data-forge-import
              className="sr-only"
              tabIndex={-1}
              aria-label="Import a character JSON file"
              onChange={(event) => {
                void importFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <p role="status" data-forge-status className={`mt-2 min-h-5 text-[13px] ${message?.bad ? 'text-[var(--dawn-accent)]' : 'text-[var(--dawn-secondary)]'}`}>
              {message?.text ?? ''}
            </p>
            {roster.note && <p role="alert" className="mt-1 text-[13px] text-[var(--dawn-accent)]">{roster.note}</p>}
          </section>
        </div>
      </div>

      <section className="mx-auto mt-10 w-full max-w-5xl" aria-labelledby="forge-roster">
        <h2 id="forge-roster" className="dw-eyebrow">Your roster · {roster.characters.length} of {ROSTER_MAX}</h2>
        {roster.characters.length === 0 && (
          <p className="mt-2 text-[15px] text-[var(--dawn-secondary)]">Nobody yet. Save a character and it appears here, then in the village.</p>
        )}
        <ul className="mt-3 flex flex-col gap-3" data-forge-roster>
          {roster.characters.map((entry) => (
            <li key={entry.id} className="dw-card">
              <div className="flex items-center gap-3">
                {entry.portrait ? (
                  <img src={entry.portrait} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-[var(--dawn-radius-row)] bg-[var(--dawn-chip)] object-cover" />
                ) : (
                  <span className="h-14 w-14 shrink-0 rounded-[var(--dawn-radius-row)] bg-[var(--dawn-chip)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] leading-5">{entry.character.name}</p>
                  <p className="truncate text-[13px] leading-5 text-[var(--dawn-muted)]">
                    {entry.agentId ? `Village avatar for ${heldBy.get(entry.agentId) ?? entry.agentId}` : entry.character.epithet || 'Not in the village yet'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => load(entry.character, entry.id)}
                  className="dw-btn dw-btn--chip"
                >
                  Edit
                </button>
              </div>
              <div className="dw-actions mt-3 items-center" role="group" aria-label={`Village avatar for ${entry.character.name}`}>
                <span className="dw-eyebrow">Avatar for</span>
                {AGENTS.map((agent) => (
                  <button type="button" className="dw-btn dw-btn--chip" aria-pressed={entry.agentId === agent.id}
                   key={agent.id}
                    
                   onClick={() => roster.assignCharacter(entry.id, entry.agentId === agent.id ? '' : (agent.id as AgentSlot))}
                  >
                    {agent.name}
                  </button>
                ))}
                {entry.agentId && (
                  <button type="button" className="dw-btn dw-btn--chip" onClick={onOpenVillage}>
                    <Castle aria-hidden />See in village
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${entry.character.name}`}
                  onClick={() => {
                    roster.removeCharacter(entry.id);
                    if (draftId === entry.id) setDraftId(null);
                  }}
                  className="dw-btn dw-btn--icon ml-auto"
                >
                  <Trash2 aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
