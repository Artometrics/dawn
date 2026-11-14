import { estimateCost } from '../dawn-agents/spend';
import { publicError } from '../dawn-agents/provider';
import { extractJson } from './parse-package';
import { isVoice, NARRATION_OFF } from './policy';
import { chunkText, cuesToSrt } from './text';
import { concatBytes, pcmToWav } from './wav';

export { NARRATION_OFF } from './policy';

export function mediaEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.DAWN_MEDIA_ENABLED === 'true';
}

function geminiKey(env: Record<string, string | undefined>): string | undefined {
  return env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
}

type Spend = {
  capBlocked: () => Promise<string | null>;
  record: (costUsd: number, model: string) => Promise<void>;
};

export async function narrateCut(
  body: Record<string, unknown>,
  deps: { env?: Record<string, string | undefined>; spend: Spend; fetchImpl?: typeof fetch },
): Promise<{ status: number; body: Record<string, unknown>; wav?: Uint8Array }> {
  const env = deps.env ?? process.env;
  if (!mediaEnabled(env)) return { status: 403, body: { error: NARRATION_OFF } };
  const text = String(body.text || '').trim();
  if (text.length < 2) return { status: 400, body: { error: 'Add narration text.' } };
  const requested = String(body.voice || 'Kore');
  if (!isVoice(requested)) return { status: 400, body: { error: 'That voice is not available. Kore is the default.' } };
  const blocked = await deps.spend.capBlocked();
  if (blocked) return { status: 429, body: { error: blocked } };
  const key = geminiKey(env);
  if (!key) return { status: 503, body: { error: 'Narration needs a Gemini key. Nothing was generated.' } };
  try {
    const chunks = chunkText(text.slice(0, 20_000), 3500);
    const pieces: Uint8Array[] = [];
    let sampleRate = 24_000;
    for (const chunk of chunks) {
      const payload = await geminiGenerate(key, 'gemini-2.5-flash-preview-tts', {
        contents: [{ role: 'user', parts: [{ text: `Read this YouTube narration in a clear, warm, unhurried voice:\n\n${chunk}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: requested } } },
        },
      }, deps.fetchImpl);
      const audio = firstAudio(payload);
      sampleRate = audio.sampleRate;
      pieces.push(audio.pcm);
    }
    const pcm = concatBytes(pieces);
    const tokens = Math.ceil(text.length / 4);
    await deps.spend.record(estimateCost('gemini-3.8-flash', tokens, tokens), 'gemini-2.5-flash-preview-tts');
    return {
      status: 200,
      body: { voice: requested, sampleRate, bytes: pcm.byteLength },
      wav: pcmToWav(pcm, sampleRate),
    };
  } catch (error) {
    return { status: 502, body: { error: publicError(error) } };
  }
}

export async function transcribeCut(
  body: Record<string, unknown>,
  deps: { env?: Record<string, string | undefined>; spend: Spend; fetchImpl?: typeof fetch },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const env = deps.env ?? process.env;
  if (!mediaEnabled(env)) return { status: 403, body: { error: NARRATION_OFF } };
  const blocked = await deps.spend.capBlocked();
  if (blocked) return { status: 429, body: { error: blocked } };
  const key = geminiKey(env);
  if (!key) return { status: 503, body: { error: 'Transcription needs a Gemini key. Nothing was generated.' } };
  const data = String(body.dataBase64 || '');
  if (!data) return { status: 400, body: { error: 'Attach an audio file.' } };
  const bytes = Buffer.from(data, 'base64');
  if (bytes.byteLength > 15 * 1024 * 1024) return { status: 413, body: { error: 'That recording is over 15 MB.' } };
  try {
    const payload = await geminiGenerate(key, 'gemini-3.8-flash', {
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: String(body.mime || 'audio/wav'), data } },
          { text: 'Transcribe this recording. Return JSON with text and segments (startMs, endMs, text). Do not invent words you cannot hear.' },
        ],
      }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    }, deps.fetchImpl);
    const parsed = parseTranscript(firstText(payload));
    const tokens = Math.ceil(bytes.byteLength / 100);
    await deps.spend.record(estimateCost('gemini-3.8-flash', tokens, 200), 'gemini-3.8-flash');
    return { status: 200, body: { text: parsed.text, segments: parsed.segments, srt: cuesToSrt(parsed.segments) } };
  } catch (error) {
    return { status: 502, body: { error: publicError(error) } };
  }
}

async function geminiGenerate(key: string, model: string, payload: unknown, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (json as { error?: { message?: string } }).error?.message || `Gemini returned ${response.status}.`;
    throw new Error(message);
  }
  return json;
}

function firstText(payload: unknown): string {
  const candidates = (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates;
  const text = candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!text) throw new Error('The model returned an empty transcript.');
  return text;
}

function firstAudio(payload: unknown): { pcm: Uint8Array; sampleRate: number } {
  const parts = (payload as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] }).candidates?.[0]?.content?.parts || [];
  const audio = parts.find((part) => part.inlineData?.data);
  if (!audio?.inlineData?.data) throw new Error('The model returned no audio.');
  const mime = audio.inlineData.mimeType || '';
  const rate = Number(mime.match(/rate=(\d+)/)?.[1] || 24_000);
  return { pcm: Buffer.from(audio.inlineData.data, 'base64'), sampleRate: rate };
}

function parseTranscript(text: string): { text: string; segments: { startMs: number; endMs: number; text: string }[] } {
  const record = (extractJson(text) ?? {}) as Record<string, unknown>;
  const segments = Array.isArray(record.segments)
    ? record.segments
        .map((segment) => {
          const item = segment && typeof segment === 'object' ? (segment as Record<string, unknown>) : {};
          return {
            startMs: Math.max(0, Math.round(Number(item.startMs) || 0)),
            endMs: Math.max(0, Math.round(Number(item.endMs) || 0)),
            text: String(item.text || '').trim(),
          };
        })
        .filter((segment) => segment.text)
        .slice(0, 2000)
    : [];
  const full = String(record.text || '').trim() || segments.map((segment) => segment.text).join(' ');
  if (!full) throw new Error('The model returned an empty transcript.');
  return { text: full, segments };
}
