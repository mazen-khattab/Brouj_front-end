import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useLocale } from "../../../Hooks/useLocale";

export function useProjectsMotion(root: RefObject<HTMLDivElement | null>) {
  const { locale } = useLocale();
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    gsap.registerPlugin(ScrollTrigger);
    let frame = 0;
    let disposed = false;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, prevent: node => node.closest("dialog, [data-lenis-prevent], .projects-filters") !== null });
        const tick = (seconds: number) => lenis.raf(seconds * 1000);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.from(".projects-hero h1", { yPercent: 100, duration: 0.95, ease: "power3.out" });
        gsap.from("[data-projects-enter]", { y: 12, opacity: 0, duration: 0.85, stagger: 0.08, ease: "power3.out" });
        return () => { gsap.ticker.remove(tick); lenis.destroy(); };
      });
    }, page);
    const header = document.querySelector<HTMLElement>(".home-shell > header");
    const sync = () => {
      page.style.setProperty("--projects-header-height", `${header?.getBoundingClientRect().height ?? 80}px`);
      refresh();
    };
    sync();
    const resize = new ResizeObserver(sync);
    if (header) resize.observe(header);
    resize.observe(page);
    page.addEventListener("load", refresh, true);
    void document.fonts.ready.then(() => { if (!disposed) refresh(); });
    return () => {
      disposed = true;
      resize.disconnect(); page.removeEventListener("load", refresh, true);
      media.revert(); context.revert(); cancelAnimationFrame(frame);
    };
  }, [root, locale]);
}
