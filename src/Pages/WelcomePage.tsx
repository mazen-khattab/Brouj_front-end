import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArchitecturalVisual } from "../Components/ArchitecturalVisual";
import { RouteHeading } from "../Router/RouteFeedback";
import { routePaths } from "../Router/routePaths";
import { HomeProvider } from "../Context/HomeProvider";
import { InitiativeProjects } from "../Components/Home/InitiativeProjects";
import { TermsPreview } from "../Components/Home/TermsPreview";
import { AboutSection } from "../Components/Home/AboutSection";
import { ContactSection } from "../Components/Home/ContactSection";
import { useLocale } from "../Hooks/useLocale";

export default function WelcomePage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  return (
    <HomeProvider>
      <section
        aria-label={t("welcome")}
        className="home-hero relative isolate grid min-h-[34rem] items-center overflow-hidden rounded-ui motion-safe:animate-fade-in sm:min-h-[38rem] lg:min-h-0 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:overflow-visible lg:rounded-none lg:py-8"
      >
        <div className="relative z-10 px-7 py-14 [text-shadow:0_0px_12px_#bfae89] sm:px-12 lg:px-0 lg:py-10 lg:[text-shadow:none]">
          <p className="mb-7 flex items-center gap-4 text-xs font-medium tracking-widest text-accent-light rtl:tracking-normal">
            <span aria-hidden="true" className="h-px w-10 bg-accent" />
            {t("design.eyebrow")}
          </p>
          <div className="[&_h1]:text-[5rem] sm:[&_h1]:text-[6rem] lg:[&_h1]:text-[7rem]">
            <RouteHeading>{t("brand")}</RouteHeading>
          </div>
          <p className="mt-5 text-2xl leading-relaxed">{t("welcome")}</p>
          <p className="mt-5 max-w-[35ch] text-base leading-8 text-white lg:text-white/75">{t("design.homeDescription")}</p>
          <Link
            className="mt-9 inline-flex items-center rounded-ui bg-accent px-6 py-4 font-medium text-primary no-underline [text-shadow:none] hover:bg-accent-light"
            to={routePaths.projects}
          >
            {t("browse", { ns: "routing" })}
          </Link>
        </div>
        <div className="absolute inset-0 -z-10 lg:relative lg:inset-auto lg:z-auto">
          <ArchitecturalVisual key={locale} className="home-hero-image h-full [&_figcaption]:hidden lg:h-[580px] lg:[&_figcaption]:flex" />
          <div aria-hidden="true" className="home-hero-overlay absolute inset-0 rounded-ui bg-black/60 lg:hidden" />
        </div>
      </section>
      <div className="home-sections">
        <InitiativeProjects />
        <TermsPreview />
        <AboutSection />
        <ContactSection />
      </div>
    </HomeProvider>
  );
}
