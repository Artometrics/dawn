'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth';
import { agentById } from '@/lib/agents';
import { bootFirebase, displayNameOf, type DawnMode } from '@/lib/firebase-client';
import type { ActionKind } from '@/lib/proposals';

const LOCAL_KEY = 'dawn.village.v1';

export type Quest = {
  id: string;
  title: string;
  note: string;
  status: 'active' | 'done';
  milestones: { label: string; done: boolean }[];
  createdAt: number;
  updatedAt: number;
};

export type Approval = {
  id: string;
  agentId: 'trinity' | 'kali' | 'nimbus';
  kind: ActionKind;
  summary: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: number;
  updatedAt: number;
};

export type Memory = {
  id: string;
  agentId: 'trinity' | 'kali' | 'nimbus';
  text: string;
  createdAt: number;
  importance?: number;
  kind?: 'conversation' | 'reflection' | 'observation';
};

type DawnUser = { uid: string; name: string };

type DawnContextValue = {
  ready: boolean;
  mode: DawnMode;
  user: DawnUser | null;
  name: string;
  avatar: number;
  authError: string | null;
  note: string | null;
  quests: Quest[];
  approvals: Approval[];
  memories: Memory[];
  signInLocal: (name: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setAvatar: (avatar: number) => void;
  setName: (name: string) => void;
  remember: (
    agentId: Memory['agentId'],
    text: string,
    extra?: { importance?: number; kind?: Memory['kind'] },
  ) => void;
  addApproval: (approval: Approval) => Promise<void>;
  decide: (id: string, status: 'approved' | 'declined') => Promise<void>;
  saveQuest: (quest: Quest) => void;
  clearDesk: () => Promise<void>;
};

const DawnContext = createContext<DawnContextValue | null>(null);

function loadLocal(): { name: string; avatar: number; quests: Quest[]; approvals: Approval[]; memories: Memory[] } {
  if (typeof window === 'undefined') {
    return { name: 'You', avatar: 0, quests: [], approvals: [], memories: [] };
  }
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { name: 'You', avatar: 0, quests: [], approvals: [], memories: [] };
    const parsed = JSON.parse(raw) as Partial<{ name: string; avatar: number; quests: Quest[]; approvals: Approval[]; memories: Memory[] }>;
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.slice(0, 40) : 'You',
      avatar: parsed.avatar === 1 || parsed.avatar === 2 ? parsed.avatar : 0,
      quests: Array.isArray(parsed.quests) ? parsed.quests : [],
      approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
      memories: Array.isArray(parsed.memories) ? parsed.memories : [],
    };
  } catch {
    return { name: 'You', avatar: 0, quests: [], approvals: [], memories: [] };
  }
}

