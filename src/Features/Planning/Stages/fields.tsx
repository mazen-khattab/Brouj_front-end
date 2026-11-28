import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { DateTimeInput } from "../../../Components/DateTimeInput";
import { Input, Select } from "../../../Components/Fields";
import type { InitialLocale } from "../../../i18n/bootstrap";
import { formatCurrency, formatDateTime } from "../../../i18n/format";
import { TimePlanStageStatus } from "../../../Types/contracts";
import type { TimePlanStageDto } from "../../../Types/contracts";
import type { TimePlanStageDraft } from "./types";

type StageFieldKey = keyof TimePlanStageDraft;
type Translate = TFunction<"timePlans">;

interface StageInputProps {
  id: string;
  label: string;
  value: string;
  error: string | undefined;
  change: (value: string) => void;
  nameReadOnly: boolean;
  pricingRequired: boolean;
  t: Translate;
}

interface StageField {
  key: StageFieldKey;
  label: (t: Translate) => string;
  template?: true;
  input: (props: StageInputProps) => ReactNode;
  cell?: (row: TimePlanStageDto, locale: InitialLocale, t: Translate) => ReactNode;
}

export const stageFields: readonly StageField[] = [
  {
    key: "name",
    label: (t) => t("fields.name"),
    template: true,
    input: ({ id, label, value, error, change, nameReadOnly }) => (
      <Input id={id} label={label} value={value} error={error} onChange={(event) => change(event.target.value)}
        dir="auto" maxLength={100} required readOnly={nameReadOnly} />
    ),
    cell: (row) => <span dir="auto" className="whitespace-normal break-words">{row.name}</span>,
  },
  {
    key: "deliveryDate",
    label: (t) => t("fields.deliveryDate"),
    template: true,
    input: ({ id, label, value, error, change }) => (
      <DateTimeInput id={id} label={label} value={value} error={error} onValueChange={change} dir="ltr" required />
    ),
    cell: (row, locale) => <bdi>{formatDateTime(row.deliveryDate, locale)}</bdi>,
  },
  {
    key: "status",
    label: (t) => t("fields.stageStatus"),
    input: ({ id, label, value, error, change, t }) => (
      <Select id={id} label={label} value={value} error={error} onChange={(event) => change(event.target.value)}>
        {Object.values(TimePlanStageStatus).map((status) => (
          <option key={status} value={status}>{t(`stageStatus.${status}`)}</option>
        ))}
      </Select>
    ),
    cell: (row, _locale, t) => t(`stageStatus.${row.status}`),
  },
  {
    key: "price",
    label: (t) => t("fields.price"),
    input: ({ id, label, value, error, change, pricingRequired, t }) => (
      <Input id={id} label={label} value={value} error={error} onChange={(event) => change(event.target.value)}
        dir="ltr" inputMode="decimal" hint={t("priceHint")} required={pricingRequired} />
    ),
    cell: (row, locale) => row.pricingDate == null ? "—" : <bdi>{formatCurrency(row.price, locale)}</bdi>,
  },
  {
    key: "pricingDate",
    label: (t) => t("fields.pricingDate"),
    input: ({ id, label, value, error, change, pricingRequired }) => (
      <DateTimeInput id={id} label={label} value={value} error={error} onValueChange={change} dir="ltr" required={pricingRequired} />
    ),
    cell: (row, locale) => row.pricingDate ? <bdi>{formatDateTime(row.pricingDate, locale)}</bdi> : "—",
  },
];
