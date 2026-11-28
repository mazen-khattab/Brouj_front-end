import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RouteHeading } from "../../Router/RouteFeedback";
import { routePaths } from "../../Router/routePaths";
import { HeroFilm } from "./HeroFilm";

export function HeroSection() {
  const { t } = useTranslation("home");

  return (
    <section aria-label={t("welcome", { ns: "common" })} className="home-hero">
      <div className="home-hero-overlay" aria-hidden="true" />
      <div className="home-container home-hero-inner">
        <div className="home-hero-copy">
          <p className="home-kicker" data-enter>{t("hero.eyebrow")}</p>
          <RouteHeading>{t("hero.title")}</RouteHeading>
          <p className="home-hero-description" data-enter>{t("hero.description")}</p>
          <Link data-enter className="home-action home-hero-action" to={routePaths.projects}>
            {t("hero.explore")}
            <span className="home-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <HeroFilm />
    </section>
  );
}
