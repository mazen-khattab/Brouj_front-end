import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CityEditorProvider } from "./EditorProvider";
import { useCityEditor } from "./EditorContext";
import { useCityRecord } from "./useRecord";
import { useAuth } from "../../Hooks/useAuth";
import { deleteCity, getCities } from "../../Services/Cities";
import { routePaths } from "../../Router/browserPaths";
import { Button } from "../../Components/Button";
import { Loading, ErrorPanel } from "../../Components/Feedback";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { AdminActionFeedback, ConfirmAction } from "./Feedback";
import CityForm from "./CityForm";
import CityList from "./List";
import { ApiError } from "../../Types/failures";

const panel = "grid min-w-0 gap-6 rounded-ui border border-accent/50 bg-surface p-5 shadow-panel sm:p-7";


function CityDetail({ id }: { id: string }) {
  const { t } = useTranslation("admin");
  const auth = useAuth();
  const action = useCityEditor();
  const read = useCityRecord(id, auth.generation);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteAttempt, setDeleteAttempt] = useState(false);
  const listPath = routePaths.admin.cities;

  async function remove() {
    setDeleteAttempt(true);
    let writeSignal = new AbortController().signal;
    const result = await action.run(
      (signal) => {
        writeSignal = signal;
        return deleteCity({ id }, { signal });
      },
      async () => {
        // A deleted record cannot be re-read. The destination list reloads on mount.
        await getCities({ query: { pageNumber: 1, pageSize: 20 } }, { signal: writeSignal });
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
        await getCities({ query: { pageNumber: 1, pageSize: 20 } }, { signal: new AbortController().signal });
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
            <CityForm
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
  const { cityId } = useParams();
  const { t } = useTranslation("routing");
  return (
    <div className="grid min-w-0 gap-7">
      <h1 className="break-words text-3xl font-semibold sm:text-5xl">{t(cityId ? "city" : "cities")}</h1>
      {cityId && <Link className="underline" to={"/admin/cities"}>{t("backToList", { ns: "admin" })}</Link>}
      {cityId ? <CityDetail key={cityId} id={cityId} /> : <CityList />}
    </div>
  );
}

export default function CityPage() {
  const auth = useAuth();
  const location = useLocation();
  const mode = new URLSearchParams(location.search);
  const scope = `${auth.actor}:${auth.actor ? auth.profile.id : ""}:${auth.generation}:${location.pathname}:${mode.get("create") ?? ""}`;
  return (
    <CityEditorProvider key={scope} scope={scope}>
      <Content />
    </CityEditorProvider>
  );
}
