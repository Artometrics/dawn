import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { trainingRecord, type TrainingInput, type TrainingRecord } from '../shared/training.ts';

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
    fetchImpl?: typeof fetch;
    env?: Record<string, string | undefined>;
    now?: () => Date;
  };

  constructor(
    file: string,
    options: {
      url?: string;
      token?: string;
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
    await appendFile(this.file, `${JSON.stringify(record)}\n`, { mode: 0o600 });
    const delivery = await this.forward(record);
    return { id: record.id, logged: true, ...delivery };
  }

  private async forward(record: TrainingRecord): Promise<{ forwarded: boolean; stubbed: boolean }> {
    const url = this.options.url?.trim();
    if (!url || !this.options.token) return { forwarded: false, stubbed: true };
    const fetchImpl = this.options.fetchImpl ?? fetch;
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.token}`,
        },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(4_000),
      });
      if (response.ok) return { forwarded: true, stubbed: false };
      return { forwarded: false, stubbed: true };
    } catch {
      return { forwarded: false, stubbed: true };
    }
  }
}
