import { useContext } from "react";
import { ToastContext } from "../Context/ToastContext";

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast requires ToastProvider.");
  return notify;
}
