import * as vscode from 'vscode';
import { lineStats, prepareApply, type FileEdit } from '../../src/shared/edits.ts';
import { MODEL_CHOICES } from '../../src/shared/models.ts';
import { clip } from '../../src/shared/paths.ts';
import { formatSpend, type SpendView } from '../../src/shared/spend.ts';
import { postJson, postSse } from './net.ts';
import { ReviewProvider, closeReviewEditors, showChanges } from './review.ts';

type Mode = 'chat' | 'inline' | 'agent';

type PanelMessage = { role: 'user' | 'assistant' | 'note'; text: string };

type ReviewState = {
  summary: string;
  files: { path: string; summary: string; added: number; removed: number }[];
};

type PanelState = {
  mode: Mode;
  model: string;
  models: { id: string; label: string }[];
  spendLabel: string;
  spendRatio: number;
  spendWarn: boolean;
  contextLabel: string;
  messages: PanelMessage[];
  steps: { title: string; status: string }[];
  review: ReviewState | null;
  banner: string | null;
  busy: boolean;
  trainingNote: string | null;
};

type Pending = {
  mode: 'inline' | 'agent';
  model: string;
  prompt: string;
  response: string;
  edits: FileEdit[];
  inline?: { uri: vscode.Uri; range: vscode.Range; selection: string; replacement: string };
};

type TrainingDelivery = { forwarded?: boolean; stubbed?: boolean; logged?: boolean };

const EMPTY: Record<Mode, string> = {
  chat: 'Ask about the open file or the selection.',
  inline: 'Select code, then describe the change. Nothing is written until you accept.',
  agent: 'Describe a change across files. Dawn Code holds the diff for review.',
};

function token(): string {
  return process.env.DAWN_CODE_TOKEN ?? '';
}

function gateway(): string {
  return vscode.workspace.getConfiguration('dawnCode').get<string>('gatewayUrl') || 'http://127.0.0.1:8791';
}

function trainingNote(delivery: TrainingDelivery | null | undefined): string | null {
  if (!delivery) return null;
  if (delivery.forwarded) return 'Saved to Dawn’s training log.';
  if (delivery.stubbed || delivery.logged) return 'Kept on this server. Dawn’s training log API is not merged yet.';
  return null;
}

class DawnCodeView implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private state: PanelState;
  private pending: Pending | null = null;
  private selectionTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly reviews: ReviewProvider,
  ) {
    const model = vscode.workspace.getConfiguration('dawnCode').get<string>('model') || MODEL_CHOICES[0].id;
    this.state = {
      mode: 'chat',
      model,
      models: MODEL_CHOICES,
      spendLabel: 'Spend unavailable',
      spendRatio: 0,
      spendWarn: false,
      contextLabel: 'No file open',
      messages: [],
      steps: [],
      review: null,
      banner: null,
      busy: false,
      trainingNote: null,
    };
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    const webview = webviewView.webview;
    webview.options = { enableScripts: true, localResourceRoots: [this.context.extensionUri] };
    webview.html = this.html(webview);
    webview.onDidReceiveMessage((message: { type?: string; mode?: Mode; text?: string; model?: string; path?: string }) => {
      if (message.type === 'ready') {
        this.refreshContext();
        void this.refreshSpend();
        this.post();
      } else if (message.type === 'mode' && message.mode) {
        this.state.mode = message.mode;
        this.post();
      } else if (message.type === 'model' && message.model) {
        this.state.model = message.model;
        void vscode.workspace.getConfiguration('dawnCode').update('model', message.model, vscode.ConfigurationTarget.Global);
      } else if (message.type === 'send' && message.text) {
        void this.dispatch(message.mode ?? this.state.mode, message.text, message.model ?? this.state.model);
      } else if (message.type === 'accept') void this.accept();
      else if (message.type === 'reject') void this.reject();
      else if (message.type === 'diff') void this.openDiff(message.path);
      else if (message.type === 'handoff') void this.handoff();
    });
    this.refreshContext();
    this.post();
  }

  private html(webview: vscode.Webview): string {
    const nonce = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
    const css = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'panel.css'));
    const script = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'panel.js'));
    const csp = webview.cspSource;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp}; script-src ${csp} 'nonce-${nonce}'; img-src ${csp} data:;">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${css}">
