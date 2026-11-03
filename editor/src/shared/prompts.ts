export type CodeContext = {
  workspaceName?: string;
  file?: { path: string; language: string; content: string };
  selection?: { text: string; startLine: number; endLine: number };
  files?: string[];
};

const EDITOR_RULES = [
  'You are Dawn Code, the assistant inside Kyle’s editor.',
  'Answer about the open file, the selection, and the workspace list you are given.',
  'Do not invent files that are not in the context.',
  'Prefer a short answer and a concrete code change when one is asked for.',
].join('\n');

export function chatSystemPrompt(): string {
  return EDITOR_RULES;
}

export function contextBlock(context: CodeContext | undefined): string {
  if (!context) return 'No file is open.';
  const lines: string[] = [];
  lines.push(`Workspace: ${context.workspaceName || 'untitled'}`);
  if (context.file) {
    lines.push(`Open file: ${context.file.path} (${context.file.language})`);
    lines.push(context.file.content);
  }
  if (context.selection && context.selection.text) {
    lines.push(`Selection lines ${context.selection.startLine}-${context.selection.endLine}:`);
    lines.push(context.selection.text);
  }
  if (context.files && context.files.length) {
    lines.push('Workspace files:');
    lines.push(context.files.slice(0, 150).join('\n'));
  }
  return lines.join('\n');
}

export function inlineUserPrompt(input: {
  instruction: string;
  path: string;
  language: string;
  selection: string;
  prefix?: string;
  suffix?: string;
  startLine: number;
  endLine: number;
}): string {
  return [
    `File: ${input.path} (${input.language})`,
    `Lines ${input.startLine}-${input.endLine} are the code to edit.`,
    'Code before the selection:',
    input.prefix?.trim() ? input.prefix : '(start of file)',
    'Code to edit:',
    input.selection,
    'Code after the selection:',
    input.suffix?.trim() ? input.suffix : '(end of file)',
    `Instruction: ${input.instruction}`,
    'Return JSON only: {"explanation":"one sentence","replacement":"only the edited selection"}',
    'Do not return the surrounding file. No markdown fences.',
  ].join('\n');
}

export function agentUserPrompt(task: string, files: { path: string; content: string }[]): string {
  const body = files
    .map((file) => `FILE ${file.path}\n${file.content}`)
    .join('\n\n');
  return [
    `Task: ${task}`,
    'You may only edit the files below, or add a new relative path under the workspace.',
    'Return JSON only: {"steps":["short step"],"edits":[{"path":"relative/path","summary":"one line","content":"full new file contents"}]}',
    'content is the entire file after the edit. Do not return a diff. No markdown fences.',
    body,
  ].join('\n\n');
}

export function standInChat(question: string, context: CodeContext | undefined): string {
  const file = context?.file;
  const selection = context?.selection;
  const head = file
    ? `Open file ${file.path} (${file.language}).`
    : 'No file is open.';
  const selected = selection?.text
    ? `Selection is lines ${selection.startLine}-${selection.endLine}, ${selection.text.split('\n').length} lines.`
    : 'Nothing is selected.';
  const preview = (selection?.text || file?.content || '').split('\n').slice(0, 8).join('\n');
  return [
    head,
    selected,
    'This is a stand-in. The gateway did not call Gemini or xAI.',
    `You asked: ${question.trim() || '(empty)'}`,
    preview ? `Visible code:\n${preview}` : 'There is no code in the context yet.',
  ].join('\n\n');
}

export function standInInline(instruction: string, selection: string): { explanation: string; replacement: string } {
  const rename = instruction.match(/rename\s+([A-Za-z_][A-Za-z0-9_]*)\s+to\s+([A-Za-z_][A-Za-z0-9_]*)/i);
  if (rename) {
    const from = rename[1];
    const to = rename[2];
    return {
      explanation: `Stand-in renamed ${from} to ${to}. No model was called.`,
      replacement: selection.split(from).join(to),
    };
  }
  return {
    explanation: 'Stand-in added a note. No model was called.',
    replacement: `// ${instruction.trim().slice(0, 160) || 'Dawn Code edit'}\n${selection}`,
  };
}

export function standInAgent(task: string, files: { path: string; content: string }[]): { steps: string[]; edits: { path: string; summary: string; content: string }[] } {
  const note = `// Dawn Code: ${task.replace(/\s+/g, ' ').trim().slice(0, 120) || 'agent pass'}`;
  const edits = files.slice(0, 8).map((file) => ({
    path: file.path,
    summary: 'Add a Dawn Code note at the top',
    content: file.content.startsWith('// Dawn Code:') ? file.content : `${note}\n${file.content}`,
  }));
  return {
    steps: ['Read the workspace snapshot', 'Draft notes on each file', 'Hold the diff for review'],
    edits: edits.filter((edit) => {
      const original = files.find((file) => file.path === edit.path);
      return original && original.content !== edit.content;
    }),
  };
}
