import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../Hooks/useLocale";
import { formatCurrency, formatNumber, formatDateTime } from "../../i18n/format";
import type { ProjectDto } from "../../Types/contracts";

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
  project: ProjectDto;
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
