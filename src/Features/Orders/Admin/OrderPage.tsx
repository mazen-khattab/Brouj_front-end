import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { OperationsNavigation } from "../../../Router/OperationsNavigation";
import { useAuth } from "../../../Hooks/useAuth";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { OrdersAdminProvider } from "./OrdersAdminProvider";
import Records from "./Records";

export default function OrderPage() {
  const { orderId } = useParams();
  const { pathname } = useLocation();
  const auth = useAuth();
  const { t } = useTranslation("routing");
  const scope = [auth.actor, auth.actor ? auth.profile.id : "", auth.generation, pathname].join(":");
  return (
    <div className="grid min-w-0 gap-7">
      <RouteHeading>{t(orderId === undefined ? "orders" : "order")}</RouteHeading>
      <OperationsNavigation />
      <OrdersAdminProvider key={scope} scope={scope} id={orderId}>
        <Records detail={orderId !== undefined} />
      </OrdersAdminProvider>
    </div>
  );
}
