import { useRef } from "react";
import { HomeProvider } from "./HomeProvider";
import { HeroSection } from "./HeroSection";
import { ProjectCarousel } from "./ProjectCarousel";
import { TermsPreview } from "./TermsPreview";
import { AboutSection } from "./AboutSection";
import { FilmsSection } from "./FilmsSection";
import { WorksSection } from "./WorksSection";
import { ContactSection } from "./ContactSection";
import { useHomeMotion } from "./useHomeMotion";
import "../../Styles/home.css";

export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);
  useHomeMotion(root);
  return (
    <HomeProvider>
      <div ref={root} className="home-page">
        <HeroSection />
        <ProjectCarousel />
        <TermsPreview />
        <AboutSection />
        <FilmsSection />
        <WorksSection />
        <ContactSection />
      </div>
    </HomeProvider>
  );
}
