import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Amenities } from "../../../Components/Amenities";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";

import { Browser as ProjectBrowser } from "../../Projects/Public/Browser";
import { Browser } from "./Browser";
import { useDetail } from "./DetailContext";
import { DetailProvider } from "./DetailProvider";
const panel = "grid min-w-0 gap-8 rounded-ui border border-accent/40 bg-ivory p-6 text-primary shadow-panel sm:p-9";
function Detail() {
  const { result, reload } = useDetail();
  return (
    <PublicReadPanel result={result} reload={reload}>
      {(detail) => (
        <>
          <section className={panel}>
            <h2 className="text-3xl font-medium">{detail.name}</h2>
            <Link
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/40 bg-accent-light/35 px-3.5 py-1 text-xs font-medium text-primary transition-all hover:border-accent hover:bg-accent-light hover:text-primary-deep"
              to={routePaths.city(detail.cityId)}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-accent shrink-0">
                <path
                  fillRule="evenodd"
                  d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.36 7.587a15.82 15.82 0 002.273 1.765 11.253 11.253 0 001.04.573l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{detail.cityName}</span>
            </Link>
            <Amenities items={detail.amenities} cards />
          </section>
          <ProjectBrowser areaId={detail.id} />
        </>
      )}
    </PublicReadPanel>
  );
}
export default function AreaPage() {
  const { areaId } = useParams();

  const kind = areaId === undefined ? "areas" : "area";
  const { t } = useTranslation("routing");
  const catalogue = useTranslation("catalogue");
  return (
    <div className="grid gap-8 motion-safe:animate-fade-in">
      <header className="grid gap-4">
        <RouteHeading>{t(kind)}</RouteHeading>
        <p className="max-w-prose leading-8 text-white/80">{catalogue.t(areaId === undefined ? "areasIntro" : "intro")}</p>
      </header>
      {areaId === undefined ? (
        <Browser />
      ) : (
        <DetailProvider id={areaId}>
          <Detail />
        </DetailProvider>
      )}
    </div>
  );
}