<title>Dawn Code</title>
</head>
<body>
<div class="app">
  <header class="top">
    <div class="brand">
      <svg class="mark" viewBox="0 0 28 28" aria-hidden="true"><path fill="currentColor" d="M14 2.5 25 9.2v9.6L14 25.5 3 18.8V9.2L14 2.5zm0 3.2L6.2 10.4v7.2L14 22.3l7.8-4.7v-7.2L14 5.7z"/><path fill="#ff3d8a" d="M14 9.2 18.6 14 14 18.8 9.4 14 14 9.2z"/></svg>
      <h1>Dawn Code</h1>
    </div>
    <p class="spend" id="spend">Spend unavailable</p>
    <div class="filament" id="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Monthly spend">
      <span id="filament"></span>
    </div>
  </header>
  <div class="tabs" role="tablist" aria-label="Dawn Code mode">
    <button type="button" class="tab" id="tab-chat" role="tab" aria-selected="true" data-mode="chat">Chat</button>
    <button type="button" class="tab" id="tab-inline" role="tab" aria-selected="false" data-mode="inline">Inline</button>
    <button type="button" class="tab" id="tab-agent" role="tab" aria-selected="false" data-mode="agent">Agent</button>
  </div>
  <div id="transcript" class="transcript" aria-live="polite"></div>
  <section id="review" class="review" hidden></section>
  <form id="composer" class="composer">
    <p id="banner" class="banner" hidden></p>
    <p id="training" class="training" hidden></p>
    <label class="model-label" for="model">Model</label>
    <select id="model"></select>
    <p id="context" class="context"></p>
    <label class="ask-label" for="input" id="ask">Ask</label>
    <textarea id="input" rows="3"></textarea>
    <div class="actions">
      <button type="button" id="handoff" class="handoff">Send to Dawn agent</button>
      <button type="submit" id="send" class="send">Send</button>
    </div>
  </form>
