import { clip } from './text';
import type { ScriptPackage } from './types';

export function draftPackage(topic: string, sourceText: string): ScriptPackage {
  const subject = clip(topic.trim() || 'this cut', 80);
  const source = sourceText.trim();
  const scriptText = [
    'This is a local draft, not a Gemini script.',
    `Open on the subject: ${subject}.`,
    source
      ? `The source says, in short: ${clip(source, 500)}`
      : `No article was attached. Say what the viewer should understand about ${subject} in the first two sentences.`,
    'Spend the middle on one concrete scene, the thing a person would notice.',
    'If you have a real number, show it as a chart. If you do not, do not invent one.',
    'Close with the single next step you want the viewer to take.',
  ].join('\n\n');
  return {
    titles: [subject, `What to show about ${clip(subject, 48)}`, `${clip(subject, 40)} — the cut`].slice(0, 3),
    description: `A draft outline for ${subject}. Replace this description after a model writes the package.`,
    tags: ['draft', 'loom'],
    scriptText,
    chapters: [
      { title: 'Open', summary: 'Name the subject.', startSeconds: 0 },
      { title: 'The scene', summary: 'One concrete thing to show.', startSeconds: 20 },
      { title: 'The receipt', summary: 'A chart only if the number is real.', startSeconds: 45 },
      { title: 'Close', summary: 'One next step.', startSeconds: 70 },
    ],
    visuals: [
      {
        atSeconds: 0,
        kind: 'still',
        direction: `Hold a single object that means ${subject}. Cream type on the near-black ground.`,
        chartTitle: '',
        chartType: '',
        chartLabels: [],
        chartValues: [],
      },
      {
        atSeconds: 45,
        kind: 'chart',
        direction: 'Show a chart only after you have the real series. Leave the bars empty until then.',
        chartTitle: 'Add the real series',
        chartType: 'bar',
        chartLabels: [],
        chartValues: [],
      },
    ],
    thumbnailConcepts: [
      {
        headline: clip(subject, 28),
        layout: 'Large cream headline, signal-red bar along the bottom, one object on the right.',
        foreground: 'cream',
        background: 'black',
      },
      {
        headline: clip(subject, 22),
        layout: 'Tiffany field, black Anton type, one object centered.',
        foreground: 'black',
        background: 'tiffany',
      },
    ],
  };
}

export const DRAFT_WARNING =
  'Local draft. Gemini did not write this. Set a model key on the gateway and generate again for a real script.';
