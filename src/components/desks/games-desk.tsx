'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { TOWER_KINDS, TOWERS, type TowerKind } from '@/lib/towers/config';
import { Game } from '@/lib/towers/game';
import { BOUNDS, PATH, SLOTS } from '@/lib/towers/map';
import './desks.css';
import { DilemmaDesk } from './dilemma-desk';
import { FernboundDesk } from './fernbound-desk';
import { DeskSwitch } from './switch';

const VIEWS = [
  { id: 'dilemma', label: 'Dilemma' },
  { id: 'fernbound', label: 'Fernbound' },
  { id: 'towers', label: 'Towers' },
];

export function GamesDesk() {
  const [view, setView] = useState('dilemma');
  return (
    <div className="arcade">
      <div className="arcade-bar">
        <p className="dw-note">These games run on this page. They do not call a server.</p>
        <DeskSwitch label="Arcade" views={VIEWS} current={view} onChange={setView} />
      </div>
      {view === 'dilemma' ? <DilemmaDesk /> : null}
      {view === 'fernbound' ? <FernboundDesk /> : null}
      {view === 'towers' ? (
        <div className="arcade-scroll">
          <TowersPlay />
        </div>
      ) : null}
    </div>
  );
}

function TowersPlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const kindRef = useRef<TowerKind>('archer');
  const aimRef = useRef(false);
  const [kind, setKind] = useState<TowerKind>('archer');
  const [aiming, setAiming] = useState(false);
  const [status, setStatus] = useState('Build, then send the wave.');
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game({ seed: 4 });
    gameRef.current = game;
    let last = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.update(dt);
      paintTowers(canvas, game, kindRef.current);
      if (frame++ % 20 === 0) {
        const label = game.phase === 'wave' ? `Wave ${game.wave}` : game.phase === 'won' ? 'The keep held' : game.phase === 'lost' ? 'The gate fell' : 'Build';
        setStatus(`${label} · ${game.gold} gold · ${game.lives} lives · ${game.kills} down`);
      }
      request = requestAnimationFrame(draw);
    };
    let request = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(request);
  }, []);

  function pick(next: TowerKind) {
    kindRef.current = next;
    setKind(next);
    aimRef.current = false;
    setAiming(false);
  }

  function onPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;
    const rect = canvas.getBoundingClientRect();
    const point = canvasToWorld(canvas, event.clientX - rect.left, event.clientY - rect.top);
    if (aimRef.current) {
      const result = game.castAbility(point.x, point.z);
      setNote(result.ok ? 'Axe Storm is in the air.' : result.reason);
      aimRef.current = false;
      setAiming(false);
      return;
    }
    const slot = nearestSlot(point.x, point.z);
    if (slot !== null && !game.towerAt(slot)) {
      const result = game.placeTower(slot, kindRef.current);
      setNote(result.ok ? `${TOWERS[kindRef.current].name} placed.` : result.reason);
      return;
    }
    const tower = slot !== null ? game.towerAt(slot) : undefined;
    if (tower && event.shiftKey) {
      const result = game.sellTower(tower.id);
      setNote(result.ok ? 'Sold.' : result.reason);
      return;
    }
    if (tower) {
      const result = game.upgradeTower(tower.id);
      setNote(result.ok ? `Level ${tower.level}.` : result.reason);
      return;
    }
    game.moveHero(point.x, point.z);
  }

  return (
    <div className="desk-stage">
      <p className="dw-note">{status}</p>
      <div className="dw-actions dw-actions--chips" role="group" aria-label="Towers">
        {TOWER_KINDS.map((id) => (
          <button key={id} type="button" className="dw-btn dw-btn--chip" aria-pressed={kind === id} onClick={() => pick(id)}>
            {TOWERS[id].name} {TOWERS[id].levels[0].cost}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={960}
        height={640}
        aria-label="Tower defense courtyard"
        onPointerDown={onPointer}
      />
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" onClick={() => {
          const result = gameRef.current?.startWave();
          if (result) setNote(result.ok ? 'Wave sent.' : result.reason);
        }}>Send wave</button>
        <button type="button" className="dw-btn" onClick={() => {
          const game = gameRef.current;
          if (!game) return;
          game.speed = game.speed === 1 ? 2 : 1;
          setNote(game.speed === 2 ? 'Double speed.' : 'Normal speed.');
        }}>Speed</button>
        <button type="button" className="dw-btn" aria-pressed={aiming} onClick={() => {
          aimRef.current = true;
          setAiming(true);
          setNote('Tap the field for Axe Storm.');
        }}>Axe Storm</button>
      </div>
      <p className="dw-note">Tap an empty pad to build. Tap a tower to upgrade. Shift-tap a tower to sell. Tap the path to walk the hero.</p>
      {note ? <p className="dw-alert" role="status">{note}</p> : null}
    </div>
  );
}

function canvasToWorld(canvas: HTMLCanvasElement, px: number, py: number) {
  const rect = canvas.getBoundingClientRect();
  const x = (px / rect.width) * canvas.width;
  const y = (py / rect.height) * canvas.height;
  const spanX = BOUNDS.maxX - BOUNDS.minX;
  const spanZ = BOUNDS.maxZ - BOUNDS.minZ;
  return {
    x: BOUNDS.minX + (x / canvas.width) * spanX,
    z: BOUNDS.minZ + (y / canvas.height) * spanZ,
  };
}

function worldToCanvas(canvas: HTMLCanvasElement, x: number, z: number) {
  const spanX = BOUNDS.maxX - BOUNDS.minX;
  const spanZ = BOUNDS.maxZ - BOUNDS.minZ;
  return {
    x: ((x - BOUNDS.minX) / spanX) * canvas.width,
    y: ((z - BOUNDS.minZ) / spanZ) * canvas.height,
  };
}

function nearestSlot(x: number, z: number): number | null {
  let best = -1;
  let dist = 1.1;
  SLOTS.forEach((slot, index) => {
    const d = Math.hypot(slot.x - x, slot.z - z);
    if (d < dist) {
      dist = d;
      best = index;
    }
  });
  return best < 0 ? null : best;
}

function paintTowers(canvas: HTMLCanvasElement, game: Game, kind: TowerKind) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#241c16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#c4a574';
  ctx.lineWidth = 18;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  PATH.points.forEach((point, index) => {
    const p = worldToCanvas(canvas, point.x, point.z);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  for (const [index, slot] of SLOTS.entries()) {
    const p = worldToCanvas(canvas, slot.x, slot.z);
    const taken = game.towerAt(index);
    ctx.fillStyle = taken ? '#d97746' : '#3d342c';
    ctx.beginPath();
    ctx.arc(p.x, p.y, taken ? 14 : 10, 0, Math.PI * 2);
    ctx.fill();
    if (taken) {
      ctx.fillStyle = '#f4efe6';
      ctx.font = '11px sans-serif';
      ctx.fillText(String(taken.level), p.x - 3, p.y + 4);
    }
  }
  for (const enemy of game.enemies) {
    const p = worldToCanvas(canvas, enemy.x, enemy.z);
    ctx.fillStyle = enemy.flying ? '#9ecbff' : enemy.kind === 'eraser' ? '#f2d27a' : '#e7e1d6';
    ctx.fillRect(p.x - 6, p.y - 6, 12, 12);
  }
  const hero = worldToCanvas(canvas, game.hero.x, game.hero.z);
  ctx.fillStyle = '#d97746';
  ctx.beginPath();
  ctx.arc(hero.x, hero.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4efe6';
  ctx.font = '13px sans-serif';
  ctx.fillText(TOWERS[kind].blurb, 16, 24);
}
