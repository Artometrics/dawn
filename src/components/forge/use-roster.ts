'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, type Firestore } from 'firebase/firestore';
import type { AgentSlot } from '@/lib/forge/catalog';
import type { ForgeCharacter } from '@/lib/forge/schema';
import {
  assignAgent,
  docToEntry,
  entryToDoc,
  loadRoster,
  looksByAgent,
  removeEntry,
  saveRoster,
  sortRoster,
  upsertEntry,
  type AgentLook,
  type RosterEntry,
  type UpsertResult,
} from '@/lib/forge/roster';

type Owner = { db: Firestore | null; user: { uid: string } | null };

export type SaveInput = { id: string; character: ForgeCharacter; portrait: string; sprite: string };

export type RosterApi = {
  characters: RosterEntry[];
  looks: Partial<Record<AgentSlot, AgentLook>>;
  note: string | null;
  saveCharacter: (input: SaveInput) => UpsertResult;
  removeCharacter: (id: string) => void;
  assignCharacter: (id: string, agentId: '' | AgentSlot) => void;
};

/**
 * The village roster. It always lives on this phone (localStorage). Signed in
 * with Firebase, it is mirrored to users/{uid}/characters, the same pattern as
 * quests. Nothing here calls a paid service.
 */
export function useRoster({ db, user }: Owner): RosterApi {
  const [characters, setCharacters] = useState<RosterEntry[]>(() =>
    typeof window === 'undefined' ? [] : loadRoster(window.localStorage),
  );
  const [note, setNote] = useState<string | null>(null);
  const current = useRef(characters);
  const uid = user?.uid ?? null;

  const commit = useCallback((next: RosterEntry[]) => {
    current.current = next;
    setCharacters(next);
    const result = saveRoster(window.localStorage, next);
    setNote(result.ok ? null : result.error);
  }, []);

  useEffect(() => {
    if (!db || !uid) return;
    let cancelled = false;
    let stop = () => {};
    const col = collection(db, 'users', uid, 'characters');
    void (async () => {
      try {
        const snap = await getDocs(col);
        if (snap.empty) {
          await Promise.all(current.current.map((entry) => setDoc(doc(col, entry.id), entryToDoc(entry)).catch(() => undefined)));
        }
        if (cancelled) return;
        stop = onSnapshot(col, (next) => {
          const remote = next.docs.map((item) => docToEntry(item.data())).filter((item): item is RosterEntry => item !== null);
          if (remote.length === 0 && next.metadata.fromCache) return;
          commit(sortRoster(remote));
        });
      } catch {
        setNote('Characters stayed on this phone.');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [db, uid, commit]);

  const mirror = useCallback(
    (entry: RosterEntry) => {
      if (!db || !uid) return;
      void setDoc(doc(db, 'users', uid, 'characters', entry.id), entryToDoc(entry)).catch(() => {
        setNote('That character stayed on this phone.');
      });
    },
    [db, uid],
  );

  const saveCharacter = useCallback(
    (input: SaveInput): UpsertResult => {
      const result = upsertEntry(current.current, input, Date.now());
      if (!result.ok) return result;
      commit(result.roster);
      mirror(result.entry);
      return result;
    },
    [commit, mirror],
  );

  const removeCharacter = useCallback(
    (id: string) => {
      const next = removeEntry(current.current, id);
      commit(next);
      if (db && uid) {
        void deleteDoc(doc(db, 'users', uid, 'characters', id)).catch(() => {
          setNote('That character stayed on this phone.');
        });
      }
    },
    [commit, db, uid],
  );

  const assignCharacter = useCallback(
    (id: string, agentId: '' | AgentSlot) => {
      const before = current.current;
      const next = assignAgent(before, id, agentId, Date.now());
      if (next === before) return;
      commit(next);
      for (const entry of next) {
        const old = before.find((item) => item.id === entry.id);
        if (old && old.agentId !== entry.agentId) mirror(entry);
      }
    },
    [commit, mirror],
  );

  const looks = useMemo(() => looksByAgent(characters), [characters]);

  return useMemo(
    () => ({ characters, looks, note, saveCharacter, removeCharacter, assignCharacter }),
    [characters, looks, note, saveCharacter, removeCharacter, assignCharacter],
  );
}
