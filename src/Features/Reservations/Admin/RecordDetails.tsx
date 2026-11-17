import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { BidiText } from "../../../Components/BidiText";
import { Facts } from "../../../Components/Facts";
import { useLocale } from "../../../Hooks/useLocale";
import { formatDateTime } from "../../../i18n/format";
import { routePaths } from "../../../Router/routePaths";
import type { ReservationDto } from "../../../Types/contracts";

import { Status } from "../Status";

export function BusinessFacts({ record }: { record: ReservationDto }) {
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
    { label: t("status"), value: <Status value={record.status} /> },
  ];
  items.push(
    { label: t("reservationDate"), value: <>{formatDateTime(record.reservationDate, locale)}</> },
    { label: t("cancelledAt"), value: <>{record.cancelledAt ? formatDateTime(record.cancelledAt, locale) : t("notCancelled")}</> },
  );
  return <Facts items={items} />;
}

/** The DTOs have no customerId or projectId. Only reservation/order links are supported here. */
export function BusinessLinks({ record }: { record: ReservationDto }) {
  const { t } = useTranslation("account");
  return (
    <div className="flex flex-wrap gap-4">
      {record.orderId ? (
        <Link className="underline" to={routePaths.admin.order(record.orderId)}>
          {t("order")}
        </Link>
      ) : (
        <p className="text-muted">{t("noOrder")}</p>
      )}
    </div>
  );
}
