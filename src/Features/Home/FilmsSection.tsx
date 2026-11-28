import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";
import { homeFilms, type FilmId } from "./homeFilms";

export function FilmButton({ film, hero = false, active = true, activate }: { film: FilmId; hero?: boolean; active?: boolean; activate?: () => void }) {
  const { t } = useTranslation("home");
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [duration, setDuration] = useState(homeFilms[film].preview ? "00:06" : "");
  const player = useRef<HTMLVideoElement>(null);
  const title = t(`films.${film}`);
  const { poster, video, preview } = homeFilms[film];
  return (
    <div className={hero ? "home-hero-film" : "cinema-panel"} data-active={active}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") activate?.(); }}>
      <button
        className="home-film-trigger"
        type="button"
        onFocus={activate}
        onClick={() => {
          if (!active && window.matchMedia("(min-width: 900px)").matches) { activate?.(); return; }
          setFailed(false);
          setOpen(true);
          dialog.current?.showModal();
        }}
        aria-label={t("films.watch", { title })}
      >
        <span className="home-film-frame">
          <img src={poster} alt="" loading={hero ? "eager" : "lazy"} />
          <span className="home-play" aria-hidden="true" />
          {!hero && (
            <>
              <span className="film-duration">
                <bdi dir="ltr">{duration}</bdi>
              </span>
              <span className="film-watch">{t("films.watchLabel")}</span>
              <span className="cinema-index" aria-hidden="true">{film === "quality" ? "01" : "02"}</span>
            </>
          )}
        </span>
        <span className="home-film-copy">
          <span className="home-film-label">
            {hero ? (
              t(preview ? "films.preview" : "films.watchLabel")
            ) : (
              <>
                <span dir="ltr">{film === "quality" ? "01" : "02"}</span>
                <span>{t(`films.${film}Category`)}</span>
              </>
            )}
          </span>
          <span className="home-film-title">{title}</span>
          {!hero && <span className="film-description">{t(`films.${film}Description`)}</span>}
        </span>
      </button>
      {!hero && (
        <video
          className="film-metadata"
          src={video}
          preload="auto"
          muted
          aria-hidden="true"
          tabIndex={-1}
          onDurationChange={(event) => {
            const seconds = event.currentTarget.duration;
            if (Number.isFinite(seconds))
              setDuration(`${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`);
          }}
          onLoadedMetadata={(event) => {
            const seconds = event.currentTarget.duration;
            if (Number.isFinite(seconds))
              setDuration(`${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`);
          }}
        />
      )}
      <dialog
        ref={dialog}
        data-lenis-prevent
        className="home-film-dialog"
        aria-labelledby={titleId}
        onClose={() => {
          player.current?.pause();
          setOpen(false);
        }}
      >
        <div className="home-film-dialog-bar">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label={t("films.close")}>
            ×
          </button>
        </div>
        {open &&
          (failed ? (
            <p role="status">{t("films.error")}</p>
          ) : (
            <video ref={player} aria-label={title} src={video} poster={poster} controls autoPlay playsInline onError={() => setFailed(true)} />
          ))}
      </dialog>
    </div>
  );
}

export function FilmsSection() {
  const { t, i18n } = useTranslation("home");
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".film-heading > *", { y: 18, opacity: 0, duration: .9, stagger: .1, ease: "expo.out",
          scrollTrigger: { trigger: ".film-heading", start: "top 90%", once: true } });
        gsap.fromTo(".cinema-stage", { clipPath: "inset(12% 0% 12% 0%)", opacity: .3 },
          { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, duration: 1.3, ease: "expo.out",
            scrollTrigger: { trigger: ".cinema-stage", start: "top 85%", once: true } });
      });
      media.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const cleanups: (() => void)[] = [];
        section.current?.querySelectorAll<HTMLElement>(".cinema-panel").forEach(panel => {
          const play = panel.querySelector(".home-play");
          const xTo = gsap.quickTo(play, "x", { duration: .45, ease: "power3.out" });
          const yTo = gsap.quickTo(play, "y", { duration: .45, ease: "power3.out" });
          const move = (event: PointerEvent) => {
            if (panel.dataset.active !== "true") return;
            const rect = panel.getBoundingClientRect();
            xTo((event.clientX - rect.left - rect.width / 2) * .045);
            yTo((event.clientY - rect.top - rect.height / 2) * .045);
          };
          const reset = () => { xTo(0); yTo(0); };
          panel.addEventListener("pointermove", move);
          panel.addEventListener("pointerleave", reset);
          cleanups.push(() => { panel.removeEventListener("pointermove", move); panel.removeEventListener("pointerleave", reset); });
        });
        return () => cleanups.forEach(cleanup => cleanup());
      });
    }, section);
    return () => { media.revert(); context.revert(); };
  }, [i18n.language]);
  return (
    <section ref={section} className="home-band home-films" aria-labelledby="home-films-title">
      <div className="home-container">
        <header className="film-heading">
          <div><p className="film-eyebrow">{t("films.eyebrow")}</p>
          <h2 id="home-films-title" className="home-display">{t("films.title")}</h2></div>
          <div className="cinema-intro"><p>{t("films.intro")}</p>
            <div className="cinema-chapters" role="group" aria-label={t("films.title")}>
              {(["quality", "expansion"] as const).map((film, index) =>
                <button key={film} type="button" aria-label={t(`films.${film}`)} aria-pressed={active === index}
                  onClick={() => setActive(index)}><span dir="ltr">{index === 0 ? "01" : "02"}</span></button>)}
            </div>
          </div>
        </header>
        <div className="cinema-stage">
          <FilmButton film="quality" active={active === 0} activate={() => setActive(0)} />
          <FilmButton film="expansion" active={active === 1} activate={() => setActive(1)} />
        </div>
      </div>
    </section>
  );
}
