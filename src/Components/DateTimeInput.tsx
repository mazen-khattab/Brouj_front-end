import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "./Fields";

type DateTimeInputProps = Omit<ComponentProps<typeof Input>, "type" | "value" | "defaultValue" | "onChange" | "step"> & {
  value: string;
  onValueChange: (localValue: string) => void;
};

/** Controlled local wall time: value and onValueChange use YYYY-MM-DDTHH:mm or "".
 * Hydrate with toDateTimeLocalValue; serialize with toDateTimeOffsetIso at the API boundary.
 */
export function DateTimeInput({ value, onValueChange, ...props }: DateTimeInputProps) {
  const { t } = useTranslation("common");
  return (
    <div className="grid min-w-0 content-start gap-2">
      <Input
        {...props}
        type="datetime-local"
        step={60}
        min="0001-01-01T00:00"
        max="9999-12-31T23:59"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      {!props.required && value && (
        <button
          type="button"
          disabled={props.disabled || props.pending || props.readOnly}
          className="min-h-9 justify-self-start text-sm text-primary underline underline-offset-4 disabled:opacity-50"
          aria-label={t("clearDateTime", { field: props.label })}
          onClick={() => onValueChange("")}
        >
          {t("clearDateTime", { field: props.label })}
        </button>
      )}
    </div>
  );
}
