import { useTranslation } from "react-i18next";
import { AreaDirectoryFilters } from "./AreaDirectoryFilters";
import { AreaDirectoryResults } from "./AreaDirectoryResults";

export function AreaDirectory() {
  const { t } = useTranslation("routing");
  return <section className="home-container projects-catalogue area-directory" aria-label={t("areas")}>
    <AreaDirectoryFilters />
    <AreaDirectoryResults />
  </section>;
}
