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
  Flame,
  Wand2
} from 'lucide-react';
import { Teammate, DEFAULT_TEAMMATES } from '@/types/teammate';
import { TeammateDialog } from '@/components/teammate-dialog';
import { ChatAvatar } from '@/components/chat-avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Dynamic import for Monaco to prevent SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  senderName?: string;
  senderRole?: string;
  senderAvatarSeed?: string;
}

const DEFAULT_CODE = `// Welcome to Dawn Studio (Artometrics)
// Integrated with Code with Antonio's Grok Bot Teammate Engine

interface AgentConfig {
  name: string;
  role: string;
  provider: 'google' | 'xai' | 'openrouter';
  model: string;
  memory: string[];
}

export async function runDawnAgent(config: AgentConfig, task: string) {
  console.log(\`[Dawn] Running task with \${config.name} (\${config.role})...\`);
  // Highlight any code or ask your teammate on the right to review, refactor, or test
  return { status: 'executing', task };
}
`;

export default function DawnStudio() {
  const [activeFile, setActiveFile] = useState('agent.ts');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('typescript');
  const [viewMode, setViewMode] = useState<'editor' | 'terminal'>('editor');
  
  // Teammates state (Code with Antonio Grok Bot architecture)
  const [teammates, setTeammates] = useState<Teammate[]>(DEFAULT_TEAMMATES);
  const [activeTeammateId, setActiveTeammateId] = useState<string>('grok-strategist');
  const [isTeammateDialogOpen, setIsTeammateDialogOpen] = useState(false);
  const [editingTeammate, setEditingTeammate] = useState<Teammate | null>(null);

  const activeTeammate = teammates.find((t) => t.id === activeTeammateId) || teammates[0];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Dawn Studio v0.3.0 initialized.',
    'UI: Antonio Grok Bot styling + DiceBear Gaze avatars + Shadcn UI.',
    'Gateway ready: Google Gemini 2.0 Flash + Grok 2 / OpenRouter.',
    '4 AI Teammates ready with persistent memory.',
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applyCodeToEditor = (text: string) => {
    const codeBlockMatch = text.match(/```(?:[a-zA-Z]+)?\n([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      setCode(codeBlockMatch[1]);
    } else {
      setCode(text);
    }
    setTerminalLogs((prev) => [
      ...prev,
      `[Editor] Updated ${activeFile} from ${activeTeammate.name}`,
    ]);
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
    setTerminalLogs((prev) => [
      ...prev,
      `[Team] Configured teammate: ${newTeammate.name} (${newTeammate.role})`,
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt.trim(),
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
        senderName: activeTeammate.name,
        senderRole: activeTeammate.role,
        senderAvatarSeed: activeTeammate.avatarSeed,
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
            filename: activeFile,
            language,
            content: code,
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
    <div className="flex flex-col h-screen w-screen bg-background text-foreground font-sans overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-13 border-b border-border bg-sidebar/80 backdrop-blur-md flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono font-bold tracking-wider text-sm bg-muted/60 border border-border px-3 py-1 rounded-lg shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-500 font-extrabold tracking-tight">DAWN</span>
            <span className="text-muted-foreground/60">//</span>
            <span className="text-muted-foreground text-xs font-medium">STUDIO</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/60">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Artometrics / dawn</span>
          </div>
        </div>

        {/* Center: Teammates Picker (Antonio's Grok Bot Architecture) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/40 border border-border rounded-xl p-1 gap-1 shadow-inner">
            <Users className="w-3.5 h-3.5 text-muted-foreground ml-2 mr-1" />
            {teammates.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTeammateId(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  activeTeammateId === t.id
                    ? 'bg-card text-foreground font-semibold shadow-sm border border-border/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <ChatAvatar seed={t.avatarSeed} className="size-4 rounded-full" />
                <span>{t.name}</span>
                {t.memory.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-mono">
                    {t.memory.length}
                  </Badge>
                )}
              </button>
            ))}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setEditingTeammate(null);
                setIsTeammateDialogOpen(true);
              }}
              title="Add AI Teammate"
              className="text-muted-foreground hover:text-amber-500 hover:bg-muted rounded-md ml-1"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingTeammate(activeTeammate);
              setIsTeammateDialogOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs border-border bg-card/60 hover:bg-muted"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Config Bot</span>
          </Button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Code Editor + Terminal / Output Panel */}
        <div className="flex-1 flex flex-col border-r border-border bg-[#18181b]">
          {/* File Tab Bar + View Switcher */}
          <div className="h-10 bg-sidebar border-b border-border flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto">
              {['agent.ts', 'gateway.ts', 'schema.ts'].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setActiveFile(f);
                    setViewMode('editor');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg border-t-2 text-xs font-mono transition-colors cursor-pointer ${
                    activeFile === f && viewMode === 'editor'
                      ? 'bg-[#18181b] border-amber-500 text-foreground font-medium shadow-sm'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-500" />
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pr-2">
              <Button
                variant={viewMode === 'terminal' ? 'secondary' : 'outline'}
                size="xs"
                onClick={() => setViewMode(viewMode === 'editor' ? 'terminal' : 'editor')}
                className="font-mono text-[11px]"
              >
                <Terminal className="w-3 h-3 mr-1" />
                Console
              </Button>
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                Context Attached
              </Badge>
            </div>
          </div>

          {/* Body: Editor or Terminal */}
          {viewMode === 'editor' ? (
            <div className="flex-1 relative">
              <MonacoEditor
                height="100%"
                theme="vs-dark"
                language={language}
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  wordWrap: 'on',
                  renderLineHighlight: 'all',
                }}
              />
            </div>
          ) : (
            <div className="flex-1 bg-black/90 p-4 font-mono text-xs text-zinc-300 overflow-y-auto space-y-1.5">
              <div className="text-muted-foreground text-[11px] border-b border-border pb-2 mb-2 flex items-center justify-between">
                <span>DAWN SHELL OUTPUT & ACTIVITY LOGS</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              {terminalLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground select-none">›</span>
                  <span className="text-zinc-200">{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: AI Intelligence Panel (Antonio's Grok Bot Teammate Chat) */}
        <div className="w-[500px] flex flex-col bg-sidebar border-l border-border">
          {/* Active Teammate Header */}
          <div className="h-14 border-b border-border px-4 flex items-center justify-between bg-card/60">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ChatAvatar seed={activeTeammate.avatarSeed} animated className="size-9 rounded-full ring-2 ring-border" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span>{activeTeammate.name}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                  {activeTeammate.role}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] bg-muted/40">
                {activeTeammate.model}
              </Badge>
            </div>
          </div>

          {/* Teammate Persistent Memory Bar */}
          {activeTeammate.memory.length > 0 && (
            <div className="bg-muted/20 border-b border-border px-4 py-2 flex items-center gap-2 text-[11px] text-muted-foreground overflow-x-auto">
              <Brain className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground/80 shrink-0">
                Memory:
              </span>
              <div className="flex items-center gap-1.5 truncate">
                {activeTeammate.memory.map((m, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    title={m}
                    className="truncate max-w-[150px] text-[10px] font-normal"
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6 space-y-4">
                <ChatAvatar seed={activeTeammate.avatarSeed} animated className="size-16 rounded-full ring-4 ring-border shadow-xl" />
                <div>
                  <h3 className="text-foreground font-semibold text-base">{activeTeammate.name}</h3>
                  <Badge variant="secondary" className="mt-1 text-[11px]">
                    {activeTeammate.role}
                  </Badge>
                  <p className="text-xs text-muted-foreground max-w-[320px] mt-2 leading-relaxed">
                    {activeTeammate.instructions}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full pt-2">
                  {[
                    `Review ${activeFile} for architecture flaws`,
                    `Refactor to modular clean architecture`,
                    `Write complete automated test suite`,
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSendMessage(preset)}
                      className="text-left px-3 py-2 rounded-lg bg-card/60 hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-all text-xs flex items-center justify-between cursor-pointer shadow-sm"
                    >
                      <span>→ {preset}</span>
                      <Zap className="w-3.5 h-3.5 text-amber-500/70" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    m.role === 'user'
                      ? 'bg-primary/10 border-primary/20 text-foreground ml-6 shadow-sm'
                      : 'bg-card border-border text-card-foreground mr-2 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground mb-2">
                    <div className="flex items-center gap-1.5">
                      {m.role === 'assistant' && (
                        <ChatAvatar seed={m.senderAvatarSeed || 'assistant'} className="size-3.5 rounded-full" />
                      )}
                      <span className="uppercase font-semibold tracking-wider">
                        {m.role === 'user' ? 'Kyle' : m.senderName || activeTeammate.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {m.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => applyCodeToEditor(m.content)}
                          title="Apply code directly to Monaco editor"
                          className="h-6 text-xs text-muted-foreground hover:text-amber-500"
                        >
                          <SquareCode className="w-3 h-3 mr-1" />
                          Apply
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => copyToClipboard(m.content, m.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono italic">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {activeTeammate.name} is thinking & analyzing code...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-border bg-card/60"
          >
            <div className="relative bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-500 transition-all shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Ask ${activeTeammate.name} or type instruction... (Enter to send)`}
                rows={2}
                className="w-full bg-transparent px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none resize-none font-sans"
              />
              <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 text-[11px] text-muted-foreground bg-muted/10 rounded-b-xl">
                <div className="flex items-center gap-2">
                  <ChatAvatar seed={activeTeammate.avatarSeed} className="size-3.5 rounded-full" />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {activeTeammate.name} ({activeTeammate.model})
                  </span>
                </div>
                <Button
                  type="submit"
                  size="xs"
                  disabled={isLoading || !input.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-sm cursor-pointer"
                >
                  <span>Send</span>
                  <Send className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Teammate Creation & Configuration Modal */}
      <TeammateDialog
        open={isTeammateDialogOpen}
        onOpenChange={setIsTeammateDialogOpen}
        onSaveTeammate={handleSaveTeammate}
        existingTeammate={editingTeammate}
      />
    </div>
  );
}
