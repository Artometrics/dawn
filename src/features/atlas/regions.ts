import { CARDINAL } from './data/cardinal/index.ts';
import type { Region } from './lib/types.ts';

/** Every region Atlas can open. A new region is a data folder plus one line here. */
export const REGIONS: Region[] = [CARDINAL];

export const DEFAULT_REGION = CARDINAL;

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((region) => region.id === id);
}
