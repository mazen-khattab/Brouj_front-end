import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ui as styles } from './ui';

type Props = ComponentProps<"button"> & {
  pending?: boolean;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
};

export function Button({
  pending = false,
  pendingLabel,
  variant = "primary",
  disabled,
  type = "button",
  children,
  className = "",
  ...props
}: Props) {
  const { t } = useTranslation();
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${styles.button} ${styles[variant]} ${className}`}
    >
      {pending && <span aria-hidden="true" className={`${styles.skeleton} h-2 w-5 bg-white/20!`} />}
      {pending ? (pendingLabel ?? t("saving")) : children}
    </button>
  );
}
