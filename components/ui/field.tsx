import * as React from "react";

interface FieldProps {
  /** Id of the control this label describes. */
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

/** Label, optional hint, control, and an inline error message. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
