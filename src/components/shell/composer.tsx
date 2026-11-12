'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { ModelPicker, type PickerState } from './model-picker';
import './composer.css';

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  label: string;
  placeholder?: string;
  picker: PickerState;
  disabled?: boolean;
  busy?: boolean;
  /** Extra controls on the left of the send button, such as a mode switch. */
  extra?: ReactNode;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

/** The chat composer used by NightCode, Teammates and the quest chat: a text area, the model pill, and one cream send button. */
export function Composer({ value, onChange, onSubmit, label, placeholder, picker, disabled, busy, extra, onKeyDown }: ComposerProps) {
  return (
    <form
      className="cp"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && !busy && value.trim()) onSubmit();
      }}
    >
      <textarea
        className="cp-input"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        rows={1}
        disabled={disabled}
        enterKeyHint="send"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="cp-row">
        <ModelPicker picker={picker} />
        {extra}
        <button type="submit" className="cp-send" disabled={disabled || busy}>{busy ? 'Sending…' : 'Send'}</button>
      </div>
    </form>
  );
}

export function Bubble({ who, name, children }: { who: 'you' | 'bot'; name?: string; children: ReactNode }) {
  return (
    <li className="bb" data-who={who}>
      {name && <span className="bb-name">{name}</span>}
      <span className="bb-body">{children}</span>
    </li>
  );
}
