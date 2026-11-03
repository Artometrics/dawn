export type PlannedTool = { name: string; input: Record<string, string> };

const WRITE_FILE = /\bwrite(?:\s+a)?\s+file\s+(\S+)\s+(?:that says|with content|with|=)\s+([\s\S]+?)(?=\s+and\s+list\b|$)/i;
const WRITE_PATH = /\bwrite\s+(\S+\.\w+)\s+(?:that says|with content|with)\s+([\s\S]+?)(?=\s+and\s+list\b|$)/i;

export function standInPlan(text: string): PlannedTool[] {
  const tools: PlannedTool[] = [];
  const write = text.match(WRITE_FILE) ?? text.match(WRITE_PATH);
  if (write) {
    tools.push({
      name: 'computer_write',
      input: { path: write[1].replace(/[.,]+$/, ''), content: write[2].trim() },
    });
  }
  if (/\blist\b[^\n]{0,48}\b(files|directory|sandbox|folder)\b/i.test(text)) {
    tools.push({ name: 'computer_list', input: { path: '.' } });
  }
  const run = text.match(/\brun\s+(.+)$/im);
  if (run) tools.push({ name: 'computer_exec', input: { command: run[1].trim() } });
  const applied = text.match(/\b(?:apply|use)(?: the)? recipe ([a-z0-9-]+)/i);
  if (applied) tools.push({ name: 'apply_recipe', input: { id: applied[1] } });
  const fetched = text.match(/\bfetch\s+(https?:\/\/\S+)/i);
  if (fetched) tools.push({ name: 'web_fetch', input: { url: fetched[1].replace(/[),.;]+$/, '') } });
  if (!write && !run && !fetched) {
    const search = text.match(/\b(?:search|look up)\b(?:\s+the\s+web)?(?:\s+for)?\s+(.+)$/i);
    if (search) tools.push({ name: 'web_search', input: { query: search[1].trim().slice(0, 200) } });
  }
  if (tools.length === 0) {
    const memory = text.match(/\bremember\s+(?:that\s+)?(.{3,400})$/i);
    if (memory) tools.push({ name: 'remember', input: { text: memory[1].trim() } });
  }
  return tools;
}

export function standInSpeech(instructions: string, userText: string, notes: string[]): string {
  if (notes.length) return notes.join('\n');
  const line = instructions
    .split('\n')
    .map((part) => part.trim())
    .find(Boolean);
  if (userText.trim().endsWith('?')) {
    return line
      ? `${line}\n\nI won't invent an answer on a stand-in turn. Ask me to search, fetch a page, or use the computer.`
      : 'I won\'t invent an answer on a stand-in turn. Ask me to search, fetch a page, or use the computer.';
  }
  return line ? line.slice(0, 320) : 'I am here.';
}