export function DawnProvider({ children }: { children: ReactNode }) {
  const initial = loadLocal();
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<DawnMode>('offline');
  const [user, setUser] = useState<DawnUser | null>(null);
  const [name, setNameState] = useState(initial.name);
  const [avatar, setAvatarState] = useState(initial.avatar);
  const [quests, setQuests] = useState<Quest[]>(initial.quests);
  const [approvals, setApprovals] = useState<Approval[]>(initial.approvals);
  const [memories, setMemories] = useState<Memory[]>(initial.memories);
  const [authError, setAuthError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ name, avatar, quests, approvals, memories }));
  }, [name, avatar, quests, approvals, memories]);

  useEffect(() => {
    let unsubAuth = () => {};
    let unsubQuests = () => {};
    let unsubApprovals = () => {};
    let unsubMemories = () => {};
    let cancelled = false;

    void bootFirebase().then((boot) => {
      if (cancelled) return;
      setMode(boot.mode);
      setAuth(boot.auth);
      setDb(boot.db);
      setReady(true);
      if (boot.mode === 'hosted' && boot.auth) {
        void getRedirectResult(boot.auth).catch((error: unknown) => {
          setAuthError(error instanceof Error ? error.message : 'Google sign-in failed.');
        });
      }
      if (!boot.auth) return;
      unsubAuth = onAuthStateChanged(boot.auth, (next) => {
        if (!next) {
          setUser(null);
          return;
        }
        const person = { uid: next.uid, name: displayNameOf(next, name) };
        setUser(person);
        if (next.displayName) setNameState(person.name);
      });
    });

    return () => {
      cancelled = true;
      unsubAuth();
      unsubQuests();
      unsubApprovals();
      unsubMemories();
    };
    // name is only a fallback for the first auth event
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!db || !user) return;
    void setDoc(
      doc(db, 'users', user.uid),
      { name: name.trim().slice(0, 40) || 'You', avatar, updatedAt: Date.now() },
      { merge: true },
    ).catch(() => {
      setAuthError('Could not save your profile.');
    });
  }, [db, user, name, avatar]);

  useEffect(() => {
    if (!db || !user) return;
    let cancelled = false;
    const stops: Array<() => void> = [];

    void (async () => {
      const questSnap = await getDocs(collection(db, 'users', user.uid, 'quests'));
      if (questSnap.empty) {
        const seed = loadLocal();
        await Promise.all([
          ...seed.quests.map((quest) => setDoc(doc(db, 'users', user.uid, 'quests', quest.id), quest).catch(() => undefined)),
          ...seed.approvals
            .filter((item) => item.status === 'pending')
            .map((item) => setDoc(doc(db, 'users', user.uid, 'approvals', item.id), item).catch(() => undefined)),
          ...seed.memories.map((item) => setDoc(doc(db, 'users', user.uid, 'memories', item.id), item).catch(() => undefined)),
        ]);
      }
      if (cancelled) return;
      stops.push(onSnapshot(collection(db, 'users', user.uid, 'quests'), (snap) => {
        setQuests(snap.docs.map((item) => item.data() as Quest).sort((a, b) => b.updatedAt - a.updatedAt));
      }));
      stops.push(onSnapshot(collection(db, 'users', user.uid, 'approvals'), (snap) => {
        setApprovals(snap.docs.map((item) => item.data() as Approval).sort((a, b) => b.createdAt - a.createdAt));
      }));
      stops.push(onSnapshot(collection(db, 'users', user.uid, 'memories'), (snap) => {
        setMemories(snap.docs.map((item) => item.data() as Memory).sort((a, b) => a.createdAt - b.createdAt));
      }));
    })();

    return () => {
      cancelled = true;
      stops.forEach((stop) => stop());
    };
  }, [db, user]);

  const signInLocal = useCallback(async (rawName: string) => {
    if (!auth || mode !== 'emulator') return;
    const clean = rawName.trim().slice(0, 40);
    if (clean.length < 2) {
      setAuthError('Use at least 2 letters.');
      return;
    }
    setAuthError(null);
    const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'guest';
    const email = `${slug}@dawn.local`;
    const password = 'local-emulator';
    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: clean });
      setNameState(clean);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in failed.');
    }
  }, [auth, mode]);

  const signInGoogle = useCallback(async () => {
    if (!auth || mode !== 'hosted') return;
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const narrow = window.matchMedia('(max-width: 800px)').matches;
      if (narrow) await signInWithRedirect(auth, provider);
      else await signInWithPopup(auth, provider);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign-in failed.');
    }
  }, [auth, mode]);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, [auth]);

  const setAvatar = useCallback((next: number) => {
    setAvatarState(next === 1 || next === 2 ? next : 0);
  }, []);

  const setName = useCallback((next: string) => {
    setNameState(next.slice(0, 40));
  }, []);

  const remember = useCallback((
    agentId: Memory['agentId'],
    text: string,
    extra?: { importance?: number; kind?: Memory['kind'] },
  ) => {
    const memory: Memory = {
      id: crypto.randomUUID(),
      agentId,
      text: text.replace(/\s+/g, ' ').trim().slice(0, 400),
      createdAt: Date.now(),
      ...(extra?.importance !== undefined ? { importance: extra.importance } : {}),
      ...(extra?.kind ? { kind: extra.kind } : {}),
    };
    if (!memory.text) return;
    setMemories((current) => [...current, memory].slice(-40));
    if (db && user) {
      void setDoc(doc(db, 'users', user.uid, 'memories', memory.id), memory).catch(() => {
        setNote('Memory stayed on this phone.');
      });
    }
  }, [db, user]);

  const addApproval = useCallback(async (approval: Approval) => {
    if (db && user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'approvals', approval.id), approval);
      } catch {
        setNote('That request stayed on this phone.');
      }
    }
    setApprovals((current) => [approval, ...current.filter((item) => item.id !== approval.id)]);
  }, [db, user]);

  const saveQuest = useCallback((quest: Quest) => {
    setQuests((current) => {
      const rest = current.filter((item) => item.id !== quest.id);
      return [quest, ...rest];
    });
    if (db && user) {
      void setDoc(doc(db, 'users', user.uid, 'quests', quest.id), quest).catch(() => {
        setNote('Quest stayed on this phone.');
      });
    }
  }, [db, user]);

  const decide = useCallback(async (id: string, status: 'approved' | 'declined') => {
    const current = approvals.find((item) => item.id === id);
    if (!current || current.status !== 'pending') return;
    const next: Approval = { ...current, status, updatedAt: Date.now() };
    setApprovals((list) => list.map((item) => (item.id === id ? next : item)));
    setNote(null);

    if (db && user) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'approvals', id), {
          status,
          updatedAt: next.updatedAt,
        });
      } catch {
        setApprovals((list) => list.map((item) => (item.id === id ? current : item)));
        setNote('Could not save that decision.');
        return;
      }
    }

    if (status === 'declined') {
      setNote('Declined. Nothing went out.');
      return;
    }

    if (current.kind === 'spend') {
      setNote('Approved. Nothing was spent.');
      return;
    }
    if (current.kind === 'hire') {
      setNote('Approved. Nobody was hired.');
      return;
    }

    if (!db || !user) {
      setNote('Approved on this phone. Sign in to post it to the room.');
      return;
    }

    try {
      await setDoc(doc(db, 'rooms', 'hq'), {
        title: 'hq',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Room already exists. Another signed-in person may have opened it.
    }

    try {
      await setDoc(doc(db, 'rooms', 'hq', 'members', user.uid), {
        name: name.slice(0, 40) || 'You',
        joinedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'rooms', 'hq', 'messages'), {
        uid: user.uid,
        name: name.slice(0, 40) || 'You',
        text: current.summary,
        via: current.agentId,
        approvalId: current.id,
        createdAt: serverTimestamp(),
      });
      const agent = agentById(current.agentId);
      setNote(`${agent?.name ?? 'Agent'} posted to the room.`);
    } catch {
      setNote('Approved, but the room refused the post.');
    }
  }, [approvals, db, name, user]);

  const clearDesk = useCallback(async () => {
    setQuests([]);
    setApprovals([]);
    setMemories([]);
    if (!db || !user) return;
    const paths = ['quests', 'approvals', 'memories'] as const;
    for (const path of paths) {
      const snap = await getDocs(collection(db, 'users', user.uid, path));
      await Promise.all(snap.docs.map((item) => deleteDoc(item.ref)));
    }
  }, [db, user]);

  const value = useMemo<DawnContextValue>(() => ({
    ready,
    mode,
    user,
    name,
    avatar,
    authError,
    note,
    quests,
    approvals,
    memories,
    signInLocal,
    signInGoogle,
    signOut,
    setAvatar,
    setName,
    remember,
    addApproval,
    decide,
    saveQuest,
    clearDesk,
  }), [
    ready, mode, user, name, avatar, authError, note, quests, approvals, memories,
    signInLocal, signInGoogle, signOut, setAvatar, setName, remember, addApproval, decide, saveQuest, clearDesk,
  ]);

  return <DawnContext.Provider value={value}>{children}</DawnContext.Provider>;
}

export function useDawn(): DawnContextValue {
  const value = useContext(DawnContext);
  if (!value) throw new Error('useDawn must be used inside DawnProvider');
  return value;
}
