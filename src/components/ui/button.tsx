import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // ─── Base — applies to every variant ────────────────────────────────────────
  [
    // Layout
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    // Shape — uses --radius from design system
    "rounded-md",
    // Typography
    "text-sm font-medium",
    // Transition — covers color AND shadow for smooth hover
    "transition duration-150",
    // Press feedback — subtle scale on click (Vercel / Linear pattern)
    "active:scale-[0.98]",
    // Focus — ring with offset gap for clear keyboard navigation
    // Destructive variant overrides ring-primary → ring-destructive below
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Disabled
    "disabled:pointer-events-none disabled:opacity-50",
    // SVG icons inherit size + prevent click-through
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // ── Primary — institutional Tech Blue CTA ──────────────────────────
        // shadow-sm grounds it on the page; hover:shadow lifts it slightly
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow",

        // ── Destructive — irreversible / dangerous actions ──────────────────
        // Focus ring overrides to red so keyboard users get the danger signal
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive",

        // ── Outline — secondary action with visible boundary ────────────────
        // Transparent bg inherits the parent surface (card white or page blue-gray)
        outline:
          "border border-border bg-transparent hover:bg-secondary hover:text-foreground",

        // ── Secondary — soft filled, low visual weight ───────────────────────
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",

        // ── Ghost — minimal presence, for table actions / icon strips ────────
        ghost:
          "hover:bg-secondary hover:text-foreground",

        // ── Link — inline text action, no chrome ────────────────────────────
        link:
          "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        // h-10 (40px) — standard standalone CTA
        default: "h-10 px-4 py-2",
        // h-9 (36px) — aligns perfectly with Input / Select / Textarea height
        sm:      "h-9 px-3 text-xs",
        // h-11 (44px) — prominent hero / modal primary action
        lg:      "h-11 px-8 text-base",
        // h-9 w-9 — square icon button, matches sm/input row height
        icon:    "h-9 w-9",
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

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
