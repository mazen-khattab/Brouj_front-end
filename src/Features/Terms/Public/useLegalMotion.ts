import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useLocale } from "../../../Hooks/useLocale";
import type { LegalSection } from "./legalSections";

function headerHeight() {
  return document.querySelector<HTMLElement>(".home-shell > header")?.getBoundingClientRect().height ?? 80;
}

export function useLegalPageMotion(root: RefObject<HTMLDivElement | null>) {
  const { locale } = useLocale();
  const smooth = useRef<Lenis | null>(null);
  const navigationFrame = useRef(0);
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, prevent: node => node.closest("dialog, [data-lenis-prevent], .legal-mobile-index nav") !== null });
        smooth.current = lenis;
        const tick = (seconds: number) => lenis.raf(seconds * 1000);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.from(".legal-hero h1", { yPercent: 100, duration: 0.95, ease: "power3.out" });
        gsap.from("[data-legal-enter]", { y: 12, opacity: 0, duration: 0.85, stagger: 0.08, ease: "power3.out" });
        return () => { smooth.current = null; gsap.ticker.remove(tick); lenis.destroy(); };
      });
    }, page);
    const header = document.querySelector<HTMLElement>(".home-shell > header");
    const syncHeader = () => page.style.setProperty("--legal-header-height", `${headerHeight()}px`);
    syncHeader();
    const resize = new ResizeObserver(syncHeader);
    if (header) resize.observe(header);
    return () => {
      cancelAnimationFrame(navigationFrame.current);
      resize.disconnect();
      media.revert();
      context.revert();
    };
  }, [root, locale]);

  return useCallback((id: string) => {
    cancelAnimationFrame(navigationFrame.current);
    // Let the mobile index collapse before measuring the target's new position.
    navigationFrame.current = requestAnimationFrame(() => {
      const section = document.getElementById(id);
      if (!section) return;
      const focus = () => section.focus({ preventScroll: true });
      const mobileIndex = window.matchMedia("(max-width: 1023px)").matches
        ? document.querySelector<HTMLElement>(".legal-mobile-index summary")?.getBoundingClientRect().height ?? 0 : 0;
      window.history.replaceState(window.history.state, "", `#${id}`);
      if (smooth.current) {
        smooth.current.resize();
        // Numeric targets avoid applying CSS scroll-margin a second time inside Lenis.
        const target = section.getBoundingClientRect().top + window.scrollY - headerHeight() - mobileIndex - 32;
        smooth.current.scrollTo(target, { duration: 1.05, onComplete: focus });
      }
      else { section.scrollIntoView({ block: "start", behavior: "instant" }); focus(); }
    });
  }, []);
}

export function useLegalReaderMotion(root: RefObject<HTMLDivElement | null>, sections: readonly LegalSection[], onProgress: (value: number) => void) {
  const { locale } = useLocale();
  const [active, setActive] = useState(sections[0]?.id ?? "");
  useEffect(() => {
    const reader = root.current;
    const article = reader?.querySelector<HTMLElement>(".legal-document");
    const progress = reader?.closest(".legal-page")?.querySelector<HTMLElement>(".legal-progress-fill");
    if (!reader || !article || !progress) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      // Navigation and progress remain functional even when decorative motion is reduced.
      media.add({ motion: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, match => {
        const reduced = Boolean(match.conditions?.reduced);
        const animateProgress = gsap.quickTo(progress, "scaleX", { duration: reduced ? 0 : 0.3, ease: "power3.out" });
        const updateActive = () => {
          let current = sections[0]?.id ?? "";
          for (const section of sections) {
            const element = document.getElementById(section.id);
            if (element && element.getBoundingClientRect().top <= headerHeight() + 120) current = section.id;
          }
          setActive(current);
        };
        ScrollTrigger.create({
          trigger: article,
          start: () => `top top+=${headerHeight() + 32}`,
          end: () => `+=${Math.max(1, article.scrollHeight - (window.innerHeight - headerHeight() - 64))}`,
          onUpdate: trigger => { animateProgress(trigger.progress); onProgress(Math.round(trigger.progress * 100)); },
          onRefresh: trigger => { animateProgress(trigger.progress); onProgress(Math.round(trigger.progress * 100)); },
        });
        ScrollTrigger.create({ trigger: article, start: "top bottom", end: "bottom top", onUpdate: updateActive, onRefresh: updateActive });
        updateActive();
        if (!reduced) {
          reader.querySelectorAll<HTMLElement>(".legal-clause-text").forEach(element => {
            // A small opacity change keeps legal wording readable throughout the reveal.
            gsap.from(element, { opacity: 0.65, y: 8, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 96%", once: true } });
          });
        }
      });
    }, reader);
    let frame = 0;
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    resize.observe(article);
    ScrollTrigger.refresh();
    return () => { resize.disconnect(); cancelAnimationFrame(frame); media.revert(); context.revert(); };
  }, [root, sections, onProgress, locale]);
  return active;
}
