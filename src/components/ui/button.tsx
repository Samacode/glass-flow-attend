import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "glass glass-hover text-glass-foreground hover:scale-105",
        primary: "bg-gradient-primary text-primary-foreground hover:shadow-glow hover:scale-105 border border-primary/20",
        secondary: "bg-gradient-secondary text-secondary-foreground hover:shadow-lg hover:scale-105 border border-secondary/20",
        accent: "bg-accent text-accent-foreground hover:bg-accent-glow hover:shadow-glow-accent hover:scale-105 border border-accent/20",
        success: "bg-success text-success-foreground hover:bg-success-glow hover:scale-105 border border-success/20",
        warning: "bg-warning text-warning-foreground hover:bg-warning-glow hover:scale-105 border border-warning/20",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-glow hover:scale-105 border border-destructive/20",
        outline: "glass border-2 border-glass-border text-glass-foreground hover:border-primary hover:shadow-glow",
        ghost: "text-glass-foreground hover:bg-glass/10 hover:backdrop-blur-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-glow",
        hero: "bg-gradient-primary text-white font-bold hover:shadow-glow hover:scale-110 border border-primary/30 animate-glow-pulse"
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
