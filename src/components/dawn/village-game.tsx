'use client';

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import type { VillageHandlers, VillagePose } from '@/components/dawn/village-scene';

export function VillageGame(props: Omit<VillageHandlers, 'poses'> & { poses: VillagePose[] }) {
  const host = useRef<HTMLDivElement>(null);
  const handlers = useRef(props);
  handlers.current = props;

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    let game: Phaser.Game | undefined;
    let dead = false;
    const bridge: VillageHandlers = {
      onAgent: (id) => handlers.current.onAgent(id),
      onYou: () => handlers.current.onYou(),
      get avatar() {
        return handlers.current.avatar;
      },
      poses: () => handlers.current.poses,
    };

    void import('@/components/dawn/village-scene').then(({ mountVillage }) => {
      if (dead) return;
      game = mountVillage(parent, bridge);
    });

    return () => {
      dead = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={host} className="h-full w-full min-h-[220px] [&_canvas]:!h-auto [&_canvas]:max-h-full [&_canvas]:[image-rendering:pixelated]" />;
}
