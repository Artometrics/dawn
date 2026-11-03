import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { monthKey, roundUsd } from '../shared/spend.ts';

export type Ledger = {
  monthKey: string;
  spentUsd: number;
  calls: number;
};

export class SpendStore {
  private chain: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  private readonly capUsd: number;
  private readonly now: () => Date;

  constructor(file: string, capUsd: number, now: () => Date = () => new Date()) {
    this.file = file;
    this.capUsd = capUsd;
    this.now = now;
  }

  get cap(): number {
    return this.capUsd;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async read(): Promise<Ledger> {
    const current = monthKey(this.now());
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8')) as Partial<Ledger>;
      if (parsed.monthKey !== current) return { monthKey: current, spentUsd: 0, calls: 0 };
      return {
        monthKey: current,
        spentUsd: roundUsd(Number(parsed.spentUsd) || 0),
        calls: Number(parsed.calls) || 0,
      };
    } catch {
      return { monthKey: current, spentUsd: 0, calls: 0 };
    }
  }

  private async write(ledger: Ledger): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(ledger), { mode: 0o600 });
    await rename(temp, this.file);
  }

  load(): Promise<Ledger> {
    return this.enqueue(() => this.read());
  }

  record(costUsd: number): Promise<Ledger> {
    return this.enqueue(async () => {
      const ledger = await this.read();
      ledger.spentUsd = roundUsd(ledger.spentUsd + Math.max(0, costUsd));
      ledger.calls += 1;
      await this.write(ledger);
      return ledger;
    });
  }
}
