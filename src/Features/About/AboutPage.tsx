import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { LeadershipStackSection } from "../../Components/LeadershipStackSection";
import { AboutHero } from "./AboutHero";
import { AboutPrinciples, AboutJourney, AboutClosing } from "./AboutSections";
import { useAboutMotion } from "./useAboutMotion";
import "../../Styles/home.css";
import "../../Styles/about.css";

export default function AboutPage() {
  const root = useRef<HTMLDivElement>(null);
  const scroll = useAboutMotion(root);
  const { t } = useTranslation("about");
  const { t: home } = useTranslation("home");
  return (
    <div ref={root} className="about-page">
      <AboutHero />
      <AboutPrinciples />
      <LeadershipStackSection
        id="about-leaders"
        eyebrow={t("leadership.eyebrow")}
        title={home("leadership.title")}
        subtitle={t("leadership.intro")}
        scroll={scroll}
      />
      <AboutJourney />
      <AboutClosing />
    </div>
  );
}
