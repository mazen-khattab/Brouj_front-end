import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { LeadershipStackSection } from "../../Components/LeadershipStackSection";
import type { LeadershipScroll } from "../../Hooks/useLeadershipStack";
import { routePaths } from "../../Router/routePaths";
import { ProjectType } from "../../Types/contracts";
import { useHome } from "./useHome";

export function AboutSection({ scroll }: { scroll: LeadershipScroll }) {
  const { t } = useTranslation("home");
  const { hash, key } = useLocation();
  const { collections } = useHome();
  const projects = collections[ProjectType.Initiative].result;
  const alignedLocation = useRef<string | null>(null);

  useEffect(() => {
    if (hash !== "#about" || projects.status === "loading" || alignedLocation.current === key) return;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById("about");
      section?.scrollIntoView({ block: "start" });
      section?.focus({ preventScroll: true });
      alignedLocation.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, key, projects.status]);

  return (
    <LeadershipStackSection
      id="about"
      eyebrow={t("leadership.eyebrow")}
      title={t("leadership.title")}
      storyLink={{ to: routePaths.about, label: t("about.readMore") }}
      scroll={scroll}
    />
  );
}
