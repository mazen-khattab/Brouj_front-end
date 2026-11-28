import { useEffect, useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

const motionAllowed = "(prefers-reduced-motion: no-preference)";

export function useAccountMotion(root: RefObject<HTMLDivElement | null>, pathname: string) {
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(motionAllowed, () => {
      const lenis = new Lenis({
        lerp: 0.09,
        smoothWheel: true,
        prevent: (node) => Boolean(node.closest("dialog, select, [data-lenis-prevent]")),
      });
      const tick = (seconds: number) => lenis.raf(seconds * 1000);
      gsap.ticker.add(tick);
      return () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    });
    return () => media.revert();
  }, []);

  useLayoutEffect(() => {
    const page = root.current;
    if (!page || !window.matchMedia(motionAllowed).matches) return;

    const context = gsap.context(() => {
      const lines = page.querySelectorAll(".account-hero-mask > *");
      if (lines.length) {
        gsap.from(lines, {
          yPercent: 85,
          opacity: 0,
          duration: 0.78,
          stagger: 0.08,
          ease: "power3.out",
        });
      }
      gsap.from(".account-content", { opacity: 0, duration: 0.48, ease: "power3.out" });
    }, page);
    return () => context.revert();
  }, [root, pathname]);
}
