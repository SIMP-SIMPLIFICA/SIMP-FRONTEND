import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout & shape
          "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground",
          // Placeholder
          "placeholder:text-muted-foreground/70",
          // Transitions
          "transition-colors duration-150",
          // Focus — Tech Blue border + soft glow ring
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          // Error — red border + red glow (activated via aria-invalid="true")
          "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
