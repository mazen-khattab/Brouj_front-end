import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../../Hooks/useLocale";
import { formatDateTime, formatNumber } from "../../../i18n/format";

function Timer({ drawDate }: { drawDate: string }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const target = Date.parse(drawDate);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(target) || target <= Date.now()) {
      return;
    }

    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);

      if (current >= target) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [target]);

  if (!Number.isFinite(target)) {
    return null;
  }

  const remaining = Math.max(0, Math.ceil((target - now) / 1000));
  const values = [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];

  return (
    <section aria-label={t("drawCountdown")} className="pd-countdown">
      <div className="grid gap-2">
        <h2 className="text-xl font-medium">{t("drawCountdown")}</h2>
        <time dateTime={drawDate} className="text-sm text-accent-light">
          {formatDateTime(drawDate, locale)}
        </time>
      </div>
      {remaining === 0 ? (
        <p role="status" className="text-lg text-accent-light">
          {t("drawReached")}
        </p>
      ) : (
        <dl role="timer" aria-label={t("drawCountdown")} className="grid grid-cols-4 gap-2 text-center sm:gap-6">
          {["days", "hours", "minutes", "seconds"].map((label, index) => (
            <div key={label} className="grid gap-1 border-s border-accent/30 ps-2 sm:ps-6">
              <dt className="order-2 whitespace-nowrap text-sm text-accent-light">{t(label)}</dt>
              <dd className="text-2xl font-medium tabular-nums sm:text-3xl">{formatNumber(values[index]!, locale, { minimumIntegerDigits: 2 })}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function DrawCountdown({ projectType, drawDate }: { projectType: number; drawDate: string | null }) {
  return projectType === 1 && drawDate ? <Timer key={drawDate} drawDate={drawDate} /> : null;
}
