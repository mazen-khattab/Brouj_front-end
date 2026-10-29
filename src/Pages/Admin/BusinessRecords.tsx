import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BidiText } from "../../Components/BidiText";
import { Facts } from "../../Components/Catalogue/PropertyFacts";
import { OperationsStatus } from "../../Components/AdminOperations/Shared";
import { routePaths } from "../../Router/routePaths";
import { useLocale } from "../../Hooks/useLocale";
import { formatCurrency, formatDateTime } from "../../i18n/format";
import type { ReservationDto, OrderDto } from "../../Types/contracts";

export function BusinessFacts({ record }: { record: ReservationDto | OrderDto }) {
  const { t } = useTranslation("account");
  const { locale } = useLocale();
  const items = [
    { label: t("number"), value: <BidiText>{record.number}</BidiText> },
    {
      label: t("project"),
      value: (
        <bdi dir="auto" className="break-words">
          {record.projectName}
        </bdi>
      ),
    },
    { label: t("unit"), value: <BidiText>{record.unitNumber}</BidiText> },
    { label: t("status"), value: <OperationsStatus value={record.status} order={"totalPrice" in record} /> },
  ];
  if ("totalPrice" in record) {
    items.push(
      { label: t("totalPrice"), value: <>{formatCurrency(record.totalPrice, locale)}</> },
      { label: t("completedAt"), value: <>{record.completedAt ? formatDateTime(record.completedAt, locale) : t("notCompleted")}</> },
    );
  } else {
    items.push(
      { label: t("reservationDate"), value: <>{formatDateTime(record.reservationDate, locale)}</> },
      { label: t("cancelledAt"), value: <>{record.cancelledAt ? formatDateTime(record.cancelledAt, locale) : t("notCancelled")}</> },
    );
  }
  return <Facts items={items} />;
}

/** The DTOs have no customerId or projectId. Only reservation/order links are supported here. */
export function BusinessLinks({ record }: { record: ReservationDto | OrderDto }) {
  const { t } = useTranslation("account");
  return (
    <div className="flex flex-wrap gap-4">
      {"reservationId" in record ? (
        <Link className="underline" to={routePaths.admin.reservation(record.reservationId)}>
          {t("reservation")}
        </Link>
      ) : record.orderId ? (
        <Link className="underline" to={routePaths.admin.order(record.orderId)}>
          {t("order")}
        </Link>
      ) : (
        <p className="text-muted">{t("noOrder")}</p>
      )}
    </div>
  );
}
