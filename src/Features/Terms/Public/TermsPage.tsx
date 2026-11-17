import { useTranslation } from "react-i18next";
import { Facts } from "../../../Components/Facts";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { useLocale } from "../../../Hooks/useLocale";
import { formatDateTime } from "../../../i18n/format";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { useTerms } from "./TermsContext";
import { TermsProvider } from "./TermsProvider";
const panel = "grid min-w-0 gap-8 rounded-ui border border-accent/40 bg-ivory p-6 text-primary shadow-panel sm:p-9";
function Content() {
  const { result, reload } = useTerms();
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  return (
    <PublicReadPanel result={result} reload={reload} missingDescription={t("termsMissing")}>
      {(detail) => (
        <article className={panel}>
          <header>
            <h2 className="text-2xl font-medium">{detail.title}</h2>
            <p className="mt-3 text-sm text-muted">
              {t("version", {
                value: detail.versionNumber,
              })}
            </p>
          </header>
          <Facts
            items={[
              {
                label: t("effectiveDate"),
                value: formatDateTime(detail.effectiveDate, locale),
              },
            ]}
          />
          <div dir="auto" className="max-w-prose whitespace-pre-wrap leading-9 [overflow-wrap:anywhere]">
            {detail.content}
          </div>
        </article>
      )}
    </PublicReadPanel>
  );
}
export default function TermsPage() {
  const { t } = useTranslation("catalogue");
  const routing = useTranslation("routing");
  return (
    <div className="grid gap-8 motion-safe:animate-fade-in">
      <header className="grid gap-4">
        <RouteHeading>{routing.t("terms")}</RouteHeading>
        <p className="max-w-prose leading-8 text-white/80">{t("termsIntro")}</p>
      </header>
      <TermsProvider>
        <Content />
      </TermsProvider>
    </div>
  );
}
