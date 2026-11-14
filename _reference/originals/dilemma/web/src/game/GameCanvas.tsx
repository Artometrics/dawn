import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import { DawnScene } from './scenes/DawnScene';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 980,
      height: 720,
      parent: containerRef.current,
      backgroundColor: '#9ccf7f',
      scene: [DawnScene],
      render: { pixelArt: false, antialias: true },
      scale: { mode: Phaser.Scale.NONE },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div className="game-canvas" ref={containerRef} />;
}
