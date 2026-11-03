import type { ComputerKind, WorkerKind } from './types';
import { workerKindFor } from './types';
import type { WorkerHub } from './worker-hub';

export type ComputerTask = {
  action: 'exec' | 'write' | 'read' | 'list';
  argv?: string[];
  command?: string;
  shell?: boolean;
  path?: string;
  content?: string;
  confirmed?: boolean;
};

export type ComputerResult =
  | { status: 'ok'; stdout: string; stderr: string; exitCode: number; files?: string[] }
  | { status: 'needs_confirm'; reason: string }
  | { status: 'denied'; reason: string }
  | { status: 'error'; message: string };

/**
 * One computer per agent. v1 ships the Hetzner Linux worker and an optional Mac
 * worker. A cloud VM can implement the same submit() later.
 */
export interface ComputerProvider {
  readonly kind: ComputerKind;
  submit(agentId: string, task: ComputerTask): Promise<ComputerResult>;
}

export class WorkerComputer implements ComputerProvider {
  readonly kind: ComputerKind;
  private readonly workerKind: WorkerKind;
  private readonly hub: WorkerHub;

  constructor(kind: 'hetzner' | 'mac', hub: WorkerHub) {
    this.kind = kind;
    this.hub = hub;
    this.workerKind = workerKindFor(kind) ?? 'linux';
  }

  submit(agentId: string, task: ComputerTask): Promise<ComputerResult> {
    return this.hub.enqueue(this.workerKind, agentId, task);
  }
}

export class CloudVmComputer implements ComputerProvider {
  readonly kind = 'cloud-vm' as const;

  submit(): Promise<ComputerResult> {
    return Promise.resolve({
      status: 'error',
      message: 'Cloud VMs are not connected yet. Use the Hetzner worker, or the optional Mac worker.',
    });
  }
}

export class ComputerRouter {
  private readonly hetzner: ComputerProvider;
  private readonly mac: ComputerProvider;
  private readonly cloud: ComputerProvider;

  constructor(hub: WorkerHub) {
    this.hetzner = new WorkerComputer('hetzner', hub);
    this.mac = new WorkerComputer('mac', hub);
    this.cloud = new CloudVmComputer();
  }

  resolve(kind: ComputerKind): ComputerProvider {
    if (kind === 'mac') return this.mac;
    if (kind === 'cloud-vm') return this.cloud;
    return this.hetzner;
  }
}
