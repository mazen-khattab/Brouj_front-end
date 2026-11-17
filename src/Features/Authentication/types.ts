export type AuthMode = "customer" | "register" | "staff";
export interface AuthPageProps {
  onModeChange?: (mode: AuthMode) => void;
}
