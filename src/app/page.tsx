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
  SquareCode
} from 'lucide-react';

// Dynamic import for Monaco to prevent SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', badge: 'Ultra Fast' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', badge: 'Deep Reasoning' },
  { id: 'x-ai/grok-2-1212', name: 'Grok 2', provider: 'OpenRouter / xAI', badge: 'Grok Intel' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'OpenRouter', badge: 'Cost Efficient' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'OpenRouter', badge: 'Elite Coding' },
];

const DEFAULT_CODE = `// Welcome to Dawn Studio
// Your unified Cursor-style code editor + Grok & Gemini intelligence hub.

interface AgentConfig {
  name: string;
  provider: 'google' | 'xai' | 'openrouter';
  model: string;
  temperature: number;
}

export async function runDawnAgent(config: AgentConfig, prompt: string) {
  console.log(\`[Dawn] Routing prompt via \${config.provider} (\${config.model})...\`);
  // Highlight any code or ask in the right panel to edit or refactor
  return { status: 'ready', prompt };
}
`;

export default function DawnStudio() {
  const [activeFile, setActiveFile] = useState('agent.ts');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('typescript');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [persona, setPersona] = useState<'cursor' | 'grok'>('grok');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    // If text contains a markdown code block, extract the inner code
    const codeBlockMatch = text.match(/```(?:[a-zA-Z]+)?\n([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      setCode(codeBlockMatch[1]);
    } else {
      setCode(text);
    }
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
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    const systemPrompt = persona === 'cursor'
      ? 'You are Dawn in Cursor Mode: A laser-focused code editor assistant. When asked to write or modify code, provide direct, copy-paste ready implementations, minimal fluff, and precise explanations of changes.'
      : 'You are Dawn in Grok Mode: A sharp, witty, highly autonomous engineering strategist and code partner. You challenge weak assumptions, provide high-velocity architecture insights, and write bulletproof code.';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
          system: systemPrompt,
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

        {/* Center: Model & Persona Selector */}
        <div className="flex items-center gap-3">
          {/* Persona Switch */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs">
            <button
              onClick={() => setPersona('grok')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                persona === 'grok' 
                  ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              Grok Mode
            </button>
            <button
              onClick={() => setPersona('cursor')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                persona === 'cursor' 
                  ? 'bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code2 className="w-3 h-3" />
              Cursor Mode
            </button>
          </div>

          {/* Model Dropdown */}
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="appearance-none bg-zinc-900 border border-zinc-800 text-xs rounded-md pl-3 pr-8 py-1.5 font-mono text-zinc-200 hover:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-zinc-500 font-mono hidden md:block">
            Auto-sync: Active
          </div>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Code Editor (Cursor Experience) */}
        <div className="flex-1 flex flex-col border-r border-zinc-800/80 bg-[#1e1e1e]">
          {/* File Tab Bar */}
          <div className="h-9 bg-[#181818] border-b border-zinc-800/70 flex items-center px-2 gap-1 overflow-x-auto text-xs">
            {['agent.ts', 'gateway.ts', 'schema.ts'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFile(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t border-t-2 text-xs font-mono transition-colors ${
                  activeFile === f
                    ? 'bg-[#1e1e1e] border-amber-500 text-zinc-100 font-medium'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                {f}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-zinc-500 font-mono pr-2">
              Context Attached
            </span>
          </div>

          {/* Monaco Editor */}
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
        </div>

        {/* Right: AI Intelligence Panel (Grok / Gemini Chat) */}
        <div className="w-[480px] flex flex-col bg-[#121418] border-l border-zinc-800/80">
          {/* Chat Header */}
          <div className="h-9 border-b border-zinc-800/70 px-3 flex items-center justify-between text-xs text-zinc-400 bg-[#15181e]">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span>{persona === 'grok' ? 'Grok Intelligence' : 'Cursor Copilot'}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
              <span>{activeFile}</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-zinc-300 font-semibold text-sm">Dawn Engine Ready</h3>
                  <p className="text-xs text-zinc-500 max-w-[260px] mt-1">
                    Ask questions, refactor <code className="text-amber-400/90">{activeFile}</code>, or instruct Dawn to write new systems.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-1.5 w-full pt-2">
                  {[
                    'Explain the agent loop in active code',
                    'Add streaming response handling',
                    'Convert to production Next.js route handler',
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSendMessage(preset)}
                      className="text-left px-2.5 py-1.5 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-[11px]"
                    >
                      → {preset}
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
                    <span className="uppercase">{m.role === 'user' ? 'Kyle' : persona}</span>
                    <div className="flex items-center gap-1.5">
                      {m.role === 'assistant' && (
                        <button
                          onClick={() => applyCodeToEditor(m.content)}
                          title="Apply code to editor"
                          className="hover:text-amber-400 flex items-center gap-1"
                        >
                          <SquareCode className="w-3 h-3" />
                          <span>Apply</span>
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(m.content, m.id)}
                        className="hover:text-zinc-300"
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
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono italic">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Thinking & generating...
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
                placeholder={`Ask ${persona === 'grok' ? 'Grok' : 'Dawn'} or type instruction... (Enter to send)`}
                rows={2}
                className="w-full bg-transparent px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none font-sans"
              />
              <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-zinc-800/50 text-[11px] text-zinc-500">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="font-mono text-[10px]">{selectedModel}</span>
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
    </div>
  );
}
