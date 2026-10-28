import { useState } from 'react';
import CustomerLoginPage from './Auth/CustomerLoginPage';
import CustomerRegistrationPage from './Auth/CustomerRegistrationPage';
import StaffLoginPage from './Auth/StaffLoginPage';
import type { AuthMode } from './Auth/validation';

/** Development preview only; Part 05 owns public routes and access guards. */
export default function AuthPreview() {
  const [mode, setMode] = useState<AuthMode>('customer');
  const Page = mode === 'customer' ? CustomerLoginPage : mode === 'register' ? CustomerRegistrationPage : StaffLoginPage;
  return <Page onModeChange={setMode} />;
}
