import type { ComponentProps, ReactNode } from "react";
import { ui as styles } from './ui';

interface FieldProps {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  pending?: boolean;
}
function descriptions(
  id: string,
  hint?: string,
  error?: string,
  existing?: string,
) {
  return (
    [existing, hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

function FieldFrame({
  id,
  label,
  hint,
  error,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className={styles.fieldError} id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  id,
  label,
  hint,
  error,
  pending,
  disabled,
  className = "",
  type = "text",
  ...props
}: ComponentProps<"input"> & FieldProps) {
  return (
    <FieldFrame
      id={id}
      label={label}
      {...(hint && { hint })}
      {...(error && { error })}
    >
      <input
        {...props}
        id={id}
        type={type}
        disabled={disabled || pending}
        dir={
          props.dir ??
          (["email", "tel", "password", "url"].includes(type)
            ? "ltr"
            : undefined)
        }
        aria-invalid={Boolean(error)}
        aria-busy={pending || undefined}
        aria-describedby={descriptions(
          id,
          hint,
          error,
          props["aria-describedby"],
        )}
        className={`${styles.control} ${className}`}
      />
    </FieldFrame>
  );
}

export function Select({
  id,
  label,
  hint,
  error,
  pending,
  disabled,
  className = "",
  children,
  ...props
}: ComponentProps<"select"> & FieldProps) {
  return (
    <FieldFrame
      id={id}
      label={label}
      {...(hint && { hint })}
      {...(error && { error })}
    >
      <select
        {...props}
        id={id}
        disabled={disabled || pending}
        aria-invalid={Boolean(error)}
        aria-busy={pending || undefined}
        aria-describedby={descriptions(
          id,
          hint,
          error,
          props["aria-describedby"],
        )}
        className={`${styles.control} ${className}`}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export function Textarea({
  id,
  label,
  hint,
  error,
  pending,
  disabled,
  className = "",
  ...props
}: ComponentProps<"textarea"> & FieldProps) {
  return (
    <FieldFrame
      id={id}
      label={label}
      {...(hint && { hint })}
      {...(error && { error })}
    >
      <textarea
        {...props}
        id={id}
        disabled={disabled || pending}
        aria-invalid={Boolean(error)}
        aria-busy={pending || undefined}
        aria-describedby={descriptions(
          id,
          hint,
          error,
          props["aria-describedby"],
        )}
        className={`${styles.control} min-h-28 resize-y ${className}`}
      />
    </FieldFrame>
  );
}

export function Checkbox({
  id,
  label,
  hint,
  error,
  pending,
  disabled,
  ...props
}: Omit<ComponentProps<"input">, "type"> & FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.checkRow}>
        <input
          {...props}
          type="checkbox"
          id={id}
          disabled={disabled || pending}
          aria-invalid={Boolean(error)}
          aria-busy={pending || undefined}
          aria-describedby={descriptions(
            id,
            hint,
            error,
            props["aria-describedby"],
          )}
          className={styles.checkbox}
        />
        <label htmlFor={id}>{label}</label>
      </div>
      {hint && (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className={styles.fieldError} id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
