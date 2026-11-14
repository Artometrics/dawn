import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'grid h-5 w-5 shrink-0 place-items-center border border-current bg-white text-blue data-[state=checked]:bg-blue data-[state=checked]:text-white',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
          <path d="M3.2 8.4 6.3 11.6 12.8 4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
