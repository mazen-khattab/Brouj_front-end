import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useReservationsAdmin } from "../../Context/ReservationsAdminContext";
import { useOrdersAdmin } from "../../Context/OrdersAdminContext";
import type { ReservationsAdminValue } from "../../Context/ReservationsAdminContext";
import type { OrdersAdminValue } from "../../Context/OrdersAdminContext";
import { DataTable } from "../../Components/DataTable";
import { Button } from "../../Components/Button";
import { Pagination } from "../../Components/Pagination";
import { BidiText } from "../../Components/BidiText";
import {
  OperationsReadPanel,
  OperationsStatus,
  OperationFeedback,
  OperationDialog,
  OperationsFilterBar,
} from "../../Components/AdminOperations/Shared";
import { operationsPanel } from "../../Components/AdminOperations/classes";
import { routePaths } from "../../Router/routePaths";
import { canComplete, canConvert } from "../../AdminOperations/policy";
import { useLocale } from "../../Hooks/useLocale";
import { formatCurrency, formatDateTime } from "../../i18n/format";
import type { OrderDto, ReservationDto } from "../../Types/contracts";
import { BusinessFacts, BusinessLinks } from "./BusinessRecords";
import type { OperationsData } from "../../AdminOperations/types";
import type { CatalogueRead } from "../../Hooks/useCatalogueRead";

function RecordsContent({ context, orders, detail }: { context: ReservationsAdminValue | OrdersAdminValue; orders: boolean; detail: boolean }) {
  const { t } = useTranslation("admin");
  const { locale } = useLocale();
  const [selection, select] = useState<ReservationDto | OrderDto>();
  const action = "completion" in context ? context.completion : context.conversion;
  const operation = orders ? "completion" : "conversion";
  const disabled = action.pending || action.blocked || context.read.result.status !== "success";
  const path = (id: string) => (orders ? routePaths.admin.order(id) : routePaths.admin.reservation(id));
  const read = context.read.result as CatalogueRead<OperationsData<OrderDto | ReservationDto>>;

  function actionButton(record: ReservationDto | OrderDto) {
    const eligible = "totalPrice" in record ? canComplete(record) : canConvert(record);
    return eligible ? (
      <Button disabled={disabled} onClick={() => select(record)}>
        {t(orders ? "operations.complete" : "operations.convert")}
      </Button>
    ) : null;
  }

  async function confirm() {
    if (!selection) {
      return;
    }
    if ("completion" in context) {
      await context.complete(selection.id);
    } else {
      await context.convert(selection.id);
    }
    select(undefined);
  }

  return (
    <div className="grid min-w-0 gap-6">
      <OperationFeedback action={action} operation={operation} />
      {!detail && (
        <OperationsFilterBar
          kind={orders ? "orders" : "reservations"}
          filters={context.filters}
          pending={action.pending}
          reload={context.read.reload}
        />
      )}
      <OperationsReadPanel result={read} reload={context.read.reload}>
        {(data) =>
          data.list ? (
            <section className={operationsPanel}>
              <DataTable
                caption={t(orders ? "operations.ordersCaption" : "operations.reservationsCaption")}
                scrollLabel={t(orders ? "operations.orderTable" : "operations.reservationTable")}
                rows={[...data.page.items]}
                rowKey={(row) => row.id}
                columns={[
                  {
                    id: "number",
                    header: t("number", { ns: "account" }),
                    render: (row) => (
                      <Link className="inline-block min-w-28 whitespace-nowrap underline" to={path(row.id)}>
                        <BidiText>{row.number}</BidiText>
                      </Link>
                    ),
                  },
                  {
                    id: "project",
                    header: t("project", { ns: "account" }),
                    render: (row) => (
                      <bdi dir="auto" className="block max-w-64 break-words">
                        {row.projectName}
                      </bdi>
                    ),
                  },
                  {
                    id: "unit",
                    header: t("unit", { ns: "account" }),
                    render: (row) => (
                      <span className="whitespace-nowrap">
                        <BidiText>{row.unitNumber}</BidiText>
                      </span>
                    ),
                  },
                  { id: "status", header: t("status", { ns: "account" }), render: (row) => <OperationsStatus value={row.status} order={orders} /> },
                  {
                    id: "value",
                    header: t(orders ? "totalPrice" : "reservationDate", { ns: "account" }),
                    render: (row) => ("totalPrice" in row ? formatCurrency(row.totalPrice, locale) : formatDateTime(row.reservationDate, locale)),
                  },
                  {
                    id: "actions",
                    header: t("actions"),
                    render: (row) => (
                      <div className="flex flex-wrap gap-3">
                        <Link className="underline" to={path(row.id)}>
                          {t("operations.view")}
                        </Link>
                        {actionButton(row)}
                      </div>
                    ),
                  },
                ]}
              />
              <Pagination
                page={data.page.pageNumber}
                totalPages={data.page.totalPages}
                pending={action.pending}
                onPageChange={(pageNumber) => context.filters.update({ pageNumber })}
              />
            </section>
          ) : (
            <article className={operationsPanel}>
              <BusinessFacts record={data.record} />
              <BusinessLinks record={data.record} />
              {orders && <p className="text-sm leading-7 text-muted">{t("operations.completionEligibility")}</p>}
              <div className="flex flex-wrap gap-3">
                {actionButton(data.record)}
                <Button variant="secondary" disabled={action.pending} onClick={() => void context.read.reload().catch(() => {})}>
                  {t("operations.refresh")}
                </Button>
              </div>
              <Link className="underline" to={orders ? routePaths.admin.orders : routePaths.admin.reservations}>
                {t(orders ? "operations.backOrders" : "operations.backReservations")}
              </Link>
            </article>
          )
        }
      </OperationsReadPanel>
      <OperationDialog open={Boolean(selection)} operation={operation} pending={action.pending} onClose={() => select(undefined)} onConfirm={confirm}>
        {selection && (
          <p className="break-words font-semibold">
            <BidiText>{selection.number}</BidiText>
          </p>
        )}
      </OperationDialog>
    </div>
  );
}

export function AdminReservationsPage({ detail }: { detail: boolean }) {
  return <RecordsContent context={useReservationsAdmin()} orders={false} detail={detail} />;
}

export function AdminOrdersPage({ detail }: { detail: boolean }) {
  return <RecordsContent context={useOrdersAdmin()} orders detail={detail} />;
}
