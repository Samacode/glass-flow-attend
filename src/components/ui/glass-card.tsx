import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const glassCardVariants = cva(
  "glass rounded-lg p-6 transition-all duration-300",
  {
    variants: {
      variant: {
        default: "glass-hover",
        intense: "glass-intense glass-hover",
        static: "",
        glow: "glass-hover glow-primary",
        accent: "glass-hover glow-accent"
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        xl: "p-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(glassCardVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard, glassCardVariants };