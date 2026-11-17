import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { operationsPanel } from "../../../Components/panels";
import { OperationDialog, OperationFeedback, OperationsReadPanel } from "../../../Components/StaffOperations";
import { BidiText } from "../../../Components/BidiText";
import { Button } from "../../../Components/Button";
import { DataTable } from "../../../Components/DataTable";
import { Pagination } from "../../../Components/Pagination";
import { useLocale } from "../../../Hooks/useLocale";
import { formatDateTime } from "../../../i18n/format";
import { routePaths } from "../../../Router/routePaths";
import type { ReservationDto } from "../../../Types/contracts";
import { canConvert } from "./policy";
import { BusinessFacts, BusinessLinks } from "./RecordDetails";
import { useReservationsAdmin } from "./ReservationsAdminContext";

import { ReservationsFilterBar } from "./FilterBar";

import { Status } from "../Status";

export default function Records({ detail }: { detail: boolean }) {
  const context = useReservationsAdmin();
  const { t } = useTranslation("admin");
  const { locale } = useLocale();
  const [selection, select] = useState<ReservationDto>();
  const action = context.conversion;
  const operation = "conversion";
  const disabled = action.pending || action.blocked || context.read.result.status !== "success";
  const path = routePaths.admin.reservation;
  const read = context.read.result;

  function actionButton(record: ReservationDto) {
    const eligible = canConvert(record);
    return eligible ? (
      <Button disabled={disabled} onClick={() => select(record)}>
        {t("operations.convert")}
      </Button>
    ) : null;
  }

  async function confirm() {
    if (!selection) {
      return;
    }
    await context.convert(selection.id);
    select(undefined);
  }

  return (
    <div className="grid min-w-0 gap-6">
      <OperationFeedback action={action} operation={operation} />
      {!detail && <ReservationsFilterBar filters={context.filters} pending={action.pending} reload={context.read.reload} />}
      <OperationsReadPanel result={read} reload={context.read.reload}>
        {(data) =>
          data.list ? (
            <section className={operationsPanel}>
              <DataTable
                caption={t("operations.reservationsCaption")}
                scrollLabel={t("operations.reservationTable")}
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
                  { id: "status", header: t("status", { ns: "account" }), render: (row) => <Status value={row.status} /> },
                  {
                    id: "value",
                    header: t("reservationDate", { ns: "account" }),
                    render: (row) => formatDateTime(row.reservationDate, locale),
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

              <div className="flex flex-wrap gap-3">
                {actionButton(data.record)}
                <Button variant="secondary" disabled={action.pending} onClick={() => void context.read.reload().catch(() => {})}>
                  {t("operations.refresh")}
                </Button>
              </div>
              <Link className="underline" to={routePaths.admin.reservations}>
                {t("operations.backReservations")}
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
