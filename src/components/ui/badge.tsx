import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-black tracking-wider uppercase transition-colors outline-none",
  {
    variants: {
      intent: {
        primary: "border-transparent bg-sky-500 text-white shadow-md",
        secondary: "border-transparent bg-sky-100 text-sky-600",
        outline: "text-slate-800 border-slate-200",
        gradient: "border-transparent bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md",
        destructive: "border-transparent bg-rose-500 text-white shadow-md",
      },
    },
    defaultVariants: {
      intent: "primary",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, intent, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ intent }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
