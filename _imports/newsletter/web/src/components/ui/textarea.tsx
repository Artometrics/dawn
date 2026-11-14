import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-40 border border-line bg-white px-3 py-3 font-text text-base leading-relaxed text-ink placeholder:text-ink-soft',
        className,
      )}
      {...props}
    />
  );
}
