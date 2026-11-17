import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { BrandWordmark } from "../../../Components/BrandWordmark";
import { Button } from "../../../Components/Button";
import { Alert, Loading, Skeleton, ValidationSummary } from "../../../Components/Feedback";
import { Input } from "../../../Components/Fields";
import { LanguageSwitcher } from "../../../Components/LanguageSwitcher";
import { useAuth } from "../../../Hooks/useAuth";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import { SessionActionError } from "../../../Types/auth";
import type { LoginInput } from "../../../Types/contracts";
import { UserRole } from "../../../Types/contracts";
import { ApiError } from "../../../Types/failures";
import { apiFailureMessage } from "../../../i18n/apiFailures";
import type { TranslationMessage } from "../../../i18n/resources";
import type { AuthPageProps } from "../types";
import { validateLogin } from "./loginValidation";
const emptyAuthValues: LoginInput = { email: "", password: "" };
type AuthField = keyof LoginInput;
type AuthIssue = {
  field: AuthField;
  key: string;
};
export default function LoginPage({ onModeChange }: AuthPageProps) {
  const mode = "staff";
  const { t } = useTranslation("auth");
  const auth = useAuth();
  const location = useLocation();
  const [values, setValues] = useState({ ...emptyAuthValues });
  const [issues, setIssues] = useState<AuthIssue[]>([]);
  const [error, setError] = useState<TranslationMessage>();
  const mounted = useRef(false);
  const request = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  const identity = auth.actor ? auth.actor + ":" + auth.profile.id : "";
  const [observed, setObserved] = useState({ generation: auth.generation, identity });
  if (observed.generation !== auth.generation || observed.identity !== identity) {
    setObserved({ generation: auth.generation, identity });
    // Preserve failed-login edits, but clear credentials immediately on identity/bootstrap changes.
    if (identity || auth.status === "bootstrapping" || !auth.pending) {
      setValues({ ...emptyAuthValues });
      setIssues([]);
      setError(undefined);
    }
  }
  const fields: AuthField[] = ["email", "password"];
  const message = error ?? (auth.reason ? { namespace: "auth" as const, key: auth.reason } : undefined);
  function showFailure(failure: unknown) {
    if (!mounted.current) return;
    if (failure instanceof SessionActionError) {
      if (failure.code === "hydration") setValues({ ...emptyAuthValues });
      setError({ namespace: "auth", key: failure.code });
    } else if (failure instanceof ApiError) {
      if (failure.kind === "canceled") return;
      setError(apiFailureMessage(failure));
      const serverIssues = Object.keys(failure.fieldErrors).flatMap((key) => {
        const field = fields.find((name) => name.toLowerCase() === key.split(".").at(-1)?.toLowerCase());
        return field ? [{ field, key: "validation.server" }] : [];
      });
      if (serverIssues.length) setIssues(serverIssues);
    } else setError({ namespace: "errors", key: "generic" });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || auth.pending) return;
    const next = validateLogin(values);
    setIssues(next);
    setError(undefined);
    if (next.length) {
      document.getElementById("auth-" + next[0]!.field)?.focus();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    try {
      await auth.loginStaff({ email: values.email.trim(), password: values.password }, controller.signal);
      if (mounted.current) {
        setValues({ ...emptyAuthValues });
        setIssues([]);
      }
    } catch (failure: unknown) {
      showFailure(failure);
    } finally {
      if (request.current === controller) request.current = undefined;
    }
  }
  async function signOut() {
    setError(undefined);
    try {
      await auth.logout();
    } catch (failure: unknown) {
      if (failure instanceof SessionActionError) showFailure(failure);
      else if (mounted.current) setError({ namespace: "auth", key: "logoutUnconfirmed" });
    }
  }
  return (
    <main id="route-content" tabIndex={-1} className="relative isolate min-h-svh text-white">
      {/* <LuxuryBackdrop /> */}
      <div className="mx-auto max-w-[1440px] px-5 sm:px-10">
        <header className="flex items-center justify-between gap-5 border-b border-accent/25 py-6">
          <Link to={routePaths.home} className="no-underline focus-visible:outline-accent-light">
            <BrandWordmark />
          </Link>
          <LanguageSwitcher compact />
        </header>
        <div className="grid min-h-[calc(100svh-7rem)] place-items-center py-10 motion-safe:animate-fade-in sm:py-14">
          <section
            className={`relative w-full min-w-0 overflow-hidden rounded-ui border border-accent/60 bg-ivory p-7 text-primary shadow-[0_30px_100px_#071c2c66] sm:p-10 ${"max-w-[33rem]"}`}
            aria-labelledby="auth-title"
          >
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-accent via-accent-light to-accent" />
            <div
              aria-hidden="true"
              className="mb-7 grid size-12 place-items-center rounded-ui border border-primary/15 bg-accent-light/60 text-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
                <rect x="5" y="10" width="14" height="11" rx="3" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
              </svg>
            </div>
            {onModeChange && (
              <nav aria-label={t("session")} className="mb-8 flex flex-wrap gap-2 border-b border-accent/40 pb-6">
                {(["customer", "register", "staff"] as const).map((option) => (
                  <Button
                    key={option}
                    variant={option === mode ? "primary" : "secondary"}
                    disabled={auth.pending}
                    aria-pressed={mode === option}
                    onClick={() => onModeChange(option)}
                  >
                    {t(option + "Tab")}
                  </Button>
                ))}
              </nav>
            )}
            <p className="mb-3 text-xs font-medium tracking-widest text-muted rtl:tracking-normal">{t("eyebrow")}</p>
            <div id="auth-title">
              <RouteHeading>{t(mode + "Title")}</RouteHeading>
            </div>
            <p className="mt-3 mb-7 text-sm leading-7 text-muted">{t(mode + "Description")}</p>
            {message && (
              <div className="mb-6">
                <Alert tone="error">{t(message.key, { ns: message.namespace, ...message.values })}</Alert>
              </div>
            )}
            {auth.status === "bootstrapping" ? (
              <div className="grid gap-5" aria-busy="true">
                <Loading label={t("checking")} />
                <Skeleton height="3rem" />
                <Skeleton height="3rem" />
              </div>
            ) : auth.actor ? (
              <div className="grid gap-5" role="status">
                <p>{t("signedIn", { name: auth.status === "customer" ? auth.profile.fName + " " + auth.profile.lName : auth.profile.name })}</p>
                <p className="text-sm text-muted">
                  {t(auth.status === "staff" ? (auth.role === UserRole.SuperAdmin ? "role.superAdmin" : "role.admin") : "role.customer")}
                </p>
                <p className="text-sm leading-7">{t("logoutRequired")}</p>
                <Button pending={auth.pending} pendingLabel={t("working")} onClick={() => void signOut()}>
                  {t("logout")}
                </Button>
              </div>
            ) : auth.status === "unavailable" || auth.logoutRequired ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  pending={auth.pending}
                  pendingLabel={t("checking")}
                  onClick={() => {
                    setError(undefined);
                    void auth.retryBootstrap().catch(showFailure);
                  }}
                >
                  {t("retry")}
                </Button>
                {auth.logoutRequired && (
                  <Button variant="secondary" disabled={auth.pending} onClick={() => void signOut()}>
                    {t("logout")}
                  </Button>
                )}
              </div>
            ) : (
              <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-6">
                <ValidationSummary
                  items={issues.map((issue) => ({ fieldId: "auth-" + issue.field, message: t(issue.field) + ": " + t(issue.key) }))}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      id="auth-email"
                      name="email"
                      label={t("email")}
                      value={values.email}
                      required
                      pending={auth.pending}
                      type="email"
                      autoComplete="username"
                      error={issues.find((issue) => issue.field === "email") ? t(issues.find((issue) => issue.field === "email")!.key) : undefined}
                      onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      id="auth-password"
                      name="password"
                      label={t("password")}
                      value={values.password}
                      required
                      pending={auth.pending}
                      type="password"
                      autoComplete="current-password"
                      error={
                        issues.find((issue) => issue.field === "password") ? t(issues.find((issue) => issue.field === "password")!.key) : undefined
                      }
                      onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
                    />
                  </div>
                </div>
                <Button type="submit" pending={auth.pending} pendingLabel={t("working")}>
                  {t("signIn")}
                </Button>
              </form>
            )}
            {!onModeChange && (
              <nav
                aria-label={t("authAlternative", { ns: "routing" })}
                className="mt-8 flex flex-wrap gap-x-5 gap-y-4 border-t border-primary/15 pt-6 text-sm"
              >
                {
                  <Link
                    className="font-medium text-primary/80 underline decoration-accent/50 underline-offset-4 transition-all hover:text-primary hover:decoration-accent hover:underline-offset-6"
                    to={routePaths.login + location.search}
                  >
                    {t("customerTab")}
                  </Link>
                }
                {
                  <Link
                    className="font-medium text-primary/80 underline decoration-accent/50 underline-offset-4 transition-all hover:text-primary hover:decoration-accent hover:underline-offset-6"
                    to={routePaths.register + location.search}
                  >
                    {t("registerTab")}
                  </Link>
                }
              </nav>
            )}
            <Link
              to={routePaths.home}
              className="mt-7 inline-block text-sm text-muted underline decoration-muted/40 underline-offset-4 transition-all hover:text-primary hover:decoration-primary"
            >
              {t("home")}
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
