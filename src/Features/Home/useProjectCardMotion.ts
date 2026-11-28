import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function useProjectCardMotion(cardRef: RefObject<HTMLElement | null>, collection: "initiative" | "works", index: number) {
  useEffect(() => {
    const card = cardRef.current;
    const link = card?.querySelector<HTMLAnchorElement>("a");
    const image = card?.querySelector("img");
    if (!card || !link || !image) return;
    gsap.registerPlugin(ScrollTrigger);

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(image, { clipPath: "inset(0 0 100% 0)" }, {
          clipPath: "inset(0)",
          duration: 0.9,
          delay: (index % 3) * 0.07,
          ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 94%", once: true },
        });
        gsap.fromTo(image, { scale: 1.12 }, {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: card, start: "top bottom", end: "bottom 38%", scrub: true },
        });
      });
      media.add("(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        if (collection === "works") {
          const distance = [24, -16, 10][index % 3]!;
          gsap.fromTo(card, { y: distance }, {
            y: distance * -0.65,
            ease: "none",
            scrollTrigger: { trigger: card.closest(".works-grid"), start: "top bottom", end: "bottom top", scrub: true },
          });
          return;
        }

        const tiltX = gsap.quickTo(link, "rotationX", { duration: 0.42, ease: "power3.out" });
        const tiltY = gsap.quickTo(link, "rotationY", { duration: 0.42, ease: "power3.out" });
        const move = (event: PointerEvent) => {
          if (event.pointerType !== "mouse" || event.buttons) return;
          const rect = card.getBoundingClientRect();
          tiltX(gsap.utils.clamp(-4, 4, (0.5 - (event.clientY - rect.y) / rect.height) * 8));
          tiltY(gsap.utils.clamp(-4, 4, ((event.clientX - rect.x) / rect.width - 0.5) * 8));
        };
        const reset = () => { tiltX(0); tiltY(0); };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", reset);
        card.addEventListener("pointerdown", reset);
        return () => {
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerleave", reset);
          card.removeEventListener("pointerdown", reset);
        };
      });
    }, card);

    return () => { media.revert(); context.revert(); };
  }, [cardRef, collection, index]);
}
