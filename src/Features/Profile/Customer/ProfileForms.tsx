import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { Alert, ValidationSummary } from "../../../Components/Feedback";
import { Input } from "../../../Components/Fields";
import type { FieldIssue } from "../../../Forms/serverIssues";
import { serverIssues } from "../../../Forms/serverIssues";
import { useAuth } from "../../../Hooks/useAuth";
import type { CurrentCustomerDto, CustomerProfileInput } from "../../../Types/contracts";
import { useProfileData } from "./DataContext";
import { useProfileActions } from "./ActionContext";
import { validatePassword, validateProfile } from "./validation";

const profileFields = ["fName", "lName", "email", "phone", "identityNumber"] as const;
export default function ProfileForms({ profile }: { profile: CurrentCustomerDto }) {
  const { t } = useTranslation("account");
  const auth = useAuth();
  const action = useProfileActions();
  const data = useProfileData();
  const [values, setValues] = useState<CustomerProfileInput>({
    fName: profile.fName,
    lName: profile.lName,
    email: profile.email,
    phone: profile.phone,
    identityNumber: profile.identityNumber,
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [passwordIssues, setPasswordIssues] = useState<FieldIssue[]>([]);
  const [reloadFailed, setReloadFailed] = useState(false);
  const blocked = action.pending || !!action.uncertain || auth.pending || reloadFailed;
  async function checkProfile() {
    try {
      await auth.reloadIdentity();
      if (action.isCurrent()) {
        action.resetAfterRead();
        setReloadFailed(false);
        data.reload();
      }
    } catch {
      if (action.isCurrent()) setReloadFailed(true);
    }
  }
  async function refreshIdentity() {
    try {
      await auth.reloadIdentity();
      return action.isCurrent();
    } catch {
      if (action.isCurrent()) setReloadFailed(true);
      return false;
    }
  }
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (blocked) return;
    const next = validateProfile(values);
    setIssues(next);
    if (next.length) {
      document.getElementById("profile-" + next[0]!.field)?.focus();
      return;
    }
    const result = await action.updateProfile(values);
    if (!action.isCurrent()) return;
    if (result.ok) {
      if (await refreshIdentity()) data.reload();
    } else {
      setIssues(serverIssues(result.failure, profileFields));
      if (result.failure.status === 409 || (result.failure.status === 401 && result.failure.featureCode !== 1)) await refreshIdentity();
    }
  }
  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (blocked) return;
    const next = validatePassword(passwords);
    setPasswordIssues(next);
    if (next.length) {
      document.getElementById("password-" + next[0]!.field)?.focus();
      return;
    }
    const result = await action.changePassword(passwords);
    if (!action.isCurrent()) return;
    if (result.ok) {
      setPasswords({ currentPassword: "", newPassword: "" });
      await refreshIdentity();
    } else {
      setPasswordIssues(serverIssues(result.failure, ["currentPassword", "newPassword"]));
      if (result.failure.status === 409 || (result.failure.status === 401 && result.failure.featureCode !== 1)) await refreshIdentity();
    }
  }

  return (
    <>
      {reloadFailed && <Alert tone="error">{t("reloadFailed")}</Alert>}
      {(action.uncertain || reloadFailed) && (
        <Button className="account-ghost" variant="secondary" disabled={action.pending} onClick={() => void checkProfile()}>
          {t("reloadProfile")}
        </Button>
      )}
      <section className="account-panel account-form-panel" aria-labelledby="personal-information">
        <h2 id="personal-information" className="account-section-title">{t("profileForm")}</h2>
        <form noValidate className="account-form" onSubmit={(event) => void saveProfile(event)}>
          <ValidationSummary
            items={issues.map((issue) => ({
              fieldId: "profile-" + issue.field,
              message: t(issue.field, { ns: "auth" }) + ": " + t(issue.key, { ns: "auth" }),
            }))}
          />
          <div className="account-form-fields">
            {profileFields.map((field) => (
              <Input
                key={field}
                id={"profile-" + field}
                label={t(field, { ns: "auth" })}
                value={values[field]}
                required={field !== "identityNumber"}
                pending={action.pending}
                type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                {...(field === "identityNumber" ? { dir: "ltr", inputMode: "numeric" as const } : {})}
                autoComplete={
                  field === "identityNumber"
                    ? "off"
                    : field === "fName"
                      ? "given-name"
                      : field === "lName"
                        ? "family-name"
                        : field === "phone"
                          ? "tel-national"
                          : "email"
                }
                error={
                  issues.some((issue) => issue.field === field) ? t(issues.find((issue) => issue.field === field)!.key, { ns: "auth" }) : undefined
                }
                onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
              />
            ))}
          </div>
          <Button className="account-primary" type="submit" disabled={blocked} pending={action.pending && action.operation === "profile"} pendingLabel={t("working")}>
            {t("saveProfile")}
          </Button>
        </form>
      </section>
      <section className="account-panel account-form-panel" aria-labelledby="change-password">
        <h2 id="change-password" className="account-section-title">{t("passwordForm")}</h2>
        <form noValidate className="account-form" onSubmit={(event) => void savePassword(event)}>
          <ValidationSummary
            items={passwordIssues.map((issue) => ({
              fieldId: "password-" + issue.field,
              message: t(issue.field) + ": " + t(issue.key, { ns: "auth" }),
            }))}
          />
          <div className="account-form-fields">
            {(["currentPassword", "newPassword"] as const).map((field) => (
              <Input
                key={field}
                id={"password-" + field}
                label={t(field)}
                type="password"
                autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
                value={passwords[field]}
                required
                pending={action.pending}
                error={
                  passwordIssues.some((issue) => issue.field === field)
                    ? t(passwordIssues.find((issue) => issue.field === field)!.key, { ns: "auth" })
                    : undefined
                }
                onChange={(event) => setPasswords((current) => ({ ...current, [field]: event.target.value }))}
              />
            ))}
          </div>
          <Button className="account-primary" type="submit" disabled={blocked} pending={action.pending && action.operation === "password"} pendingLabel={t("working")}>
            {t("savePassword")}
          </Button>
        </form>
      </section>
    </>
  );
}
