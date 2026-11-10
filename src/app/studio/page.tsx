'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
  Bot, 
  Code2, 
  FileCode, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Zap, 
  ChevronDown,
  Layers,
  SquareCode,
  Users,
  Brain,
  Plus,
  Terminal,
  Settings,
  GitBranch,
  FolderGit2,
  Folder,
  Flame,
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Smartphone,
  Monitor,
  Maximize2,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Mic,
  Laptop,
  CheckCircle2,
  Lock,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Command,
  LayoutGrid,
  X,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  MessageSquare,
  Bell,
  Clock,
  Compass,
  Smile,
  Paperclip,
  Share2,
  Star,
  Activity,
  Bookmark,
  Hash,
  AtSign,
  Play,
  Moon,
  Sun,
  Headphones,
  Home
} from 'lucide-react';
import { Teammate, DEFAULT_TEAMMATES } from '@/types/teammate';
import { TeammateDialog } from '@/components/teammate-dialog';
import { ChatAvatar } from '@/components/chat-avatar';
import { api, gatewayBase } from '@/components/dawn-agents/api';
import { bootFirebase } from '@/lib/firebase-client';
import { probeDesk } from '@/lib/home/town-action';
import { streamStudioChat } from '@/lib/studio/client-chat';
import { studioSendMode } from '@/lib/studio/send-mode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Monaco editor dynamic import
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  authorName?: string;
  authorAvatar?: string;
  timestamp?: string;
  reactions?: { emoji: string; count: number; userReacted?: boolean }[];
  commandSnippet?: {
    title: string;
    command: string;
    status: 'success' | 'running' | 'error';
  };
}

interface WorkspaceTab {
  id: string;
  type: 'browser' | 'editor';
  title: string;
  url?: string;
}

const INITIAL_CODE = `// Welcome to Dawn Studio (Artometrics)
// Unified Claude + Slack + Grok Bot workspace

export async function startServer(port: number = 3000) {
  console.log(\`Starting Dawn Agent service on port \${port}...\`);
  return {
    status: 200,
    url: \`http://localhost:\${port}\`,
    ready: true,
  };
}
`;

