declare module 'node:sqlite' {
  export type SQLInputValue = string | number | bigint | null | Uint8Array;
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      get(...args: SQLInputValue[]): unknown;
      all(...args: SQLInputValue[]): unknown[];
      run(...args: SQLInputValue[]): { changes: number };
    };
    close(): void;
  }
}
