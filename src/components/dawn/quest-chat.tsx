'use client';

import { useEffect, useRef, useState } from 'react';
import { Bubble } from '@/components/shell/composer';
import type { PickerState } from '@/components/shell/model-picker';
import { askGateway, type ChatLine } from '@/lib/site/chat-client';

/** The quest guide: a short chat that answers through the Dawn gateway with the model chosen in the picker. */
export function useQuestChat(picker: PickerState, quests: string[]) {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(text: string) {
    const history: ChatLine[] = [...lines, { role: 'user', text }];
    setLines(history);
    setBusy(true);
    setError('');
    const answer = await askGateway({ persona: 'quest', memories: quests, lines: history, choice: picker.choice });
    setBusy(false);
    if (answer.status === 'ok') setLines([...history, { role: 'agent', text: answer.data.reply }]);
    else setError(answer.status === 'error' ? answer.message : 'The guide did not answer. Try again.');
  }

  return { lines, busy, error, send, clear: () => { setLines([]); setError(''); } };
}

export function QuestThread({ chat, onClose }: { chat: ReturnType<typeof useQuestChat>; onClose: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [chat.lines.length, chat.busy]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-4 pt-2 pb-4">
      <div className="flex items-center justify-between">
        <p className="dw-eyebrow">Guide</p>
        <button type="button" className="dw-btn" onClick={onClose}>Back to quests</button>
      </div>
      <ol className="bb-list">
        {chat.lines.map((line, index) => (
          <Bubble key={`${line.role}-${index}`} who={line.role === 'user' ? 'you' : 'bot'} name={line.role === 'user' ? 'You' : 'Guide'}>{line.text}</Bubble>
        ))}
        {chat.busy && <li className="dw-note">Thinking…</li>}
      </ol>
      {chat.error && <p className="dw-alert" role="alert">{chat.error}</p>}
      <div ref={end} />
    </div>
  );
}