export default function DawnStudio() {
  // Navigation & Rail State
  const [activeNavRail, setActiveNavRail] = useState<'home' | 'bots' | 'activity' | 'files' | 'code'>('bots');
  const [claudeTopPill, setClaudeTopPill] = useState<'home' | 'code'>('home');
  const [claudeMode, setClaudeMode] = useState<'chat' | 'cowork'>('chat');
  const [rightPanelTab, setRightPanelTab] = useState<'details' | 'library' | 'computer' | 'editor'>('computer');

  // Search Bar / Command Palette
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Panel toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isComputerAwake, setIsComputerAwake] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [mobilePane, setMobilePane] = useState<'chat' | 'computer' | 'project'>('chat');
  const [hostNote, setHostNote] = useState('');
  const [projects, setProjects] = useState<{ id: string; title: string }[] | null>(null);

  // Teammates / Grok Bots
  const [teammates, setTeammates] = useState<Teammate[]>(DEFAULT_TEAMMATES);
  const [activeTeammateId, setActiveTeammateId] = useState<string>('trinity');
  const [isTeammateDialogOpen, setIsTeammateDialogOpen] = useState(false);
  const [editingTeammate, setEditingTeammate] = useState<Teammate | null>(null);
  const activeTeammate = teammates.find((t) => t.id === activeTeammateId) || teammates[0];

  // Browser & Code tabs
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
    { id: 'tab-browser', type: 'browser', title: 'AI-Enabled :3000', url: 'http://localhost:3000' },
    { id: 'tab-editor', type: 'editor', title: 'page.tsx (Monaco)' },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-browser');
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const [browserUrl, setBrowserUrl] = useState('http://localhost:3000');
  const [inputUrl, setInputUrl] = useState('http://localhost:3000');
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [editorCode, setEditorCode] = useState(INITIAL_CODE);
  const [iframeKey, setIframeKey] = useState(0);

  // Chat conversation
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      role: 'assistant',
      authorName: 'TRINITY',
      content:
        "Cursor's own numbers back this up. To get heavy usage on Teams, you'd need the $120 Premium seat, which costs more than Pro+. For a team of just you, those business features don't help, so Pro+ gets you more usage for the money.",
      timestamp: 'Yesterday at 4:32 PM',
      reactions: [{ emoji: '🔥', count: 3 }],
    },
    {
      id: 'm-2',
      role: 'user',
      content:
        'can you convert the account to a team account later? like if i sign up for pro with team@artometrics.com, could i buy a team plan later?',
      timestamp: 'Yesterday at 4:34 PM',
    },
    {
      id: 'm-3',
      role: 'assistant',
      authorName: 'TRINITY',
      content:
        "Yes, you can start on Pro and create a Teams plan later from the Cursor dashboard. Your account stays the same, and Teams just becomes your plan.\n\nOne tip: sign up with your own address, like kyle@artometrics.com, rather than team@. Each Teams seat belongs to one person, so a shared-sounding email can get confusing once you add people. I'd confirm the exact switch steps with Cursor support when you're ready, since I haven't checked their current upgrade flow.",
      timestamp: 'Yesterday at 4:35 PM',
      reactions: [
        { emoji: '👏', count: 2 },
        { emoji: '🚀', count: 4 },
      ],
    },
    {
      id: 'm-4',
      role: 'user',
      content:
        'but lets say i have 3 employees who need cursor or something, we can all be logged in no? like we are building our own company clone of grok bots and cursor',
      timestamp: 'Yesterday at 4:40 PM',
    },
    {
      id: 'm-5',
      role: 'assistant',
      authorName: 'TRINITY',
      content:
        "Not on one shared login. Cursor plans are per person, so sharing one account between 4 people breaks Cursor's terms. Everyone would also be pulling from the same weekly usage, which would run out fast.\n\nWith 3 employees, get Cursor Teams with 4 seats, one each. That's $160 a month on Standard seats, or you can mix in Premium seats for whoever codes the most. Everyone gets their own Cursor and Grok Bot login and their own usage, and you manage billing in one place. Since they'll be building your DAWN product with it, that's exactly what Teams is for.",
      timestamp: 'Yesterday at 4:42 PM',
      reactions: [{ emoji: '🎉', count: 6 }],
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const base = await gatewayBase();
      const status = await probeDesk(fetch, `${base}/api/state`);
      if (status !== 'ready') {
        if (!cancel) setProjects([]);
        return;
      }
      try {
        const state = await api<{ articles?: { id: string; title: string }[] }>(base, '/api/state');
        if (!cancel) setProjects((state.articles ?? []).filter((item) => item.title.trim()));
      } catch {
        if (!cancel) setProjects([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)');
    const apply = () => {
      setNarrow(media.matches);
      if (media.matches) {
        setIsSidebarOpen(false);
        setIsRightPanelOpen(false);
      }
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  // Keyboard shortcut for Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefreshBrowser = () => {
    setBrowserUrl(inputUrl);
    setIframeKey((prev) => prev + 1);
  };

  const handleCloseTab = (tabIdToClose: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const remaining = tabs.filter((t) => t.id !== tabIdToClose);
    if (remaining.length === 0) {
      setIsRightPanelOpen(false);
      setTabs([]);
    } else {
      setTabs(remaining);
      if (activeTabId === tabIdToClose) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isLoading) return;
    const boot = await bootFirebase();
    if (studioSendMode(boot.mode) !== 'provider' || !boot.app) {
      setHostNote('A model is not connected on this host. Nothing was sent.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt.trim(),
      timestamp: 'Just now',
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setHostNote('');
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        authorName: activeTeammate.name,
        content: '',
        timestamp: 'Just now',
      },
    ]);
    try {
      await streamStudioChat(
        {
          messages: newMessages.map((item) => ({ role: item.role, content: item.content })),
          model: activeTeammate.model,
          teammate: activeTeammate,
          codeContext: {
            filename: 'page.tsx',
            language: 'typescript',
            content: editorCode,
          },
        },
        (accumulated) => {
          setMessages((prev) => prev.map((item) => (item.id === assistantId ? { ...item, content: accumulated } : item)));
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'The model did not answer.';
      setMessages((prev) => prev.map((item) => (item.id === assistantId ? { ...item, content: message } : item)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dawn-studio flex flex-col h-screen w-screen bg-[var(--dawn-sheet)] text-[var(--dawn-text)] font-sans overflow-hidden select-none">
      <h1 className="dw-sr-only">Studio</h1>
      {/* ═══════════════════════════════════════════════════════════════
          SLACK-STYLE TOP WINDOW BAR WITH GLOBAL SEARCH (IMAGE 5 STYLE)
      ═════════════════════════════════════════════════════════════════ */}
      <header className={`${narrow ? 'hidden' : 'h-11 bg-[var(--dawn-bg)] border-b border-[var(--dawn-chip)] px-3 flex items-center justify-between shrink-0 z-30'}`}>
        {/* Left: Window Traffic Lights & Navigation */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 group">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Toggle Sidebar"
              className="w-3 h-3 rounded-full bg-[#ff5f56] inline-flex items-center justify-center cursor-pointer hover:opacity-80"
            >
              <X className="w-2 h-2 text-[#4c0000] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block cursor-pointer hover:opacity-80" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block cursor-pointer hover:opacity-80" />
          </div>

          <div className="flex items-center gap-1 text-[var(--dawn-muted)]">
            <Link href="/" className="p-1 rounded hover:bg-[var(--dawn-field)] hover:text-[var(--dawn-text)] inline-flex items-center gap-1 text-xs" aria-label="Back to town">
              <ArrowLeft className="w-3.5 h-3.5" />
              Town
            </Link>
            <button type="button" aria-label="Forward" className="p-1 rounded hover:bg-[var(--dawn-field)] hover:text-[var(--dawn-text)] cursor-pointer">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button type="button" aria-label="History" className="p-1 rounded hover:bg-[var(--dawn-field)] hover:text-[var(--dawn-text)] cursor-pointer">
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Global Search Bar Area (Slack / macOS style) */}
        <div className="flex-1 max-w-xl mx-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full h-7 bg-[var(--dawn-elev)] hover:bg-[var(--dawn-field)] border border-[var(--dawn-chip)] rounded-lg px-3 flex items-center justify-between text-xs text-[var(--dawn-muted)] transition-all cursor-pointer shadow-inner"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[var(--dawn-accent)]" />
              <span className="truncate">Search Dawn, Grok Bots & Code...</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--dawn-muted)] bg-[var(--dawn-sheet)] px-1.5 py-0.5 rounded border border-[var(--dawn-chip)]">
              <span>⌘</span>
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Right: Workspace switcher, Help, User */}
        <div className="flex items-center gap-2 justify-end">
          <button 
            onClick={() => setIsTeammateDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[var(--dawn-secondary)] bg-[var(--dawn-field)] hover:bg-[var(--dawn-chip)] border border-[var(--dawn-chip)] px-2.5 py-1 rounded-md cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--dawn-accent)]" />
            <span className="font-medium text-xs">Configure Bots</span>
          </button>

          <button 
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            title="Toggle Right Panel"
            className="p-1.5 rounded-md hover:bg-[var(--dawn-field)] text-[var(--dawn-muted)] hover:text-[var(--dawn-text)] cursor-pointer"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN APPLICATION WORKSPACE (SLACK RAIL + SIDEBAR + CHAT + COMPUTER)
      ═════════════════════════════════════════════════════════════════ */}
      {narrow && (
        <div className="flex shrink-0 border-b border-[var(--dawn-chip)] bg-[var(--dawn-bg)]">
          <Link href="/" className="px-3 py-3 text-sm text-[var(--dawn-text)]">Town</Link>
          {(['chat', 'computer', 'project'] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              onClick={() => setMobilePane(pane)}
              className={`flex-1 py-3 text-sm capitalize ${mobilePane === pane ? 'text-[var(--dawn-text)]' : 'text-[var(--dawn-muted)]'}`}
            >
              {pane === 'project' ? 'Project' : pane === 'computer' ? 'Computer' : 'Chat'}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 flex overflow-hidden relative min-w-0">
        {/* ─────────────────────────────────────────────────────────────
            FAR-LEFT SLACK-STYLE VERTICAL ACTIVITY RAIL (MORE ICONS, LESS TEXT)
        ───────────────────────────────────────────────────────────────── */}
        <nav className={`${narrow ? 'hidden' : 'w-14'} bg-[var(--dawn-bg)] border-r border-[var(--dawn-field)] flex flex-col items-center py-3 justify-between shrink-0 z-20`}>
          {/* Top App / Workspace Badge */}
          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={() => {
                setClaudeTopPill('home');
                setActiveNavRail('home');
              }}
              title="Dawn Studio Home"
              className="size-9 rounded-xl bg-[var(--dawn-accent)] flex items-center justify-center text-[var(--dawn-ink)] shadow-md cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="font-serif font-black text-lg">✳</span>
            </button>

            {/* Navigation Icons Strip */}
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <button
                onClick={() => {
                  setActiveNavRail('home');
                  setClaudeTopPill('home');
                }}
                title="Home (Claude Evening Thoughts)"
                className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                  activeNavRail === 'home'
                    ? 'bg-[var(--dawn-field)] text-[var(--dawn-accent)] shadow-sm'
                    : 'text-[var(--dawn-muted)] hover:bg-[var(--dawn-elev)] hover:text-[var(--dawn-text)]'
                }`}
              >
                <span className="text-sm font-serif">🏠</span>
              </button>

              <button
                onClick={() => setActiveNavRail('bots')}
                title="Grok Bots & Teammates"
                className={`relative p-2.5 rounded-xl cursor-pointer transition-all ${
                  activeNavRail === 'bots'
                    ? 'bg-[var(--dawn-field)] text-[var(--dawn-accent)] shadow-sm'
                    : 'text-[var(--dawn-muted)] hover:bg-[var(--dawn-elev)] hover:text-[var(--dawn-text)]'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--dawn-accent)]" />
              </button>

              <button
                onClick={() => {
                  setClaudeTopPill('code');
                  setRightPanelTab('editor');
                  setIsRightPanelOpen(true);
                }}
                title="Code Editor / IDE"
                className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                  claudeTopPill === 'code'
                    ? 'bg-[var(--dawn-field)] text-[var(--dawn-accent)]'
                    : 'text-[var(--dawn-muted)] hover:bg-[var(--dawn-elev)] hover:text-[var(--dawn-text)]'
                }`}
              >
                <Code2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setRightPanelTab('computer');
                  setIsRightPanelOpen(true);
                }}
                title="Live Browser & Computer Preview"
                className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                  rightPanelTab === 'computer' && isRightPanelOpen
                    ? 'bg-[var(--dawn-field)] text-[var(--dawn-accent)]'
                    : 'text-[var(--dawn-muted)] hover:bg-[var(--dawn-elev)] hover:text-[var(--dawn-text)]'
                }`}
              >
                <Globe className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveNavRail('activity')}
                title="Activity & Mentions"
                className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                  activeNavRail === 'activity'
                    ? 'bg-[var(--dawn-field)] text-[var(--dawn-accent)]'
                    : 'text-[var(--dawn-muted)] hover:bg-[var(--dawn-elev)] hover:text-[var(--dawn-text)]'
                }`}
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Icons: Settings & User Profile */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                setEditingTeammate(activeTeammate);
                setIsTeammateDialogOpen(true);
              }}
              title="Settings"
              className="p-2.5 rounded-xl text-[var(--dawn-muted)] hover:bg-[var(--dawn-elev)] hover:text-[var(--dawn-text)] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Profile Avatar */}
            <div 
              title="Kyle"
              className="size-8 rounded-full bg-[var(--dawn-accent)] flex items-center justify-center text-xs font-bold text-[var(--dawn-ink)] shadow-inner cursor-pointer"
            >
              K
            </div>
          </div>
        </nav>

        {/* ─────────────────────────────────────────────────────────────
            COLUMN 1: GROK BOTS & CHANNELS SIDEBAR (IMAGE 4 & 5 STYLE)
        ───────────────────────────────────────────────────────────────── */}
        {(narrow ? mobilePane === 'project' : isSidebarOpen) && (
          <aside className={`${narrow ? 'absolute inset-0 z-40 w-full' : 'w-64'} bg-[var(--dawn-sheet)] border-r border-[var(--dawn-chip)] flex flex-col shrink-0`}>
            {/* Claude-style Mode Switcher: [ Home ] vs [ </> Code ] */}
            <div className="p-2.5 border-b border-[var(--dawn-chip)]">
              <div className="grid grid-cols-2 bg-[var(--dawn-field)] p-0.5 rounded-lg text-xs font-medium text-[var(--dawn-muted)]">
                <button
                  onClick={() => setClaudeTopPill('home')}
                  className={`flex items-center justify-center gap-1.5 py-1 rounded-md transition-all cursor-pointer ${
                    claudeTopPill === 'home'
                      ? 'bg-[var(--dawn-chip)] text-[var(--dawn-text)] shadow-sm'
                      : 'hover:text-[var(--dawn-text)]'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => {
                    setClaudeTopPill('code');
                    setRightPanelTab('editor');
                    setIsRightPanelOpen(true);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1 rounded-md transition-all cursor-pointer ${
                    claudeTopPill === 'code'
                      ? 'bg-[var(--dawn-chip)] text-[var(--dawn-text)] shadow-sm'
                      : 'hover:text-[var(--dawn-text)]'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Code</span>
                </button>
              </div>
            </div>

            {/* Active Highlighted Grok Bot Banner (Trinity from image 4) */}
            <div className="p-3 mx-2 mt-2 bg-[var(--dawn-field)] rounded-xl border border-[var(--dawn-chip)] flex items-center gap-3 shadow-sm">
              <div className="relative size-10 rounded-full bg-[var(--dawn-pill)] flex items-center justify-center text-[var(--dawn-ink)] shrink-0 shadow">
                {/* Minimalist Trinity Bot Eyes */}
                <div className="w-6 h-6 rounded-full bg-[var(--dawn-pill)] flex items-center justify-center relative">
                  <span className="w-1.5 h-3.5 bg-black rounded-full absolute left-1 rotate-12" />
                  <span className="w-1.5 h-3.5 bg-black rounded-full absolute right-1 rotate-12" />
                </div>
                <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-[var(--dawn-accent)] flex items-center justify-center text-[9px] text-[var(--dawn-ink)] font-bold">
                  ★
                </div>
              </div>
              <div className="truncate flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--dawn-text)]">
                  <span>TRINITY</span>
                </div>
                <span className="text-[11px] text-[var(--dawn-muted)] truncate block">Autonomous Bot</span>
              </div>
              <button 
                onClick={() => {
                  setEditingTeammate(teammates.find(t => t.id === 'trinity') || activeTeammate);
                  setIsTeammateDialogOpen(true);
                }}
                className="text-[var(--dawn-muted)] hover:text-[var(--dawn-text)]"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Grok Bots Channel Roster (Image 4 exact list) */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 text-xs">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[var(--dawn-muted)] uppercase tracking-wider">
                <span>Grok Bots</span>
                <button 
                  onClick={() => {
                    setEditingTeammate(null);
                    setIsTeammateDialogOpen(true);
                  }}
                  className="hover:text-[var(--dawn-text)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {teammates.map((t) => {
                const isSelected = activeTeammateId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTeammateId(t.id)}
                    className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-[var(--dawn-field)] border border-[var(--dawn-grip)] text-[var(--dawn-text)] shadow-sm'
                        : 'text-[var(--dawn-muted)] hover:bg-[var(--dawn-elev)] hover:text-[var(--dawn-text)]'
                    }`}
                  >
                    {/* Bot Avatar Icon */}
                    <div className="relative shrink-0">
                      <ChatAvatar seed={t.avatarSeed} className="size-7 ring-1 ring-border/30 rounded-full" />
                      <span 
                        className="absolute bottom-0 right-0 size-2 rounded-full ring-1 ring-[var(--dawn-sheet)]"
                        style={{ backgroundColor: t.accentColor }} 
                      />
                    </div>

                    {/* Bot Info */}
                    <div className="flex-1 truncate">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--dawn-text)] truncate">{t.name}</span>
                        {t.unreadCount && (
                          <span className="text-[10px] bg-[var(--dawn-accent)] text-[var(--dawn-text)] px-1.5 py-0.2 rounded-full font-bold">
                            +{t.unreadCount}
                          </span>
                        )}
                        {t.badge && (
                          <span className="text-[9px] bg-[var(--dawn-chip)] text-[var(--dawn-secondary)] px-1.5 py-0.2 rounded font-medium">
                            {t.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--dawn-muted)] truncate mt-0.5">
                        {t.statusText || t.role}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Pinned Projects Section (Claude Image 1 style) */}
              <div className="pt-3">
                <div className="px-2 py-1 text-[11px] font-semibold text-[var(--dawn-muted)] uppercase tracking-wider">
                  Pinned
                </div>
                <div className="space-y-0.5 mt-1 text-[var(--dawn-muted)]">
                  {projects === null && <p className="px-2 py-1.5 text-[11px]">Checking the desk…</p>}
                  {projects?.length === 0 && <p className="px-2 py-1.5 text-[11px] leading-snug">No project files are stored on this host.</p>}
                  {projects?.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--dawn-elev)] cursor-pointer text-left"
                      onClick={() => setHostNote(`${project.title} is on the desk. This page does not copy the file.`)}
                    >
                      <Folder className="w-3.5 h-3.5 text-[var(--dawn-accent)]" />
                      <span>{project.title}</span>
                    </button>
                  ))}
                </div>
                {hostNote && <p role="status" className="px-2 pt-3 text-[11px] leading-snug text-[var(--dawn-text)]">{hostNote}</p>}
              </div>
            </div>

            {/* Bottom Footer: Connect apps / Settings */}
            <div className="p-3 border-t border-[var(--dawn-chip)] bg-[var(--dawn-bg)] flex items-center justify-between text-xs text-[var(--dawn-muted)]">
              <div className="flex items-center gap-2">
                <span className="text-[11px]">Connect apps</span>
                <span className="flex -space-x-1">
                  <span className="size-4 rounded-full bg-[var(--dawn-secondary)] inline-block ring-1 ring-[var(--dawn-sheet)]" />
                  <span className="size-4 rounded-full bg-[var(--dawn-muted)] inline-block ring-1 ring-[var(--dawn-sheet)]" />
                </span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse sidebar"
                className="hover:text-[var(--dawn-text)] p-1 rounded hover:bg-[var(--dawn-elev)] cursor-pointer"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>
          </aside>
        )}

        {/* ─────────────────────────────────────────────────────────────
            COLUMN 2: MIDDLE CHAT / CLAUDE "EVENING THOUGHTS" + COMPOSER
        ───────────────────────────────────────────────────────────────── */}
        <main className={`flex-1 flex flex-col min-w-0 border-r border-[var(--dawn-chip)] bg-[var(--dawn-sheet)] transition-all ${narrow && mobilePane !== 'chat' ? 'hidden' : ''}`}>
          {/* Thread Header (Grok / Slack style) */}
          <div className="h-11 px-4 border-b border-[var(--dawn-chip)] flex items-center justify-between text-xs bg-[var(--dawn-sheet)]/90 backdrop-blur-md">
            <div className="flex items-center gap-2 font-medium text-[var(--dawn-text)]">
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  title="Open Sidebar"
                  className="p-1 rounded text-[var(--dawn-muted)] hover:text-[var(--dawn-text)] hover:bg-[var(--dawn-field)] mr-1 cursor-pointer"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              )}
              <ChatAvatar seed={activeTeammate.avatarSeed} className="size-5 rounded-full" />
              <span className="font-bold text-sm tracking-tight">{activeTeammate.name}</span>
              <span className="text-xs text-[var(--dawn-muted)] font-normal">· {activeTeammate.role}</span>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center gap-2">
              {/* Switching pills: Chat vs Cowork (Claude style from Image 1) */}
              <div className="flex bg-[var(--dawn-field)] p-0.5 rounded-lg text-[11px]">
                <button
                  onClick={() => setClaudeMode('chat')}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    claudeMode === 'chat' ? 'bg-[var(--dawn-chip)] text-[var(--dawn-text)] shadow-sm' : 'text-[var(--dawn-muted)]'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setClaudeMode('cowork')}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    claudeMode === 'cowork' ? 'bg-[var(--dawn-chip)] text-[var(--dawn-text)] shadow-sm' : 'text-[var(--dawn-muted)]'
                  }`}
                >
                  Cowork
                </button>
              </div>

              <button
                onClick={() => {
                  setRightPanelTab('computer');
                  setIsRightPanelOpen(true);
                }}
                className="text-[var(--dawn-muted)] hover:text-[var(--dawn-text)] p-1 rounded hover:bg-[var(--dawn-field)] cursor-pointer"
                title="Open Computer View"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text">
            <p role="status" className="text-[var(--dawn-accent)]">Sample transcript. Saved in this page, not a live chat. No model is connected.</p>
            {hostNote && <p role="status">{hostNote}</p>}
            {/* Claude-style "Evening thoughts" hero title if few messages or starting clean */}
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center pb-20 text-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[var(--dawn-accent)] font-serif text-3xl">✳</span>
                  <h1 className="font-serif text-3xl text-[var(--dawn-text)] tracking-tight">Evening thoughts</h1>
                </div>
                <p className="text-xs text-[var(--dawn-muted)] max-w-sm">
                  What would you like to build or orchestrate with TRINITY and the Grok team tonight?
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className="space-y-1.5">
                {m.role === 'user' ? (
                  /* User Message Bubble (Claude / Grok rounded pill) */
                  <div className="flex justify-end">
                    <div className="bg-[var(--dawn-chip)] border border-[var(--dawn-grip)] text-[var(--dawn-text)] rounded-2xl px-4 py-2.5 max-w-[85%] text-xs leading-relaxed shadow-sm">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant Message (Slack / Grok bot formatted) */
                  <div className="flex items-start gap-3 pt-1">
                    <div className="size-8 rounded-full bg-[var(--dawn-pill)] flex items-center justify-center text-[var(--dawn-ink)] shrink-0 mt-0.5 shadow">
                      <span className="text-xs font-bold">🤖</span>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[var(--dawn-text)]">{m.authorName || activeTeammate.name}</span>
                        {m.timestamp && <span className="text-[10px] text-[var(--dawn-muted)]">{m.timestamp}</span>}
                      </div>

                      <div className="bg-[var(--dawn-elev)] border border-[var(--dawn-chip)] rounded-2xl p-3.5 text-[var(--dawn-text)] leading-relaxed whitespace-pre-wrap font-sans text-xs shadow-sm">
                        {m.content}
                      </div>

                      {/* Slack-style Reactions & Actions */}
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-[var(--dawn-muted)]">
                        {m.reactions?.map((r, i) => (
                          <span
                            key={i}
                            title="Sample reaction. Not saved."
                            className="flex items-center gap-1 bg-[var(--dawn-field)] border border-[var(--dawn-chip)] px-2 py-0.5 rounded-full text-xs"
                          >
                            <span>{r.emoji}</span>
                            <span className="font-mono text-[10px] text-[var(--dawn-muted)]">{r.count}</span>
                          </span>
                        ))}
                        <button type="button" aria-label="Add reaction" className="hover:text-[var(--dawn-text)] cursor-pointer px-1">
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(m.content, m.id)}
                          aria-label="Copy message" className="hover:text-[var(--dawn-text)] cursor-pointer px-1"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3.5 h-3.5 text-[var(--dawn-accent)]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[var(--dawn-accent)] font-mono italic pt-2">
                <span className="w-2 h-2 rounded-full bg-[var(--dawn-accent)] animate-pulse" />
                TRINITY is typing...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Floating Claude / Grok Composer Input Box (Image 1 & 4 styling) */}
          <div className="p-3 border-t border-[var(--dawn-chip)] bg-[var(--dawn-bg)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-[var(--dawn-field)] border border-[var(--dawn-chip)] rounded-2xl focus-within:border-[var(--dawn-accent)]/60 transition-colors shadow-lg overflow-hidden"
            >
              <div className="px-3.5 pt-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message ${activeTeammate.name}...`}
                  rows={2}
                  className="w-full min-h-11 bg-transparent text-xs text-[var(--dawn-text)] placeholder-[var(--dawn-muted)] focus:outline-none resize-none font-sans"
                />
              </div>

              {/* Composer Footer: Attachments, Switcher, Send Arrow */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--dawn-chip)] text-[11px] text-[var(--dawn-muted)]">
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Attach" className="p-1 hover:text-[var(--dawn-text)] cursor-pointer rounded hover:bg-[var(--dawn-chip)]">
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Model indicator */}
                  <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--dawn-muted)] bg-[var(--dawn-elev)] px-2 py-0.5 rounded border border-[var(--dawn-chip)]">
                    <span>Sample label. No model is connected.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Voice input" className="text-[var(--dawn-muted)] hover:text-[var(--dawn-text)] cursor-pointer p-1">
                    <Mic className="w-4 h-4" />
                  </button>
                  {/* Terracotta Orange Send Button (Claude signature style) */}
                  <button
                    type="submit"
                    aria-label="Send"
                    disabled={isLoading || !input.trim()}
                    className="size-7 rounded-xl bg-[var(--dawn-pill)] hover:bg-[var(--dawn-pill-hover)] disabled:opacity-40 flex items-center justify-center text-[var(--dawn-ink)] cursor-pointer shadow-md transition-all"
                  >
                    <ArrowRight className="w-3.5 h-3.5 -rotate-90 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>

        {/* ─────────────────────────────────────────────────────────────
            COLUMN 3: RIGHT PANEL (GROK "COMPUTER" & LIVE WEBVIEW / IDE)
        ───────────────────────────────────────────────────────────────── */}
        {(narrow ? mobilePane === 'computer' : isRightPanelOpen) && (
          <aside aria-label="Computer" className={`${narrow ? 'absolute inset-0 z-30 w-full' : 'flex-1 min-w-0'} flex flex-col bg-[var(--dawn-bg)] overflow-hidden transition-all border-l border-[var(--dawn-chip)]`}>
            {/* Top Header: Grok Segmented Switcher [ Details ] [ Library ] [ Computer ] [ Editor ] */}
            <div className="h-11 border-b border-[var(--dawn-chip)] bg-[var(--dawn-bg)] px-3 flex items-center justify-between text-xs">
              {/* Grok Segmented Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[var(--dawn-elev)] p-0.5 rounded-lg">
                <button
                  onClick={() => setRightPanelTab('details')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    rightPanelTab === 'details'
                      ? 'bg-[var(--dawn-chip)] text-[var(--dawn-text)] shadow-sm'
                      : 'text-[var(--dawn-muted)] hover:text-[var(--dawn-text)]'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setRightPanelTab('library')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    rightPanelTab === 'library'
                      ? 'bg-[var(--dawn-chip)] text-[var(--dawn-text)] shadow-sm'
                      : 'text-[var(--dawn-muted)] hover:text-[var(--dawn-text)]'
                  }`}
                >
                  Library
                </button>
                <button
                  onClick={() => setRightPanelTab('computer')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    rightPanelTab === 'computer'
                      ? 'bg-[var(--dawn-chip)] text-[var(--dawn-text)] shadow-sm'
                      : 'text-[var(--dawn-muted)] hover:text-[var(--dawn-text)]'
                  }`}
                >
                  Computer
                </button>
                <button
                  onClick={() => setRightPanelTab('editor')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    rightPanelTab === 'editor'
                      ? 'bg-[var(--dawn-chip)] text-[var(--dawn-text)] shadow-sm'
                      : 'text-[var(--dawn-muted)] hover:text-[var(--dawn-text)]'
                  }`}
                >
                  Code
                </button>
              </div>

              {/* Action Icons: Mobile view, Fullscreen, and Close */}
              <div className="flex items-center gap-1.5 text-[var(--dawn-muted)]">
                {rightPanelTab === 'computer' && (
                  <button
                    onClick={() => setIsMobilePreview(!isMobilePreview)}
                    title="Toggle Smartphone Mockup"
                    className={`p-1.5 rounded hover:bg-[var(--dawn-field)] hover:text-[var(--dawn-text)] cursor-pointer ${
                      isMobilePreview ? 'text-[var(--dawn-accent)] bg-[var(--dawn-field)]' : ''
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => window.open(browserUrl, '_blank')}
                  title="Open in new window"
                  className="p-1.5 rounded hover:bg-[var(--dawn-field)] hover:text-[var(--dawn-text)] cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsRightPanelOpen(false)}
                  title="Close Right Panel"
                  className="p-1.5 rounded hover:bg-[var(--dawn-field)] hover:text-[var(--dawn-text)] cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Browser Address Bar (when in computer tab) */}
            {rightPanelTab === 'computer' && (
              <div className="h-9 border-b border-[var(--dawn-chip)] bg-[var(--dawn-sheet)] px-3 flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 text-[var(--dawn-muted)]">
                  <button type="button" aria-label="Refresh" onClick={handleRefreshBrowser} className="p-1 rounded hover:text-[var(--dawn-text)] cursor-pointer">
                    <RotateCw className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 flex items-center bg-[var(--dawn-bg)] border border-[var(--dawn-chip)] rounded-md px-2 py-0.5 text-xs text-[var(--dawn-secondary)]">
                  <span className="text-[var(--dawn-muted)] mr-1.5 text-[10px]">🔒</span>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRefreshBrowser();
                    }}
                    className="w-full bg-transparent text-[var(--dawn-text)] font-mono text-[11px] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Content Pane */}
            <div className="flex-1 relative overflow-hidden bg-[var(--dawn-bg)]">
              {rightPanelTab === 'computer' ? (
                /* Grok Bot "Computer" View (Image 4 exact style) */
                !isComputerAwake ? (
                  <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center select-none">
                    <div className="size-16 rounded-full bg-[var(--dawn-elev)] border border-[var(--dawn-chip)] flex items-center justify-center mb-4 text-[var(--dawn-muted)]">
                      <Monitor className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--dawn-text)] mb-1">
                      No computer is connected.
                    </h3>
                    <p className="text-xs text-[var(--dawn-muted)] mb-5">
                      This host has no desktop to wake. Nothing here opens a remote screen.
                    </p>
                    <Button
                      onClick={() => setHostNote('No computer is connected on this host. The screen cannot wake.')}
                      className="bg-[var(--dawn-pill)] hover:bg-[var(--dawn-pill-hover)] text-[var(--dawn-ink)] text-xs font-semibold px-4 py-2 rounded-xl shadow-md cursor-pointer max-w-full"
                    >
                      Wake Up Screen
                    </Button>
                    {hostNote && <p role="status" className="text-xs text-[var(--dawn-text)] mt-4 max-w-sm">{hostNote}</p>}
                  </div>
                ) : isMobilePreview ? (
                  /* Smartphone Mockup */
                  <div className="h-full w-full flex items-center justify-center p-6 bg-[var(--dawn-bg)] overflow-y-auto">
                    <div className="w-[360px] h-[680px] rounded-[44px] bg-black p-3 shadow-2xl ring-1 ring-white/10 relative flex flex-col shrink-0">
                      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-20 flex items-center justify-between px-2" />
                      <div className="flex-1 rounded-[34px] overflow-hidden bg-white relative">
                        <iframe
                          key={iframeKey}
                          src={browserUrl}
                          title="Mobile Preview"
                          className="w-full h-full border-0"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Live Full Webview */
                  <iframe
                    key={iframeKey}
                    src={browserUrl}
                    title="Computer Screen Preview"
                    className="w-full h-full border-0 bg-white"
                  />
                )
              ) : rightPanelTab === 'editor' ? (
                /* Monaco Code Editor */
                <MonacoEditor
                  height="100%"
                  theme="vs-dark"
                  language="typescript"
                  value={editorCode}
                  onChange={(value) => setEditorCode(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              ) : rightPanelTab === 'details' ? (
                /* Bot Details & Memory */
                <div className="p-6 space-y-4 overflow-y-auto h-full text-xs text-[var(--dawn-secondary)]">
                  <div className="flex items-center gap-3 pb-4 border-b border-[var(--dawn-chip)]">
                    <ChatAvatar seed={activeTeammate.avatarSeed} className="size-12 rounded-full" />
                    <div>
                      <h2 className="text-base font-bold text-[var(--dawn-text)]">{activeTeammate.name}</h2>
                      <p className="text-xs text-[var(--dawn-muted)]">{activeTeammate.role}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-[var(--dawn-text)] mb-2">Instructions</h4>
                    <p className="bg-[var(--dawn-sheet)] p-3 rounded-xl border border-[var(--dawn-chip)] leading-relaxed">
                      {activeTeammate.instructions}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-[var(--dawn-text)] mb-2">Persistent Memories</h4>
                    <ul className="space-y-1.5">
                      {activeTeammate.memory.map((m, i) => (
                        <li key={i} className="bg-[var(--dawn-sheet)] px-3 py-2 rounded-lg border border-[var(--dawn-chip)] text-[11px]">
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                /* Library View */
                <div className="p-6 text-center text-xs text-[var(--dawn-muted)]">
                  <Folder className="w-8 h-8 mx-auto mb-2 text-[var(--dawn-accent)]" />
                  <p>Artifacts, logs, and screenshots library for {activeTeammate.name}.</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          GLOBAL COMMAND PALETTE / SEARCH MODAL (CMD+K)
      ═════════════════════════════════════════════════════════════════ */}
      {isSearchOpen && (
        <div 
          onClick={() => setIsSearchOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-24"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-[560px] bg-[var(--dawn-elev)] border border-[var(--dawn-grip)] rounded-2xl shadow-2xl overflow-hidden text-xs"
          >
            {/* Search Input Bar */}
            <div className="p-3 border-b border-[var(--dawn-chip)] flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--dawn-accent)]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bots, channels, commands, or code..."
                className="w-full bg-transparent text-sm text-[var(--dawn-text)] placeholder-[var(--dawn-muted)] focus:outline-none"
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="text-[var(--dawn-muted)] hover:text-[var(--dawn-text)] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Switcher Results */}
            <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-bold text-[var(--dawn-muted)] uppercase tracking-wider">
                Grok Bots & Teammates
              </div>
              {teammates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTeammateId(t.id);
                    setIsSearchOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[var(--dawn-chip)] text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ChatAvatar seed={t.avatarSeed} className="size-6 rounded-full" />
                    <div>
                      <span className="font-semibold text-[var(--dawn-text)]">{t.name}</span>
                      <span className="text-[11px] text-[var(--dawn-muted)] ml-2">{t.role}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--dawn-muted)] font-mono">Jump ↵</span>
                </button>
              ))}

              <div className="px-2 pt-2 py-1 text-[10px] font-bold text-[var(--dawn-muted)] uppercase tracking-wider">
                Workspaces & Views
              </div>
              <button
                onClick={() => {
                  setClaudeTopPill('home');
                  setIsSearchOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--dawn-chip)] text-left cursor-pointer"
              >
                <span className="text-sm font-serif">🏠</span>
                <span className="text-[var(--dawn-text)]">Claude Home View (&quot;Evening Thoughts&quot;)</span>
              </button>
              <button
                onClick={() => {
                  setRightPanelTab('computer');
                  setIsRightPanelOpen(true);
                  setIsComputerAwake(true);
                  setIsSearchOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--dawn-chip)] text-left cursor-pointer"
              >
                <Monitor className="w-4 h-4 text-[var(--dawn-accent)]" />
                <span className="text-[var(--dawn-text)]">Grok Computer / Live Webview</span>
              </button>
              <button
                onClick={() => {
                  setRightPanelTab('editor');
                  setIsRightPanelOpen(true);
                  setIsSearchOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--dawn-chip)] text-left cursor-pointer"
              >
                <Code2 className="w-4 h-4 text-[var(--dawn-accent)]" />
                <span className="text-[var(--dawn-text)]">Monaco Code Editor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teammate Configuration Modal */}
      <TeammateDialog
        open={isTeammateDialogOpen}
        onOpenChange={setIsTeammateDialogOpen}
        onSaveTeammate={(t) => {
          setTeammates((prev) => prev.map((item) => (item.id === t.id ? t : item)));
        }}
        existingTeammate={editingTeammate}
      />
    </div>
  );
}
