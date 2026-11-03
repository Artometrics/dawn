'use client';

import { PALETTE } from '@/lib/dawn-agents/avatar';
import { spriteById } from '@/lib/credits/sprites';
import type { PixelAvatar } from '@/lib/dawn-agents/types';

export function PixelAvatarView({ avatar, size = 40, title }: { avatar: PixelAvatar; size?: number; title?: string }) {
  const sprite = avatar.sprite ? spriteById(avatar.sprite) : undefined;
  if (sprite) {
    return (
      <img
        className="pixel-avatar"
        src={sprite.src}
        alt=""
        width={size}
        height={size}
        title={title || sprite.name}
        style={{ width: size, height: size }}
      />
    );
  }
  const grid = avatar.grid === 16 ? 16 : 8;
  const cells = (avatar.cells || '').padEnd(grid * grid, '0').slice(0, grid * grid);
  return (
    <svg className="pixel-avatar" width={size} height={size} viewBox={`0 0 ${grid} ${grid}`} role="img" aria-label={title || 'Pixel avatar'}>
      {cells.split('').map((cell, index) => {
        const fill = PALETTE[Number(cell)] || '';
        if (!fill) return null;
        const x = index % grid;
        const y = Math.floor(index / grid);
        return <rect key={`${index}-${cell}`} x={x} y={y} width="1" height="1" fill={fill} />;
      })}
    </svg>
  );
}
