import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../Hooks/useLocale";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from "../../i18n/format";
import type {
  AmenityDto,
  ProjectDto,
  ProjectListDto,
  UnitDto,
  UnitListDto,
} from "../../Types/contracts";

export function Facts({
  items,
}: {
  items: ReadonlyArray<{ label: string; value: ReactNode }>;
}) {
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
export function ProjectFacts({
  project,
}: {
  project: ProjectDto | ProjectListDto;
}) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const items = [
    { label: t("projectPrice"), value: formatCurrency(project.price, locale) },
    {
      label: t("size"),
      value: t("squareMeters", {
        value: formatNumber(project.size, locale, { maximumFractionDigits: 4 }),
      }),
    },
    {
      label: t("projectType"),
      value: t(
        project.projectType === 0
          ? "regular"
          : project.projectType === 1
            ? "initiative"
            : "unknownType",
      ),
    },
  ];
  if ("floorCount" in project) {
    items.push(
      { label: t("floors"), value: formatNumber(project.floorCount, locale) },
      {
        label: t("plannedUnits"),
        value: formatNumber(project.plannedUnitCount, locale),
      },
      { label: t("garage"), value: t(project.isGarage ? "yes" : "no") },
      {
        label: t("garagePrice"),
        value: formatCurrency(project.garagePrice, locale),
      },
    );
    if (project.neighborPrice !== null)
      items.push({
        label: t("neighborPrice"),
        value: formatCurrency(project.neighborPrice, locale),
      });
    if (project.drawDate)
      items.push({
        label: t("drawDate"),
        value: formatDateTime(project.drawDate, locale),
      });
    if (project.latitude !== null)
      items.push({
        label: t("latitude"),
        value: formatNumber(project.latitude, locale, {
          maximumFractionDigits: 6,
        }),
      });
    if (project.longitude !== null)
      items.push({
        label: t("longitude"),
        value: formatNumber(project.longitude, locale, {
          maximumFractionDigits: 6,
        }),
      });
  }
  return <Facts items={items} />;
}
export function UnitFacts({
  unit,
  full = false,
}: {
  unit: UnitDto | UnitListDto;
  full?: boolean;
}) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const items = [
    { label: t("unitPrice"), value: formatCurrency(unit.totalPrice, locale) },
    {
      label: t("size"),
      value: t("squareMeters", {
        value: formatNumber(unit.size, locale, { maximumFractionDigits: 4 }),
      }),
    },
    { label: t("floor"), value: formatNumber(unit.floorNumber, locale) },
    {
      label: t("availability"),
      value: t(unit.isAvailable ? "available" : "unavailable"),
    },
  ];
  if (full) {
    items.push(
      {
        label: t("meterPrice"),
        value: formatCurrency(unit.meterPrice, locale),
      },
      { label: t("garage"), value: t(unit.isGarage ? "yes" : "no") },
      {
        label: t("garagePrice"),
        value: formatCurrency(unit.garagePrice, locale),
      },
    );
    if (unit.neighborMeterPrice !== null)
      items.push({
        label: t("neighborMeterPrice"),
        value: formatCurrency(unit.neighborMeterPrice, locale),
      });
    if (unit.percentage !== null)
      items.push({
        label: t("percentage"),
        value: t("percentValue", {
          value: formatNumber(unit.percentage, locale, {
            maximumFractionDigits: 6,
          }),
        }),
      });
  }
  return <Facts items={items} />;
}
export function Amenities({ items, cards = false }: { items: ReadonlyArray<AmenityDto>; cards?: boolean }) {
  const { t } = useTranslation("catalogue");
  return (
    <section className="grid gap-5">
      <h2 className="text-2xl font-medium">{t("amenities")}</h2>
      {items.length && cards ? <dl className="flex flex-wrap gap-3">{items.map((item, index) => <div key={`${item.name}:${index}`} className="grid min-w-32 max-w-52 content-start gap-1 rounded-ui border border-accent/40 bg-surface px-4 py-3">
        <dt dir="auto" className="text-sm font-medium [overflow-wrap:anywhere]">{item.name}</dt>
        <dd dir="auto" className="text-sm leading-6 text-muted [overflow-wrap:anywhere]">{item.value}</dd>
      </div>)}</dl> : items.length ? (
        <Facts
          items={items.map((item) => ({ label: item.name, value: item.value }))}
        />
      ) : (
        <p className="text-muted">{t("noAmenities")}</p>
      )}
    </section>
  );
}
