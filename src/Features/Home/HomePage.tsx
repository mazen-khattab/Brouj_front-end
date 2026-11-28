import { useRef } from "react";
import { HomeProvider } from "./HomeProvider";
import { HeroSection } from "./HeroSection";
import { ProjectCarousel } from "./ProjectCarousel";
import { LegalBooklet3D } from "../../Components/sections/LegalBooklet3D";
import { AboutSection } from "./AboutSection";
import { FilmsSection } from "./FilmsSection";
import { WorksSection } from "./WorksSection";
import { ContactSection } from "./ContactSection";
import { useHomeMotion } from "./useHomeMotion";
import "../../Styles/home.css";
import "../../Styles/home-motion.css";

export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);
  const scroll = useHomeMotion(root);
  return (
    <HomeProvider>
      <div ref={root} className="home-page">
        <HeroSection />
        <ProjectCarousel />
        <LegalBooklet3D scroll={scroll} />
        <AboutSection scroll={scroll} />
        <FilmsSection />
        <WorksSection />
        <ContactSection />
      </div>
    </HomeProvider>
  );
}
