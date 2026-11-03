import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { toBackfillLine, trainingRecord, type TrainingInput, type TrainingRecord } from '../shared/training.ts';

export type TrainingResult = {
  id: string;
  logged: true;
  forwarded: boolean;
  stubbed: boolean;
};

/**
 * Writes each interaction to the local dataset and forwards it to Dawn's
 * training log. A missing route is kept locally and marked stubbed.
 */
export class TrainingLog {
  private chain: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  private session = '';
  private readonly options: {
    url?: string;
    token?: string;
    importUrl?: string;
    ownerToken?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    loginUrl?: string;
    fetchImpl?: typeof fetch;
    env?: Record<string, string | undefined>;
    now?: () => Date;
  };

  constructor(
    file: string,
    options: {
      url?: string;
      token?: string;
      importUrl?: string;
      ownerToken?: string;
      ownerEmail?: string;
      ownerPassword?: string;
      loginUrl?: string;
      fetchImpl?: typeof fetch;
      env?: Record<string, string | undefined>;
      now?: () => Date;
    } = {},
  ) {
    this.file = file;
    this.options = options;
  }

  record(input: TrainingInput): Promise<TrainingResult> {
    const run = this.chain.then(() => this.write(input), () => this.write(input));
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async write(input: TrainingInput): Promise<TrainingResult> {
    const env = this.options.env ?? process.env;
    const record = trainingRecord(input, env, this.options.now?.() ?? new Date());
    await mkdir(path.dirname(this.file), { recursive: true });
    await appendFile(this.file, `${toBackfillLine(record)}\n`, { mode: 0o600 });
    const delivery = await this.forward(record);
    return { id: record.id, logged: true, ...delivery };
  }

  private async ownerToken(): Promise<string> {
    if (this.options.ownerToken) return this.options.ownerToken;
    if (this.session) return this.session;
    if (!this.options.loginUrl || !this.options.ownerEmail || !this.options.ownerPassword) return '';
    const fetchImpl = this.options.fetchImpl ?? fetch;
    try {
      const response = await fetchImpl(this.options.loginUrl, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.options.ownerEmail, password: this.options.ownerPassword }),
        signal: AbortSignal.timeout(4_000),
      });
      if (!response.ok) return '';
      const body = await response.json() as { token?: unknown };
      this.session = typeof body.token === 'string' ? body.token : '';
      return this.session;
    } catch {
      return '';
    }
  }

  private async post(url: string, token: string, body: unknown): Promise<boolean> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4_000),
    });
    return response.ok;
  }

  private async forward(record: TrainingRecord): Promise<{ forwarded: boolean; stubbed: boolean }> {
    const line = toBackfillLine(record);
    try {
      const owner = await this.ownerToken();
      if (this.options.importUrl && owner) {
        const imported = await this.post(this.options.importUrl, owner, { jsonl: `${line}\n` });
        if (imported) return { forwarded: true, stubbed: false };
      }
      const url = this.options.url?.trim();
      if (url && this.options.token) {
        const legacy = await this.post(url, this.options.token, record);
        if (legacy) return { forwarded: true, stubbed: false };
      }
      return { forwarded: false, stubbed: true };
    } catch {
      return { forwarded: false, stubbed: true };
    }
  }
}
