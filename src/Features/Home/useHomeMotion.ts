import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useLocale } from "../../Hooks/useLocale";

export function useHomeMotion(root: RefObject<HTMLDivElement | null>) {
  const { locale } = useLocale();
  useEffect(() => {
    const page = root.current;
    if (!page || !window.matchMedia || !window.ResizeObserver) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const lenis = new Lenis({
          lerp: 0.105,
          smoothWheel: true,
          anchors: true,
          prevent: (node) => node.closest("dialog, [data-lenis-prevent]") !== null,
        });
        const tick = (seconds: number) => lenis.raf(seconds * 1000);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        const hero = page.querySelector(".home-hero")!;
        gsap.from(hero.querySelectorAll("[data-enter]"), { y: 18, opacity: 0, duration: 0.9, stagger: 0.075, ease: "power3.out" });
        gsap.from(hero.querySelector("h1"), { yPercent: 38, clipPath: "inset(0 0 85% 0)", duration: 1.05, ease: "power3.out" });
        gsap.to(hero.querySelector(".home-hero-image"), {
          yPercent: 6,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.9 },
        });
        for (const section of page.querySelectorAll(".home-band")) {
          if (section.id === "about" || section.classList.contains("home-films")) continue;
          const heading = section.querySelector("h2");
          if (heading)
            gsap.from(heading, {
              y: 16,
              opacity: 0,
              clipPath: "inset(0 0 48% 0)",
              duration: 0.85,
              ease: "expo.out",
              scrollTrigger: { trigger: heading, start: "top 95%", once: true },
            });
          const items = section.querySelectorAll("[data-reveal]");
          const first = items.item(0);
          if (first && window.matchMedia("(pointer: fine)").matches) {
            gsap.fromTo(items, { yPercent: 0.8 }, {
              yPercent: -0.8, ease: "none",
              scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1 },
            });
          }
          if (first)
            gsap.from(items, {
              y: 14,
              opacity: 0,
              ease: "power3.out",
              duration: 0.8,
              stagger: 0.08,
              scrollTrigger: { trigger: first, start: "top 96%", once: true },
            });
        }
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
          lenis.destroy();
        };
      });
    }, page);
    return () => {
      media.revert();
      context.revert();
    };
  }, [root, locale]);
}
