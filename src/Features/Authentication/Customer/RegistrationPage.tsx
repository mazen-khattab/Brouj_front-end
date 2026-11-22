import { AuthFrame } from "../AuthFrame";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { Alert, Loading, Skeleton, ValidationSummary } from "../../../Components/Feedback";
import { Input } from "../../../Components/Fields";
import { useAuth } from "../../../Hooks/useAuth";
import { SessionActionError } from "../../../Types/auth";
import type { RegisterCustomerInput } from "../../../Types/contracts";
import { UserRole } from "../../../Types/contracts";
import { ApiError } from "../../../Types/failures";
import { apiFailureMessage } from "../../../i18n/apiFailures";
import type { TranslationMessage } from "../../../i18n/resources";
import type { AuthPageProps } from "../types";
import { validateRegistration } from "./registrationValidation";
const emptyAuthValues: RegisterCustomerInput = { email: "", password: "", fName: "", lName: "", phone: "", identityNumber: "" };
type AuthField = keyof RegisterCustomerInput;
type AuthIssue = {
  field: AuthField;
  key: string;
};
export default function RegistrationPage({ onModeChange }: AuthPageProps) {
  const mode = "register";
  const { t } = useTranslation("auth");
  const auth = useAuth();
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
  const fields: AuthField[] = ["fName", "lName", "email", "phone", "identityNumber", "password"];
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
    const next = validateRegistration(values);
    setIssues(next);
    setError(undefined);
    if (next.length) {
      document.getElementById("auth-" + next[0]!.field)?.focus();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    try {
      await auth.registerCustomer({ ...values, email: values.email.trim() }, controller.signal);
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
    <AuthFrame mode={mode} pending={auth.pending} onModeChange={onModeChange}>
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
            {fields.map((field) => (
              <div key={field} className={field === "email" || field === "password" ? "sm:col-span-2" : ""}>
                <Input
                  id={"auth-" + field}
                  name={field}
                  label={t(field)}
                  value={values[field]}
                  required
                  pending={auth.pending}
                  type={field === "email" ? "email" : field === "password" ? "password" : field === "phone" ? "tel" : "text"}
                  autoComplete={
                    field === "email"
                      ? "username"
                      : field === "password"
                        ? "new-password"
                        : field === "fName"
                          ? "given-name"
                          : field === "lName"
                            ? "family-name"
                            : field === "phone"
                              ? "tel-national"
                              : "off"
                  }
                  {...(field === "identityNumber" ? { inputMode: "numeric" as const, dir: "ltr" } : {})}
                  {...(field === "password" && true ? { hint: t("passwordHint") } : {})}
                  error={issues.find((issue) => issue.field === field) ? t(issues.find((issue) => issue.field === field)!.key) : undefined}
                  onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <Button type="submit" pending={auth.pending} pendingLabel={t("working")}>
            {t("register")}
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
