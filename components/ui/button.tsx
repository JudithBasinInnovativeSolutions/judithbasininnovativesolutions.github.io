import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[.25rem] border border-transparent px-5 py-3 text-base font-extrabold leading-tight transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground shadow-[.32rem_.32rem_0_var(--forest-700)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[var(--cyan-300)] hover:shadow-[.48rem_.48rem_0_var(--forest-700)]',
        outline: 'border-border bg-transparent text-foreground hover:border-primary hover:text-[var(--cyan-300)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Button({ className, variant = 'default', ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, className }))} {...props} />;
}

export { Button, buttonVariants };
