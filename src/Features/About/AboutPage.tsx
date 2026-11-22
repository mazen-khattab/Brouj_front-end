import { useRef } from "react";
import { AboutHero } from "./AboutHero";
import { AboutPrinciples, AboutLeadership, AboutJourney, AboutClosing } from "./AboutSections";
import { useAboutMotion } from "./useAboutMotion";
import "../../Styles/home.css";
import "../../Styles/about.css";

export default function AboutPage() {
  const root = useRef<HTMLDivElement>(null);
  useAboutMotion(root);
  return <div ref={root} className="about-page"><AboutHero /><AboutPrinciples /><AboutLeadership /><AboutJourney /><AboutClosing /></div>;
}
