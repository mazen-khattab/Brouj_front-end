import { useTranslation } from "react-i18next";
import { CitiesDirectoryFilters } from "./CitiesDirectoryFilters";
import { CitiesDirectoryResults } from "./CitiesDirectoryResults";

export function CitiesDirectory() {
  const { t } = useTranslation("catalogue");
  return <section className="home-container projects-catalogue cities-directory" aria-label={t("citiesDirectory")}>
    <CitiesDirectoryFilters />
    <CitiesDirectoryResults />
  </section>;
}
