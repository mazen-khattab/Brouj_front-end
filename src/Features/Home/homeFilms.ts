import initiativePoster from "../../assets/home/initiative.jpg";
import designPoster from "../../assets/home/design.jpg";
import perspectivePoster from "../../assets/home/perspective.jpg";
import initiativeVideo from "../../assets/home/initiative.webm";
import designVideo from "../../assets/home/design.webm";
import perspectiveVideo from "../../assets/home/perspective.webm";

function film(poster: string, localPreview: string, published: string | undefined) {
  return { poster, video: published?.trim() || localPreview, preview: !published?.trim() };
}
export const homeFilms = {
  initiative: film(initiativePoster, initiativeVideo, import.meta.env.VITE_HOME_INITIATIVE_FILM),
  quality: film(designPoster, designVideo, import.meta.env.VITE_HOME_QUALITY_FILM),
  expansion: film(perspectivePoster, perspectiveVideo, import.meta.env.VITE_HOME_EXPANSION_FILM),
};
export type FilmId = keyof typeof homeFilms;
