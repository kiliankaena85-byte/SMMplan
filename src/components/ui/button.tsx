import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-500 ease-out outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      intent: {
        primary: "bg-slate-900 text-white shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:bg-slate-800 hover:shadow-[0_6px_20px_rgb(0,0,0,0.15)]",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        destructive: "bg-rose-500 text-white hover:bg-rose-600 shadow-sm",
        outline: "border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-800",
        ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-600",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20",
        dark: "bg-black text-white shadow-md hover:bg-slate-900",
        tint: "bg-sky-50 text-sky-600 hover:bg-sky-100", // The pure blue accent used sparingly
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-2xl px-10 text-lg font-semibold",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, intent, size, isAnimated, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ intent, size, isAnimated, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
