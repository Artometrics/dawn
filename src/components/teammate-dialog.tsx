'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, Brain } from 'lucide-react';
import { Teammate } from '@/types/teammate';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChatAvatar } from '@/components/chat-avatar';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card text-card-foreground border-border shadow-2xl p-6">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <ChatAvatar seed={name || 'new-bot'} animated className="size-9 ring-1 ring-border" />
            <div>
              <DialogTitle className="text-base font-semibold">
                {existingTeammate ? 'Edit Teammate' : 'Configure AI Teammate'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Code with Antonio Grok Bot Teammate Engine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted cursor-pointer transition-colors"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {/* Quick Presets */}
        <div className="mt-3">
          <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.role}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left p-2 rounded-lg bg-muted/40 hover:bg-muted/80 border border-border text-xs transition-colors flex items-center justify-between cursor-pointer"
              >
                <span className="font-medium text-foreground">{p.role}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.accentColor }} />
              </button>
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Teammate Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grok Strategist"
              className="bg-background text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Role / Job Description
            </label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Autonomous Lead Architect"
              className="bg-background text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Model Engine
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
              <option value="x-ai/grok-2-1212">Grok 2 (OpenRouter/xAI)</option>
              <option value="deepseek/deepseek-chat">DeepSeek V3</option>
              <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Instructions & Persona
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Define how this bot behaves and what tasks it specializes in..."
              className="bg-background text-xs resize-none"
            />
          </div>

          {/* Persistent Memory Section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-amber-500" />
                <span>Persistent Memory ({memories.length})</span>
              </label>
              <Badge variant="outline" className="text-[10px] h-4">
                Retained Across Sessions
              </Badge>
            </div>

            <div className="space-y-1.5 max-h-28 overflow-y-auto mb-2">
              {memories.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 bg-muted/40 border border-border/80 px-2.5 py-1.5 rounded-md text-xs text-foreground"
                >
                  <span className="truncate flex-1">{m}</span>
                  <button
                    type="button"
                    onClick={() => removeMemory(idx)}
                    className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMemory();
                  }
                }}
                placeholder="Add a new project rule or architectural decision..."
                className="bg-background text-xs flex-1"
              />
              <Button type="button" size="sm" variant="secondary" onClick={addMemory}>
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Save Teammate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
