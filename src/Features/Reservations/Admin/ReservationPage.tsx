import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { OperationsNavigation } from "../../../Router/OperationsNavigation";
import { useAuth } from "../../../Hooks/useAuth";
import { RouteHeading } from "../../../Router/RouteFeedback";
import Records from "./Records";
import { ReservationsAdminProvider } from "./ReservationsAdminProvider";

export default function ReservationPage() {
  const { reservationId } = useParams();
  const { pathname } = useLocation();
  const auth = useAuth();
  const { t } = useTranslation("routing");
  const scope = [auth.actor, auth.actor ? auth.profile.id : "", auth.generation, pathname].join(":");
  return (
    <div className="grid min-w-0 gap-7">
      <RouteHeading>{t(reservationId === undefined ? "reservations" : "reservation")}</RouteHeading>
      <OperationsNavigation />
      <ReservationsAdminProvider key={scope} scope={scope} id={reservationId}>
        <Records detail={reservationId !== undefined} />
      </ReservationsAdminProvider>
    </div>
  );
}
