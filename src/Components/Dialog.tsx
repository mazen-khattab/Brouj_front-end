import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { ui as styles } from './ui';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  pending?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({
  open,
  title,
  description,
  pending = false,
  onClose,
  children,
}: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const outsidePress = useRef(false);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.documentElement.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.documentElement.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);

  function containTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((node) => node.getClientRects().length > 0 && node.tabIndex >= 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) {
      event.preventDefault();
      event.currentTarget.focus();
    } else if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === event.currentTarget)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      aria-busy={pending || undefined}
      className={styles.dialog}
      onKeyDown={containTab}
      onPointerDown={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        outsidePress.current = event.button === 0 && event.target === event.currentTarget &&
          (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
      }}
      onPointerUp={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const outside = event.target === event.currentTarget &&
          (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
        // A drag beginning inside the dialog is not a backdrop click; pending actions stay protected.
        if (outsidePress.current && outside && !pending) onClose();
        outsidePress.current = false;
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      onClose={() => {
        // StrictMode can close and reopen a newly mounted dialog before the queued close event fires.
        if (open && !pending && !ref.current?.open) { onClose(); }
      }}
    >
      <Button
        className={styles.dialogClose}
        variant="secondary"
        aria-label={t("close")}
        disabled={pending}
        onClick={onClose}
      >
        ×
      </Button>
      <h2 className="mb-4 pe-12 text-2xl font-semibold" id={`${id}-title`}>{title}</h2>
      {description && <p className="mb-6 text-sm leading-8 text-muted" id={`${id}-description`}>{description}</p>}
      <div className={styles.dialogBody}>{children}</div>
    </dialog>
  );
}
