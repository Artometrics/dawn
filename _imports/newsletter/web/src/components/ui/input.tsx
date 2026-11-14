import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full min-h-11 border border-line bg-white px-3 font-ui text-base text-ink placeholder:text-ink-soft',
        className,
      )}
      {...props}
    />
  );
}
