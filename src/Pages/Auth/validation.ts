import type { RegisterCustomerInput } from '../../Types/contracts';
export type AuthMode = 'customer' | 'register' | 'staff';
export type AuthField = keyof RegisterCustomerInput;
export type AuthIssue = { field: AuthField; key: string };
export const emptyAuthValues: RegisterCustomerInput = { email: '', password: '', fName: '', lName: '', phone: '', identityNumber: '' };

export function validEmail(value: string) {
  const text = value.trim();
  const at = text.indexOf('@');
  // InputRules.Email delegates to .NET 10 EmailAddressAttribute, not an RFC mailbox regex.
  return text.length <= 254 && !/[\r\n]/.test(text) && at > 0 && at < text.length - 1 && at === text.lastIndexOf('@');
}

/** Login passwords may be shorter than registration passwords in the actual backend validators. */
export function validateAuth(mode: AuthMode, values: RegisterCustomerInput): AuthIssue[] {
  const issues: AuthIssue[] = [];
  const fields: AuthField[] = mode === 'register' ? ['fName', 'lName', 'phone', 'identityNumber', 'email', 'password'] : ['email', 'password'];
  for (const field of fields) {
    const value = values[field];
    if (field === 'password' ? !value.length : !value.trim()) issues.push({ field, key: 'validation.required' });
    else if (['fName', 'lName'].includes(field) && value.length > 100) issues.push({ field, key: 'validation.nameLength' });
    else if (field === 'email' && !validEmail(value)) issues.push({ field, key: 'validation.email' });
    else if (field === 'phone' && !/^01[0125][0-9]{8}$/.test(value)) issues.push({ field, key: 'validation.phone' });
    else if (field === 'identityNumber' && !/^[0-9]{14}$/.test(value)) issues.push({ field, key: 'validation.identityNumber' });
    else if (field === 'password' && mode === 'register' && value.length < 8) issues.push({ field, key: 'validation.password' });
  }
  return issues;
}
