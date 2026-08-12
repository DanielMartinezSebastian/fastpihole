import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

// Hand-rolled to match this project's existing UI primitives (button, card,
// badge — plain Tailwind + cva, no Radix dependency) rather than pull in a
// separate headless-UI library just for this.
function Dialog({ open, onOpenChange, children }) {
  React.useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === "Escape") onOpenChange?.(false)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>,
    document.body
  )
}

function DialogContent({ className, children, onClose }) {
  return (
    <div className={cn("relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg", className)}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  )
}

function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-4 space-y-1.5 pr-6", className)} {...props} />
}

function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold leading-none", className)} {...props} />
}

function DialogDescription({ className, ...props }) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function DialogFooter({ className, ...props }) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
