import { useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ToastContext } from "./ToastContext";
import type { Notice } from "./ToastContext";
import { Toast } from "../Components/Toast";
import { ui as styles } from "../Components/ui";
import { AuthContext } from './AuthContext';

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [notices, setNotices] = useState<(Notice & { id: number })[]>([]);
  const generation = useContext(AuthContext)?.generation ?? 0;
  const [previousGeneration, setPreviousGeneration] = useState(generation);
  // Clear private notices without remounting forms during an unsuccessful sign-in.
  if (previousGeneration !== generation) { setPreviousGeneration(generation); setNotices([]); }
  const nextId = useRef(0);
  const notify = useCallback((notice: Notice) => {
    const entry = { ...notice, id: ++nextId.current };
    setNotices((current) => [...current.slice(-3), entry]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);
  return (
    <ToastContext value={notify}>
      {children}
      <aside aria-label={t("notifications")} className={styles.toasts}>
        {notices.map((notice) => (
          <Toast key={notice.id} notice={notice} dismiss={dismiss} />
        ))}
      </aside>
    </ToastContext>
  );
}