</div>
<script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }

  private post(): void {
    this.view?.webview.postMessage({ type: 'state', state: this.state });
  }

  private note(text: string): void {
    this.state.messages = [...this.state.messages, { role: 'note', text }];
    this.post();
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Dawn Code could not finish that request.';
    this.state.banner = message;
    this.state.busy = false;
    this.post();
  }

  refreshContext(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.scheme === 'dawn-code-review') {
      this.state.contextLabel = 'No file open';
    } else {
      const relative = vscode.workspace.asRelativePath(editor.document.uri);
      const selection = editor.selection;
      const lines = selection.isEmpty ? '' : ` · lines ${selection.start.line + 1}–${selection.end.line + 1}`;
      this.state.contextLabel = `${relative}${lines}`;
    }
    this.post();
  }

  private snapshot() {
    const editor = vscode.window.activeTextEditor;
    const folder = vscode.workspace.workspaceFolders?.[0];
    const workspaceName = folder?.name ?? 'workspace';
    if (!editor || editor.document.uri.scheme !== 'file') {
      return { workspaceName, file: undefined, selection: undefined, prefix: '', suffix: '', fullFile: '', uri: undefined, range: undefined, relative: '' };
    }
    const document = editor.document;
    const relative = vscode.workspace.asRelativePath(document.uri);
    const full = document.getText();
    const range = editor.selection.isEmpty ? undefined : new vscode.Range(editor.selection.start, editor.selection.end);
    const selected = range ? document.getText(range) : '';
    const start = range ? document.offsetAt(range.start) : 0;
    const end = range ? document.offsetAt(range.end) : 0;
    return {
      workspaceName,
      relative,
      uri: document.uri,
      range,
      fullFile: full,
      prefix: clip(full.slice(Math.max(0, start - 8_000), start), 8_000).text,
      suffix: clip(full.slice(end, end + 8_000), 8_000).text,
      file: {
        path: relative,
        language: document.languageId,
        content: clip(full, 24_000).text,
      },
      selection: selected
        ? { text: clip(selected, 12_000).text, startLine: range!.start.line + 1, endLine: range!.end.line + 1 }
        : undefined,
    };
  }

  private async refreshSpend(): Promise<void> {
    if (!token()) {
      this.state.spendLabel = 'Set DAWN_CODE_TOKEN on the editor server';
      this.post();
      return;
    }
    try {
      const spend = await postJson<SpendView>(gateway(), token(), '/v1/spend');
      this.applySpend(spend);
    } catch {
      this.state.spendLabel = 'Gateway not running';
      this.post();
    }
  }

  private applySpend(spend: SpendView | undefined): void {
    if (!spend) return;
    this.state.spendLabel = formatSpend(spend);
    this.state.spendRatio = spend.ratio;
    this.state.spendWarn = spend.warn || spend.blocked;
    if (spend.blocked) this.state.banner = 'Monthly cap reached. Paid models are paused. Stand-in answers still work.';
  }

  private requireToken(): boolean {
    if (token()) return true;
    this.state.banner = 'Set DAWN_CODE_TOKEN in the editor service environment. The browser never sees model keys.';
    this.post();
    return false;
  }

  async dispatch(mode: Mode, text: string, model: string): Promise<void> {
    this.state.mode = mode;
    this.state.model = model;
    this.state.banner = null;
    this.state.busy = true;
    this.state.messages = [...this.state.messages, { role: 'user', text }];
    this.post();
    try {
      if (mode === 'chat') await this.chat(text, model);
      else if (mode === 'inline') await this.inline(text, model);
      else await this.agent(text, model);
    } catch (error) {
      this.fail(error);
    } finally {
      this.state.busy = false;
      this.post();
    }
  }

  private async chat(text: string, model: string): Promise<void> {
    if (!this.requireToken()) return;
    const snap = this.snapshot();
    this.state.messages = [...this.state.messages, { role: 'assistant', text: '' }];
    this.post();
    await postSse(gateway(), token(), '/v1/chat', {
      model,
      messages: this.state.messages.filter((message) => message.role !== 'note').slice(0, -1).map((message) => ({
        role: message.role,
        content: message.text,
      })),
      context: { workspaceName: snap.workspaceName, file: snap.file, selection: snap.selection },
    }, ({ event, data }) => {
      if (event === 'delta' && typeof data.text === 'string') {
        const messages = this.state.messages.slice();
        const last = messages[messages.length - 1];
        if (last && last.role === 'assistant') last.text += data.text;
        this.state.messages = messages;
        this.post();
      } else if (event === 'usage' && data.spend) {
        this.applySpend(data.spend as SpendView);
      } else if (event === 'training') {
        this.state.trainingNote = trainingNote(data as TrainingDelivery);
      } else if (event === 'error' && typeof data.message === 'string') {
        this.state.banner = data.message;
      }
    });
  }

  private async inline(text: string, model: string): Promise<void> {
    if (!this.requireToken()) return;
    const snap = this.snapshot();
    if (!snap.selection || !snap.range || !snap.uri) {
      this.state.banner = 'Select the code you want changed, then describe the edit.';
      return;
    }
    const result = await postJson<{
      explanation: string;
      replacement: string;
      proposedFile: string;
      spend?: SpendView;
      training?: TrainingDelivery;
    }>(gateway(), token(), '/v1/edit', {
      model,
      instruction: text,
      path: snap.relative,
      language: snap.file?.language,
      selection: snap.selection.text,
      prefix: snap.prefix,
      suffix: snap.suffix,
      fullFile: clip(snap.fullFile, 200_000).text,
      startLine: snap.selection.startLine,
      endLine: snap.selection.endLine,
    });
    const edit: FileEdit = {
      path: snap.relative,
      original: snap.fullFile,
      proposed: result.proposedFile,
      summary: result.explanation,
    };
    this.pending = {
      mode: 'inline',
      model,
      prompt: text,
      response: result.explanation,
      edits: [edit],
      inline: { uri: snap.uri, range: snap.range, selection: snap.selection.text, replacement: result.replacement },
    };
    const stats = lineStats(snap.selection.text, result.replacement);
    this.state.review = {
      summary: result.explanation,
      files: [{ path: snap.relative, summary: result.explanation, added: stats.added, removed: stats.removed }],
    };
    this.state.trainingNote = trainingNote(result.training);
    this.applySpend(result.spend);
    this.state.messages = [...this.state.messages, { role: 'assistant', text: result.explanation }];
    const root = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (root) await showChanges(this.reviews, root, [edit]);
  }

  private async agent(text: string, model: string): Promise<void> {
    if (!this.requireToken()) return;
    const files = await this.workspaceFiles();
    if (!files.length) {
      this.state.banner = 'Open a folder with source files before running the agent.';
      return;
    }
    this.state.steps = [];
    this.state.review = null;
    await postSse(gateway(), token(), '/v1/agent', { model, task: text, files }, ({ event, data }) => {
      if (event === 'step' && typeof data.title === 'string') {
        this.state.steps = [...this.state.steps, { title: data.title, status: String(data.status ?? 'done') }];
        this.post();
      } else if (event === 'review' && Array.isArray(data.edits)) {
        const edits = data.edits as FileEdit[];
        this.pending = { mode: 'agent', model, prompt: text, response: this.state.steps.map((step) => step.title).join('\n'), edits };
        this.state.review = {
          summary: edits.length ? `${edits.length} file${edits.length === 1 ? '' : 's'} ready for review` : 'No file changes were proposed.',
          files: edits.map((edit) => {
            const stats = lineStats(edit.original, edit.proposed);
            return { path: edit.path, summary: edit.summary, added: stats.added, removed: stats.removed };
          }),
        };
      } else if (event === 'usage' && data.spend) this.applySpend(data.spend as SpendView);
      else if (event === 'training') this.state.trainingNote = trainingNote(data as TrainingDelivery);
      else if (event === 'error' && typeof data.message === 'string') this.state.banner = data.message;
    });
    const root = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (root && this.pending?.edits.length) await showChanges(this.reviews, root, this.pending.edits);
    if (!this.pending?.edits.length) this.note('The agent finished without a file change.');
  }

  private async workspaceFiles(): Promise<{ path: string; content: string }[]> {
    const active = vscode.window.activeTextEditor;
    const found = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx,mjs,cjs,css,json,md}',
      '**/{node_modules,.git,dist,out,.next,coverage}/**',
      30,
    );
    const ordered = active && active.document.uri.scheme === 'file'
      ? [active.document.uri, ...found.filter((uri) => uri.toString() !== active.document.uri.toString())]
      : found;
    const files: { path: string; content: string }[] = [];
    for (const uri of ordered) {
      if (files.length >= 12 || uri.scheme !== 'file') continue;
      const relative = vscode.workspace.asRelativePath(uri);
      if (relative.startsWith('..')) continue;
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        if (bytes.byteLength > 80_000) continue;
        const content = Buffer.from(bytes).toString('utf8');
        if (content.includes('\0')) continue;
        files.push({ path: relative, content });
      } catch {
        continue;
      }
    }
    return files;
  }

  async accept(): Promise<void> {
    const pending = this.pending;
    if (!pending) {
      this.state.banner = 'There is no review open.';
      this.post();
      return;
    }
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) return;
    try {
      if (pending.inline) {
        const document = await vscode.workspace.openTextDocument(pending.inline.uri);
        if (document.getText(pending.inline.range) !== pending.inline.selection) {
          this.state.banner = 'The selection changed. Reject this edit and run it again.';
          this.post();
          return;
        }
        const workspace = new vscode.WorkspaceEdit();
        workspace.replace(pending.inline.uri, pending.inline.range, pending.inline.replacement);
        const applied = await vscode.workspace.applyEdit(workspace);
        if (!applied) throw new Error('VS Code did not apply the edit.');
      } else {
        const current = new Map<string, string | null>();
        for (const edit of pending.edits) {
          const uri = vscode.Uri.joinPath(root.uri, edit.path);
          try {
            current.set(edit.path, Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'));
          } catch {
            current.set(edit.path, null);
          }
        }
        const plan = prepareApply(pending.edits, current);
        if (plan.conflicts.length) {
          this.state.banner = `These files changed since the review: ${plan.conflicts.join(', ')}. Nothing was written.`;
          this.post();
          return;
        }
        const workspace = new vscode.WorkspaceEdit();
        for (const edit of plan.ok) {
          const uri = vscode.Uri.joinPath(root.uri, edit.path);
          if (edit.original === '' && current.get(edit.path) === null) {
            workspace.createFile(uri, { ignoreIfExists: true, contents: Buffer.from(edit.proposed) });
          } else {
            const document = await vscode.workspace.openTextDocument(uri);
            const whole = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
            workspace.replace(uri, whole, edit.proposed);
          }
        }
        const applied = await vscode.workspace.applyEdit(workspace);
        if (!applied) throw new Error('VS Code did not apply the edits.');
      }
      await this.logDecision(pending, 'accept');
      await closeReviewEditors();
      this.pending = null;
      this.state.review = null;
      this.note('Accepted. The files are updated.');
    } catch (error) {
      this.fail(error);
    }
  }

  async reject(): Promise<void> {
    const pending = this.pending;
    if (!pending) {
      this.state.banner = 'There is no review open.';
      this.post();
      return;
    }
    await this.logDecision(pending, 'reject');
    await closeReviewEditors();
    this.pending = null;
    this.state.review = null;
    this.note('Rejected. No files were changed.');
  }

  private async logDecision(pending: Pending, action: 'accept' | 'reject'): Promise<void> {
    if (!token()) return;
    try {
      const result = await postJson<TrainingDelivery>(gateway(), token(), '/v1/training-log', {
        kind: pending.mode,
        action,
        model: pending.model,
        prompt: pending.prompt,
        response: pending.response,
        paths: pending.edits.map((edit) => edit.path),
        edit: pending.edits.map((edit) => ({ path: edit.path, before: edit.original, after: edit.proposed })),
      });
      this.state.trainingNote = trainingNote(result);
    } catch {
      this.state.trainingNote = 'The decision was applied here. The training log did not save.';
    }
  }

  private async openDiff(path: string | undefined): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root || !this.pending) return;
    const edits = path ? this.pending.edits.filter((edit) => edit.path === path) : this.pending.edits;
    await showChanges(this.reviews, root.uri, edits.length ? edits : this.pending.edits);
  }

  async promptInline(): Promise<void> {
    this.state.mode = 'inline';
    this.post();
    await vscode.commands.executeCommand('dawnCode.chat.focus');
    const instruction = await vscode.window.showInputBox({ title: 'Dawn Code inline edit', prompt: 'Describe the change to the selection', ignoreFocusOut: true });
    if (instruction) await this.dispatch('inline', instruction, this.state.model);
  }

  async promptAgent(): Promise<void> {
    this.state.mode = 'agent';
    this.post();
    await vscode.commands.executeCommand('dawnCode.chat.focus');
    const task = await vscode.window.showInputBox({ title: 'Dawn Code agent', prompt: 'Describe the change across files', ignoreFocusOut: true });
    if (task) await this.dispatch('agent', task, this.state.model);
  }

  async insertRecipe(): Promise<void> {
    if (!this.requireToken()) return;
    await vscode.commands.executeCommand('dawnCode.chat.focus');
    try {
      const listed = await postJson<{ stubbed: boolean; message?: string; recipes: { id: string; name: string; tags: string[] }[] }>(gateway(), token(), '/v1/dawn-agents/recipes');
      if (listed.stubbed || !listed.recipes.length) {
        const message = listed.message ?? 'No Style Recipes were returned.';
        this.state.banner = message;
        this.post();
        void vscode.window.showWarningMessage(message);
        return;
      }
      const picked = await vscode.window.showQuickPick(
        listed.recipes.map((recipe) => ({ label: recipe.name, description: recipe.tags.join(', '), id: recipe.id })),
        { title: 'Insert a Style Recipe', ignoreFocusOut: true },
      );
      if (!picked) return;
      const snippet = await postJson<{ html: string; name: string; stubbed: boolean; message?: string }>(gateway(), token(), `/v1/dawn-agents/recipes/${encodeURIComponent(picked.id)}`);
      if (!snippet.html) {
        const message = snippet.message ?? 'That recipe has no HTML.';
        this.state.banner = message;
        this.post();
        void vscode.window.showWarningMessage(message);
        return;
      }
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.uri.scheme !== 'file') {
        this.state.banner = 'Open a file before inserting a recipe.';
        this.post();
        return;
      }
      const applied = await editor.edit((builder) => builder.insert(editor.selection.active, snippet.html));
      if (!applied) throw new Error('VS Code did not insert the recipe.');
      const relative = vscode.workspace.asRelativePath(editor.document.uri);
      await postJson(gateway(), token(), '/v1/training-log', {
        kind: 'inline',
        action: 'edit',
        model: this.state.model,
        prompt: `Insert Style Recipe ${snippet.name}`,
        response: snippet.html,
        paths: [relative],
      });
      this.note(`Inserted ${snippet.name}.`);
    } catch (error) {
      this.fail(error);
    }
  }

  async handoff(): Promise<void> {
    if (!this.requireToken()) return;
    await vscode.commands.executeCommand('dawnCode.chat.focus');
    this.state.busy = true;
    this.post();
    try {
      const listed = await postJson<{ stubbed: boolean; message?: string; agents: { id: string; name: string; computer?: string }[] }>(gateway(), token(), '/v1/dawn-agents/agents');
      const picked = await vscode.window.showQuickPick(
        listed.agents.map((agent) => ({
          label: agent.name,
          description: listed.stubbed ? 'Stub' : agent.computer ?? '',
          detail: agent.id,
          agentId: agent.id,
        })),
        { title: listed.stubbed ? 'Dawn Agents is not merged. This handoff stays local.' : 'Send to a Dawn agent', ignoreFocusOut: true },
      );
      if (!picked) return;
      const snap = this.snapshot();
      const prompt = await vscode.window.showInputBox({
        title: `Task for ${picked.label}`,
        value: snap.selection?.text ? `Look at ${snap.relative}:\n${snap.selection.text}` : '',
        prompt: 'What should the agent do?',
        ignoreFocusOut: true,
      });
      if (!prompt) return;
      const job = await postJson<{ stubbed: boolean; status: string; message?: string; replies: { content: string }[] }>(gateway(), token(), '/v1/dawn-agents/jobs', {
        agentId: picked.agentId,
        prompt,
        title: 'Dawn Code handoff',
      });
      const reply = job.replies.map((item) => item.content).filter(Boolean).join('\n');
      const line = job.stubbed
        ? `Not sent. ${job.message ?? 'Dawn Agents is not merged yet.'}`
        : `${job.status}. ${reply || 'The agent returned no text.'}`;
      this.note(line);
    } catch (error) {
      this.fail(error);
    } finally {
      this.state.busy = false;
      this.post();
    }
  }

  async demo(): Promise<void> {
    await vscode.workspace.getConfiguration('workbench').update('colorTheme', 'Artometrics Dark', vscode.ConfigurationTarget.Global);
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder) {
      for (const relative of ['editor/sample/hello.ts', 'sample/hello.ts']) {
        try {
          const document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(folder.uri, relative));
          const editor = await vscode.window.showTextDocument(document);
          const text = document.getText();
          const start = text.indexOf('return message');
          if (start >= 0) {
            editor.selection = new vscode.Selection(document.positionAt(start), document.positionAt(start + 'return message'.length));
          }
          break;
        } catch {
          continue;
        }
      }
    }
    await vscode.commands.executeCommand('dawnCode.chat.focus');
    this.refreshContext();
  }

  watchEditor(): vscode.Disposable {
    return vscode.window.onDidChangeTextEditorSelection(() => {
      if (this.selectionTimer) clearTimeout(this.selectionTimer);
      this.selectionTimer = setTimeout(() => this.refreshContext(), 150);
    });
  }
}

let current: DawnCodeView | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const reviews = new ReviewProvider();
  const view = new DawnCodeView(context, reviews);
  current = view;
  context.subscriptions.push(
    reviews,
    view.watchEditor(),
    vscode.window.registerWebviewViewProvider('dawnCode.chat', view, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.workspace.registerTextDocumentContentProvider(reviews.scheme, reviews),
    vscode.commands.registerCommand('dawnCode.inlineEdit', () => view.promptInline()),
    vscode.commands.registerCommand('dawnCode.agentRun', () => view.promptAgent()),
    vscode.commands.registerCommand('dawnCode.sendToAgent', () => view.handoff()),
    vscode.commands.registerCommand('dawnCode.insertRecipe', () => view.insertRecipe()),
    vscode.commands.registerCommand('dawnCode.acceptChange', () => view.accept()),
    vscode.commands.registerCommand('dawnCode.rejectChange', () => view.reject()),
  );
  if (process.env.DAWN_CODE_DEMO === '1') {
    setTimeout(() => void view.demo(), 600);
  }
}

export function deactivate(): void {
  current = undefined;
}
