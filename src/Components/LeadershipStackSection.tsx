import { Fragment, useRef, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useLeadershipStack, type LeadershipScroll } from "../Hooks/useLeadershipStack";
import "../Styles/leadership-stack.css";

const leaders = ["ceo", "strategy", "legal"] as const;

interface LeadershipStackSectionProps {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  storyLink?: { to: string; label: string };
  scroll: LeadershipScroll;
}

export function LeadershipStackSection({ id, eyebrow, title, subtitle, storyLink, scroll }: LeadershipStackSectionProps) {
  const { t, i18n } = useTranslation("home");
  const { t: about } = useTranslation("about");
  const deck = useRef<HTMLDivElement>(null);
  const revealCard = useLeadershipStack(deck, scroll, i18n.resolvedLanguage);
  const titleId = `${id}-title`;

  return (
    <section id={id} tabIndex={-1} className="leadership-stack" aria-labelledby={titleId}>
      <div className="home-container">
        <header className="leadership-heading">
          <div>
            {eyebrow && <p className="leadership-eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          {subtitle && <p className="leadership-intro">{subtitle}</p>}
          {storyLink && (
            <Link className="home-text-link leadership-story" to={storyLink.to}>
              {storyLink.label}<span className="home-arrow" aria-hidden="true">→</span>
            </Link>
          )}
        </header>
        <div ref={deck} className="leadership-deck">
          {leaders.map((leader, index) => {
            const nameId = `${id}-${leader}-name`;
            const roleId = `${id}-${leader}-role`;
            const layer = {
              "--leadership-layer": index,
              "--leadership-layers-above": leaders.length - index - 1,
            } as CSSProperties;

            return (
              <Fragment key={leader}>
                <div className="leadership-card-anchor" aria-hidden="true" />
                <article className={`leadership-deck-card leadership-deck-card--${leader}`} style={layer} aria-labelledby={nameId}>
                  <div className="leadership-card-panel">
                    <header className="leadership-card-bar">
                      <div className="leadership-card-bar-content">
                        <bdi className="leadership-card-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</bdi>
                        <h3 id={nameId}>{t(`leadership.${leader}.name`)}</h3>
                        <span id={roleId} className="leadership-card-role">{t(`leadership.${leader}.role`)}</span>
                      </div>
                      <button type="button" aria-labelledby={nameId} aria-describedby={roleId} onClick={() => revealCard(index)} />
                    </header>
                    <div className="leadership-card-body">
                      <div className="leadership-card-content">
                        <div className="leadership-card-portrait" aria-hidden="true">
                          <svg viewBox="0 0 320 380" fill="none">
                            <path d="M32 360V160a128 128 0 0 1 256 0v200" />
                            <path d="M44 360V160a116 116 0 0 1 232 0v200" />
                            <path d="M160 20v24M150 32h20M20 160h24m232 0h24M20 360h24m232 0h24" />
                          </svg>
                          <span>{t(`leadership.${leader}.initials`)}</span>
                        </div>
                        <div className="leadership-card-copy">
                          <p className="leadership-statement">{t(`leadership.${leader}.statement`)}</p>
                          <p className="leadership-bio">{about(`leadership.${leader}`)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
