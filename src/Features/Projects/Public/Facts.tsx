import { useTranslation } from "react-i18next";
import { Facts } from "../../../Components/Facts";
import { useLocale } from "../../../Hooks/useLocale";
import { formatCurrency, formatDateTime, formatNumber } from "../../../i18n/format";
import type { ProjectDto, ProjectListDto } from "../../../Types/contracts";

export function ProjectFacts({ project }: { project: ProjectDto | ProjectListDto }) {
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
      value: t(project.projectType === 0 ? "regular" : project.projectType === 1 ? "initiative" : "unknownType"),
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
