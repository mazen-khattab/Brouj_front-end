import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useLocale } from "../../Hooks/useLocale";

export function useAboutMotion(root: RefObject<HTMLDivElement | null>) {
  const { locale } = useLocale();
  const scroll = useRef<Lenis | null>(null);
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true, prevent: node => node.closest("dialog, [data-lenis-prevent]") !== null });
        scroll.current = lenis;
        const tick = (seconds: number) => lenis.raf(seconds * 1000);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.from(".about-hero h1", { yPercent: 100, duration: 1.1, ease: "expo.out" });
        gsap.from("[data-about-enter]", { y: 18, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" });
        gsap.from(".about-sculpture", { opacity: 0, duration: 1.1, ease: "power3.out" });
        page.querySelectorAll<HTMLElement>("[data-about-reveal]").forEach(element => {
          gsap.from(element, { y: 24, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 92%", once: true } });
        });
        page.querySelectorAll<HTMLElement>(".about-hairline").forEach(line => {
          gsap.from(line, { scaleX: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: line, start: "top 92%", once: true } });
        });
        gsap.from("[data-about-progress]", { scaleY: 0, ease: "none", scrollTrigger: { trigger: ".about-timeline", start: "top 70%", end: "bottom 65%", scrub: 1 } });
        let frame = 0;
        const resize = new ResizeObserver(() => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => ScrollTrigger.refresh());
        });
        resize.observe(page);
        return () => {
          resize.disconnect();
          cancelAnimationFrame(frame);
          gsap.ticker.remove(tick);
          scroll.current = null;
          lenis.destroy();
        };
      });
    }, page);
    return () => { media.revert(); context.revert(); };
  }, [root, locale]);
  return scroll;
}
