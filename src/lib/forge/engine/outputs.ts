import { ForgeStage } from './stage';
import type { ForgeCharacter } from '../schema';

// Files and images made from a character without touching the visible viewport.
// Each call builds a short-lived stage on a detached canvas and releases its WebGL context.

async function withStage<T>(character: ForgeCharacter, run: (stage: ForgeStage) => T | Promise<T>): Promise<T> {
  const canvas = document.createElement('canvas');
  const stage = new ForgeStage(canvas, { live: false, reducedMotion: true });
  try {
    stage.setCharacter(character);
    return await run(stage);
  } finally {
    stage.dispose();
  }
}

export type RosterShots = { portrait: string; sprite: string };

/** Small PNGs for the roster list and the Village. Both are data URLs. */
export function renderShots(character: ForgeCharacter): Promise<RosterShots> {
  return withStage(character, (stage) => ({
    portrait: stage.portrait(168, 224, false).toDataURL('image/png'),
    sprite: stage.sprite(64).toDataURL('image/png'),
  }));
}

/** Forge's 900 x 1200 portrait with the name plate. */
export function renderPortraitBlob(character: ForgeCharacter): Promise<Blob> {
  return withStage(character, (stage) => {
    const shot = stage.portrait(900, 1200, true);
    return new Promise<Blob>((resolve, reject) => {
      shot.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not save the portrait.'))), 'image/png');
    });
  });
}

/** Skinned body plus the idle and guard clips, as a binary glTF. */
export function exportGlb(character: ForgeCharacter): Promise<ArrayBuffer> {
  return withStage(character, (stage) => stage.glb());
}
