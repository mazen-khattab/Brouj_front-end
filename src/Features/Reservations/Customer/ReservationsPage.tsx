import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { PrivateReadPanel } from "../../../Components/PrivateReadPanel";
import { BidiText } from "../../../Components/BidiText";
import { Button } from "../../../Components/Button";
import { Facts } from "../../../Components/Facts";
import { Dialog } from "../../../Components/Dialog";
import { useAuth } from "../../../Hooks/useAuth";
import { useLocale } from "../../../Hooks/useLocale";
import { routePaths } from "../../../Router/routePaths";
import type { ReservationDto } from "../../../Types/contracts";
import { formatDateTime } from "../../../i18n/format";
import { AccountFilters, AccountResults } from "../../Account/AccountList";
import { useCancellation } from "./CancellationContext";
import { CancellationProvider } from "./CancellationProvider";
import type { ReservationsData } from "./DataContext";
import { ReservationsDataProvider } from "./DataProvider";
import { canCancel } from "./policy";
import { useReservationsData } from "./useData";

import { CancellationFeedback } from "./CancellationFeedback";

import { Status } from "../Status";

function RecordFacts({ record, detail = false }: { record: ReservationDto; detail?: boolean }) {
  const { t } = useTranslation("account");
  const { locale } = useLocale();
  const items = [
    ...(detail ? [
      { label: t("number"), value: <BidiText>{record.number}</BidiText> },
      { label: t("status"), value: <Status value={record.status} className="account-status" /> },
    ] : []),
    { label: t("unit"), value: <BidiText>{record.unitNumber}</BidiText> },
    { label: t("project"), value: <bdi dir="auto">{record.projectName}</bdi> },
    {
      label: t("reservationDate"),
      value: <>{formatDateTime(record.reservationDate, locale)}</>,
    },
    {
      label: t("cancelledAt"),
      value: <>{record.cancelledAt ? formatDateTime(record.cancelledAt, locale) : t("notCancelled")}</>,
    },
  ];
  return <Facts items={items} />;
}
function Records({ data }: { data: Extract<ReservationsData, { kind: "reservations" }> }) {
  const { t } = useTranslation("account");
  const { update } = useReservationsData();
  return (
    <AccountResults page={data.value} onPageChange={(page) => update({ page })}>
      {data.value.items.map((record) => (
        <article key={record.id} className="account-panel account-record">
          <div className="account-record-heading">
            <h2><BidiText>{record.number}</BidiText></h2>
            <Status value={record.status} className="account-status" />
          </div>
          <RecordFacts record={record} />
          <Link className="account-record-link" to={routePaths.reservation(record.id)}>{t("view")}</Link>
        </article>
      ))}
    </AccountResults>
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
    <article className="account-panel account-detail">
      <RecordFacts record={reservation} detail />
      {reservation.orderId ? (
        <Link className="account-record-link" to={routePaths.order(reservation.orderId)}>
          {t("order")}
        </Link>
      ) : (
        <p className="text-muted">{t("noOrder")}</p>
      )}
      {canCancel(reservation) && (
        <Button className="account-primary" disabled={!!action.uncertain} pending={action.pending} pendingLabel={t("working")} onClick={() => setOpen(true)}>
          {t("cancelReservation")}
        </Button>
      )}
      <Button className="account-ghost" variant="secondary" disabled={action.pending} onClick={context.reload}>
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

function Content({ kind }: { kind: ReservationsData["kind"] }) {
  const filters = useReservationsData();
  const { result, reload } = filters;

  return (
    <div className="account-list">
      {kind === "reservations" && <AccountFilters statusKey="reservationStatus" statuses={[0, 1, 2]} filters={filters} />}
      <PrivateReadPanel result={result} reload={reload}>
        {(data) => (data.kind === "reservations" ? <Records data={data} /> : <ReservationDetails reservation={data.value} />)}
      </PrivateReadPanel>
    </div>
  );
}

export default function ReservationsPage() {
  const { reservationId } = useParams();
  const kind = reservationId === undefined ? "reservations" : "reservation";
  const auth = useAuth();
  const id = reservationId;
  const scope = auth.actor ? `${auth.profile.id}:${auth.generation}` : "anonymous";
  return (
    <div className="account-list-page">
      <CancellationProvider key={`${scope}:${kind}:${id ?? ""}`}>
        <ReservationsDataProvider kind={kind} id={id}>
          <CancellationFeedback />
          <Content kind={kind} />
        </ReservationsDataProvider>
      </CancellationProvider>
    </div>
  );
}
