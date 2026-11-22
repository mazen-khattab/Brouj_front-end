import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";
import { BrandWordmark } from "../../Components/BrandWordmark";
import { LanguageSwitcher } from "../../Components/LanguageSwitcher";
import { RouteHeading } from "../../Router/RouteFeedback";
import { routePaths } from "../../Router/routePaths";
import type { AuthMode, AuthPageProps } from "./types";
import "../../Styles/home.css";
import "../../Styles/auth.css";

const modes = ["customer", "register", "staff"] as const;
const destinations: Record<AuthMode, string> = { customer: routePaths.login, register: routePaths.register, staff: routePaths.staffLogin };

export function AuthFrame({ mode, pending, onModeChange, children }: {
  mode: AuthMode;
  pending: boolean;
  onModeChange?: AuthPageProps["onModeChange"];
  children: ReactNode;
}) {
  const { t, i18n } = useTranslation("auth");
  const { search } = useLocation();
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".auth-story-copy > *", { y: 14, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out" });
        gsap.from(".auth-title-mask h1", { yPercent: 100, duration: 0.95, ease: "power3.out" });
      });
    }, root);
    return () => { media.revert(); context.revert(); };
  }, [mode, i18n.language]);
  return <main ref={root} id="route-content" tabIndex={-1} className="auth-page" data-mode={mode}>
    <header className="auth-header">
      <Link to={routePaths.home} className="auth-brand" aria-label={t("brand", { ns: "common" })}><BrandWordmark /></Link>
      <LanguageSwitcher compact />
    </header>
    <div className="auth-layout">
      <section className="auth-story" aria-labelledby="auth-story-title">
        <div className="auth-story-copy">
          <p className="auth-story-eyebrow">{t("design.eyebrow")}</p>
          <h2 id="auth-story-title">{t(mode === "staff" ? "design.staffTitle" : "design.title")}</h2>
          <p>{t(mode === "staff" ? "design.staffBody" : "design.body")}</p>
        </div>
        <div className="auth-story-drawing" aria-hidden="true"><svg viewBox="0 0 400 420" fill="none">
          <path d="M45 400V175a155 155 0 0 1 310 0v225M58 400V175a142 142 0 0 1 284 0v225M200 8v28M186 20h28M30 175h28m284 0h28M30 400h340" />
          <path d="M130 400V245h35v155m17 0V195h35v205m17 0V285h35v115" />
        </svg></div>
        <p className="auth-story-caption">{t("footerNote", { ns: "routing" })}</p>
      </section>
      <div className="auth-form-region">
        <section className="auth-form-panel" aria-labelledby="auth-title">
          {onModeChange && <nav className="auth-mode-switch" aria-label={t("session")}>
            {modes.map(option => <button key={option} type="button" disabled={pending} aria-pressed={mode === option} onClick={() => onModeChange(option)}>{t(option + "Tab")}</button>)}
          </nav>}
          <p className="auth-form-eyebrow">{t("eyebrow")}</p>
          <div id="auth-title" className="auth-title-mask"><RouteHeading>{t(mode + "Title")}</RouteHeading></div>
          <p className="auth-form-description">{t(mode + "Description")}</p>
          {children}
          {!onModeChange && <nav className="auth-alternatives" aria-label={t("authAlternative", { ns: "routing" })}>
            {modes.filter(option => option !== mode).map(option => <Link key={option} to={destinations[option] + search}>{t(option + "Tab")}</Link>)}
          </nav>}
          <Link to={routePaths.home} className="auth-home-link"><span aria-hidden="true">←</span>{t("home")}</Link>
        </section>
      </div>
    </div>
  </main>;
}
