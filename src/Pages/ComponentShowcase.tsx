import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocale } from "../Hooks/useLocale";
import { useToast } from "../Hooks/useToast";
import { Button } from "../Components/Button";
import { Input, Select, Textarea, Checkbox } from "../Components/Fields";
import {
  Alert,
  EmptyState,
  ErrorPanel,
  Loading,
  Skeleton,
  ValidationSummary,
} from "../Components/Feedback";
import { DataTable } from "../Components/DataTable";
import { Dialog } from "../Components/Dialog";
import { Pagination } from "../Components/Pagination";
import { LanguageSwitcher } from "../Components/LanguageSwitcher";
import { BidiText } from "../Components/BidiText";
import { BrandWordmark } from "../Components/BrandWordmark";
import { ArchitecturalVisual } from "../Components/ArchitecturalVisual";
import { LuxuryBackdrop } from "../Components/LuxuryBackdrop";
import { surfaces } from "../Components/surfaces";
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  formatNumber,
} from "../i18n/format";
const styles = {
  shell: "mx-auto max-w-[1320px] px-5 sm:px-10 lg:px-14",
  header:
    "flex items-center justify-between gap-6 border-b border-accent/25 pb-6 text-white",
  brand: "inline-flex no-underline focus-visible:outline-accent",
  intro:
    "grid items-center gap-9 py-12 motion-safe:animate-fade-in lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-16",
  badge:
    "inline-flex items-center gap-3 text-xs font-medium tracking-[0.14em] text-accent-light rtl:tracking-normal",
  lead: "mt-6 max-w-[42ch] text-base leading-8 text-white/75",
  grid: "mb-12 grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.2fr_1fr] lg:gap-9",
  panel:
    "min-w-0 rounded-ui border border-accent/35 p-6 shadow-[0_16px_48px_#0d293e0a] motion-safe:animate-fade-in sm:p-8 lg:p-9 [&_h2]:mb-5 [&_h2]:text-xl [&_h2]:font-medium",
  muted: "mb-7 text-sm leading-7 text-primary",
  stack: "grid min-w-0 gap-6",
  actions: "flex flex-wrap items-center gap-3",
  formats:
    "grid gap-5 [&_div]:grid [&_div]:grid-cols-[1fr_1.5fr] [&_div]:gap-4 [&_div]:border-b [&_div]:border-accent/25 [&_div]:pb-5 [&_dt]:text-sm [&_dt]:text-accent-light [&_dd]:m-0 [&_dd]:font-semibold",
  footer:
    "flex flex-wrap items-center justify-between gap-5 border-t border-accent/25 py-8 text-sm text-accent-light",
};

type Issue = {
  fieldId: "sample-name" | "sample-email";
  key: "validation.required" | "validation.email";
};
const samples = Array.from({ length: 5 }, (_, index) => ({
  id: `example-${index + 1}`,
  number: index + 1,
}));
const unchangedText = "نص تجريبي كما هو <b>Sample content</b> & example";

