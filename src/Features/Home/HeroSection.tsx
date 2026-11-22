import { Component, lazy, Suspense, useCallback, type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RouteHeading } from "../../Router/RouteFeedback";
import { routePaths } from "../../Router/routePaths";
import { HeroFilm } from "./HeroFilm";
import { homeFilms } from "./homeFilms";

const ArchitecturalScene = lazy(() => import("./ArchitecturalScene"));

class SceneFallback extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnavailable();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function HeroSection() {
  const { t } = useTranslation("home");
  const hero = useRef<HTMLElement>(null);
  const [supported, setSupported] = useState(false);
  const [expanded, expand] = useState(false);
  const unavailable = useCallback(() => {
    setSupported(false);
    expand(false);
  }, []);
  useEffect(() => {
    if (!window.matchMedia || !window.WebGL2RenderingContext) return;
    const media = window.matchMedia("(min-width: 800px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => {
      const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
      setSupported(media.matches && !device.connection?.saveData && (device.deviceMemory ?? 8) >= 4);
      expand(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <section ref={hero} aria-label={t("welcome", { ns: "common" })} className="home-hero" data-model={expanded && supported}>
      <img className="home-hero-image" src={homeFilms.initiative.poster} alt="" fetchPriority="high" />
      <div className="home-hero-overlay" aria-hidden="true" />
      <div className="home-container home-hero-inner">
        <div className="home-hero-copy">
          <p className="home-kicker" data-enter>
            {t("hero.eyebrow")}
          </p>
          <RouteHeading>{t("hero.title")}</RouteHeading>
          <p className="home-hero-description" data-enter>
            {t("hero.description")}
          </p>
          <Link data-enter className="home-action home-hero-action" to={routePaths.projects}>
            {t("hero.explore")}
            <span className="home-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
        <div className="home-hero-showcase" data-enter>
          <div className="home-hero-stage">
            <HeroFilm modelVisible={expanded && supported} />
            {supported && expanded && (
              <div className="home-model" aria-hidden="true">
                <SceneFallback onUnavailable={unavailable}>
                  <Suspense fallback={null}>
                    <ArchitecturalScene hero={hero} onUnavailable={unavailable} />
                  </Suspense>
                </SceneFallback>
              </div>
            )}
          </div>
          <div className="home-hero-rail">
            {supported && (
              <button type="button" className="home-model-toggle" aria-pressed={expanded} onClick={() => expand(!expanded)}>
                <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                {t(expanded ? "hero.courtyard" : "hero.model")}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
