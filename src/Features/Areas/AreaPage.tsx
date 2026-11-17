import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AreaEditorProvider } from "./EditorProvider";
import { useAreaEditor } from "./EditorContext";
import { useAreaRecord } from "./useRecord";
import { useAuth } from "../../Hooks/useAuth";
import { deleteArea, getAreas } from "../../Services/Areas";
import { routePaths } from "../../Router/browserPaths";
import { Button } from "../../Components/Button";
import { Loading, ErrorPanel } from "../../Components/Feedback";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { AdminActionFeedback, ConfirmAction } from "./Feedback";
import AreaForm from "./AreaForm";
import AreaList from "./List";
import { ApiError } from "../../Types/failures";
import AreaAmenities from "./Amenities";

const panel = "grid min-w-0 gap-6 rounded-ui border border-accent/50 bg-surface p-5 shadow-panel sm:p-7";


function AreaDetail({ id }: { id: string }) {
  const { t } = useTranslation("admin");
  const auth = useAuth();
  const action = useAreaEditor();
  const read = useAreaRecord(id, auth.generation);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteAttempt, setDeleteAttempt] = useState(false);
  const listPath = routePaths.admin.areas;

  async function remove() {
    setDeleteAttempt(true);
    let writeSignal = new AbortController().signal;
    const result = await action.run(
      (signal) => {
        writeSignal = signal;
        return deleteArea({ id }, { signal });
      },
      async () => {
        // A deleted record cannot be re-read. The destination list reloads on mount.
        await getAreas({ query: { pageNumber: 1, pageSize: 20 } }, { signal: writeSignal });
      },
      read.reload,
    );
    setConfirm(false);
    if (result) {
      action.discardDrafts();
      setDeleted(true);
    }
  }

  async function checkCurrent() {
    try {
      await read.reload();
    } catch (error) {
      if (deleteAttempt && error instanceof ApiError && error.status === 404) {
        await getAreas({ query: { pageNumber: 1, pageSize: 20 } }, { signal: new AbortController().signal });
        action.discardDrafts();
        setDeleted(true);
      } else {
        throw error;
      }
    }
  }

  if (deleted) {
    return (
      <section className={panel}>
        <p role="status">{t("deleted")}</p>
        <Button onClick={() => navigate(listPath)}>{t("backToList")}</Button>
      </section>
    );
  }
  return (
    <div className="grid min-w-0 gap-7">
      <section className={panel}>
        <AdminActionFeedback refresh={checkCurrent} />
        {read.pending && <Loading label={t("loading")} />}
        {read.failure && (
          <ErrorPanel
            title={t("loadFailed")}
            description={t(apiFailureMessage(read.failure).key, { ns: "errors" })}
            onRetry={() => void read.reload().catch(() => {})}
          />
        )}
        {read.data && (
          <>
            <p className="break-words text-xl font-semibold">{read.data.name}</p>
            <AreaForm
              data={read.data}
              refresh={read.reload}
              readPending={read.pending || Boolean(read.failure)}
            />
            <Button
              variant="secondary"
              disabled={action.pending || action.blocked || read.pending || Boolean(read.failure)}
              onClick={() => setConfirm(true)}
            >
              {t("deleteRecord")}
            </Button>
          </>
        )}
      </section>
      {read.data && (
        <section className={panel}>
          <AreaAmenities
            id={id}
            initial={read.data.amenities}
            refresh={read.reload}
            readPending={read.pending || Boolean(read.failure)}
          />
        </section>
      )}
      {confirm && (
        <ConfirmAction
          title={t("deleteRecord")}
          description={t("deleteHint")}
          onClose={() => setConfirm(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

function Content() {
  const { areaId } = useParams();
  const { t } = useTranslation("routing");
  return (
    <div className="grid min-w-0 gap-7">
      <h1 className="break-words text-3xl font-semibold sm:text-5xl">{t(areaId ? "area" : "areas")}</h1>
      {areaId && <Link className="underline" to={"/admin/areas"}>{t("backToList", { ns: "admin" })}</Link>}
      {areaId ? <AreaDetail key={areaId} id={areaId} /> : <AreaList />}
    </div>
  );
}

export default function AreaPage() {
  const auth = useAuth();
  const location = useLocation();
  const mode = new URLSearchParams(location.search);
  const scope = `${auth.actor}:${auth.actor ? auth.profile.id : ""}:${auth.generation}:${location.pathname}:${mode.get("create") ?? ""}`;
  return (
    <AreaEditorProvider key={scope} scope={scope}>
      <Content />
    </AreaEditorProvider>
  );
}
