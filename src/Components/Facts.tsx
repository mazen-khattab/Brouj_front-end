import type { ReactNode } from "react";

export function Facts({ items }: { items: ReadonlyArray<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="border-t border-accent/40 pt-4">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className="mt-2 text-lg font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
