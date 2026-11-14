declare module '@newsletter/markdown' {
  export function renderMarkdown(src: string): string;
  export function slugify(value: string): string;
  export function markdownToText(src: string): string;
}
