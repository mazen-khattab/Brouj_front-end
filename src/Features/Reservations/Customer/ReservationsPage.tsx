import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { PrivateReadPanel, accountPanel } from "../../../Components/PrivateReadPanel";
import { BidiText } from "../../../Components/BidiText";
import { Button } from "../../../Components/Button";
import { Facts } from "../../../Components/Facts";
import { Dialog } from "../../../Components/Dialog";
import { EmptyState } from "../../../Components/Feedback";
import { Select } from "../../../Components/Fields";
import { Pagination } from "../../../Components/Pagination";
import { useAuth } from "../../../Hooks/useAuth";
import { useLocale } from "../../../Hooks/useLocale";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import type { ReservationDto } from "../../../Types/contracts";
import { formatDateTime, formatNumber } from "../../../i18n/format";
import { useCancellation } from "./CancellationContext";
import { CancellationProvider } from "./CancellationProvider";
import type { ReservationsData } from "./DataContext";
import { ReservationsDataProvider } from "./DataProvider";
import { canCancel } from "./policy";
import { useReservationsData } from "./useData";

import { CancellationFeedback } from "./CancellationFeedback";

import { Status } from "../Status";

function RecordFacts({ record }: { record: ReservationDto }) {
  const { t } = useTranslation("account");
  const { locale } = useLocale();
  const items = [
    { label: t("number"), value: <BidiText>{record.number}</BidiText> },
    { label: t("unit"), value: <BidiText>{record.unitNumber}</BidiText> },
    { label: t("project"), value: <bdi dir="auto">{record.projectName}</bdi> },
    {
      label: t("status"),
      value: <Status value={record.status} />,
    },
  ];
  items.push(
    {
      label: t("reservationDate"),
      value: <>{formatDateTime(record.reservationDate, locale)}</>,
    },
    {
      label: t("cancelledAt"),
      value: <>{record.cancelledAt ? formatDateTime(record.cancelledAt, locale) : t("notCancelled")}</>,
    },
  );
  return <Facts items={items} />;
}
function Records({ data }: { data: Extract<ReservationsData, { kind: "reservations" }> }) {
  const { t } = useTranslation("account");
  const { locale } = useLocale();
  const context = useReservationsData();
  return (
    <div className="grid gap-6">
      <section
        className="flex flex-wrap items-end gap-5 rounded-ui border border-accent/40 bg-accent-light p-6 text-primary"
        aria-label={t("status")}
      >
        <Select
          id="account-status"
          label={t("status")}
          value={context.status ?? ""}
          onChange={(event) =>
            context.update({
              status: event.target.value === "" ? null : Number(event.target.value),
            })
          }
        >
          <option value="">{t("all")}</option>
          {[0, 1, 2].map((status) => (
            <option key={status} value={status}>
              {t(`${"reservationStatus"}.${status}`)}
            </option>
          ))}
        </Select>
        <Select
          id="account-page-size"
          label={t("pageSize")}
          value={context.pageSize}
          onChange={(event) => context.update({ pageSize: Number(event.target.value) })}
        >
          {[...new Set([12, 24, 48, context.pageSize])]
            .sort((a, b) => a - b)
            .map((size) => (
              <option key={size} value={size}>
                {formatNumber(size, locale)}
              </option>
            ))}
        </Select>
        <Button variant="secondary" onClick={context.reload}>
          {t("refresh")}
        </Button>
      </section>
      <p className="text-accent-light">{t("results", { value: formatNumber(data.value.totalCount, locale) })}</p>
      {!data.value.items.length ? (
        <div className={accountPanel}>
          <EmptyState title={t("empty")} description={t("emptyDescription")} />
          <Link className="underline" to={routePaths.projects}>
            {t("browse")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.value.items.map((record) => (
            <article key={record.id} className={accountPanel}>
              <h2 className="text-xl font-medium">
                <BidiText>{record.number}</BidiText>
              </h2>
              <RecordFacts record={record} />
              <Link className="justify-self-start underline" to={routePaths.reservation(record.id)}>
                {t("view")}
              </Link>
            </article>
          ))}
        </div>
      )}
      <Pagination page={data.value.pageNumber} totalPages={data.value.totalPages} onPageChange={(page) => context.update({ page })} />
    </div>
  );
}

function ReservationDetails({ reservation }: { reservation: ReservationDto }) {
  const { t } = useTranslation("account");
  const context = useReservationsData();
  const action = useCancellation();
  const [open, setOpen] = useState(false);
  async function cancel() {
    const result = await action.cancel(reservation.id);
    if (!action.isCurrent()) return;
    if (result.ok || result.failure.status === 409) {
      setOpen(false);
      context.reload();
    } else if (result.failure.status === 404) {
      setOpen(false);
      context.reload();
    }
  }
  return (
    <article className={accountPanel}>
      <RecordFacts record={reservation} />
      {reservation.orderId ? (
        <Link className="underline" to={routePaths.order(reservation.orderId)}>
          {t("order")}
        </Link>
      ) : (
        <p className="text-muted">{t("noOrder")}</p>
      )}
      {canCancel(reservation) && (
        <Button disabled={!!action.uncertain} pending={action.pending} pendingLabel={t("working")} onClick={() => setOpen(true)}>
          {t("cancelReservation")}
        </Button>
      )}
      <Button variant="secondary" disabled={action.pending} onClick={context.reload}>
        {t("refresh")}
      </Button>
      <Dialog open={open} pending={action.pending} title={t("cancelTitle")} description={t("cancelDescription")} onClose={() => setOpen(false)}>
        <div className="grid gap-5">
          <CancellationFeedback />
          <Button pending={action.pending} disabled={!!action.uncertain} pendingLabel={t("working")} onClick={() => void cancel()}>
            {t("confirmCancel")}
          </Button>
          <Button variant="secondary" disabled={action.pending} onClick={() => setOpen(false)}>
            {t("keepReservation")}
          </Button>
        </div>
      </Dialog>
    </article>
  );
}

function Content() {
  const { result, reload } = useReservationsData();

  return (
    <PrivateReadPanel result={result} reload={reload}>
      {(data) => (data.kind === "reservations" ? <Records data={data} /> : <ReservationDetails reservation={data.value} />)}
    </PrivateReadPanel>
  );
}

export default function ReservationsPage() {
  const { reservationId } = useParams();
  const kind = reservationId === undefined ? "reservations" : "reservation";
  const { t } = useTranslation("routing");
  const account = useTranslation("account");
  const auth = useAuth();
  const id = reservationId;
  const scope = auth.actor ? `${auth.profile.id}:${auth.generation}` : "anonymous";
  return (
    <div className="grid gap-7">
      <header className="grid gap-3">
        <RouteHeading>{t(kind)}</RouteHeading>
        <p className="text-white/80">{account.t("intro")}</p>
      </header>
      <CancellationProvider key={`${scope}:${kind}:${id ?? ""}`}>
        <ReservationsDataProvider kind={kind} id={id}>
          <CancellationFeedback />
          <Content />
        </ReservationsDataProvider>
      </CancellationProvider>
    </div>
  );
}
