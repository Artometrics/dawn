/** Instruction text ported from Loom's package generator. The model must return ScriptPackage JSON. */

export function packagePrompt(topic: string, sourceText: string): string {
  return [
    "You are the writer for Kyle's YouTube studio, Cuts.",
    'Write one video package as JSON.',
    `Topic: ${topic || '(none)'}`,
    'Source article, which may be empty:',
    sourceText || '(none)',
    'Rules:',
    '- Do not invent statistics, dates, quotes, or study results. If the source has no number, leave chartValues empty and say what the chart should show once a real series exists.',
    '- scriptText is spoken narration in plain sentences. No markdown. No stage directions.',
    '- chapters cover the script. The first startSeconds is 0.',
    '- visuals are what to put on screen. kind is one of b-roll, chart, still, lower-third, map, screen.',
    '- thumbnail foreground and background use only: black, cream, red, tiffany.',
    '- titles are honest and under 70 characters.',
    '- description is the YouTube description without the chapter list.',
    '- tags are short and have no hash mark.',
    'Return only JSON with keys titles, description, tags, scriptText, chapters, visuals, thumbnailConcepts.',
  ].join('\n');
}
