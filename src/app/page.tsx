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
  Play
} from 'lucide-react';
import { Teammate, DEFAULT_TEAMMATES } from '@/types/teammate';
import { TeammateDialog } from '@/components/teammate-dialog';

// Dynamic import for Monaco to prevent SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  senderName?: string;
  senderRole?: string;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', badge: 'Ultra Fast' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', badge: 'Deep Reasoning' },
  { id: 'x-ai/grok-2-1212', name: 'Grok 2', provider: 'OpenRouter / xAI', badge: 'Grok Intel' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'OpenRouter', badge: 'Cost Efficient' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'OpenRouter', badge: 'Elite Coding' },
];

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
  
  // Teammates state (inspired by Antonio's Grok Bot clone)
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
    'Dawn Studio v0.2.0 initialized.',
    'Gateway ready: Google Gemini 2.0 Flash + Grok 2 / OpenRouter.',
    '4 AI Teammates loaded into local memory.',
    'Type instructions in the right panel to execute.',
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
    <div className="flex flex-col h-screen w-screen bg-[#0d0f12] text-zinc-100 font-sans overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-zinc-800/80 bg-[#121418] flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono font-bold tracking-wider text-sm bg-zinc-900 border border-zinc-700/60 px-2.5 py-1 rounded shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400">DAWN</span>
            <span className="text-zinc-500">//</span>
            <span className="text-zinc-400 text-xs font-normal">STUDIO</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span>Artometrics / dawn</span>
          </div>
        </div>

        {/* Center: Teammates Picker (Grok Bot Architecture) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-1 gap-1">
            <Users className="w-3.5 h-3.5 text-zinc-500 ml-1.5 mr-0.5" />
            {teammates.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTeammateId(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                  activeTeammateId === t.id
                    ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: t.accentColor }}
                />
                <span>{t.name}</span>
                {t.memory.length > 0 && (
                  <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1 rounded font-mono">
                    {t.memory.length}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => {
                setEditingTeammate(null);
                setIsTeammateDialogOpen(true);
              }}
              title="Add AI Teammate"
              className="p-1 text-zinc-400 hover:text-amber-400 rounded hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingTeammate(activeTeammate);
              setIsTeammateDialogOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-500" />
            <span>Config Bot</span>
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Code Editor + Terminal / Output Panel */}
        <div className="flex-1 flex flex-col border-r border-zinc-800/80 bg-[#1e1e1e]">
          {/* File Tab Bar + View Switcher */}
          <div className="h-9 bg-[#181818] border-b border-zinc-800/70 flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto">
              {['agent.ts', 'gateway.ts', 'schema.ts'].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setActiveFile(f);
                    setViewMode('editor');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t border-t-2 text-xs font-mono transition-colors ${
                    activeFile === f && viewMode === 'editor'
                      ? 'bg-[#1e1e1e] border-amber-500 text-zinc-100 font-medium'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 pr-2">
              <button
                onClick={() => setViewMode(viewMode === 'editor' ? 'terminal' : 'editor')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                  viewMode === 'terminal'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-3 h-3" />
                <span>Console</span>
              </button>
              <span className="text-[11px] text-zinc-500 font-mono">
                Context Attached
              </span>
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
            <div className="flex-1 bg-[#101216] p-4 font-mono text-xs text-zinc-300 overflow-y-auto space-y-1">
              <div className="text-zinc-500 text-[11px] border-b border-zinc-800 pb-2 mb-2 flex items-center justify-between">
                <span>DAWN SHELL OUTPUT & ACTIVITY LOGS</span>
                <span className="text-emerald-400 font-mono">ONLINE</span>
              </div>
              {terminalLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-zinc-600 select-none">›</span>
                  <span className="text-zinc-300">{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: AI Intelligence Panel (Antonio's Grok Bot Teammate Chat) */}
        <div className="w-[480px] flex flex-col bg-[#121418] border-l border-zinc-800/80">
          {/* Active Teammate Header */}
          <div className="h-12 border-b border-zinc-800/70 px-3 flex items-center justify-between text-xs text-zinc-400 bg-[#15181e]">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs"
                style={{ backgroundColor: `${activeTeammate.accentColor}25`, color: activeTeammate.accentColor }}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                  <span>{activeTeammate.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] text-zinc-500 truncate max-w-[220px]">
                  {activeTeammate.role}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                {activeTeammate.model}
              </span>
            </div>
          </div>

          {/* Teammate Persistent Memory Pill Bar */}
          {activeTeammate.memory.length > 0 && (
            <div className="bg-[#101216] border-b border-zinc-800/60 px-3 py-1.5 flex items-center gap-2 text-[11px] text-zinc-400 overflow-x-auto">
              <Brain className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] uppercase font-mono text-zinc-500 shrink-0">Memory:</span>
              <div className="flex items-center gap-1.5 truncate">
                {activeTeammate.memory.map((m, i) => (
                  <span
                    key={i}
                    title={m}
                    className="truncate max-w-[140px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-300"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-6 space-y-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${activeTeammate.accentColor}20`, color: activeTeammate.accentColor }}
                >
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-zinc-200 font-semibold text-sm">{activeTeammate.name}</h3>
                  <p className="text-xs text-zinc-400 max-w-[280px] mt-1">
                    {activeTeammate.instructions}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-1.5 w-full pt-3">
                  {[
                    `Review ${activeFile} for architecture flaws`,
                    `Refactor to modular microservices pattern`,
                    `Write full test suite for active code`,
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSendMessage(preset)}
                      className="text-left px-3 py-1.5 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-[11px] flex items-center justify-between"
                    >
                      <span>→ {preset}</span>
                      <Zap className="w-3 h-3 text-zinc-600" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border ${
                    m.role === 'user'
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-200 ml-4'
                      : 'bg-[#181b22] border-zinc-800/80 text-zinc-300 mr-2'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 mb-1.5">
                    <span className="uppercase font-semibold text-zinc-400">
                      {m.role === 'user' ? 'Kyle' : m.senderName || activeTeammate.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {m.role === 'assistant' && (
                        <button
                          onClick={() => applyCodeToEditor(m.content)}
                          title="Apply code directly to Monaco editor"
                          className="hover:text-amber-400 flex items-center gap-1 text-zinc-400 transition-colors"
                        >
                          <SquareCode className="w-3 h-3" />
                          <span>Apply</span>
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(m.content, m.id)}
                        className="hover:text-zinc-300 text-zinc-500"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono italic">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
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
            className="p-3 border-t border-zinc-800/80 bg-[#15181e]"
          >
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all">
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
                className="w-full bg-transparent px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none font-sans"
              />
              <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-zinc-800/50 text-[11px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: activeTeammate.accentColor }}
                  />
                  <span className="font-mono text-[10px] text-zinc-400">
                    {activeTeammate.name} ({activeTeammate.model})
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black px-2.5 py-1 rounded font-medium text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </button>
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
