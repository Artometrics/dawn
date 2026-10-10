'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
  FileText,
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
  PanelRight
} from 'lucide-react';
import { Teammate, DEFAULT_TEAMMATES } from '@/types/teammate';
import { TeammateDialog } from '@/components/teammate-dialog';
import { ChatAvatar } from '@/components/chat-avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Monaco editor dynamic import
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  commandSnippet?: {
    title: string;
    command: string;
    status: 'success' | 'running' | 'error';
  };
  timestamp?: string;
  liked?: boolean | null;
}

interface Thread {
  id: string;
  repo: string;
  title: string;
  timeAgo: string;
  unread?: boolean;
}

interface WorkspaceTab {
  id: string;
  type: 'browser' | 'editor';
  title: string;
  url?: string;
}

const INITIAL_THREADS: Thread[] = [
  { id: 't-1', repo: 'webfall', title: 'Figma setup verification', timeAgo: '1d' },
  { id: 't-2', repo: 'webfall', title: 'Homepage development progress', timeAgo: '7d' },
  { id: 't-3', repo: 'webfall', title: 'Webfall: port Astro site to Next.js', timeAgo: '4h', unread: true },
  { id: 't-4', repo: 'webfall', title: 'Webfall: rebuild Home to Figma + web.app', timeAgo: '7h' },
  { id: 't-5', repo: 'webfall', title: 'Webfall: port missing corp-site pages', timeAgo: '8h' },
  { id: 't-6', repo: 'impact', title: 'Impact report portfolio', timeAgo: '4h', unread: true },
  { id: 't-7', repo: 'dawn', title: 'Dawn Studio autonomous agent architecture', timeAgo: 'Just now' },
];

