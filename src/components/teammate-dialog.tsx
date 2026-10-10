'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2, Sparkles, User, Brain, ShieldAlert } from 'lucide-react';
import { Teammate } from '@/types/teammate';

const PRESETS = [
  {
    role: 'Grok Strategist',
    instructions:
      'Challenge weak technical assumptions, propose modular, scalable architectures, and write robust, production-grade code. Avoid corporate boilerplate.',
    model: 'gemini-2.0-flash',
    accentColor: '#f59e0b',
  },
  {
    role: 'Fullstack Architect',
    instructions:
      'Design end-to-end fullstack systems connecting Next.js 15 App Router, Prisma ORM, and streaming APIs with high test coverage and clean type contracts.',
    model: 'gemini-1.5-pro',
    accentColor: '#3b82f6',
  },
  {
    role: 'Security & Auth Auditor',
    instructions:
      'Review code for security vulnerabilities, OAuth misconfigurations, token leakage, OWASP top 10 flaws, and rate-limiting needs.',
    model: 'gemini-1.5-pro',
    accentColor: '#10b981',
  },
  {
    role: 'Performance Tuner',
    instructions:
      'Analyze bundle sizes, database query plans, memory leaks, and render latency. Recommend precise, measurable speed optimizations.',
    model: 'gemini-2.0-flash',
    accentColor: '#ec4899',
  },
];

interface TeammateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveTeammate: (teammate: Teammate) => void;
  existingTeammate?: Teammate | null;
}

export function TeammateDialog({
  open,
  onOpenChange,
  onSaveTeammate,
  existingTeammate,
}: TeammateDialogProps) {
  const [name, setName] = useState(existingTeammate?.name || '');
  const [role, setRole] = useState(existingTeammate?.role || '');
  const [instructions, setInstructions] = useState(existingTeammate?.instructions || '');
  const [model, setModel] = useState(existingTeammate?.model || 'gemini-2.0-flash');
  const [accentColor, setAccentColor] = useState(existingTeammate?.accentColor || '#f59e0b');
  const [memories, setMemories] = useState<string[]>(existingTeammate?.memory || []);
  const [newMemory, setNewMemory] = useState('');

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.role);
    setRole(preset.role);
    setInstructions(preset.instructions);
    setModel(preset.model);
    setAccentColor(preset.accentColor);
  };

  const addMemory = () => {
    if (!newMemory.trim()) return;
    setMemories([...memories, newMemory.trim()]);
    setNewMemory('');
  };

  const removeMemory = (idx: number) => {
    setMemories(memories.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!name.trim() || !role.trim() || !instructions.trim()) return;

    const teammate: Teammate = {
      id: existingTeammate?.id || `bot-${Date.now()}`,
      name: name.trim(),
      role: role.trim(),
      instructions: instructions.trim(),
      model,
      avatarSeed: existingTeammate?.avatarSeed || name.toLowerCase().replace(/\s+/g, '-'),
      memory: memories,
      accentColor,
    };

    onSaveTeammate(teammate);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg bg-[#14171d] border border-zinc-800 rounded-xl p-6 shadow-2xl z-50 text-zinc-100 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
                style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
              >
                <Brain className="w-4 h-4" />
              </div>
              <Dialog.Title className="font-semibold text-sm">
                {existingTeammate ? 'Edit Teammate' : 'Create AI Teammate'}
              </Dialog.Title>
            </div>
            <Dialog.Close className="text-zinc-400 hover:text-zinc-200 p-1">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          {/* Quick Presets */}
          <div className="mt-4">
            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="text-left p-2 rounded bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 text-xs transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-zinc-200">{p.role}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.accentColor }} />
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Teammate Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grok Strategist"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Role / Job Title</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Autonomous Lead Architect"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Model Engine</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                <option value="x-ai/grok-2-1212">Grok 2 (OpenRouter/xAI)</option>
                <option value="deepseek/deepseek-chat">DeepSeek V3</option>
                <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">System Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="Define how this teammate behaves, solves problems, and writes code..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-none font-sans"
              />
            </div>

            {/* Persistent Memory Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-amber-400" />
                  <span>Persistent Bot Memory ({memories.length})</span>
                </label>
              </div>
              <p className="text-[11px] text-zinc-500 mb-2">
                Notes and facts this teammate remembers across every prompt and file.
              </p>

              <div className="space-y-1.5 max-h-32 overflow-y-auto mb-2">
                {memories.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 bg-zinc-900/60 border border-zinc-800/80 px-2.5 py-1.5 rounded text-xs text-zinc-300"
                  >
                    <span className="truncate flex-1">{m}</span>
                    <button
                      type="button"
                      onClick={() => removeMemory(idx)}
                      className="text-zinc-500 hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMemory();
                    }
                  }}
                  placeholder="Add a new project rule or memory note..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={addMemory}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-200 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Save Teammate</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
