import { create } from 'zustand';

import { BrowserSimulation } from '../simulation/engine';
import { STRATEGY_ORDER } from '../simulation/strategies';
import type { SimulationSnapshot, StrategyKey } from '../simulation/types';

type SimulationState = {
  engine: BrowserSimulation;
  snapshot: SimulationSnapshot;
  running: boolean;
  speed: number;
  step: (dt: number) => void;
  toggleRunning: () => void;
  setSpeed: (speed: number) => void;
  reset: (strategies?: StrategyKey[]) => void;
};

function buildEngine(strategies: StrategyKey[] = STRATEGY_ORDER) {
  const engine = new BrowserSimulation(strategies);
  return { engine, snapshot: engine.snapshot() };
}

const initial = buildEngine();

export const useSimulationStore = create<SimulationState>((set) => ({
  engine: initial.engine,
  snapshot: initial.snapshot,
  running: true,
  speed: 1,
  step: (dt) =>
    set((state) => {
      if (!state.running) {
        return state;
      }
      return { snapshot: state.engine.step(dt * state.speed) };
    }),
  toggleRunning: () => set((state) => ({ running: !state.running })),
  setSpeed: (speed) => set({ speed }),
  reset: (strategies = STRATEGY_ORDER) => {
    const next = buildEngine(strategies);
    set({ engine: next.engine, snapshot: next.snapshot, running: true });
  },
}));
