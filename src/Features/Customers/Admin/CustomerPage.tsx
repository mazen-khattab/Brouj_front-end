import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../Hooks/useAuth";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { OperationsNavigation } from "../../../Router/OperationsNavigation";
import { CustomerOperationsProvider } from "./CustomerOperationsProvider";
import CustomersPage from "./CustomersPage";

export default function CustomerPage() {
  const { customerId } = useParams();
  const { pathname } = useLocation();
  const auth = useAuth();
  const { t } = useTranslation("routing");
  const scope = [auth.actor, auth.actor ? auth.profile.id : "", auth.generation, pathname].join(":");
  return (
    <div className="grid min-w-0 gap-7">
      <RouteHeading>{t(customerId === undefined ? "customers" : "customer")}</RouteHeading>
      <OperationsNavigation />
      <CustomerOperationsProvider key={scope} scope={scope} id={customerId}>
        <CustomersPage detail={customerId !== undefined} />
      </CustomerOperationsProvider>
    </div>
  );
}
