import { createContext } from "react";
import type { TranslationMessage } from "../i18n/resources";

export interface Notice {
  message: TranslationMessage;
  tone?: "success" | "info" | "error";
}
export const ToastContext = createContext<((notice: Notice) => void) | null>(
  null,
);