const INITIAL_CODE = `// Welcome to Dawn Studio (Artometrics)
// Cursor & Grok unified agentic interface

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
  // Panel Layout toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Navigation & Threads
  const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>('t-1');
  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  // Teammates state
  const [teammates, setTeammates] = useState<Teammate[]>(DEFAULT_TEAMMATES);
  const [activeTeammateId, setActiveTeammateId] = useState<string>('grok-strategist');
  const [isTeammateDialogOpen, setIsTeammateDialogOpen] = useState(false);
  const [editingTeammate, setEditingTeammate] = useState<Teammate | null>(null);
  const activeTeammate = teammates.find((t) => t.id === activeTeammateId) || teammates[0];

  // Tabs State (with dynamic close support!)
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

  // Chat messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-init-1',
      role: 'user',
      content: 'hi. so open up a local version of the homepage. ive got edits i need to make',
      timestamp: '1d ago',
    },
    {
      id: 'm-init-2',
      role: 'assistant',
      content:
        'Saves should hot-reload in the browser. Tell me what you want changed (copy, order, spacing, assets) and I can apply it with you.\n\nhttp://localhost:3000/ is responding (HTTP 200). Keep using that for homepage edits. If you need a clean restart later: npm run dev.',
      commandSnippet: {
        title: 'Finished Start dev server on port 3000',
        command: 'npm run dev',
        status: 'success',
      },
      timestamp: '1d ago',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [gitBranch, setGitBranch] = useState('develop');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
      // If all tabs are closed, hide the right panel
      setIsRightPanelOpen(false);
      setTabs([]);
    } else {
      setTabs(remaining);
      if (activeTabId === tabIdToClose) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
    }
  };

  const handleNewTab = (type: 'browser' | 'editor' = 'browser') => {
    const newTab: WorkspaceTab = {
      id: `tab-${Date.now()}`,
      type,
      title: type === 'browser' ? `Preview :${3000 + tabs.length}` : `script-${tabs.length + 1}.ts`,
      url: 'http://localhost:3000',
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setIsRightPanelOpen(true);
  };

  const handleSaveTeammate = (newTeammate: Teammate) => {
    setTeammates((prev) => {
      const exists = prev.some((t) => t.id === newTeammate.id);
      if (exists) {
        return prev.map((t) => (t.id === newTeammate.id ? newTeammate : t));
      }
      return [...prev, newTeammate];
    });
    setActiveTeammateId(newTeammate.id);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isLoading) return;

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

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: 'Just now',
      },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          model: activeTeammate.model,
          teammate: activeTeammate,
          codeContext: {
            filename: 'page.tsx',
            language: 'typescript',
            content: editorCode,
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          );
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `⚠️ Error connecting to model: ${err.message}` }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0d0e11] text-[#ededed] font-sans overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          COLUMN 1: LEFT NAVIGATION & REPOSITORIES / THREADS SIDEBAR
      ───────────────────────────────────────────────────────────────── */}
      {isSidebarOpen && (
        <aside className="w-64 bg-[#111216] border-r border-[#202228] flex flex-col shrink-0 transition-all">
          {/* Window Traffic Lights & Collapse Button */}
          <div className="h-11 px-3.5 flex items-center justify-between border-b border-[#202228]">
            <div className="flex items-center gap-2 group">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                title="Close / Collapse Sidebar"
                className="w-3 h-3 rounded-full bg-[#ff5f56] inline-flex items-center justify-center cursor-pointer hover:opacity-80"
              >
                <X className="w-2 h-2 text-[#4c0000] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block cursor-pointer hover:opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block cursor-pointer hover:opacity-80" />
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-xs text-[#c9cdd4]">Cursor 2.5</span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse Sidebar"
                className="p-1 rounded text-[#6e737e] hover:text-[#ededed] hover:bg-[#1a1c23] ml-1 cursor-pointer"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Icon Strip / Search */}
          <div className="px-3 pt-3 pb-2 flex items-center justify-between text-[#8a8f98]">
            <div className="flex items-center gap-2">
              <button className="p-1 rounded hover:bg-[#1a1c23] hover:text-[#ededed] cursor-pointer">
                <Folder className="w-4 h-4" />
              </button>
              <button className="p-1 rounded hover:bg-[#1a1c23] hover:text-[#ededed] cursor-pointer">
                <Search className="w-4 h-4" />
              </button>
              <button className="p-1 rounded hover:bg-[#1a1c23] hover:text-[#ededed] cursor-pointer">
                <FolderGit2 className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={() => {
                const newT: Thread = {
                  id: `t-${Date.now()}`,
                  repo: 'webfall',
                  title: 'New Composer task',
                  timeAgo: 'Just now',
                };
                setThreads([newT, ...threads]);
                setActiveThreadId(newT.id);
              }}
              title="New Chat / Thread"
              className="p-1 rounded hover:bg-[#1a1c23] hover:text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Project & Repositories Tree */}
          <div className="flex-1 overflow-y-auto px-2 space-y-4 text-xs">
            {/* Projects Section */}
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[#6e737e] uppercase tracking-wider">
                <span>Projects</span>
                <button className="hover:text-white">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5 mt-1">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#181920] text-[#c9cdd4] cursor-pointer">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>SEO</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#181920] text-[#c9cdd4] cursor-pointer">
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>Rainfall Reports</span>
                </div>
              </div>
            </div>

            {/* Repositories Section */}
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[#6e737e] uppercase tracking-wider">
                <span>Repositories</span>
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#6e737e]" />
              </div>

              {/* Repo: impact */}
              <div className="mt-1">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[#8a8f98] font-medium">
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>impact</span>
                </div>
                <div className="pl-4 space-y-0.5 mt-0.5">
                  <button
                    onClick={() => setActiveThreadId('t-6')}
                    className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded-md transition-colors cursor-pointer ${
                      activeThreadId === 't-6' ? 'bg-[#1e2029] text-white font-medium' : 'text-[#8a8f98] hover:bg-[#181920] hover:text-[#c9cdd4]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate">Impact report portfolio</span>
                    </div>
                    <span className="text-[10px] text-[#5b606a]">4h</span>
                  </button>
                </div>
              </div>

              {/* Repo: webfall */}
              <div className="mt-2">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[#8a8f98] font-medium">
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>webfall</span>
                </div>
                <div className="pl-3 space-y-0.5 mt-0.5">
                  {threads
                    .filter((t) => t.repo === 'webfall')
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveThreadId(t.id)}
                        className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded-md transition-colors cursor-pointer ${
                          activeThreadId === t.id
                            ? 'bg-[#1e2029] text-white font-medium shadow-sm'
                            : 'text-[#8a8f98] hover:bg-[#181920] hover:text-[#c9cdd4]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeThreadId === t.id ? 'bg-amber-400' : 'bg-transparent'}`} />
                          <span className="truncate">{t.title}</span>
                        </div>
                        <span className="text-[10px] text-[#5b606a] shrink-0 ml-1">{t.timeAgo}</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* User Profile Bar at bottom */}
          <div className="p-3 border-t border-[#202228] flex items-center justify-between text-xs text-[#c9cdd4] bg-[#111216]">
            <div className="flex items-center gap-2.5">
              <div className="size-6 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-[11px] font-bold text-black">
                K
              </div>
              <span className="font-medium truncate">Kyle McAuliffe</span>
            </div>
            <button 
              onClick={() => {
                setEditingTeammate(activeTeammate);
                setIsTeammateDialogOpen(true);
              }}
              className="text-[#6e737e] hover:text-[#ededed] p-1 rounded hover:bg-[#1a1c23] cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────
          COLUMN 2: MIDDLE AI AGENT / COMPOSER THREAD
      ───────────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col min-w-[380px] border-r border-[#202228] bg-[#0d0e11] transition-all">
        {/* Thread Top Bar with Open/Close Toggles */}
        <div className="h-11 px-4 border-b border-[#202228] flex items-center justify-between text-xs bg-[#111216]/60 backdrop-blur-md">
          <div className="flex items-center gap-2 font-medium text-[#ededed]">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                title="Open Sidebar"
                className="p-1 rounded text-[#8a8f98] hover:text-[#ededed] hover:bg-[#1a1c23] mr-1 cursor-pointer"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <span className="truncate">{activeThread.title}</span>
            <Lock className="w-3 h-3 text-[#6e737e]" />
          </div>

          <div className="flex items-center gap-2">
            {!isRightPanelOpen && (
              <button
                onClick={() => {
                  if (tabs.length === 0) {
                    setTabs([
                      { id: 'tab-browser', type: 'browser', title: 'AI-Enabled :3000', url: 'http://localhost:3000' },
                      { id: 'tab-editor', type: 'editor', title: 'page.tsx (Monaco)' }
                    ]);
                    setActiveTabId('tab-browser');
                  }
                  setIsRightPanelOpen(true);
                }}
                className="flex items-center gap-1.5 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30 cursor-pointer font-medium"
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span>Open Preview / IDE ↗</span>
              </button>
            )}
            <button className="text-[#6e737e] hover:text-[#ededed] p-1 cursor-pointer">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat / Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text">
          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              {m.role === 'user' ? (
                /* User Message Bubble */
                <div className="bg-[#1a1c23] border border-[#272a33] rounded-xl p-3.5 text-[#ededed] leading-relaxed shadow-sm">
                  {m.content}
                </div>
              ) : (
                /* Assistant Message */
                <div className="space-y-3 pt-1">
                  {/* Command Executed Badge (if present) */}
                  {m.commandSnippet && (
                    <div className="flex items-center gap-2 text-[11px] text-[#8a8f98] bg-[#16171d] border border-[#252731] px-3 py-1.5 rounded-lg font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{m.commandSnippet.title}</span>
                    </div>
                  )}

                  <div className="text-[#d4d7de] leading-relaxed whitespace-pre-wrap font-sans text-xs">
                    {m.content}
                  </div>

                  {/* Actions & Timestamp footer */}
                  <div className="flex items-center gap-3 pt-1 text-[#6e737e] text-[11px]">
                    <button className="hover:text-white cursor-pointer">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button className="hover:text-white cursor-pointer">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(m.content, m.id)}
                      className="hover:text-white cursor-pointer"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {m.timestamp && <span>{m.timestamp}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-amber-400/80 font-mono italic">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Thinking and streaming edits...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Composer Input Dock */}
        <div className="p-3 border-t border-[#202228] bg-[#111216]">
          {/* Top Pill Controls: Changes, Commit & Push, Design Mode */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 font-mono text-[11px] text-[#8a8f98] bg-[#181920] px-2 py-0.5 rounded border border-[#252731]">
                <span>Changes</span>
                <span className="text-emerald-400">+43</span>
                <span className="text-rose-400">-164</span>
              </div>
              <button className="flex items-center gap-1 text-[11px] text-[#8a8f98] hover:text-[#ededed] bg-[#181920] px-2 py-0.5 rounded border border-[#252731] cursor-pointer">
                <span>Commit & Push</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <button className="text-[11px] text-[#8a8f98] hover:text-[#ededed] bg-[#181920] px-2 py-0.5 rounded border border-[#252731] cursor-pointer">
                Design Mode
              </button>
            </div>
          </div>

          {/* Main Text Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="bg-[#181920] border border-[#272a33] rounded-xl focus-within:border-[#3e4250] transition-colors overflow-hidden"
          >
            <div className="flex items-center px-3 pt-2.5">
              <span className="text-[#6e737e] text-base mr-2 select-none">+</span>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Send follow-up"
                rows={2}
                className="w-full bg-transparent text-xs text-[#ededed] placeholder-[#6e737e] focus:outline-none resize-none font-sans"
              />
            </div>

            {/* Input Footer: Model Selector & Mic */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#23252f] text-[11px] text-[#8a8f98]">
              <div className="flex items-center gap-2">
                {/* Model Engine Selector */}
                <select
                  value={activeTeammate.model}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    setTeammates((prev) =>
                      prev.map((t) =>
                        t.id === activeTeammateId ? { ...t, model: newModel } : t
                      )
                    );
                  }}
                  className="bg-transparent text-[#8a8f98] hover:text-[#ededed] cursor-pointer focus:outline-none font-mono text-[11px]"
                >
                  <option value="gemini-3.8-flash" className="bg-[#181920] text-white">
                    Composer 2.5 (Gemini 3.8)
                  </option>
                  <option value="gemini-3.1-pro-preview" className="bg-[#181920] text-white">
                    Deep Reasoning (Gemini Pro)
                  </option>
                  <option value="openai/gpt-4o-mini" className="bg-[#181920] text-white">
                    GPT-4o Mini (OpenRouter)
                  </option>
                  <option value="x-ai/grok-2-1212" className="bg-[#181920] text-white">
                    Grok 2 (xAI / OpenRouter)
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" className="text-[#6e737e] hover:text-white cursor-pointer">
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="size-6 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center text-black cursor-pointer transition-opacity"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </form>

          {/* Bottom Dock Status (Branch & Machine) */}
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-[#6e737e]">
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1 hover:text-[#c9cdd4] cursor-pointer">
                <GitBranch className="w-3 h-3 text-[#8a8f98]" />
                <span>{gitBranch}</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
              <button className="flex items-center gap-1 hover:text-[#c9cdd4] cursor-pointer">
                <Laptop className="w-3 h-3 text-[#8a8f98]" />
                <span>This Mac</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-mono">ONLINE</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          COLUMN 3: RIGHT LIVE BROWSER PREVIEW & CODE PANEL
      ───────────────────────────────────────────────────────────────── */}
      {isRightPanelOpen && (
        <main className="flex-1 flex flex-col bg-[#0e0f12] overflow-hidden min-w-[380px] transition-all">
          {/* Top Browser Chrome Bar with Tab Close Buttons and Panel Close */}
          <div className="h-11 border-b border-[#202228] bg-[#111216] px-3 flex items-center justify-between text-xs">
            {/* Tabs List (with explicit X close buttons on each tab) */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    activeTabId === tab.id
                      ? 'bg-[#1e2029] text-[#ededed] shadow-sm'
                      : 'text-[#8a8f98] hover:bg-[#181920] hover:text-[#ededed]'
                  }`}
                >
                  {tab.type === 'browser' ? (
                    <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <Code2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">{tab.title}</span>
                  {/* Close Tab Button */}
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    title={`Close ${tab.title}`}
                    className="p-0.5 ml-1 rounded hover:bg-[#2e3240] text-[#6e737e] hover:text-white cursor-pointer opacity-60 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <button 
                onClick={() => handleNewTab('browser')}
                title="New Tab"
                className="text-[#6e737e] hover:text-[#ededed] p-1 ml-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Action Icons: Mobile view, Fullscreen, and Panel Close Button */}
            <div className="flex items-center gap-1.5 text-[#8a8f98]">
              {activeTab?.type === 'browser' && (
                <button
                  onClick={() => setIsMobilePreview(!isMobilePreview)}
                  title="Toggle Mobile Mockup View"
                  className={`p-1.5 rounded hover:bg-[#1a1c23] hover:text-[#ededed] cursor-pointer ${
                    isMobilePreview ? 'text-amber-400 bg-[#1a1c23]' : ''
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => window.open(browserUrl, '_blank')}
                title="Open in new window"
                className="p-1.5 rounded hover:bg-[#1a1c23] hover:text-[#ededed] cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Close Panel Button */}
              <button
                onClick={() => setIsRightPanelOpen(false)}
                title="Close Panel (Hide Preview & Editor)"
                className="p-1.5 rounded hover:bg-[#1a1c23] hover:text-white text-[#8a8f98] cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Address / Navigation Bar (when in browser tab) */}
          {activeTab?.type === 'browser' && (
            <div className="h-10 border-b border-[#202228] bg-[#14151b] px-3 flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-[#6e737e]">
                <button className="p-1 rounded hover:text-white cursor-pointer">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 rounded hover:text-white cursor-pointer">
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleRefreshBrowser} className="p-1 rounded hover:text-white cursor-pointer">
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* URL input bar */}
              <div className="flex-1 flex items-center bg-[#0d0e11] border border-[#252731] rounded-lg px-2.5 py-1 text-xs text-[#c9cdd4]">
                <span className="text-[#5b606a] mr-1.5 font-mono">🔒</span>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRefreshBrowser();
                    }
                  }}
                  className="w-full bg-transparent text-[#ededed] font-mono text-[11px] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Browser Content Frame / Editor */}
          <div className="flex-1 relative overflow-hidden bg-[#0a0a0c]">
            {activeTab?.type === 'browser' ? (
              isMobilePreview ? (
                /* Mobile Smartphone Frame View */
                <div className="h-full w-full flex items-center justify-center p-6 bg-gradient-to-b from-[#121318] to-[#0a0a0d] overflow-y-auto">
                  <div className="w-[375px] h-[720px] rounded-[48px] bg-black p-3.5 shadow-2xl ring-1 ring-white/10 relative flex flex-col shrink-0">
                    {/* Dynamic Island / Notch */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20 flex items-center justify-between px-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#18181b]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500/40" />
                    </div>
                    {/* Screen Content */}
                    <div className="flex-1 rounded-[38px] overflow-hidden bg-white relative">
                      <iframe
                        key={iframeKey}
                        src={browserUrl}
                        title="Dawn Live Mobile Preview"
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Full Desktop Browser View */
                <iframe
                  key={iframeKey}
                  src={browserUrl}
                  title="Dawn Live Desktop Preview"
                  className="w-full h-full border-0 bg-white"
                />
              )
            ) : (
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
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  wordWrap: 'on',
                }}
              />
            )}
          </div>
        </main>
      )}

      {/* Teammate Configuration Modal */}
      <TeammateDialog
        open={isTeammateDialogOpen}
        onOpenChange={setIsTeammateDialogOpen}
        onSaveTeammate={handleSaveTeammate}
        existingTeammate={editingTeammate}
      />
    </div>
  );
}
