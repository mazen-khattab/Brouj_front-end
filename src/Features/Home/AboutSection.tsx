import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale } from "../../Hooks/useLocale";
import { routePaths } from "../../Router/routePaths";
import { ProjectType } from "../../Types/contracts";
import { useHome } from "./useHome";

interface LeaderItem {
  id: "ceo" | "strategy" | "legal";
  photo?: string;
}

const people: readonly LeaderItem[] = [
  { id: "ceo" },
  { id: "strategy" },
  { id: "legal" },
];

export function AboutSection() {
  const { t } = useTranslation("home");
  const { locale } = useLocale();
  const { hash, key } = useLocation();
  const { collections, terms } = useHome();
  const projects = collections[ProjectType.Initiative].result;
  const alignedLocation = useRef<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hash !== "#about" || projects.status === "loading" || terms.status === "loading" || alignedLocation.current === key) return;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById("about");
      section?.scrollIntoView({ block: "start" });
      section?.focus({ preventScroll: true });
      alignedLocation.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, key, projects.status, terms.status]);

  // Lock section height on desktop so card hover expansion extends only the card without extending the section
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof window === "undefined") return;

    const syncHeight = () => {
      if (window.innerWidth >= 1024) {
        section.style.height = "auto";
        const naturalHeight = section.getBoundingClientRect().height;
        section.style.height = `${naturalHeight}px`;
      } else {
        section.style.height = "auto";
      }
    };

    const frame = requestAnimationFrame(syncHeight);
    document.fonts?.ready?.then(syncHeight);
    window.addEventListener("resize", syncHeight);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncHeight);
      section.style.height = "auto";
    };
  }, [locale]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Editorial section heading reveal
      const eyebrow = section.querySelector<HTMLElement>("[data-editorial-eyebrow]");
      const title = section.querySelector<HTMLElement>("[data-editorial-title]");
      const cta = section.querySelector<HTMLElement>("[data-magnetic-cta]");

      if (eyebrow) {
        gsap.from(eyebrow, {
          y: 20,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: eyebrow,
            start: "top 92%",
            once: true,
          },
        });
      }

      if (title) {
        gsap.from(title, {
          yPercent: 75,
          duration: 1.1,
          ease: "expo.out",
          scrollTrigger: {
            trigger: title,
            start: "top 92%",
            once: true,
          },
        });
      }

      if (cta) {
        gsap.from(cta, {
          opacity: 0,
          x: locale === "ar" ? -24 : 24,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cta,
            start: "top 92%",
            once: true,
          },
        });
      }

      // 2. Leadership cards staggered reveal & gold arch border stroke animation
      const cards = section.querySelectorAll<HTMLElement>("[data-leadership-card]");
      if (cards.length > 0) {
        gsap.from(cards, {
          y: 44,
          opacity: 0,
          duration: 1.0,
          stagger: 0.16,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            once: true,
          },
        });

        cards.forEach((card, index) => {
          const archStrokes = card.querySelectorAll<SVGPathElement>(".leadership-arch-stroke");
          archStrokes.forEach((stroke) => {
            const length = stroke.getTotalLength ? stroke.getTotalLength() : 800;
            gsap.fromTo(
              stroke,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                duration: 1.4,
                delay: 0.15 + index * 0.18,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 82%",
                  once: true,
                },
              }
            );
          });
        });

        // 3. Subtle vertical parallax across cards on fine pointer devices
        if (window.matchMedia("(pointer: fine)").matches) {
          const parallaxDistances = [-14, -32, -20];
          cards.forEach((card, idx) => {
            gsap.to(card, {
              y: parallaxDistances[idx] ?? -16,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: 1.2,
              },
            });
          });
        }
      }
    }, section);

    return () => ctx.revert();
  }, [locale]);

  const handleCtaMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) * 0.22;
    const y = (e.clientY - (rect.top + rect.height / 2)) * 0.22;
    gsap.to(e.currentTarget, { x, y, duration: 0.35, ease: "power2.out" });
  };

  const handleCtaMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  };

  return (
    <section
      ref={sectionRef}
      id="about"
      tabIndex={-1}
      aria-labelledby="about-title"
      className="home-band home-about"
    >
      <div className="home-container">
        <div className="home-section-heading leadership-section-heading">
          <div className="leadership-heading-group">
            <p className="home-kicker leadership-eyebrow" data-editorial-eyebrow>
              {t("leadership.eyebrow", "04 — LEADERSHIP")}
            </p>
            <div className="leadership-title-mask">
              <h2 id="about-title" className="home-display leadership-title" data-editorial-title>
                {t("leadership.title")}
              </h2>
            </div>
          </div>
          <Link
            to={routePaths.about}
            className="home-text-link leadership-cta"
            data-magnetic-cta
            onMouseMove={handleCtaMouseMove}
            onMouseLeave={handleCtaMouseLeave}
          >
            <span className="leadership-cta-text">{t("about.readMore")}</span>
            <span className="leadership-cta-arrow" aria-hidden="true">→</span>
            <span className="leadership-cta-line" aria-hidden="true" />
          </Link>
        </div>

        <div className="leadership-gallery">
          {people.map(({ id, photo }, index) => (
            <article
              key={id}
              className={`leadership-card leadership-card--${id}`}
              data-leadership-card
              tabIndex={0}
            >
              <div className="leadership-frame">
                <div className="leadership-frame-header" aria-hidden="true">
                  <span className="leadership-index">
                    <span className="leadership-index-bracket">[</span>
                    {String(index + 1).padStart(2, "0")}
                    <span className="leadership-index-bracket">]</span>
                  </span>
                  <span className="leadership-tag">{t(`leadership.${id}.tag`)}</span>
                </div>

                <div className="leadership-arch-stage" aria-hidden="true">
                  <svg
                    className="leadership-arch-svg"
                    viewBox="0 0 320 380"
                    fill="none"
                    aria-hidden="true"
                  >
                    {/* Outer architectural arch hairline */}
                    <path
                      className="leadership-arch-stroke leadership-arch-outer"
                      d="M 32 360 V 160 A 128 128 0 0 1 288 160 V 360"
                    />
                    {/* Inner architectural arch hairline */}
                    <path
                      className="leadership-arch-stroke leadership-arch-inner"
                      d="M 44 360 V 160 A 116 116 0 0 1 276 160 V 360"
                    />
                    {/* Architectural keystone tick & impost ticks */}
                    <path className="leadership-arch-mark" d="M 160 20 V 44 M 150 32 H 170" />
                    <path className="leadership-arch-mark" d="M 20 160 H 44 M 276 160 H 300" />
                    <path className="leadership-arch-mark" d="M 20 360 H 44 M 276 360 H 300" />
                  </svg>

                  <div className="leadership-portrait-window">
                    {photo ? (
                      <img src={photo} alt="" className="leadership-portrait-img" loading="lazy" />
                    ) : (
                      <div className="leadership-monogram-stage">
                        <div className="leadership-radial-sheen" />
                        <div className="leadership-monogram-seal">
                          <span className="leadership-monogram-letters">
                            {t(`leadership.${id}.initials`)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="leadership-content">
                <h3 className="leadership-name">{t(`leadership.${id}.name`)}</h3>
                <p className="leadership-role">{t(`leadership.${id}.role`)}</p>
                <div className="leadership-divider" aria-hidden="true" />
                <p className="leadership-statement">{t(`leadership.${id}.statement`)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
