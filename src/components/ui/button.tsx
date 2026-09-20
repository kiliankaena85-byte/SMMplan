import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-bold transition-all duration-150 ease-out outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      intent: {
        primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-xs",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
        outline: "border border-border bg-background hover:bg-muted text-foreground hover:text-foreground shadow-xs",
        ghost: "hover:bg-muted hover:text-foreground text-muted-foreground",
        glass: "bg-card/10 backdrop-blur-md border border-white/20 text-primary-foreground hover:bg-card/20",
        dark: "bg-foreground text-background shadow-xs hover:opacity-90",
        tint: "bg-primary/10 text-primary hover:bg-primary/20", // The pure blue accent used sparingly
      },
      size: {
        default: "h-11 px-6 py-2 text-sm",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
      isAnimated: {
        true: "group transform-gpu hover:-translate-y-[1px]",
        false: "",
      }
    },
    defaultVariants: {
      intent: "primary",
      size: "default",
      isAnimated: false,
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  variant?: VariantProps<typeof buttonVariants>['intent'];
}

const Button = ({ className, intent, variant, size, isAnimated, asChild = false, ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  const Comp = asChild ? Slot : "button"
  const resolvedIntent = intent || variant || "primary"
  return (
    <Comp
      className={cn(buttonVariants({ intent: resolvedIntent, size, isAnimated, className }))}
      ref={ref}
      {...props}
    />
  )
}
Button.displayName = "Button"

export { Button, buttonVariants }
