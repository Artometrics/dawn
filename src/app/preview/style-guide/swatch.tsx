'use client';

import { useEffect, useRef } from 'react';

function toHex(value: string) {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return value.trim();
  const [r, g, b, a] = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  const hex = [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
  return a !== undefined && a < 1 ? `#${hex} @ ${Math.round(a * 100)}%` : `#${hex}`;
}

/** A colour chip that prints its token name and the value the browser resolves for it, so the guide cannot drift from tokens.css. */
export function Swatch({ token, note }: { token: string; note?: string }) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!chipRef.current || !valueRef.current) return;
    valueRef.current.textContent = toHex(getComputedStyle(chipRef.current).backgroundColor);
  }, []);
  return (
    <li className="sg-swatch">
      <span ref={chipRef} className="sg-chip" style={{ background: `var(${token})` }} />
      <span className="sg-swatch-text">
        <code>{token}</code>
        <span ref={valueRef} className="sg-hex">&nbsp;</span>
        {note ? <span className="dw-note">{note}</span> : null}
      </span>
    </li>
  );
}
