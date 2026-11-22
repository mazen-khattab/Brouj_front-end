import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PublicReadPanel } from "../../Components/PublicReadPanel";
import { routePaths } from "../../Router/routePaths";
import { useHome } from "./useHome";

export function TermsPreview() {
  const { t } = useTranslation("home");
  const { terms, reloadTerms } = useHome();
  const missing = terms.status === "error" && terms.failure.status === 404;
  return (
    <section id="booklet" className="home-band home-terms" aria-labelledby="home-terms-title">
      <div className="home-container home-terms-grid">
        <div className="home-terms-stage" aria-hidden="true" data-reveal>
          <div className="home-book">
            <div className="home-book-cover">
              <span className="book-emblem">
                <i />
                <i />
                <i />
              </span>
              <span>{t("terms.title")}</span>
              {terms.status === "success" && <small>{t("terms.version", { version: terms.data.versionNumber })}</small>}
            </div>
          </div>
        </div>
        <div className="home-terms-copy">
          <h2 id="home-terms-title" className="home-display">
            {t("terms.title")}
          </h2>
          {missing ? (
            <div className="home-empty">
              <h3>{t("terms.empty")}</h3>
              <p>{t("terms.emptyDescription")}</p>
            </div>
          ) : (
            <PublicReadPanel result={terms} reload={reloadTerms}>
              {(data) => (
                <>
                  <p className="home-description">{t("terms.intro")}</p>
                  <details className="home-reader">
                    <summary>
                      <span dir="auto">{data.title}</span>
                      <span className="reader-plus" aria-hidden="true" />
                    </summary>
                    <div className="home-document" data-lenis-prevent tabIndex={0} dir="auto">
                      {data.content}
                    </div>
                  </details>
                  <Link className="home-text-link" to={routePaths.terms}>
                    {t("terms.read")}
                  </Link>
                </>
              )}
            </PublicReadPanel>
          )}
        </div>
      </div>
    </section>
  );
}
