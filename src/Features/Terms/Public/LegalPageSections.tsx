import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useLocale } from "../../../Hooks/useLocale";
import { formatDateTime } from "../../../i18n/format";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import { ProjectType, type TermsDto } from "../../../Types/contracts";

export function LegalHeader({ document }: { document: TermsDto | null }) {
  const { t } = useTranslation("legal");
  const { locale } = useLocale();
  return <header className="legal-hero">
    <div className="home-container">
      <p className="legal-eyebrow" data-legal-enter>{t("hero.eyebrow")}</p>
      <div className="legal-title-mask"><RouteHeading>{t("hero.title")}</RouteHeading></div>
      <p className="legal-hero-intro" data-legal-enter>{t("hero.intro")}</p>
      <div className="legal-metadata">
        <dl>
          {document ? <>
            <div><dt>{t("hero.version")}</dt><dd><bdi>{document.versionNumber}</bdi></dd></div>
            <div><dt>{t("hero.effective")}</dt><dd><time dateTime={document.effectiveDate}>{formatDateTime(document.effectiveDate, locale, { dateStyle: "long" })}</time></dd></div>
          </> : <div><dt>{t("hero.reference")}</dt><dd>{t("hero.initiative")}</dd></div>}
        </dl>
        <button className="legal-print" type="button" onClick={() => window.print()} disabled={!document}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7Zm10-3h1" /></svg>
          {t("hero.print")}
        </button>
      </div>
    </div>
  </header>;
}

export function LegalPending({ reload }: { reload: () => void }) {
  const { t } = useTranslation("legal");
  return <section className="home-container legal-pending" aria-labelledby="legal-pending-title">
    <div className="legal-booklet-emblem" aria-hidden="true">
      <svg viewBox="0 0 180 220" fill="none"><path d="M28 18h126v176H28zM39 18v176M55 161h72M55 173h49M58 131V86a34 34 0 0 1 68 0v45M65 131V86a27 27 0 0 1 54 0v45M91 47v14" /></svg>
    </div>
    <div className="legal-pending-copy">
      <p className="legal-eyebrow">{t("pending.eyebrow")}</p>
      <h2 id="legal-pending-title">{t("pending.title")}</h2>
      <p>{t("pending.body")}</p>
      <button type="button" className="legal-text-action" onClick={reload}>{t("pending.check")}<span aria-hidden="true">↻</span></button>
    </div>
  </section>;
}

export function LegalClosing() {
  const { t } = useTranslation("legal");
  return <section className="legal-closing" aria-labelledby="legal-closing-title">
    <div className="home-container legal-closing-inner">
      <div><p className="legal-eyebrow">{t("closing.eyebrow")}</p><h2 id="legal-closing-title">{t("closing.title")}</h2><p>{t("closing.body")}</p></div>
      <div className="legal-closing-actions">
        <Link className="legal-button" to={`${routePaths.projects}?projectType=${ProjectType.Initiative}`}>{t("closing.projects")}<span aria-hidden="true">↗</span></Link>
        <Link className="legal-button legal-button-secondary" to={`${routePaths.home}#contact`}>{t("closing.contact")}<span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  </section>;
}
