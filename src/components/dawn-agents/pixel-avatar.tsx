'use client';

import { useState } from 'react';
import { PALETTE } from '@/lib/dawn-agents/avatar';
import type { PixelAvatar } from '@/lib/dawn-agents/types';

export function PixelAvatarView({ avatar, size = 40, title }: { avatar: PixelAvatar; size?: number; title?: string }) {
  const cells = avatar.cells.padEnd(avatar.grid * avatar.grid, '0').slice(0, avatar.grid * avatar.grid);
  return (
    <svg className="pixel-avatar" width={size} height={size} viewBox={`0 0 ${avatar.grid} ${avatar.grid}`} role="img" aria-label={title || 'Pixel avatar'}>
      {cells.split('').map((cell, index) => {
        const fill = PALETTE[Number(cell)] || '';
        if (!fill) return null;
        const x = index % avatar.grid;
        const y = Math.floor(index / avatar.grid);
        return <rect key={`${index}-${cell}`} x={x} y={y} width="1" height="1" fill={fill} />;
      })}
    </svg>
  );
}

export function AvatarEditor({ avatar, onChange }: { avatar: PixelAvatar; onChange: (avatar: PixelAvatar) => void }) {
  const [paint, setPaint] = useState('1');
  const cells = avatar.cells.padEnd(avatar.grid * avatar.grid, '0');
  function paintAt(index: number) {
    const next = cells.split('');
    next[index] = paint;
    onChange({ ...avatar, cells: next.join('').slice(0, avatar.grid * avatar.grid) });
  }
  return (
    <div className="avatar-editor">
      <div className="swatches">
        {PALETTE.map((color, index) => (
          <button
            key={color || 'clear'}
            type="button"
            className={paint === String(index) ? 'on' : ''}
            style={{ background: color || 'repeating-linear-gradient(45deg,#243049 0 4px,#10131c 4px 8px)' }}
            aria-label={color || 'Clear'}
            aria-pressed={paint === String(index)}
            onClick={() => setPaint(String(index))}
          />
        ))}
      </div>
      <div className="pixel-grid" style={{ gridTemplateColumns: `repeat(${avatar.grid}, 1fr)` }}>
        {cells
          .slice(0, avatar.grid * avatar.grid)
          .split('')
          .map((cell, index) => (
            <button key={index} type="button" style={{ background: PALETTE[Number(cell)] || 'transparent' }} aria-label={`Cell ${index + 1}`} onClick={() => paintAt(index)} />
          ))}
      </div>
    </div>
  );
}
