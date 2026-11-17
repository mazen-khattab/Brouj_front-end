import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UnitEditorProvider } from "./EditorProvider";
import { useUnitEditor } from "./EditorContext";
import { useUnitRecord } from "./useRecord";
import { useAuth } from "../../../Hooks/useAuth";
import { deleteUnit, getUnitsByProject } from "../../../Services/Units";
import { routePaths } from "../../../Router/browserPaths";
import { Button } from "../../../Components/Button";
import { Loading, ErrorPanel } from "../../../Components/Feedback";
import { apiFailureMessage } from "../../../i18n/apiFailures";
import { AdminActionFeedback, ConfirmAction } from "./Feedback";
import UnitForm from "./UnitForm";
import UnitList from "./List";
import { ApiError } from "../../../Types/failures";
import UnitAmenities from "./Amenities";
import UnitImages from "./Images";
import { UnitFacts } from "./Facts";

const panel = "grid min-w-0 gap-6 rounded-ui border border-accent/50 bg-surface p-5 shadow-panel sm:p-7";

function UnitDetail({ id, projectId }: { id: string; projectId: string }) {
  const { t } = useTranslation("admin");
  const auth = useAuth();
  const action = useUnitEditor();
  const read = useUnitRecord(id, projectId, auth.generation);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteAttempt, setDeleteAttempt] = useState(false);
  const listPath = routePaths.admin.units + `?projectId=${encodeURIComponent(projectId)}`;

  async function remove() {
    setDeleteAttempt(true);
    let writeSignal = new AbortController().signal;
    const result = await action.run(
      (signal) => {
        writeSignal = signal;
        return deleteUnit({ id, query: { projectId } }, { signal });
      },
      async () => {
        // A deleted record cannot be re-read. The destination list reloads on mount.
        await getUnitsByProject({ projectId, query: { pageNumber: 1, pageSize: 20 } }, { signal: writeSignal });
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
        await getUnitsByProject({ projectId, query: { pageNumber: 1, pageSize: 20 } }, { signal: new AbortController().signal });
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
            <p className="break-words text-xl font-semibold">{read.data.number}</p>
            <UnitFacts unit={read.data} full />
            <UnitForm data={read.data} projectId={projectId} refresh={read.reload} readPending={read.pending || Boolean(read.failure)} />
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
          <UnitAmenities id={id} initial={read.data.amenities} refresh={read.reload} readPending={read.pending || Boolean(read.failure)} />
        </section>
      )}
      {read.data && (
        <section className={panel}>
          <UnitImages id={id} images={read.data.images} refresh={read.reload} readPending={read.pending || Boolean(read.failure)} />
        </section>
      )}
      {confirm && <ConfirmAction title={t("deleteRecord")} description={t("deleteHint")} onClose={() => setConfirm(false)} onConfirm={remove} />}
    </div>
  );
}

function Content() {
  const { unitId } = useParams();
  const [search] = useSearchParams();
  const { t } = useTranslation("routing");
  return (
    <div className="grid min-w-0 gap-7">
      <h1 className="break-words text-3xl font-semibold sm:text-5xl">{t(unitId ? "unit" : "units")}</h1>
      {unitId && (
        <Link className="underline" to={`${routePaths.admin.units}?projectId=${encodeURIComponent(search.get("projectId") ?? "")}`}>
          {t("backToList", { ns: "admin" })}
        </Link>
      )}
      {unitId ? <UnitDetail key={unitId} id={unitId} projectId={search.get("projectId") ?? ""} /> : <UnitList />}
    </div>
  );
}

export default function UnitPage() {
  const auth = useAuth();
  const location = useLocation();
  const mode = new URLSearchParams(location.search);
  const scope = `${auth.actor}:${auth.actor ? auth.profile.id : ""}:${auth.generation}:${location.pathname}:${mode.get("create") ?? ""}:${mode.get("projectId") ?? ""}`;
  return (
    <UnitEditorProvider key={scope} scope={scope}>
      <Content />
    </UnitEditorProvider>
  );
}