/** Development fixtures only: no business services, credentials, mutations, or persisted form values. */
export default function ComponentShowcase() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const notify = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [view, setView] = useState("");
  const [notes, setNotes] = useState("");
  const [checked, setChecked] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const errorFor = (id: Issue["fieldId"]) => {
    const issue = issues.find((item) => item.fieldId === id);
    return issue ? t(issue.key) : undefined;
  };

  function checkForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Issue[] = [];
    if (!name.trim())
      next.push({ fieldId: "sample-name", key: "validation.required" });
    const emailControl = event.currentTarget.elements.namedItem("email");
    if (!email.trim())
      next.push({ fieldId: "sample-email", key: "validation.required" });
    else if (
      emailControl instanceof HTMLInputElement &&
      emailControl.validity.typeMismatch
    )
      next.push({ fieldId: "sample-email", key: "validation.email" });
    setIssues(next);
    if (!next.length)
      notify({ tone: "success", message: { key: "showcase.saved" } });
  }

  return (
    <main className="min-h-svh">
      <div className="relative isolate">
        <LuxuryBackdrop />
        <div className={`${styles.shell} pt-6`}>
          <header className={styles.header}>
            <Link to="/" className={styles.brand}>
              <BrandWordmark />
            </Link>
            <LanguageSwitcher />
          </header>
          <section className={styles.intro}>
            <div className="py-3 text-white">
              <span className={styles.badge}>
                <span aria-hidden="true" className="h-px w-9 bg-accent" />
                {t("showcase.badge")}
              </span>
              <h1 className="mt-8 max-w-[15ch] text-[2.75rem] font-medium leading-[1.15] tracking-tight sm:text-6xl lg:text-[4rem] rtl:leading-[1.6] rtl:tracking-normal">
                {t("showcase.title")}
              </h1>
              <p className={styles.lead}>{t("showcase.description")}</p>
              <div className="mt-9 flex items-center gap-4 border-t border-accent/25 pt-6 text-xs tracking-wide text-accent-light rtl:tracking-normal">
                <span>{t("design.materials")}</span>
              </div>
            </div>
            <ArchitecturalVisual className="h-[330px] sm:h-[420px] lg:h-[460px]" />
          </section>
        </div>
      </div>
      <div
        className={`border-t border-accent/40 py-12 sm:py-16 ${surfaces.ivory}`}
      >
        <div className={styles.shell}>
          <div className="mb-8 flex items-center gap-4 text-xs font-medium tracking-widest text-primary rtl:tracking-normal">
            <span aria-hidden="true" className="h-px w-9 bg-accent" />
            {t("design.collection")}
          </div>
          <div className={styles.grid}>
            <section
              className={`${styles.panel} bg-white text-primary`}
              aria-labelledby="form-title"
            >
              <h2 id="form-title">{t("showcase.form")}</h2>
              <p className={styles.muted}>{t("showcase.formDescription")}</p>
              <form noValidate className={styles.stack} onSubmit={checkForm}>
                <ValidationSummary
                  items={issues.map((issue) => ({
                    fieldId: issue.fieldId,
                    message: `${t(issue.fieldId === "sample-name" ? "showcase.name" : "showcase.email")}: ${t(issue.key)}`,
                  }))}
                />
                <Input
                  id="sample-name"
                  name="displayName"
                  label={t("showcase.name")}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  error={errorFor("sample-name")}
                  required
                  autoComplete="off"
                />
                <Input
                  id="sample-email"
                  name="email"
                  type="email"
                  label={t("showcase.email")}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  error={errorFor("sample-email")}
                  autoComplete="off"
                  required
                  placeholder="name@example.test"
                />
                <Select
                  id="sample-view"
                  label={t("showcase.select")}
                  value={view}
                  onChange={(event) => setView(event.target.value)}
                >
                  <option value="">{t("showcase.selectPlaceholder")}</option>
                  <option value="comfortable">
                    {t("showcase.comfortable")}
                  </option>
                  <option value="compact">{t("showcase.compact")}</option>
                </Select>
                <Textarea
                  id="sample-notes"
                  label={t("showcase.notes")}
                  hint={t("showcase.hint")}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <Checkbox
                  id="sample-check"
                  label={t("showcase.checkbox")}
                  checked={checked}
                  onChange={(event) => setChecked(event.target.checked)}
                />
                <div className={styles.actions}>
                  <Button type="submit">{t("save")}</Button>
                  <Button disabled variant="secondary">
                    {t("showcase.disabledButton")}
                  </Button>
                </div>
              </form>
            </section>
            <div className={styles.stack}>
              <section
                className={`${styles.panel} ${surfaces.gold} text-primary`}
                aria-labelledby="feedback-title"
              >
                <h2 id="feedback-title">{t("showcase.feedback")}</h2>
                <div className={styles.stack}>
                  <Alert>
                    <p>{t("showcase.info")}</p>
                  </Alert>
                  <Alert tone="success">
                    <p>{t("showcase.success")}</p>
                  </Alert>
                  <Alert tone="error">
                    <p>{t("showcase.error")}</p>
                  </Alert>
                  <div className={styles.actions}>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        notify({
                          message: { key: "showcase.success" },
                          tone: "success",
                        })
                      }
                    >
                      {t("showcase.notify")}
                    </Button>
                    <Button pending pendingLabel={t("showcase.pendingButton")}>
                      {t("save")}
                    </Button>
                  </div>
                </div>
              </section>
              <section
                className={`${styles.panel} ${surfaces.navy} text-white`}
                aria-labelledby="loading-title"
              >
                <h2 id="loading-title">{t("showcase.loadingTitle")}</h2>
                <div className={styles.stack} aria-busy="true">
                  <Loading />
                  <Skeleton height="5rem" />
                  <Skeleton />
                  <Skeleton width="70%" />
                </div>
              </section>
              <section
                className={`${styles.panel} ${surfaces.navy} text-white`}
                aria-labelledby="dialog-section-title"
              >
                <h2 id="dialog-section-title">{t("showcase.dialogSection")}</h2>
                <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                  {t("showcase.openDialog")}
                </Button>
              </section>
            </div>
          </div>
          <section
            className={`${styles.panel} mb-12 ${surfaces.gold} text-primary`}
            aria-labelledby="table-title"
          >
            <h2 id="table-title">{t("showcase.tableTitle")}</h2>
            <p className={styles.muted}>{t("showcase.tableDescription")}</p>
            <DataTable
              caption={t("showcase.tableCaption")}
              scrollLabel={t("showcase.tableRegion")}
              rows={samples.slice((page - 1) * 2, page * 2)}
              rowKey={(row) => row.id}
              columns={[
                {
                  id: "label",
                  header: t("showcase.columnName"),
                  render: (row) =>
                    `${t("showcase.rowName")} ${formatNumber(row.number, locale)}`,
                },
                {
                  id: "contact",
                  header: t("showcase.columnContact"),
                  render: () => (
                    <BidiText>long-example-identifier@example.test</BidiText>
                  ),
                },
                {
                  id: "date",
                  header: t("showcase.columnDate"),
                  render: () => formatDateOnly("2026-10-28", locale),
                },
                {
                  id: "number",
                  header: t("showcase.columnNumber"),
                  render: () => formatCurrency(125000.5, locale),
                },
              ]}
            />
            <Pagination page={page} totalPages={3} onPageChange={setPage} />
          </section>
          <div className={styles.grid}>
            <section
              className={`${styles.panel} ${surfaces.gold} text-primary`}
              aria-labelledby="states-title"
            >
              <h2 id="states-title">{t("showcase.emptySection")}</h2>
              <div className={styles.stack}>
                <EmptyState />
                <ErrorPanel
                  onRetry={() => notify({ message: { key: "showcase.info" } })}
                />
              </div>
            </section>
            <section
              className={`${styles.panel} ${surfaces.navy} text-white`}
              aria-labelledby="format-title"
            >
              <h2 id="format-title">{t("showcase.formatting")}</h2>
              <dl className={styles.formats}>
                <div>
                  <dt>{t("showcase.number")}</dt>
                  <dd>{formatNumber(1234567.89, locale)}</dd>
                </div>
                <div>
                  <dt>{t("showcase.currency")}</dt>
                  <dd>{formatCurrency(125000.5, locale)}</dd>
                </div>
                <div>
                  <dt>{t("showcase.date")}</dt>
                  <dd>{formatDateOnly("2026-10-28", locale)}</dd>
                </div>
                <div>
                  <dt>{t("showcase.dateTime")}</dt>
                  <dd>{formatDateTime("2026-10-28T12:30:00+02:00", locale)}</dd>
                </div>
              </dl>
              <h3 className="mt-7 mb-3 font-semibold text-accent-light">
                {t("showcase.backendText")}
              </h3>
              <p data-testid="unchanged-text">{unchangedText}</p>
            </section>
          </div>
        </div>
      </div>
      <div className={surfaces.navy}>
        <footer className={`${styles.footer} ${styles.shell}`}>
          <span className="text-xs tracking-wide rtl:tracking-normal">
            {t("design.footerLine")}
          </span>
          <Link to="/">{t("showcase.home")}</Link>
        </footer>
      </div>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        pending={pending}
        title={t("showcase.dialogTitle")}
        description={t("showcase.dialogDescription")}
      >
        <Input
          id="dialog-notes"
          label={t("showcase.notes")}
          disabled={pending}
        />
        {pending && <Alert>{t("showcase.pendingNotice")}</Alert>}
        <div className={styles.actions}>
          <Button onClick={() => setPending(!pending)}>
            {t(pending ? "showcase.pendingFinish" : "showcase.pendingStart")}
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => setDialogOpen(false)}
          >
            {t("cancel")}
          </Button>
        </div>
      </Dialog>
    </main>
  );
}
