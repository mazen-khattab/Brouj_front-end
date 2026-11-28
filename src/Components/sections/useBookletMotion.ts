import { useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

const singlePageQuery = "(max-width: 760px)";
const desktopQuery = "(min-width: 1080px)";
const flipDuration = 0.95;
const halfFlip = flipDuration / 2;
const readingDwell = 0.45;
const pageLabel = (page: number) => (page === 0 ? "cover" : `chapter-${page}`);

function addSinglePageFlip(timeline: gsap.core.Timeline, from: HTMLElement, to: HTMLElement, sign: number, start: number) {
  const midpoint = start + halfFlip;
  timeline
    .to(from, { rotationY: sign * 90, duration: halfFlip, ease: "sine.in" }, start)
    .set(from, { visibility: "hidden" }, midpoint)
    .set(to, { visibility: "visible" }, midpoint)
    .to(to, { rotationY: 0, duration: halfFlip, ease: "sine.out" }, midpoint);
}

function addSpreadFlip(timeline: gsap.core.Timeline, book: HTMLElement, sheets: HTMLElement[], index: number, sign: number, start: number) {
  const sheet = sheets[index]!;
  const shadows = sheet.querySelectorAll(".booklet-turn-shadow");
  const midpoint = start + halfFlip;
  const cover = index === 0;
  const landingDepth = index + 1;

  // The sheet changes stacks while edge-on. Both faces keep their own small depth offset.
  timeline
    .to(sheet, { rotationY: sign * 90, duration: halfFlip, ease: "sine.in" }, start)
    .to(sheet, { z: sheets.length + 2, duration: halfFlip, ease: "sine.inOut" }, start)
    .to(shadows, { opacity: 0.45, duration: halfFlip, ease: "sine.inOut" }, start)
    .set(sheet, { zIndex: landingDepth }, midpoint)
    .to(sheet, { rotationY: sign * (cover ? 175 : 180), duration: halfFlip, ease: "sine.out" }, midpoint)
    .to(sheet, { z: landingDepth, duration: halfFlip, ease: "sine.inOut" }, midpoint)
    .to(shadows, { opacity: 0, duration: halfFlip, ease: "sine.inOut" }, midpoint);

  if (cover) {
    timeline.to(book, { xPercent: 0, rotationZ: 0, rotationX: 0, scale: 1, duration: flipDuration, ease: "sine.inOut" }, start);
  } else if (index === 1) {
    // Flatten the open cover as the first leaf lifts so the turned pages sit above it.
    timeline.to(sheets[0]!, { rotationY: sign * 180, duration: halfFlip, ease: "sine.inOut" }, start);
  }
}

function createBookletTimeline(book: HTMLElement, sheets: HTMLElement[], sign: number, single: boolean, pinned: boolean) {
  const timeline = gsap.timeline({ paused: true }).addLabel(pageLabel(0), 0);
  const midpoints: number[] = [];
  gsap.set(book, {
    x: 0,
    xPercent: single ? 0 : sign * 25,
    rotationZ: single ? 0 : sign * -4,
    rotationX: single ? 0 : 8,
    scale: single ? 1 : 0.91,
  });
  gsap.set(sheets, {
    rotationY: (index: number) => (single && index > 0 ? -sign * 90 : 0),
    visibility: (index: number) => (single && index > 0 ? "hidden" : "visible"),
    z: (index: number) => (single ? 0 : sheets.length - index),
    zIndex: (index: number) => sheets.length - index,
  });

  for (let index = 0; index < sheets.length - 1; index += 1) {
    const start = timeline.duration();
    if (single) {
      addSinglePageFlip(timeline, sheets[index]!, sheets[index + 1]!, sign, start);
    }
    else {
      addSpreadFlip(timeline, book, sheets, index, sign, start);
    }
    midpoints.push(start + halfFlip);
    const dwell = pinned ? readingDwell : 0;
    timeline.addLabel(pageLabel(index + 1), start + flipDuration + dwell / 2);
    if (pinned) {
      timeline.to({}, { duration: dwell }, start + flipDuration);
    }
  }
  if (pinned) {
    timeline.to({}, { duration: 0.35 });
  }
  return { timeline, midpoints };
}

export function useBookletMotion(sectionRef: RefObject<HTMLElement | null>, scroll: RefObject<Lenis | null>, direction: "rtl" | "ltr") {
  const [page, setPage] = useState(0);
  const renderedPage = useRef(0);
  const navigate = useRef<(page: number) => void>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const runway = section?.querySelector<HTMLElement>(".booklet-runway");
    const book = runway?.querySelector<HTMLElement>(".booklet-object");
    if (!section || !runway || !book) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const sign = direction === "rtl" ? 1 : -1;
    const sheets = Array.from(book.querySelectorAll<HTMLElement>(".booklet-sheet"));
    const desktop = window.matchMedia(desktopQuery);
    const singlePage = window.matchMedia(singlePageQuery);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const navigationEase = gsap.parseEase("power2.inOut");
    const media = [desktop, singlePage, reducedMotion];
    const navbar = section.closest(".home-shell")?.querySelector<HTMLElement>(":scope > header");
    let scene: gsap.Context | undefined;
    let mode = "";
    let pinInset = 0;
    let frame = 0;

    const fit = () => {
      const header = navbar?.offsetHeight ?? 80;
      const height = runway.offsetHeight;
      const pinned = desktop.matches && !reducedMotion.matches && height + header + 30 <= window.innerHeight;
      const inset = Math.round((window.innerHeight + header - height) / 2);
      const single = singlePage.matches;
      const nextMode = pinned ? "pinned" : single ? "single" : "spread";

      if (scene && mode === nextMode) {
        if (pinned && inset !== pinInset) {
          pinInset = inset;
          ScrollTrigger.refresh();
        }
        return;
      }

      const hadPin = mode === "pinned";
      scene?.revert();
      mode = nextMode;
      pinInset = inset;
      if (pinned) {
        section.dataset.scrollLinked = "true";
      }
      else {
        section.removeAttribute("data-scroll-linked");
      }

      scene = gsap.context(() => {
        const { timeline, midpoints } = createBookletTimeline(book, sheets, sign, single, pinned);
        let turn: gsap.core.Tween | undefined;
        const syncChapter = () => {
          const time = timeline.time();
          const nextMidpoint = midpoints.findIndex((midpoint) => time < midpoint);
          const active = nextMidpoint === -1 ? midpoints.length : nextMidpoint;
          if (active === renderedPage.current) {
            return;
          }
          renderedPage.current = active;
          setPage(active);
        };
        timeline.eventCallback("onUpdate", syncChapter);

        const trigger = pinned
          ? ScrollTrigger.create({
              animation: timeline,
              trigger: runway,
              start: () => `top ${pinInset}px`,
              end: () => `+=${Math.round(window.innerHeight * 0.9 * midpoints.length)}`,
              pin: true,
              scrub: 1.25,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              // Measure the pin spacing before the Leadership and Cinema triggers below it.
              refreshPriority: 1,
            })
          : undefined;

        if (!trigger) {
          timeline.seek(pageLabel(renderedPage.current), false);
        }
        navigate.current = (index) => {
          const label = pageLabel(gsap.utils.clamp(0, midpoints.length, index));
          if (trigger) {
            const top = trigger.labelToScroll(label);
            if (scroll.current) {
              scroll.current.scrollTo(top, { duration: 1.15, easing: navigationEase });
            }
            else {
              window.scrollTo({ top, behavior: "smooth" });
            }
          } else {
            turn?.kill();
            if (reducedMotion.matches) {
              timeline.seek(label, false);
            }
            else {
              const distance = Math.abs(timeline.labels[label]! - timeline.time()) / flipDuration;
              turn = timeline.tweenTo(label, { duration: gsap.utils.clamp(0.25, 1.2, distance * 0.62), ease: "none" });
            }
          }
        };

        return () => {
          timeline.eventCallback("onUpdate", null);
          turn?.kill();
          navigate.current = null;
        };
      }, section);

      if (pinned || hadPin) {
        ScrollTrigger.refresh();
      }
    };

    const scheduleFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    const resize = new ResizeObserver(scheduleFit);
    resize.observe(runway);
    if (navbar) {
      resize.observe(navbar);
    }
    window.addEventListener("resize", scheduleFit);
    media.forEach((query) => query.addEventListener("change", scheduleFit));
    fit();

    return () => {
      resize.disconnect();
      window.removeEventListener("resize", scheduleFit);
      media.forEach((query) => query.removeEventListener("change", scheduleFit));
      cancelAnimationFrame(frame);
      scene?.revert();
      section.removeAttribute("data-scroll-linked");
    };
  }, [sectionRef, scroll, direction]);

  return { page, goTo: (index: number) => navigate.current?.(index) };
}
