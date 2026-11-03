import * as vscode from 'vscode';
import type { FileEdit } from '../../src/shared/edits.ts';

/**
 * Both sides of a review diff are virtual documents. The workspace file is
 * not opened or written until Accept. That is the same gate Cline uses for
 * an edit preview, implemented here for Dawn Code.
 */
export class ReviewProvider implements vscode.TextDocumentContentProvider {
  readonly scheme = 'dawn-code-review';
  private readonly texts = new Map<string, string>();
  private readonly emitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.emitter.event;

  put(key: string, text: string): vscode.Uri {
    const uri = vscode.Uri.from({ scheme: this.scheme, path: `/${key}` });
    this.texts.set(uri.toString(), text);
    this.emitter.fire(uri);
    return uri;
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.texts.get(uri.toString()) ?? '';
  }

  dispose(): void {
    this.emitter.dispose();
  }
}

export async function showChanges(provider: ReviewProvider, root: vscode.Uri, edits: FileEdit[]): Promise<void> {
  const entries = edits.map((edit) => {
    const file = vscode.Uri.joinPath(root, edit.path);
    const before = provider.put(`before/${edit.path}`, edit.original);
    const after = provider.put(`after/${edit.path}`, edit.proposed);
    return [file, before, after] as [vscode.Uri, vscode.Uri, vscode.Uri];
  });
  if (!entries.length) return;
  try {
    await vscode.commands.executeCommand('vscode.changes', 'Dawn Code review', entries);
  } catch {
    const [edit] = edits;
    await vscode.commands.executeCommand('vscode.diff', entries[0][1], entries[0][2], `Dawn Code: ${edit.path}`);
  }
}

export async function closeReviewEditors(): Promise<void> {
  for (const group of vscode.window.tabGroups.all) {
    const tabs = group.tabs.filter((tab) => {
      const input = tab.input;
      if (input instanceof vscode.TabInputTextDiff) {
        return input.original.scheme === 'dawn-code-review' || input.modified.scheme === 'dawn-code-review';
      }
      if (input instanceof vscode.TabInputText) return input.uri.scheme === 'dawn-code-review';
      return false;
    });
    if (tabs.length) await vscode.window.tabGroups.close(tabs);
  }
}
