import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { BidiText } from "../../../Components/BidiText";
import { MediaGallery } from "../../../Components/MediaGallery";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { PageLoading, RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import { ReservationEntry } from "../../Reservations/Customer/ReservationEntry";
import { UnitDetails } from "./UnitDetails";

import { useDetail } from "./DetailContext";
import { DetailProvider } from "./DetailProvider";
const CustomerScope = lazy(() => import("../../Reservations/Customer/BookingScope"));
const panel = "grid min-w-0 gap-8 rounded-ui border border-accent/40 bg-ivory p-6 text-primary shadow-panel sm:p-9";
function Detail() {
  const { result, reload } = useDetail();
  const { t } = useTranslation("catalogue");
  return (
    <PublicReadPanel result={result} reload={reload}>
      {(detail) => (
        <>
          <article className={panel}>
            <header className="flex flex-wrap items-center justify-between gap-5">
              <h2 className="text-3xl font-medium">
                {t("unitLabel", { number: "" })}
                <BidiText>{detail.number}</BidiText>
              </h2>
              <Link
                className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-light/30 px-4 py-1.5 text-xs font-medium text-primary transition-all hover:border-accent hover:bg-accent-light hover:text-primary-deep"
                to={routePaths.project(detail.projectId)}
              >
                <span>{t("backProject")}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-3.5 text-accent transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </header>
            <div className="grid items-start gap-8 lg:grid-cols-2">
              <MediaGallery key={detail.id} images={detail.images} />
              <UnitDetails unit={detail} />
            </div>
            <ReservationEntry unit={detail} reload={reload} />
          </article>
        </>
      )}
    </PublicReadPanel>
  );
}
export default function UnitPage() {
  const { unitId, projectId } = useParams();

  const kind = "unit";
  const { t } = useTranslation("routing");
  const catalogue = useTranslation("catalogue");
  return (
    <div className="grid gap-8 motion-safe:animate-fade-in">
      <header className="grid gap-4">
        <RouteHeading>{t(kind)}</RouteHeading>
        <p className="max-w-prose leading-8 text-white/80">{catalogue.t("intro")}</p>
      </header>
      <DetailProvider id={unitId} projectId={projectId}>
        <Suspense fallback={<PageLoading />}>
          <CustomerScope key={[projectId, unitId].join(":")}>
            <Detail />
          </CustomerScope>
        </Suspense>
      </DetailProvider>
    </div>
  );
}
