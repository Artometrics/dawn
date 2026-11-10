'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Castle, Download, FileUp, ImageDown, Trash2 } from 'lucide-react';
import { AGENTS } from '@/lib/agents';
import { useDawn } from '@/components/dawn/dawn-provider';
import { ForgeViewport } from '@/components/forge/forge-viewport';
import {
  BUILD_RANGE,
  CLIPS,
  COLOR_SLOTS,
  HEIGHT_RANGE,
  NAME_MAX,
  PARTS,
  PART_SLOTS,
  ROSTER_MAX,
  type AgentSlot,
  type PartSlot,
} from '@/lib/forge/catalog';
import { exportCharacterJson, fileSafeName, importCharacterJson } from '@/lib/forge/codec';
import { PRESETS } from '@/lib/forge/presets';
import { blankCharacter, type ForgeCharacter } from '@/lib/forge/schema';
import type { ForgeStage } from '@/lib/forge/engine/stage';

const SLOT_LABEL: Record<PartSlot, string> = {
  head: 'Head',
  face: 'Face',
  hair: 'Hair',
  outfit: 'Outfit',
  accessory: 'Accessory',
};

function Chip({ on, onClick, children }: { on?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on === undefined ? undefined : on}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[14px] ${
        on ? 'bg-[var(--dawn-accent)] text-[var(--dawn-ink)]' : 'bg-[var(--dawn-chip)] text-[var(--dawn-text)]'
      }`}
    >
      {children}
    </button>
  );
}

function Secondary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--dawn-chip)] px-4 text-[14px] font-medium disabled:opacity-40"
    >
      {children}
    </button>
  );
}

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

function dataUrlToBlob(url: string): Blob {
  const [, base64 = ''] = url.split(',');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: 'image/png' });
}

export function CharacterMaker({ onOpenVillage }: { onOpenVillage: () => void }) {
  const { roster } = useDawn();
  const [draft, setDraft] = useState<ForgeCharacter>(() => ({ ...PRESETS[0].character, colors: { ...PRESETS[0].character.colors } }));
  const [draftId, setDraftId] = useState<string | null>(null);
  const [skeleton, setSkeleton] = useState(false);
  const [busy, setBusy] = useState<'save' | 'png' | 'glb' | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const stageRef = useRef<ForgeStage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const full = roster.characters.length >= ROSTER_MAX && !roster.characters.some((item) => item.id === draftId);

  function patch(next: Partial<ForgeCharacter>) {
    setDraft((current) => ({ ...current, ...next }));
    setMessage(null);
  }

  function say(text: string, bad = false) {
    setMessage({ text, bad });
  }

  function load(character: ForgeCharacter, id: string | null) {
    setDraft({ ...character, colors: { ...character.colors } });
    setDraftId(id);
    setMessage(null);
  }

  async function save() {
    if (busy) return;
    setBusy('save');
    try {
      const { renderShots } = await import('@/lib/forge/engine/outputs');
      const shots = renderShots(draft);
      const id = draftId ?? crypto.randomUUID();
      const result = roster.saveCharacter({ id, character: draft, portrait: shots.portrait, sprite: shots.sprite });
      if (!result.ok) {
        say(result.error, true);
        return;
      }
      setDraftId(id);
      say(`${draft.name} is in your roster.`);
    } catch {
      say('Could not draw the portrait on this browser.', true);
    } finally {
      setBusy(null);
    }
  }

  async function savePng() {
    if (busy) return;
    setBusy('png');
    try {
      const { renderPortraitPng } = await import('@/lib/forge/engine/outputs');
      download(`${fileSafeName(draft.name)}-portrait.png`, dataUrlToBlob(renderPortraitPng(draft, 512)));
      say('Portrait saved.');
    } catch {
      say('Could not draw the portrait on this browser.', true);
    } finally {
      setBusy(null);
    }
  }

  async function saveGlb() {
    if (busy) return;
    setBusy('glb');
    try {
      const { exportGlb } = await import('@/lib/forge/engine/outputs');
      const buffer = await exportGlb(draft);
      download(`${fileSafeName(draft.name)}.glb`, new Blob([buffer], { type: 'model/gltf-binary' }));
      say('glTF saved.');
    } catch {
      say('Could not make the glTF file.', true);
    } finally {
      setBusy(null);
    }
  }

  function saveJson() {
    download(`${fileSafeName(draft.name)}.forge.json`, new Blob([exportCharacterJson(draft)], { type: 'application/json' }));
    say('JSON saved.');
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const parsed = importCharacterJson(await file.text());
    if (!parsed.ok) {
      say(parsed.error, true);
      return;
    }
    load(parsed.value, null);
    say(`${parsed.value.name} is loaded. Save it to keep it.`);
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
            <ForgeViewport character={draft} skeleton={skeleton} stageRef={stageRef} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Pose and view">
            {CLIPS.map((clip) => (
              <Chip key={clip.id} on={draft.clip === clip.id} onClick={() => patch({ clip: clip.id })}>
                {clip.label}
              </Chip>
            ))}
            <Chip on={skeleton} onClick={() => setSkeleton((on) => !on)}>Skeleton</Chip>
            <Chip onClick={() => stageRef.current?.resetView()}>Reset view</Chip>
          </div>
        </div>

        <div className="min-w-0">
          <section aria-labelledby="forge-start">
            <h2 id="forge-start" className="text-[13px] text-[var(--dawn-muted)]">Start from</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Chip key={preset.id} on={draftId === null && draft.name === preset.character.name} onClick={() => load(preset.character, null)}>
                  {preset.character.name}
                </Chip>
              ))}
              <Chip onClick={() => load(blankCharacter(), null)}>Blank</Chip>
            </div>
          </section>

          <section className="mt-6" aria-labelledby="forge-name">
            <label id="forge-name" htmlFor="forge-name-input" className="text-[13px] text-[var(--dawn-muted)]">Name</label>
            <input
              id="forge-name-input"
              value={draft.name}
              maxLength={NAME_MAX}
              onChange={(event) => patch({ name: event.target.value })}
              className="dawn-field mt-2"
              autoComplete="off"
            />
          </section>

          {PART_SLOTS.map((slot) => (
            <section key={slot} className="mt-6" aria-labelledby={`forge-${slot}`}>
              <h2 id={`forge-${slot}`} className="text-[13px] text-[var(--dawn-muted)]">{SLOT_LABEL[slot]}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {PARTS[slot].map((option) => (
                  <Chip key={option.id} on={draft[slot] === option.id} onClick={() => patch({ [slot]: option.id } as Partial<ForgeCharacter>)}>
                    {option.label}
                  </Chip>
                ))}
              </div>
            </section>
          ))}

          <section className="mt-6">
            <h2 className="text-[13px] text-[var(--dawn-muted)]">Body</h2>
            <label className="mt-2 flex min-h-11 items-center gap-3 text-[15px]">
              <span className="w-16 shrink-0">Height</span>
              <input
                type="range"
                min={HEIGHT_RANGE.min}
                max={HEIGHT_RANGE.max}
                step={0.01}
                value={draft.height}
                onChange={(event) => patch({ height: Number(event.target.value) })}
                className="h-11 min-w-0 flex-1 accent-[var(--dawn-accent)]"
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 text-[15px]">
              <span className="w-16 shrink-0">Build</span>
              <input
                type="range"
                min={BUILD_RANGE.min}
                max={BUILD_RANGE.max}
                step={0.01}
                value={draft.build}
                onChange={(event) => patch({ build: Number(event.target.value) })}
                className="h-11 min-w-0 flex-1 accent-[var(--dawn-accent)]"
              />
            </label>
          </section>

          <section className="mt-6">
            <h2 className="text-[13px] text-[var(--dawn-muted)]">Color</h2>
            <div className="mt-2 flex flex-wrap gap-4">
              {COLOR_SLOTS.map((slot) => (
                <label key={slot.id} className="flex flex-col items-center gap-1 text-[13px] text-[var(--dawn-secondary)]">
                  <input
                    type="color"
                    value={draft.colors[slot.id]}
                    onChange={(event) => patch({ colors: { ...draft.colors, [slot.id]: event.target.value.toLowerCase() } })}
                    className="h-11 w-11 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                  />
                  {slot.label}
                </label>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy !== null || full || !draft.name.trim()}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--dawn-pill)] px-4 text-[14px] font-medium text-[var(--dawn-ink)] disabled:opacity-40"
            >
              {busy === 'save' ? 'Saving…' : draftId ? 'Save changes' : 'Save to roster'}
            </button>
            {full && <p className="mt-2 text-[13px] text-[var(--dawn-accent)]">The roster holds {ROSTER_MAX} characters. Remove one to add another.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Secondary onClick={saveJson}><Download className="h-4 w-4" aria-hidden />JSON</Secondary>
              <Secondary onClick={() => fileRef.current?.click()}><FileUp className="h-4 w-4" aria-hidden />Import</Secondary>
              <Secondary onClick={() => void savePng()} disabled={busy !== null}><ImageDown className="h-4 w-4" aria-hidden />PNG</Secondary>
              <Secondary onClick={() => void saveGlb()} disabled={busy !== null}><Download className="h-4 w-4" aria-hidden />glTF</Secondary>
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
        <h2 id="forge-roster" className="text-[13px] text-[var(--dawn-muted)]">Your roster · {roster.characters.length} of {ROSTER_MAX}</h2>
        {roster.characters.length === 0 && (
          <p className="mt-2 text-[15px] text-[var(--dawn-secondary)]">Nobody yet. Save a character and it appears here, then in the village.</p>
        )}
        <ul className="mt-3 flex flex-col gap-3" data-forge-roster>
          {roster.characters.map((entry) => (
            <li key={entry.id} className="rounded-[18px] bg-[var(--dawn-elev)] p-3">
              <div className="flex items-center gap-3">
                {entry.portrait ? (
                  <img src={entry.portrait} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-[14px] bg-[var(--dawn-chip)] object-cover" />
                ) : (
                  <span className="h-14 w-14 shrink-0 rounded-[14px] bg-[var(--dawn-chip)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] leading-5">{entry.character.name}</p>
                  <p className="truncate text-[13px] leading-5 text-[var(--dawn-muted)]">
                    {entry.agentId ? `Village avatar for ${heldBy.get(entry.agentId) ?? entry.agentId}` : entry.character.title || 'Not in the village yet'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => load(entry.character, entry.id)}
                  className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--dawn-chip)] px-4 text-[14px] font-medium"
                >
                  Edit
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={`Village avatar for ${entry.character.name}`}>
                <span className="text-[13px] text-[var(--dawn-muted)]">Avatar for</span>
                {AGENTS.map((agent) => (
                  <Chip
                    key={agent.id}
                    on={entry.agentId === agent.id}
                    onClick={() => roster.assignCharacter(entry.id, entry.agentId === agent.id ? '' : (agent.id as AgentSlot))}
                  >
                    {agent.name}
                  </Chip>
                ))}
                {entry.agentId && (
                  <Chip onClick={onOpenVillage}>
                    <Castle className="mr-1 h-4 w-4" aria-hidden />See in village
                  </Chip>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${entry.character.name}`}
                  onClick={() => {
                    roster.removeCharacter(entry.id);
                    if (draftId === entry.id) setDraftId(null);
                  }}
                  className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-[var(--dawn-chip)]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
