import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCustomerOperations } from "../../Context/CustomerOperationsContext";
import { DataTable } from "../../Components/DataTable";
import { Button } from "../../Components/Button";
import { Pagination } from "../../Components/Pagination";
import { BidiText } from "../../Components/BidiText";
import { Facts } from "../../Components/Catalogue/PropertyFacts";
import { OperationsReadPanel, OperationFeedback, OperationDialog, OperationsFilterBar } from "../../Components/AdminOperations/Shared";
import { operationsPanel } from "../../Components/AdminOperations/classes";
import { routePaths } from "../../Router/routePaths";
import { useLocale } from "../../Hooks/useLocale";
import { formatDateTime } from "../../i18n/format";
import type { CustomerDto } from "../../Types/contracts";
import { customerOperation } from "../../AdminOperations/policy";

export default function CustomersPage({ detail }: { detail: boolean }) {
  const context = useCustomerOperations();
  const { t } = useTranslation("admin");
  const { locale } = useLocale();
  const [selection, select] = useState<CustomerDto>();
  const operation = selection ? customerOperation(selection) : "deletion";
  const pending = context.deletion.pending || context.restoration.pending;
  const disabled = pending || context.deletion.blocked || context.restoration.blocked || context.read.result.status !== "success";
  const feedback = context.active ? context[context.active] : undefined;

  function action(customer: CustomerDto) {
    return (
      <Button variant="secondary" disabled={disabled} onClick={() => select(customer)}>
        {t(customer.deletedAt === null ? "operations.softDelete" : "operations.restore")}
      </Button>
    );
  }

  async function confirm() {
    if (!selection) {
      return;
    }
    await (operation === "deletion" ? context.remove(selection.id) : context.restore(selection.id));
    select(undefined);
  }

  return (
    <div className="grid min-w-0 gap-6">
      {feedback && context.active && <OperationFeedback action={feedback} operation={context.active} />}
      {!detail && <OperationsFilterBar kind="customers" filters={context.filters} pending={pending} reload={context.read.reload} />}
      <OperationsReadPanel result={context.read.result} reload={context.read.reload}>
        {(data) =>
          data.list ? (
            <section className={operationsPanel}>
              <DataTable
                caption={t("operations.customersCaption")}
                scrollLabel={t("operations.customerTable")}
                rows={[...data.page.items]}
                rowKey={(row) => row.id}
                columns={[
                  {
                    id: "name",
                    header: t("operations.customerName"),
                    render: (row) => (
                      <Link className="underline" to={routePaths.admin.customer(row.id)}>
                        <bdi data-private dir="auto" className="block max-w-64 break-words">
                          {row.fName} {row.lName}
                        </bdi>
                      </Link>
                    ),
                  },
                  {
                    id: "email",
                    header: t("operations.email"),
                    render: (row) => (
                      <span data-private>
                        <BidiText>{row.email}</BidiText>
                      </span>
                    ),
                  },
                  {
                    id: "phone",
                    header: t("operations.phone"),
                    render: (row) => (
                      <span data-private className="whitespace-nowrap">
                        <BidiText>{row.phone}</BidiText>
                      </span>
                    ),
                  },
                  {
                    id: "state",
                    header: t("operations.customerState"),
                    render: (row) => t(row.deletedAt === null ? "operations.active" : "operations.deleted"),
                  },
                  {
                    id: "actions",
                    header: t("actions"),
                    render: (row) => (
                      <div className="flex flex-wrap gap-3">
                        <Link className="underline" to={routePaths.admin.customer(row.id)}>
                          {t("operations.view")}
                        </Link>
                        {action(row)}
                      </div>
                    ),
                  },
                ]}
              />
              <Pagination
                page={data.page.pageNumber}
                totalPages={data.page.totalPages}
                pending={pending}
                onPageChange={(pageNumber) => context.filters.update({ pageNumber })}
              />
            </section>
          ) : (
            <article className={operationsPanel}>
              <Facts
                items={[
                  {
                    label: t("operations.customerName"),
                    value: (
                      <bdi data-private dir="auto">
                        {data.record.fName} {data.record.lName}
                      </bdi>
                    ),
                  },
                  {
                    label: t("operations.email"),
                    value: (
                      <span data-private>
                        <BidiText>{data.record.email}</BidiText>
                      </span>
                    ),
                  },
                  {
                    label: t("operations.phone"),
                    value: (
                      <span data-private>
                        <BidiText>{data.record.phone}</BidiText>
                      </span>
                    ),
                  },
                  { label: t("operations.customerState"), value: t(data.record.deletedAt === null ? "operations.active" : "operations.deleted") },
                  {
                    label: t("operations.deletedAt"),
                    value: data.record.deletedAt ? formatDateTime(data.record.deletedAt, locale) : t("operations.notDeleted"),
                  },
                ]}
              />
              <div className="flex flex-wrap gap-4">
                {action(data.record)}
                <Button variant="secondary" disabled={pending} onClick={() => void context.read.reload().catch(() => {})}>
                  {t("operations.refresh")}
                </Button>
              </div>
              <Link className="underline" to={routePaths.admin.customers}>
                {t("operations.backCustomers")}
              </Link>
            </article>
          )
        }
      </OperationsReadPanel>
      <OperationDialog open={Boolean(selection)} operation={operation} pending={pending} onClose={() => select(undefined)} onConfirm={confirm}>
        {selection && (
          <p data-private className="break-words font-semibold">
            <bdi dir="auto">
              {selection.fName} {selection.lName}
            </bdi>
          </p>
        )}
      </OperationDialog>
    </div>
  );
}
