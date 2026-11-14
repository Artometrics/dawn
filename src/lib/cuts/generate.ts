import { fetchArticleText } from '../dawn-agents/article-text';
import { createKitModel, type Generate, type SpendHooks } from '../dawn-agents/model-reply';
import type { DailyRequestCap } from '../dawn-agents/model-choice';
import { publicError } from '../dawn-agents/provider';
import { DRAFT_WARNING, draftPackage } from './draft';
import { parsePackage } from './parse-package';
import { inspectUrl } from './policy';
import { packagePrompt } from './prompt';
import type { ScriptPackage } from './types';

export type GenerateResult = {
  status: number;
  body: {
    package?: ScriptPackage;
    provider?: 'model' | 'draft';
    model?: string;
    warning?: string;
    error?: string;
    excerpt?: string;
  };
};

export async function generateCutPackage(
  body: Record<string, unknown>,
  deps: {
    cap: DailyRequestCap;
    spend: SpendHooks;
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
    generate?: Generate;
  },
): Promise<GenerateResult> {
  const topic = String(body.topic || '').trim().slice(0, 4000);
  const sourceUrl = String(body.sourceUrl || '').trim();
  let sourceText = String(body.sourceText || '').trim().slice(0, 20_000);
  if (!topic && !sourceUrl && !sourceText) {
    return { status: 400, body: { error: 'Add a topic or an article URL.' } };
  }
  if (sourceUrl) {
    const inspected = inspectUrl(sourceUrl);
    if (!inspected.ok) return { status: 400, body: { error: inspected.error } };
    if (!inspected.url) return { status: 400, body: { error: 'Add an article URL.' } };
    try {
      const article = await fetchArticleText(inspected.url, deps.fetchImpl);
      sourceText = article.text;
    } catch (error) {
      return { status: 400, body: { error: publicError(error) } };
    }
  }
  const blocked = await deps.spend.blocked();
  if (blocked) return { status: 429, body: { error: blocked } };
  const model = createKitModel({
    requested: body.model,
    cap: deps.cap,
    spend: deps.spend,
    env: deps.env,
    generate: deps.generate,
  });
  if (!model) {
    return {
      status: 200,
      body: {
        package: draftPackage(topic || 'this cut', sourceText),
        provider: 'draft',
        model: 'local-draft',
        warning: DRAFT_WARNING,
        excerpt: sourceText.slice(0, 2_000),
      },
    };
  }
  try {
    const text = await model.reply(packagePrompt(topic, sourceText), [{ role: 'user', content: 'Write the package JSON.' }]);
    const pack = parsePackage(text);
    return {
      status: 200,
      body: {
        package: pack,
        provider: 'model',
        model: model.choice.model,
        warning: '',
        excerpt: sourceText.slice(0, 2_000),
      },
    };
  } catch (error) {
    const message = publicError(error);
    if (message.startsWith('Spend cap reached')) return { status: 429, body: { error: message } };
    if (message.startsWith('Daily model limit')) return { status: 429, body: { error: message } };
    return { status: 502, body: { error: message } };
  }
}
