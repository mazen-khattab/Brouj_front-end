import { useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandWordmark } from "../Components/BrandWordmark";
import { Button } from "../Components/Button";
import { routePaths } from "./routePaths";
import "../Styles/loading.css";

export function RouteHeading({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  
  useLayoutEffect(() => {
    document.title = `${String(children)} · ${t("brand")}`;
  }, [children, t]);

  return (
    <h1 key={pathname} data-route-focus tabIndex={-1} className="text-3xl font-medium leading-relaxed focus:outline-none sm:text-4xl">
      {children}
    </h1>
  );
}

export function PageLoading({ full = false }: { full?: boolean }) {
  const { t } = useTranslation("routing");
  return (
    <div className={`page-loading ${full ? "page-loading--full" : "page-loading--inline"}`} role="status" aria-live="polite">
      {full && <div className="page-loading-brand"><BrandWordmark /></div>}
      <div className="page-loading-content">
        <div className="page-loading-emblem" aria-hidden="true">
          <svg viewBox="0 0 120 140" fill="none"><path d="M15 125V60a45 45 0 0 1 90 0v65M23 125V60a37 37 0 0 1 74 0v65M60 7v15M9 60h14m74 0h14" /></svg>
          <span className="page-loading-pillars"><i /><i /><i /></span>
        </div>
        <p>{t(full ? "opening" : "loadingPage")}</p>
        <span className="page-loading-rule" aria-hidden="true"><span /></span>
      </div>
    </div>
  );
}

export function RouteMessage({ kind = "notFound", action }: { kind?: "notFound" | "forbidden" | "routeError"; action?: ReactNode }) {
  const { t } = useTranslation("routing");
  return (
    <section
      className="mx-auto grid max-w-3xl gap-6 rounded-ui border border-accent/40 bg-ivory p-7 text-primary shadow-panel sm:p-12"
      aria-labelledby="route-message-title"
    >
      <span aria-hidden="true" className="text-sm tracking-widest text-muted">
        {kind === "notFound" ? "404" : kind === "forbidden" ? "403" : "BROUJ"}
      </span>
      <div id="route-message-title">
        <RouteHeading>{t(kind)}</RouteHeading>
      </div>
      <p className="max-w-prose leading-8 text-muted">{t(kind + "Description")}</p>
      <div className="flex flex-wrap items-center gap-5">
        {action}
        <Link className="underline" to={routePaths.home}>
          {t("home")}
        </Link>
      </div>
    </section>
  );
}

export function RouteErrorView() {
  const error = useRouteError();
  const { t } = useTranslation("routing");
  // Never echo chunk URLs, exception messages, or private loader data to the page.
  return (
    <RouteMessage
      kind={isRouteErrorResponse(error) && error.status === 404 ? "notFound" : "routeError"}
      action={<Button onClick={() => window.location.reload()}>{t("reload")}</Button>}
    />
  );
}
