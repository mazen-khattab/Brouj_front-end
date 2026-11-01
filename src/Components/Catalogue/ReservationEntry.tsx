import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Hooks/useAuth";
import { Button } from "../Button";
import { Loading } from "../Feedback";
import type { UnitDto } from "../../Types/contracts";

const CustomerReservation = lazy(() => import("../../Pages/Account/CustomerReservation"));

export function ReservationEntry({ unit }: { unit: UnitDto }) {
  const auth = useAuth();
  const { t } = useTranslation("catalogue");
  return (
    <div id="reservation" className="grid scroll-mt-32 gap-5 border-t border-accent/40 pt-6">
      {auth.actor === "staff" ? (
        <p>{t("staffReservation")}</p>
      ) : auth.actor === "customer" || (auth.status === "anonymous" && !auth.logoutRequired) ? (
        <Suspense fallback={<Loading />}>
          <CustomerReservation key={unit.id} unit={unit} />
        </Suspense>
      ) : (
        <Button
          variant="secondary"
          className="justify-self-start"
          pending={auth.pending || auth.status === "bootstrapping"}
          onClick={() => void auth.retryBootstrap().catch(() => undefined)}
        >
          {t("retry", { ns: "auth" })}
        </Button>
      )}
    </div>
  );
}
