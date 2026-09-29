import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none rounded-xl border bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/70",
        "border-line focus:border-primary transition-colors",
        error && "border-danger focus:border-danger",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
