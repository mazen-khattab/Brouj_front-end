import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

export type LeadershipScroll = RefObject<Lenis | null>;

function getPinPosition(deck: HTMLElement, index: number) {
  const anchor = deck.querySelectorAll(".leadership-card-anchor")[index];
  const card = deck.querySelectorAll(".leadership-deck-card")[index];
  if (!anchor || !card) return window.scrollY;
  // The anchor keeps the card's original position after the card becomes sticky.
  return Math.ceil(anchor.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(card).insetBlockStart));
}

export function useLeadershipStack(deckRef: RefObject<HTMLDivElement | null>, scroll: LeadershipScroll, language: string | undefined) {
  useEffect(() => {
    const deck = deckRef.current;
    const navbar = deck?.closest(".home-shell")?.querySelector<HTMLElement>(":scope > header");
    if (!deck || !navbar || !window.ResizeObserver) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const headerRows = Array.from(deck.querySelectorAll<HTMLElement>(".leadership-card-bar-content"));
      const contents = Array.from(deck.querySelectorAll<HTMLElement>(".leadership-card-content"));
      const bodies = Array.from(deck.querySelectorAll<HTMLElement>(".leadership-card-body"));
      const anchors = deck.querySelectorAll(".leadership-card-anchor");
      let depth: gsap.Context | undefined;
      let frame = 0;
      let bodySize = 0;
      let pinStart = 0;
      let stripSize = 0;

      const fitDeck = () => {
        const start = navbar.offsetHeight + 12;
        const size = Math.max(...contents.map((content) => content.offsetHeight)) + 2;
        const minStrip = parseFloat(getComputedStyle(deck).getPropertyValue("--leadership-min-strip"));
        const strip = Math.max(minStrip, ...headerRows.map((row) => Math.ceil(row.getBoundingClientRect().height) + 2));
        const stacked = start + headerRows.length * strip + size + 12 <= document.documentElement.clientHeight;
        const layoutChanged = size !== bodySize || start !== pinStart || strip !== stripSize;
        bodySize = size;
        pinStart = start;
        stripSize = strip;

        if (!stacked) {
          delete deck.dataset.stacking;
          if (depth) {
            depth.revert();
            depth = undefined;
            ScrollTrigger.refresh();
          }
          return;
        }

        deck.style.setProperty("--leadership-pin-start", `${start}px`);
        deck.style.setProperty("--leadership-body-size", `${size}px`);
        deck.style.setProperty("--leadership-strip", `${strip}px`);
        deck.dataset.stacking = "true";

        if (!depth) {
          depth = gsap.context(() => {
            bodies.slice(0, -1).forEach((body, index) => {
              const next = anchors[index + 1]!;
              const nextPin = () => getPinPosition(deck, index + 1);
              const timeline = gsap.timeline({
                defaults: { ease: "none" },
                scrollTrigger: {
                  trigger: next,
                  start: () => nextPin() - bodySize,
                  end: nextPin,
                  scrub: true,
                  invalidateOnRefresh: true,
                },
              });
              timeline.to(contents[index]!, { scale: 0.97 }, 0);
              timeline.to(body, { "--leadership-dim": 0.12 }, 0);
            });
          }, deck);
          ScrollTrigger.refresh();
        } else if (layoutChanged) {
          ScrollTrigger.refresh();
        }
      };

      const scheduleFit = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(fitDeck);
      };
      const resize = new ResizeObserver(scheduleFit);
      [navbar, ...headerRows, ...contents].forEach((element) => resize.observe(element));
      window.addEventListener("resize", scheduleFit);
      scheduleFit();

      return () => {
        resize.disconnect();
        window.removeEventListener("resize", scheduleFit);
        cancelAnimationFrame(frame);
        depth?.revert();
        delete deck.dataset.stacking;
        deck.style.removeProperty("--leadership-pin-start");
        deck.style.removeProperty("--leadership-body-size");
        deck.style.removeProperty("--leadership-strip");
      };
    });
    return () => media.revert();
  }, [deckRef, language]);

  return (index: number) => {
    const deck = deckRef.current;
    if (!deck?.dataset.stacking) return;
    const top = getPinPosition(deck, index);
    if (scroll.current) scroll.current.scrollTo(top);
    else window.scrollTo({ top });
  };
}
