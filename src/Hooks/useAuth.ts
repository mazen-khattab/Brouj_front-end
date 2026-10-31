import { useContext } from "react";
import { AuthContext } from "../Context/AuthContext";

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider.");
  return value;
}
