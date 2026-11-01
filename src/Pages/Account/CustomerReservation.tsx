import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Hooks/useAuth";
import { useLocale } from "../../Hooks/useLocale";
import { useReservationBooking } from "../../Hooks/useReservationBooking";
import { useCatalogueDetail } from "../../Hooks/useCatalogue";
import { Dialog } from "../../Components/Dialog";
import { Button } from "../../Components/Button";
import { Input, Select } from "../../Components/Fields";
import { Alert, ValidationSummary } from "../../Components/Feedback";
import { BidiText } from "../../Components/BidiText";
import { ageGroups, financialBrackets, repaymentPeriods, bookingValues, bookingInput, validateBooking } from "../../Account/reservationBooking";
import type { BookingValues } from "../../Account/reservationBooking";
import type { FieldIssue } from "../../Account/policy";
import { serverIssues } from "../../Account/policy";
import { ApiError } from "../../Types/failures";
import { SessionActionError } from "../../Types/auth";
import type { UnitDto } from "../../Types/contracts";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { formatNumber } from "../../i18n/format";
import { routePaths } from "../../Router/routePaths";

export default function CustomerReservation({ unit }: { unit: UnitDto }) {
  const { t } = useTranslation(["catalogue", "auth", "account"]);
  const auth = useAuth();
  const { locale } = useLocale();
  const booking = useReservationBooking();
  const catalogue = useCatalogueDetail();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => bookingValues(auth.actor === "customer" ? auth.profile : undefined));
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const scope = `${auth.generation}:${auth.actor ?? "anonymous"}:${auth.actor ? auth.profile.id : ""}`;
  const [observed, setObserved] = useState(scope);

  if (scope !== observed) {
    setObserved(scope);
    // Keep the guest's booking through its own registration; discard drafts on other identity changes.
    if (!booking.preservesDraft(auth.generation)) {
      setValues(bookingValues(auth.actor === "customer" ? auth.profile : undefined));
      setIssues([]);
      setOpen(false);
    }
  }

  const guest = auth.actor !== "customer";
  const disabled = !unit.isAvailable || !!booking.uncertain || auth.pending;
  const failure = booking.failure;
  const fieldIssues =
    failure instanceof ApiError ? serverIssues(failure, Object.keys(values)).map((issue) => ({ ...issue, key: "auth:validation.server" })) : [];
  const allIssues = [...issues, ...fieldIssues];

  const fieldError = (field: keyof BookingValues) => {
    const issue = allIssues.find((issue) => issue.field === field);
    return issue ? t(issue.key) : undefined;
  };

  const returnTo = routePaths.unit(unit.projectId, unit.id) + "#reservation";
  const message = failure instanceof ApiError ? apiFailureMessage(failure) : undefined;

  const feedback = failure && (
    <Alert tone="error">
      <div className="grid gap-3">
        <p>
          {booking.uncertain
            ? t("account:uncertain")
            : failure instanceof SessionActionError
              ? t(`auth:${failure.code}`)
              : failure.status === 409
                ? t(booking.registrationFailure ? "booking.registrationConflict" : "account:conflict")
                : t(message!.key, { ns: message!.namespace ?? "errors" })}
        </p>
        {booking.uncertain && (
          <Link className="underline" to={routePaths.reservations}>
            {t("account:checkReservations")}
          </Link>
        )}
      </div>
    </Alert>
  );

  function start() {
    booking.reset();
    setValues(bookingValues(auth.actor === "customer" ? auth.profile : undefined));
    setIssues([]);
    setOpen(true);
  }

  function close() {
    if (booking.pending) return;
    setOpen(false);
    setValues(bookingValues(auth.actor === "customer" ? auth.profile : undefined));
    setIssues([]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || booking.pending) {
      return;
    }

    const next = validateBooking(values, guest);
    setIssues(next);

    if (next.length) {
      document.getElementById("booking-" + next[0]!.field)?.focus();
      return;
    }

    const result = await booking.submit(bookingInput(unit.id, values, guest), () => {
      setValues((current) => ({ ...current, email: "", password: "" }));
    });

    if (result && "id" in result) {
      await navigate(routePaths.reservation(result.id));
    } else if (result && "failure" in result && result.reservationSent && result.failure instanceof ApiError && result.failure.status === 409) {
      setOpen(false);
      catalogue.reload();
    }
  }

  function update(field: keyof BookingValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setIssues((current) => current.filter((issue) => issue.field !== field));
  }

  return (
    <div className="grid gap-5">
      {!open && feedback}
      {!unit.isAvailable && <p>{t("unavailable")}</p>}
      <Button className="justify-self-start" disabled={disabled} pending={booking.pending} pendingLabel={t("account:working")} onClick={start}>
        {t("booking.reserveNow")}
      </Button>
      <Dialog
        open={open}
        pending={booking.pending}
        title={t("booking.title")}
        description={t(guest ? "booking.guestIntro" : "booking.intro")}
        onClose={close}
      >
        {open && (
          <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5">
            <p>
              {t("account:unit")}: <BidiText>{unit.number}</BidiText>
            </p>
            {feedback}
            <ValidationSummary
              items={allIssues.map((issue) => ({ fieldId: "booking-" + issue.field, message: t("booking." + issue.field) + ": " + t(issue.key) }))}
            />
            <fieldset disabled={booking.pending} className="grid min-w-0 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  id="booking-fullName"
                  name="fullName"
                  label={t("booking.fullName")}
                  hint={t("booking.fullNameHint")}
                  value={values.fullName}
                  required
                  maxLength={201}
                  autoComplete="name"
                  error={fieldError("fullName")}
                  onChange={(event) => update("fullName", event.target.value)}
                />
              </div>
              {guest && (
                <>
                  <div className="sm:col-span-2">
                    <Input
                      id="booking-email"
                      name="email"
                      label={t("booking.email")}
                      value={values.email}
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="username"
                      error={fieldError("email")}
                      onChange={(event) => update("email", event.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      id="booking-password"
                      name="password"
                      label={t("booking.password")}
                      hint={t("auth:passwordHint")}
                      value={values.password}
                      type="password"
                      required
                      autoComplete="new-password"
                      error={fieldError("password")}
                      onChange={(event) => update("password", event.target.value)}
                    />
                  </div>
                </>
              )}
              <Input
                id="booking-phone"
                name="phone"
                label={t("booking.phone")}
                value={values.phone}
                type="tel"
                required
                autoComplete="tel-national"
                error={fieldError("phone")}
                onChange={(event) => update("phone", event.target.value)}
              />
              <Input
                id="booking-identityNumber"
                name="identityNumber"
                label={t("booking.identityNumber")}
                value={values.identityNumber}
                inputMode="numeric"
                dir="ltr"
                required
                minLength={14}
                maxLength={14}
                autoComplete="off"
                error={fieldError("identityNumber")}
                onChange={(event) => update("identityNumber", event.target.value)}
              />
              <Select
                id="booking-ageGroup"
                name="ageGroup"
                label={t("booking.ageGroup")}
                value={values.ageGroup}
                required
                error={fieldError("ageGroup")}
                onChange={(event) => update("ageGroup", event.target.value)}
              >
                <option value="">{t("booking.choose")}</option>
                {ageGroups.map((group) => (
                  <option key={group} value={group}>
                    {group === "36+"
                      ? t("booking.age36")
                      : t("booking.ageRange", {
                          from: formatNumber(group === "21-27" ? 21 : 28, locale),
                          to: formatNumber(group === "21-27" ? 27 : 35, locale),
                        })}
                  </option>
                ))}
              </Select>
              <Input
                id="booking-placeOfResidence"
                name="placeOfResidence"
                label={t("booking.placeOfResidence")}
                value={values.placeOfResidence}
                required
                maxLength={250}
                autoComplete="address-level2"
                error={fieldError("placeOfResidence")}
                onChange={(event) => update("placeOfResidence", event.target.value)}
              />
              <Select
                id="booking-preferredFinancialBracket"
                name="preferredFinancialBracket"
                label={t("booking.preferredFinancialBracket")}
                value={values.preferredFinancialBracket}
                required
                error={fieldError("preferredFinancialBracket")}
                onChange={(event) => update("preferredFinancialBracket", event.target.value)}
              >
                <option value="">{t("booking.choose")}</option>
                {financialBrackets.map((amount) => (
                  <option key={amount} value={amount}>
                    {t("booking.bracket", { value: formatNumber(amount / 1000, locale) })}
                  </option>
                ))}
              </Select>
              <Select
                id="booking-preferredRepaymentPeriod"
                name="preferredRepaymentPeriod"
                label={t("booking.preferredRepaymentPeriod")}
                value={values.preferredRepaymentPeriod}
                required
                error={fieldError("preferredRepaymentPeriod")}
                onChange={(event) => update("preferredRepaymentPeriod", event.target.value)}
              >
                <option value="">{t("booking.choose")}</option>
                {repaymentPeriods.map((months) => (
                  <option key={months} value={months}>
                    {t("booking.months", { value: formatNumber(months, locale) })}
                  </option>
                ))}
              </Select>
            </fieldset>
            <Link
              className="w-fit text-sm underline"
              to={routePaths.terms}
              aria-disabled={booking.pending}
              tabIndex={booking.pending ? -1 : 0}
              onClick={(event) => {
                if (booking.pending) event.preventDefault();
              }}
            >
              {t("account:terms")}
            </Link>
            <Button type="submit" disabled={disabled} pending={booking.pending} pendingLabel={t("account:working")}>
              {t("account:confirmReservation")}
            </Button>
            {guest && (
              <Link
                className="w-fit text-sm underline"
                to={`${routePaths.login}?${new URLSearchParams({ returnTo })}`}
                aria-disabled={booking.pending}
                tabIndex={booking.pending ? -1 : 0}
                onClick={(event) => {
                  if (booking.pending) event.preventDefault();
                }}
              >
                {t("booking.signIn")}
              </Link>
            )}
          </form>
        )}
      </Dialog>
    </div>
  );
}
