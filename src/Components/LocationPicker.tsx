import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocationLookup } from "../Hooks/useLocationLookup";
import type { LocationLookup } from "../Types/lookups";
import { ErrorPanel, Loading, Skeleton } from "./Feedback";
import { SearchField } from "./SearchField";

export function LocationPicker({
  field,
  selectedId,
  onSelect,
}: {
  field: "city" | "area";
  selectedId: string | null | undefined;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation("catalogue");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<LocationLookup>();
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const pointerDownInside = useRef(false);
  const { choices, selection } = useLocationLookup(field, search, selectedId, open);
  const commit = useCallback((value: string) => setSearch(value), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) {
        details.current.open = false;
      }
    };

    const onPointerUp = () => {
      pointerDownInside.current = false;
    };

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [open]);

  function close(restoreFocus = false) {
    if (details.current) {
      details.current.open = false;
    }
    if (restoreFocus) {
      trigger.current?.focus();
    }
  }

  function choose(item: LocationLookup | null) {
    setChosen(item ?? undefined);
    close(true);
    onSelect(item?.id ?? null);
  }

  const selectedName = selectedId
    ? selection.result.status === "success"
      ? selection.result.data.name
      : chosen?.id === selectedId
        ? chosen.name
        : t("change")
    : t(field === "city" ? "selectCity" : "selectArea");

  return (
    <div className="grid min-w-0 gap-2.5">
      <p className="text-sm font-semibold">{t(field)}</p>
      <details
        ref={details}
        id={`filter-${field}`}
        className="relative min-w-0"
        onToggle={(event) => setOpen(event.currentTarget.open)}
        onPointerDown={() => {
          pointerDownInside.current = true;
        }}
        onBlur={(event) => {
          if (pointerDownInside.current) {
            return;
          }
          if (!event.currentTarget.contains(event.relatedTarget)) {
            close();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            close(true);
          }
        }}
      >
        <summary
          ref={trigger}
          aria-label={t(field === "city" ? "selectCity" : "selectArea")}
          className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-ui border border-control-border bg-white px-4 py-3 text-sm text-primary shadow-xs [&::-webkit-details-marker]:hidden"
        >
          <span dir="auto">{selectedName}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="m5 7 5 5 5-5" />
          </svg>
        </summary>
        {open && (
          <div
            role="region"
            aria-label={t(field === "city" ? "cityOptions" : "areaOptions")}
            className="absolute inset-x-0 top-full z-20 mt-2 grid gap-3 rounded-ui border border-accent bg-ivory p-4 text-primary shadow-panel"
          >
            <SearchField id={`filter-${field}-search`} label={t("search") + " · " + t(field)} value={search} onCommit={commit} autoFocus />
            {selection.result.status === "error" && <p className="text-xs text-muted">{t("selectionUnavailable")}</p>}
            <button
              type="button"
              aria-pressed={!selectedId}
              className="rounded-ui border border-accent/50 bg-accent-light px-4 py-2.5 text-start text-sm font-medium"
              onClick={() => choose(null)}
            >
              {t(field === "city" ? "allCities" : "allAreas")}
            </button>
            {choices.result.status === "loading" && (
              <div aria-busy="true" className="grid gap-3">
                <Loading label={t("loadingLocations")} />
                <Skeleton height="3rem" />
                <Skeleton height="3rem" />
              </div>
            )}
            {choices.result.status === "error" && (
              <ErrorPanel title={t("lookupError")} description={t("lookupErrorDescription")} onRetry={choices.reload} />
            )}
            {choices.result.status === "success" &&
              (choices.result.data.length ? (
                <ul className="grid max-h-56 gap-1 overflow-y-auto overscroll-contain p-1">
                  {choices.result.data.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-label={t("choose", { name: item.name })}
                        aria-pressed={item.id === selectedId}
                        className="w-full rounded-ui px-3 py-3 text-start text-sm hover:bg-accent-light aria-pressed:bg-accent aria-pressed:font-medium"
                        onClick={() => choose(item)}
                      >
                        <span dir="auto">{item.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p role="status" className="py-3 text-sm text-muted">
                  {t("empty")}
                </p>
              ))}
          </div>
        )}
      </details>
    </div>
  );
}
