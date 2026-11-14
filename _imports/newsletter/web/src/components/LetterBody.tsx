import { renderMarkdown } from '@newsletter/markdown';

export function LetterBody({ markdown }: { markdown: string }) {
  return <div className="letter font-text text-[1.125rem] leading-[1.6]" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />;
}
