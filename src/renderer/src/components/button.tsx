import * as React from 'react'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import cn from '@renderer/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50 cursor-default select-none',
  {
    variants: {
      variant: {
        primary: 'bg-zinc-700 text-white dark:bg-zinc-100 dark:text-zinc-950',
        secondary:
          'bg-white text-zinc-700 border border-zinc-300 h-[1.625rem] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
        tertiary: 'bg-transparent text-zinc-600 dark:text-zinc-400'
      },
      size: {
        default: 'px-2 py-1',
        icon: 'p-1'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
