'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  choiceValue,
  MODEL_STORAGE_KEY,
  parseChoiceValue,
  reconcileChoice,
  type ModelChoice,
  type ProviderInfo,
} from '@/lib/dawn-agents/model-catalog';
import './model-picker.css';

export type PickerState = {
  providers: ProviderInfo[];
  choice: ModelChoice | null;
  setChoice: (choice: ModelChoice) => void;
  /** offline: no gateway answered. */
  status: 'loading' | 'ready' | 'offline';
};

/** Reads the providers the server has keys for, and remembers the last choice in this browser. */
export function useModelPicker(): PickerState {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [choice, setChoiceState] = useState<ModelChoice | null>(null);
  const [status, setStatus] = useState<PickerState['status']>('loading');

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const response = await fetch('/api/models', { credentials: 'include', redirect: 'manual' });
        if (!response.ok || response.type === 'opaqueredirect') throw new Error('offline');
        const data = (await response.json()) as { providers?: ProviderInfo[] };
        if (cancel) return;
        let stored: unknown = null;
        try {
          stored = JSON.parse(localStorage.getItem(MODEL_STORAGE_KEY) || 'null');
        } catch {
          stored = null;
        }
        const list = data.providers ?? [];
        setProviders(list);
        setChoiceState(reconcileChoice(list, stored));
        setStatus('ready');
      } catch {
        if (!cancel) setStatus('offline');
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const setChoice = useCallback((next: ModelChoice) => {
    setChoiceState(next);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  }, []);

  return { providers, choice, setChoice, status };
}

/** One small pill in the composer. Disabled on a host with no gateway. */
export function ModelPicker({ picker }: { picker: PickerState }) {
  const { providers, choice, setChoice, status } = picker;
  const label = choice
    ? (providers.find((item) => item.id === choice.provider)?.models.find((item) => item.id === choice.model)?.label ?? 'Model')
    : status === 'ready' ? 'No model' : 'Gemini Flash';
  const disabled = status !== 'ready' || providers.length === 0;
  return (
    <label className="mp" data-disabled={disabled}>
      <span className="mp-label" aria-hidden>{label}</span>
      <select
        className="mp-select"
        aria-label="Model"
        disabled={disabled}
        value={choice ? choiceValue(choice) : ''}
        onChange={(event) => {
          const next = parseChoiceValue(event.target.value);
          if (next) setChoice(next);
        }}
      >
        {choice === null && <option value="">{label}</option>}
        {providers.map((provider) => (
          <optgroup key={provider.id} label={provider.label}>
            {provider.models.map((model) => (
              <option key={model.id} value={choiceValue({ provider: provider.id, model: model.id })}>{model.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
