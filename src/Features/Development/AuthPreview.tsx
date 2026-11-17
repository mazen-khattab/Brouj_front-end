import { useState } from "react";
import CustomerLoginPage from "../Authentication/Customer/LoginPage";
import CustomerRegistrationPage from "../Authentication/Customer/RegistrationPage";
import StaffLoginPage from "../Authentication/Staff/LoginPage";
import type { AuthMode } from "../Authentication/types";

/** Development preview only; Part 05 owns public routes and access guards. */
export default function AuthPreview() {
  const [mode, setMode] = useState<AuthMode>("customer");
  const Page = mode === "customer" ? CustomerLoginPage : mode === "register" ? CustomerRegistrationPage : StaffLoginPage;
  return <Page onModeChange={setMode} />;
}
