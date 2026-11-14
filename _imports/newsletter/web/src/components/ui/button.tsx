import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center min-h-11 px-4 font-ui text-[0.95rem] tracking-[-0.01em] transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue text-white hover:bg-blue-deep',
        inverse: 'bg-white text-blue hover:bg-[#e7eeff]',
        ghost: 'bg-transparent text-ink hover:bg-ink/5',
        line: 'border border-ink/20 bg-transparent text-ink hover:border-blue hover:text-blue',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Button({
  className,
  variant,
  asChild = false,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant }), className)} type={asChild ? undefined : type} {...props} />;
}
