import type { ComputerResult, ComputerTask } from './computer';
import type { WorkerKind, WorkerStatus } from './types';
import { newId } from './ids';

type Job = {
  id: string;
  agentId: string;
  kind: WorkerKind;
  task: ComputerTask;
  resolve: (result: ComputerResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

type Slot = {
  workerId: string;
  kind: WorkerKind;
  host: string;
  platform: string;
  seenAt: number;
};

const ONLINE_MS = 35_000;

function offlineMessage(kind: WorkerKind): string {
  if (kind === 'linux') return 'The Hetzner worker is offline. On the Ubuntu server, check systemctl status dawn-agents.';
  return 'The Mac worker is offline.';
}

export class WorkerHub {
  private slots = new Map<WorkerKind, Slot>();
  private queues = new Map<WorkerKind, Job[]>();
  private waiters = new Map<string, (job: Job | null) => void>();
  private jobs = new Map<string, Job>();

  hello(input: { kind: WorkerKind; host: string; platform: string }): { workerId: string } {
    const current = this.slots.get(input.kind);
    const workerId = current?.workerId ?? newId('w');
    this.slots.set(input.kind, {
      workerId,
      kind: input.kind,
      host: input.host.slice(0, 80),
      platform: input.platform.slice(0, 80),
      seenAt: Date.now(),
    });
    return { workerId };
  }

  status(): { linux: WorkerStatus | null; mac: WorkerStatus | null } {
    return { linux: this.one('linux'), mac: this.one('mac') };
  }

  online(kind: WorkerKind): boolean {
    const slot = this.slots.get(kind);
    return Boolean(slot && Date.now() - slot.seenAt < ONLINE_MS);
  }

  private one(kind: WorkerKind): WorkerStatus | null {
    const slot = this.slots.get(kind);
    if (!slot) return null;
    return {
      kind,
      host: slot.host,
      platform: slot.platform,
      seenAt: slot.seenAt,
      online: Date.now() - slot.seenAt < ONLINE_MS,
    };
  }

  enqueue(kind: WorkerKind, agentId: string, task: ComputerTask): Promise<ComputerResult> {
    if (!this.online(kind)) return Promise.resolve({ status: 'error', message: offlineMessage(kind) });
    const slot = this.slots.get(kind);
    if (!slot) return Promise.resolve({ status: 'error', message: offlineMessage(kind) });
    return new Promise((resolve) => {
      const job: Job = {
        id: newId('job'),
        agentId,
        kind,
        task,
        resolve,
        timer: setTimeout(() => {
          this.jobs.delete(job.id);
          resolve({ status: 'error', message: 'The worker did not finish in time.' });
        }, 20_000),
      };
      this.jobs.set(job.id, job);
      const waiter = this.waiters.get(slot.workerId);
      if (waiter) {
        this.waiters.delete(slot.workerId);
        waiter(job);
      } else {
        const queue = this.queues.get(kind) ?? [];
        queue.push(job);
        this.queues.set(kind, queue);
      }
    });
  }

  poll(workerId: string, kind: WorkerKind, waitMs: number): Promise<Job | null> {
    const slot = this.slots.get(kind);
    if (!slot || slot.workerId !== workerId) return Promise.resolve(null);
    slot.seenAt = Date.now();
    const queue = this.queues.get(kind);
    if (queue && queue.length) return Promise.resolve(queue.shift() ?? null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiters.delete(workerId);
        resolve(null);
      }, waitMs);
      this.waiters.set(workerId, (job) => {
        clearTimeout(timer);
        resolve(job);
      });
    });
  }

  finish(jobId: string, result: ComputerResult): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    clearTimeout(job.timer);
    this.jobs.delete(jobId);
    job.resolve(result);
    return true;
  }

  close(): void {
    for (const waiter of this.waiters.values()) waiter(null);
    this.waiters.clear();
    for (const job of this.jobs.values()) {
      clearTimeout(job.timer);
      job.resolve({ status: 'error', message: 'Gateway stopped.' });
    }
    this.jobs.clear();
  }
}
