import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { routePaths } from "../../Router/routePaths";
import { ProjectType } from "../../Types/contracts";

const pillars = ["legal", "engineering", "value"] as const;
const stages = ["conception", "framework", "execution", "expansion"] as const;

export function AboutPrinciples() {
  const { t } = useTranslation("about");
  return (
    <section id="about-vision" className="about-section" aria-labelledby="about-vision-title">
      <div className="home-container about-principles-grid">
        <div className="about-principles-intro">
          <p className="about-eyebrow">{t("principles.eyebrow")}</p>
          <h2 id="about-vision-title" data-about-reveal>{t("principles.title")}</h2>
          <div className="about-purpose" data-about-reveal>
            <h3>{t("principles.vision.title")}</h3>
            <p>{t("principles.vision.body")}</p>
          </div>
          <div className="about-purpose" data-about-reveal>
            <h3>{t("principles.mission.title")}</h3>
            <p>{t("principles.mission.body")}</p>
          </div>
        </div>
        <div className="about-pillars">
          {pillars.map((id, index) => (
            <article key={id} data-about-reveal>
              <div className="about-hairline" aria-hidden="true" />
              <span className="about-pillar-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{t(`principles.${id}.title`)}</h3>
                <p>{t(`principles.${id}.body`)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutJourney() {
  const { t } = useTranslation("about");
  return (
    <section className="about-section about-journey" aria-labelledby="about-journey-title">
      <div className="home-container about-journey-grid">
        <header>
          <p className="about-eyebrow">{t("journey.eyebrow")}</p>
          <h2 id="about-journey-title" data-about-reveal>{t("journey.title")}</h2>
          <p>{t("journey.intro")}</p>
        </header>
        <div className="about-timeline-wrap">
          <span className="about-timeline-track" aria-hidden="true"><span data-about-progress /></span>
          <ol className="about-timeline">
            {stages.map((id, index) => (
              <li key={id} data-about-reveal>
                <span className="about-timeline-node" aria-hidden="true" />
                <span className="about-stage-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{t(`journey.${id}.title`)}</h3>
                <p>{t(`journey.${id}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function AboutClosing() {
  const { t } = useTranslation("about");
  return (
    <section className="about-section about-closing" aria-labelledby="about-next-title">
      <div className="home-container">
        <div className="about-hairline" aria-hidden="true" />
        <p className="about-eyebrow">{t("closing.eyebrow")}</p>
        <h2 id="about-next-title" data-about-reveal>{t("closing.title")}</h2>
        <p>{t("closing.intro")}</p>
        <div className="about-actions">
          <Link to={`${routePaths.projects}?projectType=${ProjectType.Initiative}`} className="about-button">
            {t("closing.projects")}<span aria-hidden="true">↗</span>
          </Link>
          <Link to={routePaths.terms} className="about-button about-button-secondary">
            {t("closing.booklet")}<span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
