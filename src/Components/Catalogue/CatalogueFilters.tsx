import { useCallback, useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCatalogueList } from "../../Hooks/useCatalogue";
import { useCatalogueRead } from "../../Hooks/useCatalogueRead";
import { getCities, getCityById } from "../../Services/Cities";
import { getAreas, getAreasByCity, getAreaById } from "../../Services/Areas";
import { Input, Select } from "../Fields";
import { Button } from "../Button";
import { Pagination } from "../Pagination";
import { CatalogueFeedback } from "./CatalogueFeedback";
import type {
  AreaListDto,
  CityDto,
  PaginationResult,
} from "../../Types/contracts";
import { useLocale } from "../../Hooks/useLocale";
import { formatNumber } from "../../i18n/format";

function SearchField({
  value,
  onCommit,
  label,
  id,
}: {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  id: string;
}) {
  const [draft, setDraft] = useState(value);
  const [observed, setObserved] = useState(value);
  if (observed !== value) {
    setObserved(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft.trim() === value) return;
    const timer = window.setTimeout(() => onCommit(draft.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [draft, value, onCommit]);
  return (
    <Input
      id={id}
      type="search"
      label={label}
      maxLength={100}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

function LocationPicker({
  field,
  selectedId,
  cityId,
  onSelect,
}: {
  field: "city" | "area";
  selectedId: string | null | undefined;
  cityId: string | null | undefined;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation("catalogue");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const selectedLoader = useCallback(
    (signal: AbortSignal) =>
      field === "city"
        ? getCityById({ id: selectedId! }, { signal })
        : getAreaById({ id: selectedId! }, { signal }),
    [field, selectedId],
  );
  const selection = useCatalogueRead(
    `${field}:${selectedId ?? ""}`,
    selectedLoader,
    !!selectedId,
  );
  const loader = useCallback(
    async (
      signal: AbortSignal,
    ): Promise<PaginationResult<CityDto | AreaListDto>> => {
      const query = {
        pageNumber: page,
        pageSize: 10,
        ...(search ? { search } : {}),
      };
      return field === "city"
        ? getCities({ query }, { signal })
        : cityId
          ? getAreasByCity({ cityId, query }, { signal })
          : getAreas({ query }, { signal });
    },
    [field, cityId, page, search],
  );
  const choices = useCatalogueRead(
    `${field}:${cityId ?? ""}:${page}:${search}`,
    loader,
    open,
  );
  const commit = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  return (
    <details
      className="min-w-0 rounded-ui border border-accent/60 bg-surface p-4"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium">
        {t(field === "city" ? "selectCity" : "selectArea")}
        <span className="mt-2 block text-muted">
          {selection.result.status === "success"
            ? selection.result.data.name
            : selectedId
              ? t("change")
              : t("noneSelected")}
        </span>
      </summary>
      {open && (
        <div className="mt-5 grid gap-4">
          {selectedId && (
            <CatalogueFeedback
              result={selection.result}
              reload={selection.reload}
            >
              {() => null}
            </CatalogueFeedback>
          )}
          <SearchField
            id={`filter-${field}-search`}
            value={search}
            onCommit={commit}
            label={t("search") + " · " + t(field)}
          />
          <Button variant="secondary" onClick={() => onSelect(null)}>
            {t("all")}
          </Button>
          <CatalogueFeedback result={choices.result} reload={choices.reload}>
            {(data) => (
              <>
                {!data.items.length && (
                  <p className="text-sm text-muted">{t("empty")}</p>
                )}
                <ul className="grid gap-2">
                  {data.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={item.id === selectedId}
                        aria-label={t("choose", { name: item.name })}
                        className="w-full rounded-ui border border-accent/50 px-4 py-3 text-start hover:bg-accent-light"
                        onClick={() => onSelect(item.id)}
                      >
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={data.pageNumber}
                  totalPages={data.totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </CatalogueFeedback>
        </div>
      )}
    </details>
  );
}

export function CatalogueFilters({
  projects = false,
  locations = false,
  units = false,
}: {
  projects?: boolean;
  locations?: boolean;
  units?: boolean;
}) {
  const { t } = useTranslation("catalogue");
  const { params, update } = useCatalogueList();
  const { locale } = useLocale();
  const [searchRevision, resetSearch] = useReducer(
    (revision: number) => revision + 1,
    0,
  );
  const search = useCallback(
    (value: string) => update({ search: value || null }, true),
    [update],
  );
  return (
    <section
      aria-label={t("filters")}
      className="grid gap-5 rounded-ui border border-accent/60 bg-accent-light p-5 text-primary sm:p-6"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
        <SearchField
          key={searchRevision}
          id="catalogue-search"
          label={t(units ? "searchUnits" : "search")}
          value={params.search ?? ""}
          onCommit={search}
        />
        <Select
          id="catalogue-page-size"
          label={t("pageSize")}
          value={params.pageSize}
          onChange={(event) => update({ pageSize: Number(event.target.value) })}
        >
          {[...new Set([12, 24, 48, params.pageSize])]
            .sort((a, b) => a - b)
            .map((size) => (
              <option key={size} value={size}>
                {formatNumber(size, locale)}
              </option>
            ))}
        </Select>
      </div>
      {projects && (
        <div
          className={`grid items-start gap-5 ${locations ? "lg:grid-cols-3" : ""}`}
        >
          {locations && (
            <>
              <LocationPicker
                field="city"
                selectedId={params.cityId}
                cityId={null}
                onSelect={(id) => update({ cityId: id })}
              />
              <LocationPicker
                key={params.cityId ?? ""}
                field="area"
                selectedId={params.areaId}
                cityId={params.cityId}
                onSelect={(id) => update({ areaId: id })}
              />
            </>
          )}
          <Select
            id="catalogue-type"
            label={t("projectType")}
            value={params.projectType ?? ""}
            onChange={(event) =>
              update({
                projectType:
                  event.target.value === ""
                    ? null
                    : (Number(event.target.value) as 0 | 1),
              })
            }
          >
            <option value="">{t("all")}</option>
            <option value="0">{t("regular")}</option>
            <option value="1">{t("initiative")}</option>
          </Select>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">{t("searchHint")}</p>
        <Button
          variant="secondary"
          onClick={() => {
            // Clear an uncommitted draft too, even when the URL's search is already empty.
            resetSearch();
            update({
              search: null,
              cityId: null,
              areaId: null,
              projectType: null,
            });
          }}
        >
          {t("clear")}
        </Button>
      </div>
    </section>
  );
}
