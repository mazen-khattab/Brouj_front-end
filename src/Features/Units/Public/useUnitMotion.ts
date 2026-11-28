import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useLocale } from "../../../Hooks/useLocale";

export function useUnitMotion(root: RefObject<HTMLDivElement | null>) {
  const { locale } = useLocale();
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const lenis = new Lenis({ lerp: 0.08, smoothWheel: true,
          prevent: node => node.closest("dialog, [data-lenis-prevent]") !== null });
        const tick = (seconds: number) => lenis.raf(seconds * 1000);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.from(".ud-title-mask h1", { yPercent: 105, opacity: 0, duration: 0.95, ease: "power3.out" });
        gsap.utils.toArray<HTMLElement>("[data-ud-enter]", page).forEach(section => {
          gsap.from(section, { y: 14, opacity: 0, duration: 0.85, ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 90%", once: true } });
        });
        const stages = page.querySelectorAll("[data-ud-stage]");
        const firstStage = stages[0];
        if (firstStage) gsap.from(stages, { y: 10, opacity: 0, duration: 0.75, stagger: 0.07, ease: "power3.out",
          scrollTrigger: { trigger: firstStage, start: "top 90%", once: true } });
        return () => { gsap.ticker.remove(tick); lenis.destroy(); };
      });
    }, page);
    const header = document.querySelector<HTMLElement>(".home-shell > header");
    const resize = new ResizeObserver(() => {
      page.style.setProperty("--ud-header-height", `${header?.getBoundingClientRect().height ?? 80}px`);
      refresh();
    });
    resize.observe(page);
    if (header) resize.observe(header);
    page.addEventListener("load", refresh, true);
    void document.fonts.ready.then(() => { if (page.isConnected) refresh(); });
    return () => {
      resize.disconnect(); page.removeEventListener("load", refresh, true);
      media.revert(); context.revert(); cancelAnimationFrame(frame);
    };
  }, [root, locale]);
}
