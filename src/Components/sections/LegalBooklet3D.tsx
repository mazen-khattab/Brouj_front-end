import { useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type Lenis from "lenis";
import { BrandEmblem } from "../BrandWordmark";
import { legalBooklet, type LegalBookletChapter, type LocalizedText } from "../../data/legalBooklet";
import { useLocale } from "../../Hooks/useLocale";
import { routePaths } from "../../Router/routePaths";
import { useBookletMotion } from "./useBookletMotion";
import "../../Styles/legal-booklet.css";

type BookletLocale = keyof LocalizedText;

function ChapterHeading({ chapter, locale }: { chapter: LegalBookletChapter; locale: BookletLocale }) {
  return (
    <div className="booklet-chapter-heading">
      <bdi>{chapter.index}</bdi>
      <h3>{chapter.title[locale]}</h3>
      <p>{chapter.summary[locale]}</p>
    </div>
  );
}

function ChapterClauses({ chapter, locale }: { chapter: LegalBookletChapter; locale: BookletLocale }) {
  return (
    <>
      <div className="booklet-mobile-heading">
        <ChapterHeading chapter={chapter} locale={locale} />
      </div>
      <div className="booklet-clauses">
        {chapter.clauses.map(({ heading, body }) => (
          <div key={heading.en}>
            <h4>{heading[locale]}</h4>
            <p>{body[locale]}</p>
          </div>
        ))}
      </div>
      {chapter.highlightNote && <p className="booklet-note">{chapter.highlightNote[locale]}</p>}
    </>
  );
}

export function LegalBooklet3D({ scroll }: { scroll: RefObject<Lenis | null> }) {
  const { t } = useTranslation("home");
  const { locale, direction } = useLocale();
  const section = useRef<HTMLElement>(null);
  const { documentCode, edition, eyebrow, title, subtitle, chapters } = legalBooklet;
  const { page, goTo } = useBookletMotion(section, scroll, direction);
  const active = chapters[page - 1];
  const canTurn = page < chapters.length;

  return (
    <section ref={section} id="booklet" className="home-booklet" data-page={page} aria-labelledby="home-terms-title">
      <div className="booklet-runway">
        <div className="home-container booklet-layout">
          <header className="booklet-intro">
            <p className="booklet-eyebrow">{eyebrow[locale]}</p>
            <h2 id="home-terms-title" className="home-display">
              {title[locale]}
            </h2>
            <p className="booklet-subtitle">{subtitle[locale]}</p>
            <Link className="booklet-full-link home-action" to={routePaths.terms}>
              {t("terms.read")}
              <span aria-hidden="true" className="home-arrow">
                →
              </span>
            </Link>
          </header>
          <div className="booklet-reader">
            <div className="booklet-index" role="group" aria-label={t("terms.chapters")}>
              {chapters.map((chapter, index) => (
                <button
                  type="button"
                  key={chapter.id}
                  aria-label={`${chapter.index} ${chapter.title[locale]}`}
                  aria-pressed={page === index + 1}
                  onClick={() => goTo(index + 1)}
                >
                  <bdi>{chapter.index}</bdi>
                </button>
              ))}
            </div>
            <div
              className="booklet-stage"
              data-can-turn={canTurn}
              onClick={(event) => {
                if (!(event.target instanceof Element) || window.getSelection()?.toString()) return;
                const face = event.target.closest(".booklet-face");
                if (face?.classList.contains("booklet-back")) goTo(page - 1);
                else if (face && canTurn) goTo(page + 1);
              }}
            >
              <div className="booklet-object">
                {[undefined, ...chapters].map((chapter, index) => {
                  const following = chapters[index];
                  return (
                    <div className={`booklet-sheet${chapter ? "" : " booklet-hardcover"}`} key={chapter?.id ?? "cover"}>
                      <div className="booklet-face booklet-front" aria-hidden={page !== index} inert={page !== index}>
                        <span className="booklet-turn-shadow" aria-hidden="true" />
                        {chapter ? (
                          <ChapterClauses chapter={chapter} locale={locale} />
                        ) : (
                          <div className="booklet-cover-content">
                            <div className="booklet-cover-mark">
                              <BrandEmblem />
                            </div>
                            <p>{title[locale]}</p>
                            <small>{edition[locale]}</small>
                            <bdi>{documentCode}</bdi>
                          </div>
                        )}
                      </div>
                      <div className="booklet-face booklet-back" aria-hidden={page !== index + 1} inert={page !== index + 1}>
                        <span className="booklet-turn-shadow" aria-hidden="true" />
                        {following && <ChapterHeading chapter={following} locale={locale} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="booklet-nav">
              <button type="button" aria-label={t("terms.previous")} disabled={page === 0} onClick={() => goTo(page - 1)}>
                <span className="home-arrow" aria-hidden="true">
                  ←
                </span>
              </button>
              <p role="status" className="booklet-position">
                {active ? (
                  <>
                    <bdi>{active.index}</bdi>
                    <span>{active.title[locale]}</span>
                  </>
                ) : (
                  edition[locale]
                )}
              </p>
              <button type="button" aria-label={t(page === 0 ? "terms.open" : "terms.next")} disabled={!canTurn} onClick={() => goTo(page + 1)}>
                <span className="home-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
