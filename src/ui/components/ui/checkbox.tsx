import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/shared/utils/cn"

export interface CheckboxProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation(); // Prevent parent handlers
      if (!disabled) {
        onCheckedChange?.(!checked);
      }
      onClick?.(e);
    };

    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        ref={ref}
        disabled={disabled}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary text-primary-foreground" : "bg-background",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {checked && (
          <Check className="h-4 w-4" />
        )}
      </button>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }

