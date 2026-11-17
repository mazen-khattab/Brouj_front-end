import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProjectEditorProvider } from "./EditorProvider";
import { useProjectEditor } from "./EditorContext";
import { useProjectRecord } from "./useRecord";
import { useAuth } from "../../Hooks/useAuth";
import { deleteProject, getProjects } from "../../Services/Projects";
import { routePaths } from "../../Router/browserPaths";
import { Button } from "../../Components/Button";
import { Loading, ErrorPanel } from "../../Components/Feedback";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { AdminActionFeedback, ConfirmAction } from "./Feedback";
import ProjectForm from "./ProjectForm";
import ProjectList from "./List";
import { ApiError } from "../../Types/failures";
import ProjectAmenities from "./Amenities";
import ProjectImages from "./Images";
import { ProjectFacts } from "./Facts";

const panel = "grid min-w-0 gap-6 rounded-ui border border-accent/50 bg-surface p-5 shadow-panel sm:p-7";


function ProjectDetail({ id }: { id: string }) {
  const { t } = useTranslation("admin");
  const auth = useAuth();
  const action = useProjectEditor();
  const read = useProjectRecord(id, auth.generation);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteAttempt, setDeleteAttempt] = useState(false);
  const listPath = routePaths.admin.projects;

  async function remove() {
    setDeleteAttempt(true);
    let writeSignal = new AbortController().signal;
    const result = await action.run(
      (signal) => {
        writeSignal = signal;
        return deleteProject({ id }, { signal });
      },
      async () => {
        // A deleted record cannot be re-read. The destination list reloads on mount.
        await getProjects({ query: { pageNumber: 1, pageSize: 20 } }, { signal: writeSignal });
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
        await getProjects({ query: { pageNumber: 1, pageSize: 20 } }, { signal: new AbortController().signal });
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
            <ProjectFacts project={read.data} />
            <ProjectForm
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
          <ProjectAmenities
            id={id}
            initial={read.data.amenities}
            refresh={read.reload}
            readPending={read.pending || Boolean(read.failure)}
          />
        </section>
      )}
      {read.data && (
        <section className={panel}>
          <ProjectImages id={id} images={read.data.images} refresh={read.reload} readPending={read.pending || Boolean(read.failure)} />
        </section>
      )}
      <Link className="underline" to={`${routePaths.admin.units}?projectId=${encodeURIComponent(id)}`}>{t("units")}</Link>
      <Link className="underline" to={`${routePaths.admin.units}?create=1&projectId=${encodeURIComponent(id)}`}>{t("createUnit")}</Link>
      {confirm && (
        <ConfirmAction
          title={t("deleteRecord")}
          description={t("deleteProjectHint")}
          onClose={() => setConfirm(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

function Content() {
  const { projectId } = useParams();
  const { t } = useTranslation("routing");
  return (
    <div className="grid min-w-0 gap-7">
      <h1 className="break-words text-3xl font-semibold sm:text-5xl">{t(projectId ? "project" : "projects")}</h1>
      {projectId && <Link className="underline" to={"/admin/projects"}>{t("backToList", { ns: "admin" })}</Link>}
      {projectId ? <ProjectDetail key={projectId} id={projectId} /> : <ProjectList />}
    </div>
  );
}

export default function ProjectPage() {
  const auth = useAuth();
  const location = useLocation();
  const mode = new URLSearchParams(location.search);
  const scope = `${auth.actor}:${auth.actor ? auth.profile.id : ""}:${auth.generation}:${location.pathname}:${mode.get("create") ?? ""}`;
  return (
    <ProjectEditorProvider key={scope} scope={scope}>
      <Content />
    </ProjectEditorProvider>
  );
}
