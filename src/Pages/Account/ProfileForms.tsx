import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccountData, useCustomerAction } from '../../Hooks/useAccount';
import { useAuth } from '../../Hooks/useAuth';
import { Input } from '../../Components/Fields';
import { Button } from '../../Components/Button';
import { Alert, ValidationSummary } from '../../Components/Feedback';
import { accountPanel } from '../../Components/Account/AccountFeedback';
import { serverIssues, validatePassword, validateProfile } from '../../Account/policy';
import type { FieldIssue } from '../../Account/policy';
import type { CurrentCustomerDto, CustomerProfileInput } from '../../Types/contracts';

const profileFields = ['fName', 'lName', 'email', 'phone', 'identityNumber'] as const;
export default function ProfileForms({ profile }: { profile: CurrentCustomerDto }) {
  const { t } = useTranslation('account'); const auth = useAuth(); const action = useCustomerAction(); const data = useAccountData();
  const [values, setValues] = useState<CustomerProfileInput>({ fName: profile.fName, lName: profile.lName, email: profile.email, phone: profile.phone, identityNumber: profile.identityNumber });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [passwordIssues, setPasswordIssues] = useState<FieldIssue[]>([]);
  const [reloadFailed, setReloadFailed] = useState(false);
  const blocked = action.pending || !!action.uncertain || auth.pending || reloadFailed;
  async function checkProfile() {
    try { await auth.reloadIdentity(); if (action.isCurrent()) { action.resetAfterRead(); data.reload(); } }
    catch { if (action.isCurrent()) setReloadFailed(true); }
  }
  async function save(event: FormEvent, mode: 'profile' | 'password') {
    event.preventDefault(); if (blocked) return;
    const next = mode === 'profile' ? validateProfile(values) : validatePassword(passwords);
    (mode === 'profile' ? setIssues : setPasswordIssues)(next);
    if (next.length) { document.getElementById((mode === 'profile' ? 'profile-' : 'password-') + next[0]!.field)?.focus(); return; }
    const result = mode === 'profile' ? await action.updateProfile(values) : await action.changePassword(passwords);
    if (!action.isCurrent()) return;
    if (result.ok) {
      if (mode === 'password') setPasswords({ currentPassword: '', newPassword: '' });
      try { await auth.reloadIdentity(); if (mode === 'profile' && action.isCurrent()) data.reload(); }
      catch { if (action.isCurrent()) setReloadFailed(true); }
    } else {
      const fields = mode === 'profile' ? profileFields : ['currentPassword', 'newPassword'];
      (mode === 'profile' ? setIssues : setPasswordIssues)(serverIssues(result.failure, fields));
      if (result.failure.status === 409 || (result.failure.status === 401 && result.failure.featureCode !== 1)) {
        try { await auth.reloadIdentity(); } catch { if (action.isCurrent()) setReloadFailed(true); }
      }
    }
  }
  return <>
    {reloadFailed && <Alert tone="error">{t('reloadFailed')}</Alert>}
    {(action.uncertain || reloadFailed) && <Button variant="secondary" disabled={action.pending} onClick={() => void checkProfile()}>{t('reloadProfile')}</Button>}
    <section className={accountPanel}><h2 className="text-2xl font-medium">{t('profileForm')}</h2>
      <form noValidate className="grid gap-6" onSubmit={(event) => void save(event, 'profile')}>
        <ValidationSummary items={issues.map((issue) => ({ fieldId: 'profile-' + issue.field, message: t(issue.field, { ns: 'auth' }) + ': ' + t(issue.key, { ns: 'auth' }) }))} />
        <div className="grid gap-5 sm:grid-cols-2">{profileFields.map((field) => <Input key={field} id={'profile-' + field} label={t(field, { ns: 'auth' })} value={values[field]} required pending={action.pending}
          type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} {...(field === 'identityNumber' ? { dir: 'ltr', inputMode: 'numeric' as const } : {})}
          autoComplete={field === 'identityNumber' ? 'off' : field === 'fName' ? 'given-name' : field === 'lName' ? 'family-name' : field === 'phone' ? 'tel-national' : 'email'}
          error={issues.some((issue) => issue.field === field) ? t(issues.find((issue) => issue.field === field)!.key, { ns: 'auth' }) : undefined}
          onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} />)}</div>
        <Button type="submit" disabled={blocked} pending={action.pending && action.operation === 'profile'} pendingLabel={t('working')}>{t('saveProfile')}</Button>
      </form>
    </section>
    <section className={accountPanel}><h2 className="text-2xl font-medium">{t('passwordForm')}</h2>
      <form noValidate className="grid gap-6" onSubmit={(event) => void save(event, 'password')}>
        <ValidationSummary items={passwordIssues.map((issue) => ({ fieldId: 'password-' + issue.field, message: t(issue.field) + ': ' + t(issue.key, { ns: 'auth' }) }))} />
        {(['currentPassword', 'newPassword'] as const).map((field) => <Input key={field} id={'password-' + field} label={t(field)} type="password" autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} value={passwords[field]} required pending={action.pending}
          error={passwordIssues.some((issue) => issue.field === field) ? t(passwordIssues.find((issue) => issue.field === field)!.key, { ns: 'auth' }) : undefined}
          onChange={(event) => setPasswords((current) => ({ ...current, [field]: event.target.value }))} />)}
        <Button type="submit" disabled={blocked} pending={action.pending && action.operation === 'password'} pendingLabel={t('working')}>{t('savePassword')}</Button>
      </form>
    </section>
  </>;
}
