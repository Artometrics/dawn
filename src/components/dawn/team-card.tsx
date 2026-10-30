'use client';

import { useState } from 'react';
import { AGENTS, YOU_LOOKS } from '@/lib/agents';
import { useDawn } from '@/components/dawn/dawn-provider';

export function TeamCard() {
  const { name, setName, avatar, setAvatar, clearDesk, user, signOut } = useDawn();
  const [copied, setCopied] = useState(false);

  const cardText = [
    `Dawn team`,
    `${name}`,
    ...AGENTS.map((agent) => `${agent.name} — ${agent.title}`),
  ].join('\n');

  async function share() {
    setCopied(false);
    const file = await renderCard(name, avatar);
    if (navigator.share) {
      try {
        const payload: ShareData = { title: 'Dawn team', text: cardText };
        if (file && navigator.canShare?.({ files: [file] })) payload.files = [file];
        await navigator.share(payload);
        return;
      } catch {
        // Fall through to copy.
      }
    }
    await navigator.clipboard.writeText(cardText);
    setCopied(true);
  }

  async function save() {
    const file = await renderCard(name, avatar);
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dawn-team.png';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm" htmlFor="your-name">
        Your name
        <input
          id="your-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 min-h-11 w-full border border-[#5a4636] bg-[#1c1410] px-3 text-base"
        />
      </label>
      <div className="flex gap-2">
        {YOU_LOOKS.map((src, index) => (
          <button
            key={src}
            type="button"
            aria-label={`Look ${index + 1}`}
            aria-pressed={avatar === index}
            onClick={() => setAvatar(index)}
            className={`min-h-11 min-w-11 border p-1 ${avatar === index ? 'border-[#e2a04a]' : 'border-[#5a4636]'}`}
          >
            <img src={src} alt="" width={32} height={32} className="h-8 w-8 [image-rendering:pixelated]" />
          </button>
        ))}
      </div>
      <article id="team-card" className="border border-[#e2a04a] bg-[#2a1d14] p-3">
        <div className="flex items-center gap-3">
          <img src={YOU_LOOKS[avatar]} alt="" width={48} height={48} className="h-12 w-12 [image-rendering:pixelated]" />
          <div>
            <p className="text-xs text-[#e2a04a]">Dawn team</p>
            <p className="text-lg">{name || 'You'}</p>
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {AGENTS.map((agent) => (
            <li key={agent.id} className="flex items-center gap-2 text-sm">
              <img src={agent.src} alt="" width={32} height={32} className="h-8 w-8 [image-rendering:pixelated]" />
              <span>{agent.name}</span>
              <span className="text-[#d9cbb8]">{agent.title}</span>
            </li>
          ))}
        </ul>
      </article>
      <div className="flex gap-2">
        <button type="button" className="min-h-11 flex-1 border border-[#e2a04a] text-sm" onClick={() => void share()}>
          {copied ? 'Copied' : 'Share'}
        </button>
        <button type="button" className="min-h-11 flex-1 border border-[#5a4636] text-sm" onClick={() => void save()}>
          Save image
        </button>
      </div>
      <p className="text-xs text-[#d9cbb8]">Trinity plans. Kali and Nimbus work. You approve anything that leaves.</p>
      <button type="button" className="min-h-11 text-left text-sm text-[#d9cbb8]" onClick={() => void clearDesk()}>
        Clear quests and notes
      </button>
      {user && (
        <button type="button" className="min-h-11 text-left text-sm" onClick={() => void signOut()}>
          Sign out
        </button>
      )}
      <a href="/studio" className="min-h-11 text-sm text-[#e2a04a]">Studio</a>
    </div>
  );
}

async function renderCard(name: string, avatar: number): Promise<File | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2a1d14';
  ctx.fillRect(0, 0, 320, 180);
  ctx.strokeStyle = '#e2a04a';
  ctx.strokeRect(4, 4, 312, 172);
  ctx.fillStyle = '#f3e6d0';
  ctx.font = '16px monospace';
  ctx.fillText('Dawn team', 16, 32);
  ctx.font = '20px monospace';
  ctx.fillText(name.slice(0, 18) || 'You', 72, 64);
  const you = await loadImage(YOU_LOOKS[avatar] ?? YOU_LOOKS[0]);
  ctx.drawImage(you, 16, 40, 48, 48);
  for (let index = 0; index < AGENTS.length; index += 1) {
    const agent = AGENTS[index];
    const image = await loadImage(agent.src);
    const y = 96 + index * 24;
    ctx.drawImage(image, 16, y - 16, 20, 20);
    ctx.font = '14px monospace';
    ctx.fillText(`${agent.name}  ${agent.title}`, 44, y);
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return null;
  return new File([blob], 'dawn-team.png', { type: 'image/png' });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = src;
  });
}
