import { useTranslation } from "react-i18next";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import { ProjectType, type ProjectDto } from "../../../Types/contracts";

export function ProjectSummary({ project }: { project: ProjectDto }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const { projectType, reservationsWithoutOrderCount, reservationsWithPendingOrderCount } = project;
  if (projectType !== ProjectType.Initiative || reservationsWithoutOrderCount == null || reservationsWithPendingOrderCount == null) {
    return null;
  }

  const metrics = [
    { label: t("projectSummary.withoutOrder"), value: formatNumber(reservationsWithoutOrderCount, locale) },
    { label: t("projectSummary.pendingOrder"), value: formatNumber(reservationsWithPendingOrderCount, locale) },
  ];

  return (
    <section className="pd-summary" aria-labelledby="project-summary-title">
      <h2 id="project-summary-title">{t("projectSummary.reservations")}</h2>
      <dl>
        {metrics.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd><bdi>{value}</bdi></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
