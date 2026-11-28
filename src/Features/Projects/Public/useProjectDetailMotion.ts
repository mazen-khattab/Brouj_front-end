import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useLocale } from "../../../Hooks/useLocale";

export function useProjectDetailMotion(root: RefObject<HTMLDivElement | null>) {
  const { locale } = useLocale();
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    let refreshFrame = 0;
    const refresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", motion => {
        const lenis = new Lenis({ lerp: 0.08, smoothWheel: true,
          prevent: node => node.closest("dialog, [data-lenis-prevent]") !== null });
        const tick = (seconds: number) => lenis.raf(seconds * 1000);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.from(".pd-title-mask h1", { yPercent: 105, opacity: 0, duration: 0.95, ease: "power3.out" });
        gsap.utils.toArray<HTMLElement>("[data-pd-reveal]", page).forEach(section => {
          gsap.from(section, { y: 16, opacity: 0, duration: 0.85, ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 90%", once: true } });
        });
        const accordion = (event: MouseEvent) => {
          const summary = event.target instanceof Element ? event.target.closest("summary") : null;
          const stage = summary?.parentElement;
          const body = stage?.querySelector<HTMLElement>(".pd-stage-body");
          if (!(stage instanceof HTMLDetailsElement) || !body || event.defaultPrevented) return;
          event.preventDefault();
          const expanding = stage.dataset.expanded ? stage.dataset.expanded !== "true" : !stage.open;
          stage.dataset.expanded = String(expanding);
          const height = stage.open ? body.getBoundingClientRect().height : 0;
          stage.open = true;
          gsap.killTweensOf(body);
          motion.add(() => {
            gsap.fromTo(body, { height, overflow: "hidden" }, { height: expanding ? body.scrollHeight : 0,
              duration: 0.5, ease: "power3.out", onComplete: () => {
                stage.open = expanding;
                gsap.set(body, { clearProps: "height,overflow" });
                refresh();
              } });
          });
        };
        page.addEventListener("click", accordion);
        return () => {
          page.removeEventListener("click", accordion);
          // Keep a stage's intended state when reduced motion changes mid-transition.
          page.querySelectorAll<HTMLDetailsElement>("details[data-expanded]").forEach(stage => {
            stage.open = stage.dataset.expanded === "true";
            delete stage.dataset.expanded;
          });
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      });
    }, page);
    const resize = new ResizeObserver(refresh);
    resize.observe(page);
    page.addEventListener("load", refresh, true);
    void document.fonts.ready.then(() => { if (page.isConnected) refresh(); });
    return () => {
      resize.disconnect();
      page.removeEventListener("load", refresh, true);
      media.revert();
      context.revert();
      cancelAnimationFrame(refreshFrame);
    };
  }, [root, locale]);
}
