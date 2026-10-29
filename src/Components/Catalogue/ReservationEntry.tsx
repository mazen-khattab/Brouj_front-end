import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Hooks/useAuth";
import { routePaths } from "../../Router/routePaths";
import { Button } from "../Button";
import type { UnitDto } from "../../Types/contracts";
import { lazy, Suspense } from 'react';
import { Loading } from '../Feedback';
const CustomerReservation = lazy(() => import('../../Pages/Account/CustomerReservation'));

export function ReservationEntry({ unit }: { unit: UnitDto }) {
  const auth = useAuth();
  const { t } = useTranslation("catalogue");
  const returnTo = routePaths.unit(unit.projectId, unit.id) + "#reservation";
  return (
    <section
      id="reservation"
      aria-labelledby="reservation-title"
      className="grid gap-5 rounded-ui border border-accent/60 bg-accent-light p-7 text-primary sm:p-9"
    >
      <h2 id="reservation-title" className="text-2xl font-medium">
        {t("reservationTitle")}
      </h2>
      {auth.actor === 'customer' ? <Suspense fallback={<Loading />}><CustomerReservation unit={unit} /></Suspense> : !unit.isAvailable ? (
        <p>{t("unavailable")}</p>
      ) : auth.status === "anonymous" && !auth.logoutRequired ? (
        <>
          <p className="leading-8">{t("reservationIntro")}</p>
          <Link
            className="justify-self-start rounded-ui bg-primary px-6 py-4 text-white no-underline"
            to={`${routePaths.login}?${new URLSearchParams({ returnTo })}`}
          >
            {t("reserve")}
          </Link>
        </>
      ) : auth.actor === "staff" ? (
        <p>{t("staffReservation")}</p>
      ) : (
        <Button
          variant="secondary"
          onClick={() => void auth.retryBootstrap().catch(() => undefined)}
          pending={auth.status === "bootstrapping" || auth.pending}
        >
          {t("retry", { ns: "auth" })}
        </Button>
      )}
      <Link className="text-sm underline" to={routePaths.terms}>
        {t("terms")}
      </Link>
    </section>
  );
}
