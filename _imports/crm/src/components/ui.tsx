import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import * as Dialog from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { type ButtonHTMLAttributes, type ReactNode } from 'react'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 px-4 text-[15px] font-semibold tracking-wide transition-transform active:scale-[0.98] disabled:pointer-events-none',
  {
    variants: {
      variant: {
        signal: 'bg-signal text-white',
        quiet: 'bg-raise text-cream',
        ghost: 'bg-transparent text-cream',
        line: 'border border-tiffany/70 bg-transparent text-tiffany',
      },
    },
    defaultVariants: { variant: 'signal' },
  },
)

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />
}

export function IconButton({ label, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} className={cn('grid size-11 place-items-center text-cream', className)} {...props}>
      {children}
    </button>
  )
}

export const controlClass =
  'w-full min-h-11 border border-transparent bg-raise px-3 text-base text-cream outline-none placeholder:text-cream-dim focus:border-tiffany'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[13px] font-semibold text-cream-dim">{label}</span>
      {children}
    </label>
  )
}

export function Sheet({
  open,
  onOpenChange,
  title,
  hint,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto border-t border-line bg-ink p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:inset-auto md:left-1/2 md:top-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:border">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Dialog.Title className="font-display text-[2rem] leading-none tracking-wide">{title}</Dialog.Title>
            <Dialog.Close className="grid size-11 place-items-center" aria-label="Close">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className={hint ? 'mb-4 text-cream-dim' : 'sr-only'}>{hint ?? title}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="font-display text-[2.5rem] leading-none tracking-[0.01em]">{children}</h1>
}
