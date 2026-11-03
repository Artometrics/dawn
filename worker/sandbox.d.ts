export type SandboxTask = {
  action?: string;
  argv?: string[];
  command?: string;
  shell?: boolean;
  path?: string;
  content?: string;
  confirmed?: boolean;
};

export function assessTask(task: SandboxTask): { decision: 'allow' | 'confirm' | 'deny'; reason: string };
export function parseCommand(command: string): { argv: string[]; shell: boolean; command: string };
export function isSafeRelative(value: string): boolean;
export function pathsInArgsStayRelative(argv: string[]): boolean;
