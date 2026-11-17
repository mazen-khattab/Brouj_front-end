import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { RouteHeading } from "../../../Router/RouteFeedback";

import { Browser as AreaBrowser } from "../../Areas/Public/Browser";
import { Browser } from "./Browser";
import { useDetail } from "./DetailContext";
import { DetailProvider } from "./DetailProvider";
const panel = "grid min-w-0 gap-8 rounded-ui border border-accent/40 bg-ivory p-6 text-primary shadow-panel sm:p-9";
function Detail() {
  const { result, reload } = useDetail();
  const { t } = useTranslation("catalogue");
  return (
    <PublicReadPanel result={result} reload={reload}>
      {(detail) => (
        <>
          <div className={panel}>
            <h2 className="text-3xl font-medium">{detail.name}</h2>
            <p>{t("citiesIntro")}</p>
          </div>
          <AreaBrowser cityId={detail.id} />
        </>
      )}
    </PublicReadPanel>
  );
}
export default function CityPage() {
  const { cityId } = useParams();

  const kind = cityId === undefined ? "cities" : "city";
  const { t } = useTranslation("routing");
  const catalogue = useTranslation("catalogue");
  return (
    <div className="grid gap-8 motion-safe:animate-fade-in">
      <header className="grid gap-4">
        <RouteHeading>{t(kind)}</RouteHeading>
        <p className="max-w-prose leading-8 text-white/80">{catalogue.t(cityId === undefined ? "citiesIntro" : "intro")}</p>
      </header>
      {cityId === undefined ? (
        <Browser />
      ) : (
        <DetailProvider id={cityId}>
          <Detail />
        </DetailProvider>
      )}
    </div>
  );
}
