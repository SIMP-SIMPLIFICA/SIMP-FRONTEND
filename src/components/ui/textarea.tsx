import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Layout & shape
        "flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground",
        // Resize — vertical only to protect layout
        "resize-y",
        // Placeholder
        "placeholder:text-muted-foreground/70",
        // Transitions
        "transition-colors duration-150",
        // Focus — Tech Blue border + soft glow ring
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
        // Error — red border + red glow (activated via aria-invalid="true")
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted disabled:resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
