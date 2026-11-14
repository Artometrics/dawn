'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { bootFirebase } from '@/lib/firebase-client';
import { decodeDesk, encodeDesk, loadDesk, parsePayload, saveDesk, type DeskKind } from '@/lib/desks/store';

/**
 * A desk lives on this phone first. When Firebase Auth has a user, the same
 * envelope is mirrored to users/{uid}/desks/{kind} on the Dawn project.
 */
export function useDeskStore<T>(kind: DeskKind, parse: (raw: unknown) => T, empty: T) {
  const [value, setValue] = useState<T>(empty);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const stamp = useRef(0);

  const replace = useCallback((next: T) => {
    const updatedAt = Date.now();
    const envelope = encodeDesk(kind, next, updatedAt);
    if (!envelope) {
      setNote('That desk is too large to keep.');
      return;
    }
    const saved = saveDesk(window.localStorage, envelope);
    if (!saved.ok) {
      setNote(saved.error);
      return;
    }
    stamp.current = updatedAt;
    setValue(next);
    setNote(null);
    void mirror(kind, envelope);
  }, [kind]);

  useEffect(() => {
    let stopAuth = () => {};
    let stopDoc = () => {};
    let cancelled = false;
    const local = loadDesk(window.localStorage, kind);
    if (local) stamp.current = local.updatedAt;
    // localStorage is not available during static render, so the saved desk is applied after hydration.
    queueMicrotask(() => {
      if (cancelled) return;
      if (local) setValue(parse(parsePayload(local.payload)));
      setReady(true);
    });
    void (async () => {
      try {
        const boot = await bootFirebase();
        if (cancelled || !boot.auth || !boot.db) return;
        const db = boot.db;
        const { onAuthStateChanged } = await import('firebase/auth');
        const { doc, onSnapshot, setDoc } = await import('firebase/firestore');
        stopAuth = onAuthStateChanged(
          boot.auth,
          (user) => {
            stopDoc();
            if (!user) return;
            const ref = doc(db, 'users', user.uid, 'desks', kind);
            stopDoc = onSnapshot(
              ref,
              (snap) => {
                if (!snap.exists()) {
                  const current = loadDesk(window.localStorage, kind);
                  if (current) void setDoc(ref, current).catch(() => setNote('Saved on this phone.'));
                  return;
                }
                const remote = decodeDesk(snap.data(), kind);
                if (!remote || remote.updatedAt <= stamp.current) return;
                stamp.current = remote.updatedAt;
                saveDesk(window.localStorage, remote);
                setValue(parse(parsePayload(remote.payload)));
              },
              () => setNote('Saved on this phone.'),
            );
          },
          () => undefined,
        );
      } catch {
        if (!cancelled) setNote('Saved on this phone.');
      }
    })();
    return () => {
      cancelled = true;
      stopAuth();
      stopDoc();
    };
  }, [kind, parse]);

  return { value, ready, note, replace, setNote };
}

async function mirror(kind: DeskKind, envelope: { kind: DeskKind; payload: string; updatedAt: number }) {
  try {
    const boot = await bootFirebase();
    const user = boot.auth?.currentUser;
    if (!boot.db || !user) return;
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(boot.db, 'users', user.uid, 'desks', kind), envelope);
  } catch {
    /* the phone copy is already saved */
  }
}
