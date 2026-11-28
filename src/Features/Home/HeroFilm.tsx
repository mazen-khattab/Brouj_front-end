import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { homeFilms } from "./homeFilms";

export function HeroFilm() {
  const { t } = useTranslation("home");
  const inline = useRef<HTMLVideoElement>(null);
  const cinema = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cinemaFailed, setCinemaFailed] = useState(false);
  const { poster, video } = homeFilms.initiative;

  useEffect(() => {
    const player = inline.current;
    if (!player) return;
    // Keep only one player audible, and respect an explicit pause on return.
    if (open || paused) player.pause();
    else void player.play()?.catch(() => setPaused(true));
  }, [open, paused]);

  useEffect(() => {
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const pauseForReducedMotion = (event: MediaQueryListEvent) => { if (event.matches) setPaused(true); };
    motion?.addEventListener("change", pauseForReducedMotion);
    return () => motion?.removeEventListener("change", pauseForReducedMotion);
  }, []);

  return (
    <>
      <div className="home-hero-media">
        <img className="home-hero-image" src={poster} alt="" fetchPriority="high" />
        <video
          ref={inline}
          className="hero-film-video"
          src={video}
          poster={poster}
          aria-label={t("films.initiative")}
          autoPlay={!paused}
          loop
          muted={muted}
          playsInline
          preload="auto"
          onError={() => setFailed(true)}
          hidden={failed}
        />
      </div>
      <div className="home-container hero-film-controls">
        {failed ? <p role="status">{t("films.error")}</p> : (
          <div className="hero-film-transport">
            <button type="button" onClick={() => setPaused(!paused)} aria-label={t(paused ? "hero.play" : "hero.pause")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="m9 5 11 7-11 7Z" /> : <path d="M8 5v14M16 5v14" />}</svg>
            </button>
            <button type="button" onClick={() => setMuted(!muted)} aria-label={t(muted ? "hero.unmute" : "hero.mute")}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5Z" />{muted ? <path d="m16 9 6 6m0-6-6 6" /> : <path d="M15 8q5 4 0 8m3-11q8 7 0 14" />}</svg>
            </button>
          </div>
        )}
        <button type="button" className="hero-film-expand" aria-label={t("films.watch", { title: t("films.initiative") })}
          onClick={() => {
            inline.current?.pause();
            setCinemaFailed(false);
            setOpen(true);
            dialog.current?.showModal();
          }}>
          <span>{t("hero.expand")}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg>
        </button>
      </div>
      <dialog ref={dialog} className="home-film-dialog" data-lenis-prevent aria-labelledby={titleId}
        onClose={() => { cinema.current?.pause(); setOpen(false); }}>
        <div className="home-film-dialog-bar">
          <h2 id={titleId}>{t("films.initiative")}</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label={t("films.close")}>×</button>
        </div>
        {open && (cinemaFailed ? <p role="status">{t("films.error")}</p> :
          <video ref={cinema} src={video} poster={poster} aria-label={t("films.initiative")}
            controls autoPlay playsInline onError={() => setCinemaFailed(true)} />)}
      </dialog>
    </>
  );
}
