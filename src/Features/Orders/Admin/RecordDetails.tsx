import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { BidiText } from "../../../Components/BidiText";
import { Facts } from "../../../Components/Facts";
import { useLocale } from "../../../Hooks/useLocale";
import { formatCurrency, formatDateTime } from "../../../i18n/format";
import { routePaths } from "../../../Router/routePaths";
import type { OrderDto } from "../../../Types/contracts";

import { Status } from "../Status";

export function BusinessFacts({ record }: { record: OrderDto }) {
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
    { label: t("totalPrice"), value: <>{formatCurrency(record.totalPrice, locale)}</> },
    { label: t("completedAt"), value: <>{record.completedAt ? formatDateTime(record.completedAt, locale) : t("notCompleted")}</> },
  );
  return <Facts items={items} />;
}

/** The DTOs have no customerId or projectId. Only reservation/order links are supported here. */
export function BusinessLinks({ record }: { record: OrderDto }) {
  const { t } = useTranslation("account");
  return (
    <div className="flex flex-wrap gap-4">
      <Link className="underline" to={routePaths.admin.reservation(record.reservationId)}>
        {t("reservation")}
      </Link>
    </div>
  );
}
