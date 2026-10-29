import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Hooks/useAuth";
import { CustomerOperationsProvider } from "../../Context/CustomerOperationsProvider";
import { ReservationsAdminProvider } from "../../Context/ReservationsAdminProvider";
import { OrdersAdminProvider } from "../../Context/OrdersAdminProvider";
import { RouteHeading } from "../../Router/RouteFeedback";
import { routePaths } from "../../Router/routePaths";
import CustomersPage from "./CustomersPage";
import { AdminOrdersPage, AdminReservationsPage } from "./OperationsRecordsPage";

export default function AdminOperationsPage({ title }: { title: string }) {
  const { t } = useTranslation("routing");
  const params = useParams();
  const auth = useAuth();
  const { pathname } = useLocation();
  const scope = `${auth.actor}:${auth.actor ? auth.profile.id : ""}:${auth.generation}:${pathname}`;
  const customers = title === "customers" || title === "customer";
  const reservations = title === "reservations" || title === "reservation";
  const detail = ["customer", "reservation", "order"].includes(title);
  return (
    <div className="grid min-w-0 gap-7">
      <RouteHeading>{t(title)}</RouteHeading>
      <nav aria-label={t("operations.navigation", { ns: "admin" })} className="flex flex-wrap gap-3">
        {(["customers", "reservations", "orders"] as const).map((kind) => (
          <Link key={kind} className="rounded-ui border border-primary/25 bg-accent/40 px-5 py-3" to={routePaths.admin[kind]}>
            {t(kind)}
          </Link>
        ))}
      </nav>
      {customers ? (
        <CustomerOperationsProvider key={scope} scope={scope} id={detail ? (params.customerId ?? "") : undefined}>
          <CustomersPage detail={detail} />
        </CustomerOperationsProvider>
      ) : reservations ? (
        <ReservationsAdminProvider key={scope} scope={scope} id={detail ? (params.reservationId ?? "") : undefined}>
          <AdminReservationsPage detail={detail} />
        </ReservationsAdminProvider>
      ) : (
        <OrdersAdminProvider key={scope} scope={scope} id={detail ? (params.orderId ?? "") : undefined}>
          <AdminOrdersPage detail={detail} />
        </OrdersAdminProvider>
      )}
    </div>
  );
}
