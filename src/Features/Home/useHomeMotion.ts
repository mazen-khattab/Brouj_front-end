import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useLocale } from "../../Hooks/useLocale";

function animateEditorialSections(page: HTMLElement) {
  for (const section of page.querySelectorAll<HTMLElement>("#initiatives, #regular-projects, #contact")) {
    const heading = section.querySelector("h2");
    if (heading) gsap.fromTo(heading, { yPercent: 76, clipPath: "inset(0 0 100% 0)" }, {
      yPercent: 0,
      clipPath: "inset(0)",
      duration: 0.9,
      ease: "expo.out",
      scrollTrigger: { trigger: heading, start: "top 94%", once: true },
    });
  }
  const hairline = page.querySelector(".home-project-hairline");
  if (hairline) gsap.from(hairline, {
    scaleX: 0,
    ease: "none",
    scrollTrigger: { trigger: hairline, start: "top 95%", end: "top 65%", scrub: true },
  });
  const contact = page.querySelector(".home-contact-grid");
  if (!contact) return;
  gsap.from(contact.querySelectorAll("[data-contact-form]"), {
    y: 24,
    opacity: 0,
    clipPath: "inset(0 0 12% 0)",
    duration: 0.85,
    stagger: 0.15,
    ease: "power3.out",
    scrollTrigger: { trigger: contact, start: "top 88%", once: true },
  });
  gsap.from(contact.querySelector(".home-contact-spine"), {
    scaleY: 0,
    ease: "none",
    scrollTrigger: { trigger: contact, start: "top 84%", end: "bottom 53%", scrub: true },
  });
}

function magnetizeContactButtons(page: HTMLElement) {
  const cleanups = [...page.querySelectorAll<HTMLButtonElement>(".home-contact button[type=submit]")].map((button) => {
    const xTo = gsap.quickTo(button, "x", { duration: 0.36, ease: "power3.out" });
    const yTo = gsap.quickTo(button, "y", { duration: 0.36, ease: "power3.out" });
    const move = (event: PointerEvent) => {
      if (button.matches(":disabled") || event.pointerType !== "mouse") return;
      const rect = button.getBoundingClientRect();
      xTo((event.clientX - rect.x - rect.width / 2) * 0.12);
      yTo((event.clientY - rect.y - rect.height / 2) * 0.19);
    };
    const reset = () => { xTo(0); yTo(0); };
    button.addEventListener("pointermove", move);
    button.addEventListener("pointerleave", reset);
    button.addEventListener("blur", reset);
    return () => {
      button.removeEventListener("pointermove", move);
      button.removeEventListener("pointerleave", reset);
      button.removeEventListener("blur", reset);
    };
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}

export function useHomeMotion(root: RefObject<HTMLDivElement | null>) {
  const { locale } = useLocale();
  const scroll = useRef<Lenis | null>(null);
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
        scroll.current = lenis;
        const tick = (seconds: number) => lenis.raf(seconds * 1000);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        const hero = page.querySelector(".home-hero")!;
        gsap.timeline({ defaults: { ease: "power3.out" } })
          .from(hero.querySelector("h1"), { yPercent: 38, clipPath: "inset(0 0 85% 0)", duration: 1.05 })
          .from(hero.querySelectorAll("[data-enter]"), { y: 18, opacity: 0, duration: 0.9, stagger: 0.075 }, 0.3);
        gsap.to(hero.querySelector(".home-hero-media"), {
          yPercent: 6,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.9 },
        });
        animateEditorialSections(page);
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
      media.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => magnetizeContactButtons(page));
    }, page);
    return () => {
      media.revert();
      context.revert();
    };
  }, [root, locale]);
  return scroll;
}
