import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminCatalogueProvider } from "../../Context/AdminCatalogueProvider";
import { useAdminCatalogue } from "../../Context/AdminCatalogueContext";
import { useAdminRecord } from "../../Hooks/useAdminRecord";
import { useAuth } from "../../Hooks/useAuth";
import type { Kind } from "../../AdminCatalogue/model";
import { deleteRecord, readAffectedList } from "../../AdminCatalogue/model";
import { accountPanel } from "../../Components/Account/AccountFeedback";
import { Button } from "../../Components/Button";
import { Loading, ErrorPanel } from "../../Components/Feedback";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { AdminActionFeedback, ConfirmAction } from "../../Components/AdminCatalogue/Shared";
import CatalogueForm from "./CatalogueForm";
import CatalogueList from "./CatalogueList";
import CatalogueAmenities from "./CatalogueAmenities";
import CatalogueImages from "./CatalogueImages";
import { ProjectFacts, UnitFacts } from "../../Components/Catalogue/PropertyFacts";
import { ApiError } from "../../Types/failures";

function CatalogueDetail({ kind, id, projectId }: { kind: Kind; id: string; projectId: string }) {
  const { t } = useTranslation("admin");
  const auth = useAuth();
  const action = useAdminCatalogue();
  const read = useAdminRecord(kind, id, projectId, auth.generation);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteAttempt, setDeleteAttempt] = useState(false);
  const listPath =
    kind === "unit"
      ? `/admin/catalogue/projects/${encodeURIComponent(projectId)}`
      : `/admin/catalogue/${kind === "city" ? "cities" : kind === "area" ? "areas" : "projects"}`;

  async function remove() {
    setDeleteAttempt(true);
    let writeSignal = new AbortController().signal;
    const result = await action.run(
      (signal) => {
        writeSignal = signal;
        return deleteRecord(kind, id, projectId, signal);
      },
      async () => {
        // A deleted record cannot be re-read. The destination list reloads on mount.
        await readAffectedList(kind, projectId, writeSignal);
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
        await readAffectedList(kind, projectId, new AbortController().signal);
        action.discardDrafts();
        setDeleted(true);
      } else {
        throw error;
      }
    }
  }

  if (deleted) {
    return (
      <section className={accountPanel}>
        <p role="status">{t("deleted")}</p>
        <Button onClick={() => navigate(listPath)}>{t("backToList")}</Button>
      </section>
    );
  }
  return (
    <div className="grid min-w-0 gap-7">
      <section className={accountPanel}>
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
            <p className="break-words text-xl font-semibold">{"name" in read.data ? read.data.name : read.data.number}</p>
            {"plannedUnitCount" in read.data && <ProjectFacts project={read.data} />}
            {"totalPrice" in read.data && <UnitFacts unit={read.data} full />}
            <CatalogueForm
              kind={kind}
              data={read.data}
              projectId={projectId}
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
      {read.data && "amenities" in read.data && kind !== "city" && (
        <section className={accountPanel}>
          <CatalogueAmenities
            kind={kind}
            id={id}
            initial={read.data.amenities}
            refresh={read.reload}
            readPending={read.pending || Boolean(read.failure)}
          />
        </section>
      )}
      {read.data && "images" in read.data && (kind === "project" || kind === "unit") && (
        <section className={accountPanel}>
          <CatalogueImages kind={kind} id={id} images={read.data.images} refresh={read.reload} readPending={read.pending || Boolean(read.failure)} />
        </section>
      )}
      {read.data && kind === "project" && <CatalogueList kind="unit" projectId={id} />}
      {confirm && (
        <ConfirmAction
          title={t("deleteRecord")}
          description={t(kind === "project" ? "deleteProjectHint" : "deleteHint")}
          onClose={() => setConfirm(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

function Content({ title }: { title: string }) {
  const params = useParams();
  const [search] = useSearchParams();
  const { t } = useTranslation("routing");
  const isList = ["cities", "areas", "projects"].includes(title);
  const kind: Kind =
    title === "city" || title === "cities" ? "city" : title === "area" || title === "areas" ? "area" : title === "unit" ? "unit" : "project";
  const id = kind === "city" ? params.cityId : kind === "area" ? params.areaId : kind === "unit" ? params.unitId : params.projectId;
  return (
    <div className="grid min-w-0 gap-7">
      <h1 className="break-words text-3xl font-semibold sm:text-5xl">{t(title)}</h1>
      <nav aria-label={t("catalogue")} className="flex flex-wrap gap-3">
        {["cities", "areas", "projects"].map((name) => (
          <Link key={name} className="rounded-ui border border-primary/25 bg-accent/40 px-5 py-3" to={`/admin/catalogue/${name}`}>
            {t(name)}
          </Link>
        ))}
      </nav>
      {title === "catalogue" ? (
        <p className={accountPanel}>{t("catalogue", { ns: "admin" })}</p>
      ) : isList ? (
        <CatalogueList kind={kind} />
      ) : title === "project" && search.get("createUnit") === "1" ? (
        <CatalogueList kind="unit" projectId={params.projectId ?? ""} />
      ) : (
        <CatalogueDetail kind={kind} id={id ?? ""} projectId={params.projectId ?? ""} />
      )}
    </div>
  );
}

export default function AdminCataloguePage({ title }: { title: string }) {
  const auth = useAuth();
  const location = useLocation();
  const mode = new URLSearchParams(location.search);
  const scope = `${auth.actor}:${auth.actor ? auth.profile.id : ""}:${auth.generation}:${location.pathname}:${mode.get("create") ?? ""}:${mode.get("createUnit") ?? ""}`;
  return (
    <AdminCatalogueProvider key={scope} scope={scope}>
      <Content title={title} />
    </AdminCatalogueProvider>
  );
}
