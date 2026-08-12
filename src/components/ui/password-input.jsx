import * as React from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Input } from "./input"
import { cn } from "../../lib/utils"

// onBeforeReveal: optional async callback fired only when going from hidden
// to visible — lets the caller lazily fetch a value (e.g. a stored secret
// that isn't sent to the client until explicitly requested) before it's shown.
const PasswordInput = React.forwardRef(({ className, onBeforeReveal, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false)
  const [revealing, setRevealing] = React.useState(false)

  const handleToggle = async () => {
    if (!visible && onBeforeReveal) {
      setRevealing(true)
      try {
        await onBeforeReveal()
      } finally {
        setRevealing(false)
      }
    }
    setVisible((v) => !v)
  }

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-10", className)} ref={ref} {...props} />
      <button
        type="button"
        tabIndex={-1}
        onClick={handleToggle}
        disabled={revealing}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {revealing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : visible ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
})
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
