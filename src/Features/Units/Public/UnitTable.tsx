import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { BidiText } from "../../../Components/BidiText";
import { Button } from "../../../Components/Button";
import { EmptyState } from "../../../Components/Feedback";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { useLocale } from "../../../Hooks/useLocale";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { formatCurrency, formatDateTime, formatNumber } from "../../../i18n/format";
import { routePaths } from "../../../Router/routePaths";
import { getUnitsByProject } from "../../../Services/Units";
import { ProjectType, type ProjectDto } from "../../../Types/contracts";

function Table({ project }: { project: ProjectDto }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const load = useCallback(
    (signal: AbortSignal) => getUnitsByProject({ projectId: project.id, query: { pageNumber: page, pageSize: 20 } }, { signal }),
    [project.id, page],
  );
  const { result, reload } = useResourceRead(["unit-table", project.id, page].join(":"), load);
  const missing = t("priceUnavailable");
  const money = (value: number | null | undefined) => (value == null ? missing : formatCurrency(value, locale));
  const percent = (value: number | null | undefined) =>
    value == null ? missing : formatNumber(value / 100, locale, { style: "percent", maximumFractionDigits: 4 });
  const initiative = project.projectType === ProjectType.Initiative;
  const headers = ["unitNumber", "unitArea", "floor", "trend", "startingMeterPrice", "excellencePercentage", "meterPrice", "amenities", "unitPrice"];
  return (
    <div id="project-units" className="grid min-w-0 gap-5">
      <PublicReadPanel result={result} reload={reload}>
        {(data) => {
          if (data.items.length === 0) {
            return (
              <div className="rounded-ui bg-ivory p-6 text-primary">
                <EmptyState title={t("noUnits")} description={t("noUnitsDescription")} />
              </div>
            );
          }
          const stages = data.items[0]?.stages ?? [];
          return (
            <>
              <div className="flex flex-wrap justify-between gap-3 text-sm text-accent-light">
                <p>{t("results", { value: formatNumber(data.totalCount, locale) })}</p>
                <p id="units-table-help">{t("unitsTableHint")}</p>
              </div>
              <div
                role="region"
                aria-label={t("units")}
                aria-describedby="units-table-help"
                tabIndex={0}
                data-lenis-prevent
                className="pd-table-scroll max-w-full overflow-x-auto rounded-ui border border-accent/40 bg-ivory text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <table className="w-full border-collapse text-start text-sm">
                  <caption className="sr-only">{t("units")}</caption>
                  <thead className="bg-primary-deep text-ivory">
                    <tr>
                      {headers.map((header) => (
                        <th
                          key={header}
                          scope="col"
                          className={
                            "min-w-32 border-e border-accent/20 px-5 py-4 text-start font-medium" +
                            (header === "unitNumber" ? " sticky start-0 z-20 bg-primary-deep" : "")
                          }
                        >
                          {t(header)}
                        </th>
                      ))}
                      {initiative && (
                        <th scope="col" className="min-w-36 px-5 py-4 text-start font-medium">
                          {t("percentage")}
                        </th>
                      )}
                      {initiative && (
                        <th scope="col" className="min-w-36 px-5 py-4 text-start font-medium">
                          {t("PricingDate")}
                        </th>
                      )}
                      {stages.map((stage, index) => (
                        <th
                          key={index}
                          scope="col"
                          aria-label={stage.isCompleted ? `${stage.stageName}, ${t("stageCompleted")}` : undefined}
                          className="min-w-44 border-s border-accent/20 px-5 py-4 text-start font-medium"
                        >
                          <span className={stage.isCompleted ? "line-through decoration-white/50 decoration-1" : undefined}>
                            <BidiText direction="auto">{stage.stageName}</BidiText>
                          </span>
                        </th>
                      ))}
                      {initiative &&
                        ["neighborMeterPrice", "unitSavingPercentage"].map((header) => (
                          <th key={header} scope="col" className="min-w-40 border-s border-accent/20 px-5 py-4 text-start font-medium">
                            {t(header)}
                          </th>
                        ))}
                      <th scope="col" className="min-w-40 border-s border-accent/20 px-5 py-4 text-start font-medium">
                        {t("finishingDate")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((unit) => {
                      const href = routePaths.unit(project.id, unit.id);
                      const cells = [
                        t("squareMeters", { value: formatNumber(unit.size, locale) }),
                        formatNumber(unit.floorNumber, locale),
                        unit.trend || missing,
                        money(project.startingMeterPrice),
                        percent(unit.excellencePercentage),
                        money(unit.meterPrice),
                      ];
                      return (
                        <tr
                          key={unit.id}
                          className="cursor-pointer border-t border-accent/30 transition-colors hover:bg-accent-light/40 focus-within:bg-accent-light/40"
                          onClick={(event) => {
                            if (
                              event.defaultPrevented ||
                              (event.target instanceof Element && event.target.closest("a")) ||
                              window.getSelection()?.toString()
                            )
                              return;
                            navigate(href);
                          }}
                        >
                          <th scope="row" className="sticky start-0 z-10 bg-ivory whitespace-nowrap px-5 py-5 text-start font-medium">
                            <Link
                              to={href}
                              className="rounded-sm underline decoration-accent underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                            >
                              {t("unitLabel", { number: "" })}
                              <BidiText>{unit.number}</BidiText>
                            </Link>
                          </th>
                          {cells.map((cell, index) => (
                            <td key={index} className="whitespace-nowrap px-5 py-5 tabular-nums">
                              <BidiText direction="auto">{cell}</BidiText>
                            </td>
                          ))}
                          <td className="min-w-48 px-5 py-5">
                            <span className="block">
                              {t("garage")}: {t(unit.isGarage ? "yes" : "no")}
                            </span>
                            <span className="block">
                              {t("elevator")}: <BidiText direction="auto">{t("yes")}</BidiText>
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-5 font-medium tabular-nums">{money(unit.totalPrice)}</td>
                          {initiative && <td className="whitespace-nowrap px-5 py-5 tabular-nums">{percent(unit.percentage)}</td>}
                          {initiative && (
                            <td className="whitespace-nowrap px-5 py-5">
                              {unit.pricingDate ? formatDateTime(unit.pricingDate, locale, { dateStyle: "medium" }) : missing}
                            </td>
                          )}
                          {stages.map((stage, index) => {
                            const value = unit.stages?.[index];
                            return (
                              <td key={index} className="px-5 py-5">
                                <span className={stage.isCompleted ? "block whitespace-nowrap line-through" : "block whitespace-nowrap"}>
                                  {money(value?.stagePrice)}
                                </span>
                              </td>
                            );
                          })}
                          {initiative && (
                            <>
                              <td className="whitespace-nowrap px-5 py-5 tabular-nums">{money(unit.neighborMeterPrice)}</td>
                              <td className="whitespace-nowrap px-5 py-5 tabular-nums">{percent(unit.unitSavingPercentage)}</td>
                            </>
                          )}
                          <td className="whitespace-nowrap px-5 py-5">
                            {unit.finishingDate ? formatDateTime(unit.finishingDate, locale, { dateStyle: "medium" }) : missing}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <nav
                aria-label={t("units")}
                className="pd-unit-pagination flex flex-wrap items-center justify-between gap-4 rounded-ui border border-accent/35 bg-primary-deep p-5"
              >
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {t("previousUnits")}
                </Button>
                <p role="status" className="text-sm text-accent-light">
                  {t("unitPosition", {
                    first: formatNumber((page - 1) * data.pageSize + 1, locale),
                    last: formatNumber(Math.min(page * data.pageSize, data.totalCount), locale),
                    total: formatNumber(data.totalCount, locale),
                  })}
                </p>
                <Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                  {t("nextUnits")}
                </Button>
              </nav>
            </>
          );
        }}
      </PublicReadPanel>
    </div>
  );
}

export function UnitTable({ project }: { project: ProjectDto }) {
  return <Table key={project.id} project={project} />;
}
