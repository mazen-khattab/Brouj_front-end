import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { PrivateReadPanel, accountPanel } from "../../../Components/PrivateReadPanel";
import { BidiText } from "../../../Components/BidiText";
import { Button } from "../../../Components/Button";
import { Facts } from "../../../Components/Facts";
import { EmptyState } from "../../../Components/Feedback";
import { Select } from "../../../Components/Fields";
import { Pagination } from "../../../Components/Pagination";
import { useLocale } from "../../../Hooks/useLocale";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import type { OrderDto } from "../../../Types/contracts";
import { formatCurrency, formatDateTime, formatNumber } from "../../../i18n/format";
import type { OrdersData } from "./DataContext";
import { OrdersDataProvider } from "./DataProvider";
import { useOrdersData } from "./useData";

import { Status } from "../Status";

function RecordFacts({ record }: { record: OrderDto }) {
  const { t } = useTranslation("account");
  const { locale } = useLocale();
  const items = [
    { label: t("number"), value: <BidiText>{record.number}</BidiText> },
    { label: t("unit"), value: <BidiText>{record.unitNumber}</BidiText> },
    { label: t("project"), value: <bdi dir="auto">{record.projectName}</bdi> },
    {
      label: t("status"),
      value: <Status value={record.status} />,
    },
  ];
  items.push(
    {
      label: t("totalPrice"),
      value: <>{formatCurrency(record.totalPrice, locale)}</>,
    },
    {
      label: t("completedAt"),
      value: <>{record.completedAt ? formatDateTime(record.completedAt, locale) : t("notCompleted")}</>,
    },
  );
  return <Facts items={items} />;
}
function Records({ data }: { data: Extract<OrdersData, { kind: "orders" }> }) {
  const { t } = useTranslation("account");
  const { locale } = useLocale();
  const context = useOrdersData();
  return (
    <div className="grid gap-6">
      <section
        className="flex flex-wrap items-end gap-5 rounded-ui border border-accent/40 bg-accent-light p-6 text-primary"
        aria-label={t("status")}
      >
        <Select
          id="account-status"
          label={t("status")}
          value={context.status ?? ""}
          onChange={(event) =>
            context.update({
              status: event.target.value === "" ? null : Number(event.target.value),
            })
          }
        >
          <option value="">{t("all")}</option>
          {[0, 1, 2, 3].map((status) => (
            <option key={status} value={status}>
              {t(`${"orderStatus"}.${status}`)}
            </option>
          ))}
        </Select>
        <Select
          id="account-page-size"
          label={t("pageSize")}
          value={context.pageSize}
          onChange={(event) => context.update({ pageSize: Number(event.target.value) })}
        >
          {[...new Set([12, 24, 48, context.pageSize])]
            .sort((a, b) => a - b)
            .map((size) => (
              <option key={size} value={size}>
                {formatNumber(size, locale)}
              </option>
            ))}
        </Select>
        <Button variant="secondary" onClick={context.reload}>
          {t("refresh")}
        </Button>
      </section>
      <p className="text-accent-light">{t("results", { value: formatNumber(data.value.totalCount, locale) })}</p>
      {!data.value.items.length ? (
        <div className={accountPanel}>
          <EmptyState title={t("empty")} description={t("emptyDescription")} />
          <Link className="underline" to={routePaths.projects}>
            {t("browse")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.value.items.map((record) => (
            <article key={record.id} className={accountPanel}>
              <h2 className="text-xl font-medium">
                <BidiText>{record.number}</BidiText>
              </h2>
              <RecordFacts record={record} />
              <Link className="justify-self-start underline" to={routePaths.order(record.id)}>
                {t("view")}
              </Link>
            </article>
          ))}
        </div>
      )}
      <Pagination page={data.value.pageNumber} totalPages={data.value.totalPages} onPageChange={(page) => context.update({ page })} />
    </div>
  );
}

function Content() {
  const { result, reload } = useOrdersData();
  const { t } = useTranslation("account");
  return (
    <PrivateReadPanel result={result} reload={reload}>
      {(data) =>
        data.kind === "orders" ? (
          <Records data={data} />
        ) : (
          <article className={accountPanel}>
            <RecordFacts record={data.value} />
            <Link className="underline" to={routePaths.reservation(data.value.reservationId)}>
              {t("reservation")}
            </Link>
          </article>
        )
      }
    </PrivateReadPanel>
  );
}

export default function OrdersPage() {
  const { orderId } = useParams();
  const kind = orderId === undefined ? "orders" : "order";
  const { t } = useTranslation("routing");
  const account = useTranslation("account");
  const id = orderId;
  return (
    <div className="grid gap-7">
      <header className="grid gap-3">
        <RouteHeading>{t(kind)}</RouteHeading>
        <p className="text-white/80">{account.t("intro")}</p>
      </header>
      <OrdersDataProvider kind={kind} id={id}>
        <Content />
      </OrdersDataProvider>
    </div>
  );
}
