import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../Components/Fields";
import { Button } from "../../Components/Button";
import { ConfirmAction } from "../../Components/AdminCatalogue/Shared";
import { Alert } from "../../Components/Feedback";
import { useAdminCatalogue } from "../../Context/AdminCatalogueContext";
import { replaceAmenities, validAmenities } from "../../AdminCatalogue/model";
import type { Kind } from "../../AdminCatalogue/model";
import type { AmenityDto } from "../../Types/contracts";

export default function CatalogueAmenities({
  kind,
  id,
  initial,
  refresh,
  readPending,
}: {
  kind: Exclude<Kind, "city">;
  id: string;
  initial: readonly AmenityDto[];
  refresh: () => Promise<unknown>;
  readPending: boolean;
}) {
  const { t } = useTranslation("admin");
  const action = useAdminCatalogue();
  const [items, setItems] = useState(() => initial.map(({ name, value }) => ({ name, value })));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [confirm, setConfirm] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const disabled = action.pending || action.blocked || readPending;

  function change(next: AmenityDto[]) {
    setItems(next);
    action.markDirty("amenities", JSON.stringify(next) !== baseline);
  }

  async function replace() {
    const result = await action.run((signal) => replaceAmenities(kind, id, items, signal), refresh);
    setConfirm(false);
    if (result) {
      action.markDirty("amenities", false);
      setBaseline(JSON.stringify(items));
    }
  }

  return (
    <section className="grid gap-5" aria-label={t("amenities")}>
      <h2 className="text-2xl font-semibold">{t("amenities")}</h2>
      <p className="leading-7 text-muted">{t("replacementHint")}</p>
      {(invalid || Object.keys(action.failure?.fieldErrors ?? {}).some((key) => /amenities/i.test(key))) && (
        <Alert tone="error">{t("amenitiesInvalid")}</Alert>
      )}
      {items.map((item, index) => (
        <div key={index} className="grid min-w-0 gap-4 rounded-ui border border-accent/50 p-4 xl:grid-cols-[1fr_1fr_auto]">
          <Input
            id={`amenity-name-${index}`}
            label={t("amenityName")}
            value={item.name}
            maxLength={100}
            disabled={disabled}
            onChange={(e) => change(items.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))}
          />
          <Input
            id={`amenity-value-${index}`}
            label={t("amenityValue")}
            value={item.value}
            maxLength={32}
            disabled={disabled}
            onChange={(e) => change(items.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)))}
          />
          <Button variant="secondary" disabled={disabled} onClick={() => change(items.filter((_, i) => i !== index))}>
            {t("removeRow")}
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={disabled || items.length >= 100} onClick={() => change([...items, { name: "", value: "" }])}>
          {t("addAmenity")}
        </Button>
        <Button
          disabled={disabled}
          onClick={() => {
            const valid = validAmenities(items);
            setInvalid(!valid);
            if (valid) {
              setConfirm(true);
            }
          }}
        >
          {t("replaceAmenities")}
        </Button>
      </div>
      {confirm && (
        <ConfirmAction title={t("replaceAmenities")} description={t("replacementHint")} onClose={() => setConfirm(false)} onConfirm={replace} />
      )}
    </section>
  );
}
