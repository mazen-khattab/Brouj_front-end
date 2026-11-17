import { useTranslation } from "react-i18next";
import type { AmenityDto } from "../Types/contracts";
import { Facts } from "./Facts";

export function Amenities({ items, cards = false }: { items: ReadonlyArray<AmenityDto>; cards?: boolean }) {
  const { t } = useTranslation("catalogue");
  return (
    <section className="grid gap-5">
      <h2 className="text-2xl font-medium">{t("amenities")}</h2>
      {items.length && cards ? (
        <dl className="flex flex-wrap gap-3">
          {items.map((item, index) => (
            <div
              key={`${item.name}:${index}`}
              className="grid min-w-32 max-w-52 content-start gap-1 rounded-ui border border-accent/40 bg-surface px-4 py-3"
            >
              <dt dir="auto" className="text-sm font-medium [overflow-wrap:anywhere]">
                {item.name}
              </dt>
              <dd dir="auto" className="text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : items.length ? (
        <Facts items={items.map((item) => ({ label: item.name, value: item.value }))} />
      ) : (
        <p className="text-muted">{t("noAmenities")}</p>
      )}
    </section>
  );
}
