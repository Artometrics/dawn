import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { firstAllowedEmail } from '../../../src/lib/dawn-agents/proxy-auth.ts';
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
  private readonly options: {
    url?: string;
    token?: string;
    importUrl?: string;
    ownerEmail?: string;
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
      ownerEmail?: string;
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

  private async postImport(url: string, body: unknown): Promise<boolean> {
    const email = firstAllowedEmail(this.options.ownerEmail || '');
    if (!email) return false;
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Auth-Request-Email': email,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4_000),
    });
    return response.ok;
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
      if (this.options.importUrl && this.options.ownerEmail) {
        const imported = await this.postImport(this.options.importUrl, { jsonl: `${line}\n` });
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
