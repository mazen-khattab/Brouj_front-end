import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CustomerActionContext } from './CustomerActionContext';
import type { CustomerActionResult, CustomerActionState, CustomerOperation } from './CustomerActionContext';
import { useAuth } from '../Hooks/useAuth';
import * as profile from '../Services/CustomerProfile';
import * as reservations from '../Services/Reservations';
import { ApiError } from '../Types/failures';
import { uncertainWrite } from '../Account/policy';
import { sessionBoundary } from '../Security/sessionBoundary';
import { isGuid } from '../Catalogue/query';

export function CustomerActionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<CustomerActionState>({ pending: false });
  const controller = useRef<AbortController | null>(null);
  const active = useRef(false);
  const locked = useRef(false);
  const unresolved = useRef(false);
  const scope = auth.actor ? `${auth.actor}:${auth.profile.id}:${auth.generation}` : 'anonymous';
  const isCurrent = () => active.current && auth.actor === 'customer' && (sessionBoundary.stamp()?.generation ?? auth.generation) === auth.generation;
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, [scope]);

  async function run(operation: CustomerOperation, work: (signal: AbortSignal) => Promise<string>): Promise<CustomerActionResult> {
    const stamp = sessionBoundary.stamp();
    if (!active.current || auth.actor !== 'customer' || locked.current || unresolved.current || (stamp && stamp.generation !== auth.generation)) {
      return { ok: false, failure: new ApiError('canceled'), uncertain: false };
    }
    locked.current = true;
    const request = new AbortController(); controller.current = request;
    setState({ pending: true, operation });
    try {
      const id = await work(request.signal);
      if (!active.current || request.signal.aborted || (stamp && sessionBoundary.stamp()?.generation !== stamp.generation)) throw new ApiError('canceled');
      if (!isGuid(id)) throw new ApiError('transport', { status: 200 });
      setState({ pending: false, operation, succeeded: true });
      return { ok: true, id };
    } catch (error: unknown) {
      const failure = error instanceof ApiError ? error : new ApiError('unknown');
      const uncertain = uncertainWrite(failure);
      if (active.current && !request.signal.aborted) {
        unresolved.current = uncertain;
        setState({ pending: false, operation, failure, uncertain });
      }
      return { ok: false, failure, uncertain };
    } finally { locked.current = false; if (controller.current === request) controller.current = null; }
  }
  return <CustomerActionContext value={{ ...state,
    updateProfile: (input) => run('profile', (signal) => profile.updateCustomerProfile({ body: {
      fName: input.fName, lName: input.lName, phone: input.phone, identityNumber: input.identityNumber, email: input.email.trim(),
    } }, { signal })),
    // Wrong-current-password is a business 401, so it must never trigger refresh/replay.
    changePassword: (input) => run('password', (signal) => profile.changeCustomerPassword({ body: { currentPassword: input.currentPassword, newPassword: input.newPassword } }, { signal, skipAuthenticationRecovery: true })),
    create: (unitId) => run('create', (signal) => reservations.createReservation({ body: { unitId } }, { signal })),
    cancel: (id) => run('cancel', (signal) => reservations.cancelReservation({ id }, { signal })),
    resetAfterRead: () => { if (isCurrent() && !locked.current) { unresolved.current = false; setState({ pending: false }); } },
    isCurrent,
  }}>{children}</CustomerActionContext>;
}
