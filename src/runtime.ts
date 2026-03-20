import type { BuzRuntimeState } from "./types.js";

const runtime = {
  clients: new Map<string, any>(),
  states: new Map<string, BuzRuntimeState>(),
};

export function setBuzRuntime(accountId: string, client: any): void {
  runtime.clients.set(accountId, client);
}

export function getBuzRuntime(accountId: string): any {
  return runtime.clients.get(accountId);
}

export function removeBuzRuntime(accountId: string): void {
  runtime.clients.delete(accountId);
  runtime.states.delete(accountId);
}

export function setBuzRuntimeState(accountId: string, state: BuzRuntimeState): void {
  runtime.states.set(accountId, state);
}

export function getBuzRuntimeState(accountId: string): BuzRuntimeState | undefined {
  return runtime.states.get(accountId);
}

export function listBuzRuntimes(): Array<{ accountId: string; client: any }> {
  return Array.from(runtime.clients.entries()).map(([accountId, client]) => ({
    accountId,
    client,
  }));
}
