import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Input, Select, Textarea } from "../../Components/Fields";
import { ApiError } from "../../Types/failures";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { registrationPath, surveyPath, sendRegistration, sendSurvey } from "./homeSubmissions";
import { useHome } from "./useHome";

const priorities = ["design", "quality", "payment", "communication"] as const;
const clarityOptions = ["clear", "partly", "unclear"] as const;

function useSubmission() {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<"success" | ApiError | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function submit(form: HTMLFormElement, send: (signal: AbortSignal) => Promise<unknown>) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setNotice(null);
    try {
      await send(controller.signal);
      if (!controller.signal.aborted) {
        form.reset();
        setNotice("success");
      }
    } catch (err) {
      if (!controller.signal.aborted) setNotice(err instanceof ApiError ? err : new ApiError("unknown"));
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }
  return { submit, pending, notice, clear: () => setNotice(null) };
}

function SubmissionNotice({ notice, success }: { notice: ReturnType<typeof useSubmission>["notice"]; success: string }) {
  const { t } = useTranslation("errors");
  return (
    <p role="status" aria-live="polite" className="home-form-notice">
      {notice instanceof ApiError ? t(apiFailureMessage(notice).key) : notice === "success" ? success : ""}
    </p>
  );
}

function RegistrationForm() {
  const { t } = useTranslation("home");
  const request = useSubmission();
  const [invalid, setInvalid] = useState<"name" | "phone" | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registrationPath) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "")
      .trim()
      .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) % 16));
    const error = !name ? "name" : !/^01[0125]\d{8}$/.test(phone) ? "phone" : null;
    setInvalid(error);
    if (error) {
      (form.elements.namedItem(error) as HTMLInputElement).focus();
      return;
    }
    void request.submit(form, (signal) => sendRegistration({ name, phone, inquiry: t("contact.callback") }, signal));
  }
  return (
    <form
      aria-labelledby="registration-title"
      onSubmit={submit}
      onInput={() => {
        request.clear();
        setInvalid(null);
      }}
    >
      <h3 id="registration-title">{t("contact.registration")}</h3>
      <p>{t("contact.intro")}</p>
      <fieldset disabled={request.pending}>
        <Input
          id="contact-name"
          name="name"
          label={t("contact.name")}
          autoComplete="name"
          required
          maxLength={150}
          dir="auto"
          error={invalid === "name" ? t("contact.invalidName") : undefined}
        />
        <Input
          id="contact-phone"
          name="phone"
          label={t("contact.phone")}
          autoComplete="tel"
          type="tel"
          placeholder="01xxxxxxxxx"
          required
          maxLength={20}
          error={invalid === "phone" ? t("contact.invalidPhone") : undefined}
        />
        <button type="submit" disabled={!registrationPath} className="home-action home-action-solid">
          {t(request.pending ? "contact.sending" : "contact.register")}
        </button>
      </fieldset>
      {!registrationPath && <p>{t("contact.registrationUnavailable")}</p>}
      <SubmissionNotice notice={request.notice} success={t("contact.registered")} />
    </form>
  );
}

function SurveyForm() {
  const { t } = useTranslation("home");
  const request = useSubmission();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!surveyPath) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      priority: String(data.get("priority")),
      clarity: String(data.get("clarity")),
      suggestion: String(data.get("suggestion") ?? "").trim(),
    };
    void request.submit(form, (signal) => sendSurvey(body, signal));
  }
  return (
    <form aria-labelledby="survey-title" onSubmit={submit} onInput={request.clear}>
      <h3 id="survey-title">{t("survey.title")}</h3>
      {!surveyPath && <p>{t("survey.unavailable")}</p>}
      <fieldset disabled={request.pending}>
        <Select id="survey-priority" name="priority" label={t("survey.priority")} required defaultValue="">
          <option value="" disabled>
            {t("survey.select")}
          </option>
          {priorities.map((key) => (
            <option key={key} value={key}>
              {t(`survey.${key}`)}
            </option>
          ))}
        </Select>
        <Select id="survey-clarity" name="clarity" label={t("survey.clarity")} required defaultValue="">
          <option value="" disabled>
            {t("survey.select")}
          </option>
          {clarityOptions.map((key) => (
            <option key={key} value={key}>
              {t(`survey.${key}`)}
            </option>
          ))}
        </Select>
        <Textarea id="survey-suggestion" name="suggestion" label={t("survey.suggestion")} rows={2} dir="auto" maxLength={1500} />
        <button type="submit" disabled={!surveyPath} className="home-action home-action-solid">
          {t(request.pending ? "contact.sending" : "survey.send")}
        </button>
      </fieldset>
      <SubmissionNotice notice={request.notice} success={t("survey.sent")} />
    </form>
  );
}

export function ContactSection() {
  const { t } = useTranslation("home");
  const { hash, key } = useLocation();
  const { collections } = useHome();
  const section = useRef<HTMLElement>(null);
  const alignedLocation = useRef<string | null>(null);
  const waiting = Object.values(collections).some(collection => collection.result.status === "loading");
  useEffect(() => {
    if (hash !== "#contact" || waiting || alignedLocation.current === key) return;
    let active = true;
    const frame = requestAnimationFrame(() => {
      // Cross-route links arrive before the lazy homepage and its collections settle.
      void document.fonts.ready.then(() => {
        if (!active) return;
        section.current?.scrollIntoView({ block: "start", behavior: "instant" });
        section.current?.focus({ preventScroll: true });
        alignedLocation.current = key;
      });
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [hash, key, waiting]);
  return (
    <section ref={section} id="contact" tabIndex={-1} aria-labelledby="contact-title" className="home-band home-contact">
      <div className="home-container">
        <h2 id="contact-title" className="home-display">
          {t("contact.title")}
        </h2>
        <div className="home-contact-grid">
          <span className="home-contact-spine" aria-hidden="true" />
          <div data-contact-form>
            <RegistrationForm />
          </div>
          <div data-contact-form>
            <SurveyForm />
          </div>
        </div>
      </div>
    </section>
  );
}
