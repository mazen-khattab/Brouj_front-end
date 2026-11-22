import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RouteHeading } from "../../Router/RouteFeedback";

const ArchitecturalCenterpiece = lazy(() => import("./ArchitecturalCenterpiece"));

class SceneBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function AboutHero() {
  const { t } = useTranslation("about");
  const hero = useRef<HTMLElement>(null);
  const [available, setAvailable] = useState(false);
  const unavailable = useCallback(() => setAvailable(false), []);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => {
      const device = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
      setAvailable(media.matches && Boolean(window.WebGL2RenderingContext) && !device.connection?.saveData && (device.deviceMemory ?? 8) >= 4);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <section ref={hero} className="about-hero" aria-labelledby="about-hero-title">
      <div className="home-container about-hero-grid">
        <div className="about-hero-copy">
          <p className="about-eyebrow" data-about-enter>{t("hero.eyebrow")}</p>
          <div id="about-hero-title" className="about-title-mask"><RouteHeading>{t("hero.title")}</RouteHeading></div>
          <p className="about-hero-intro" data-about-enter>{t("hero.intro")}</p>
          <a href="#about-vision" className="about-scroll" data-about-enter><span aria-hidden="true" />{t("hero.scroll")}</a>
        </div>
        <figure className="about-sculpture" aria-label={t("hero.study")}>
          <div className="about-sculpture-fallback" aria-hidden="true"><div className="about-study-ground" /><i /><i /><i /></div>
          {available && <div className="about-canvas" aria-hidden="true">
            <SceneBoundary onUnavailable={unavailable}>
              <Suspense fallback={null}><ArchitecturalCenterpiece hero={hero} onUnavailable={unavailable} /></Suspense>
            </SceneBoundary>
          </div>}
          <figcaption><span>{t("hero.study")}</span><span>{t("hero.studyNote")}</span></figcaption>
        </figure>
      </div>
    </section>
  );
}
