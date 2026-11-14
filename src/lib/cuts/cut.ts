import { inspectUrl } from './policy';
import { advanceColumn, clip } from './text';
import type { ColumnId, Cut, CutFields, ScriptPackage } from './types';

export const SCRIPT_MAX = 20_000;
export const EXCERPT_MAX = 2_000;

export function newCutFields(input: {
  title?: string;
  topic: string;
  sourceUrl: string;
}): { ok: true; fields: CutFields } | { ok: false; code: string; error: string } {
  const topic = input.topic.trim();
  const inspected = inspectUrl(input.sourceUrl);
  if (!inspected.ok) return inspected;
  if (!topic && !inspected.url) {
    return { ok: false, code: 'BAD_INPUT', error: 'Add a topic or an article URL.' };
  }
  const requested = input.title?.trim() ?? '';
  const title = (requested || clip(topic, 80) || 'Untitled cut').slice(0, 140);
  const fields: CutFields = {
    title,
    topic: topic.slice(0, 4000),
    sourceUrl: inspected.url,
    sourceExcerpt: '',
    column: 'idea',
    scriptText: '',
    chapters: [],
    visuals: [],
    titles: [],
    description: '',
    tags: [],
    thumbnailConcepts: [],
    packageStatus: 'idle',
    generationProvider: '',
    generationModel: '',
    generationWarning: '',
    errorMessage: '',
  };
  return { ok: true, fields };
}

function cleanChapters(chapters: ScriptPackage['chapters']) {
  const cleaned = chapters
    .map((chapter) => ({
      title: chapter.title.trim().slice(0, 140),
      summary: chapter.summary.trim().slice(0, 600),
      startSeconds: Math.max(0, Math.min(86_400, Math.round(chapter.startSeconds))),
    }))
    .filter((chapter) => chapter.title)
    .slice(0, 40)
    .sort((a, b) => a.startSeconds - b.startSeconds);
  if (cleaned.length > 0) cleaned[0] = { ...cleaned[0], startSeconds: 0 };
  return cleaned;
}

export function applyPackage(
  cut: Cut,
  pack: ScriptPackage,
  meta: { provider: 'gemini' | 'draft'; model: string; warning: string; excerpt?: string },
): Cut {
  const titles = pack.titles.map((title) => title.trim().slice(0, 140)).filter(Boolean).slice(0, 8);
  const topicTitle = clip(cut.topic, 80);
  const replaceTitle = cut.title === 'Untitled cut' || cut.title === topicTitle || !cut.title;
  const title = (replaceTitle ? titles[0] || cut.title : cut.title).slice(0, 140);
  const chapters = cleanChapters(pack.chapters);
  const scriptText = pack.scriptText.trim().slice(0, SCRIPT_MAX);
  const visuals = pack.visuals.slice(0, 40).map((visual) => ({
    atSeconds: Math.max(0, Math.round(visual.atSeconds || 0)),
    kind: (visual.kind || 'b-roll').slice(0, 40),
    direction: (visual.direction || '').slice(0, 600),
    chartTitle: (visual.chartTitle || '').slice(0, 140),
    chartType: (visual.chartType || '').slice(0, 20),
    chartLabels: (visual.chartLabels || []).map((label) => label.slice(0, 40)).slice(0, 8),
    chartValues: (visual.chartValues || []).filter((value) => Number.isFinite(value)).slice(0, 8),
  }));
  return {
    ...cut,
    title,
    scriptText,
    chapters,
    visuals,
    titles,
    description: pack.description.trim().slice(0, 8000),
    tags: pack.tags.map((tag) => tag.trim().replace(/^#/, '').slice(0, 40)).filter(Boolean).slice(0, 24),
    thumbnailConcepts: pack.thumbnailConcepts.slice(0, 6).map((concept) => ({
      headline: concept.headline.trim().slice(0, 80),
      layout: concept.layout.trim().slice(0, 400),
      foreground: concept.foreground.trim().slice(0, 20) || 'cream',
      background: concept.background.trim().slice(0, 20) || 'black',
    })),
    column: advanceColumn(cut.column, 'script'),
    sourceExcerpt: (meta.excerpt ?? cut.sourceExcerpt).slice(0, EXCERPT_MAX),
    packageStatus: 'ready',
    generationProvider: meta.provider,
    generationModel: meta.model.slice(0, 80),
    generationWarning: meta.warning.slice(0, 500),
    errorMessage: '',
    updatedAt: Date.now(),
  };
}

export function columnOrCurrent(value: string, current: ColumnId): ColumnId {
  const match = ['idea', 'script', 'narration', 'visuals', 'package', 'ready'].find((column) => column === value);
  return (match as ColumnId | undefined) ?? current;
}

export function cutMarkdown(cut: Cut): string {
  const titles = cut.titles.length ? cut.titles.map((title) => `- ${title}`).join('\n') : '- (none)';
  const chapters = cut.chapters.map((chapter) => `- ${chapter.startSeconds}s ${chapter.title}: ${chapter.summary}`).join('\n');
  const pictures = cut.visuals
    .map((visual) => `- ${visual.atSeconds}s ${visual.kind}: ${visual.direction}${visual.chartTitle ? ` (${visual.chartTitle})` : ''}`)
    .join('\n');
  const thumbs = cut.thumbnailConcepts
    .map((concept) => `- ${concept.headline} — ${concept.layout} (${concept.foreground} on ${concept.background})`)
    .join('\n');
  return [
    `# ${cut.title || 'Untitled cut'}`,
    '',
    '## Titles',
    titles,
    '',
    '## Description',
    cut.description || '(none)',
    '',
    '## Chapters',
    chapters || '(none)',
    '',
    '## Script',
    cut.scriptText || '(none)',
    '',
    '## Picture notes',
    pictures || '(none)',
    '',
    '## Thumbnail concepts',
    thumbs || '(none)',
    '',
  ].join('\n');
}
