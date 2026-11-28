import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { PrivateReadPanel } from "../../../Components/PrivateReadPanel";
import { BidiText } from "../../../Components/BidiText";
import { Facts } from "../../../Components/Facts";
import { useLocale } from "../../../Hooks/useLocale";
import { routePaths } from "../../../Router/routePaths";
import type { OrderDto } from "../../../Types/contracts";
import { formatCurrency, formatDateTime } from "../../../i18n/format";
import { AccountFilters, AccountResults } from "../../Account/AccountList";
import type { OrdersData } from "./DataContext";
import { OrdersDataProvider } from "./DataProvider";
import { useOrdersData } from "./useData";

import { Status } from "../Status";

function RecordFacts({ record, detail = false }: { record: OrderDto; detail?: boolean }) {
  const { t } = useTranslation("account");
  const { locale } = useLocale();
  const items = [
    ...(detail ? [
      { label: t("number"), value: <BidiText>{record.number}</BidiText> },
      { label: t("status"), value: <Status value={record.status} className="account-status" /> },
    ] : []),
    { label: t("unit"), value: <BidiText>{record.unitNumber}</BidiText> },
    { label: t("project"), value: <bdi dir="auto">{record.projectName}</bdi> },
    {
      label: t("totalPrice"),
      value: <>{formatCurrency(record.totalPrice, locale)}</>,
    },
    {
      label: t("completedAt"),
      value: <>{record.completedAt ? formatDateTime(record.completedAt, locale) : t("notCompleted")}</>,
    },
  ];
  return <Facts items={items} />;
}
function Records({ data }: { data: Extract<OrdersData, { kind: "orders" }> }) {
  const { t } = useTranslation("account");
  const { update } = useOrdersData();
  return (
    <AccountResults page={data.value} onPageChange={(page) => update({ page })}>
      {data.value.items.map((record) => (
        <article key={record.id} className="account-panel account-record">
          <div className="account-record-heading">
            <h2><BidiText>{record.number}</BidiText></h2>
            <Status value={record.status} className="account-status" />
          </div>
          <RecordFacts record={record} />
          <Link className="account-record-link" to={routePaths.order(record.id)}>{t("view")}</Link>
        </article>
      ))}
    </AccountResults>
  );
}

function Content({ kind }: { kind: OrdersData["kind"] }) {
  const filters = useOrdersData();
  const { result, reload } = filters;
  const { t } = useTranslation("account");
  return (
    <div className="account-list">
      {kind === "orders" && <AccountFilters statusKey="orderStatus" statuses={[0, 1, 2, 3]} filters={filters} />}
      <PrivateReadPanel result={result} reload={reload}>
        {(data) =>
          data.kind === "orders" ? (
            <Records data={data} />
          ) : (
            <article className="account-panel account-detail">
              <RecordFacts record={data.value} detail />
              <Link className="account-record-link" to={routePaths.reservation(data.value.reservationId)}>
                {t("reservation")}
              </Link>
            </article>
          )
        }
      </PrivateReadPanel>
    </div>
  );
}

export default function OrdersPage() {
  const { orderId } = useParams();
  const kind = orderId === undefined ? "orders" : "order";
  const id = orderId;
  return (
    <OrdersDataProvider kind={kind} id={id}>
      <Content kind={kind} />
    </OrdersDataProvider>
  );
}
