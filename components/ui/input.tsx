import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-xl border bg-surface px-4 text-[15px] text-ink placeholder:text-ink-soft/70",
        "border-line focus:border-primary transition-colors",
        error && "border-danger focus:border-danger",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
