import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AccountDataContext } from './AccountDataContext';
import type { AccountData } from './AccountDataContext';
import { useAuth } from '../Hooks/useAuth';
import { useCatalogueRead } from '../Hooks/useCatalogueRead';
import { getCurrentCustomer } from '../Services/CustomerProfile';
import { getMyReservations, getReservationById } from '../Services/Reservations';
import { getMyOrders, getOrderById } from '../Services/Orders';
import { getProjectTimePlan } from '../Services/TimePlans';
import { ApiError } from '../Types/failures';
import { isGuid } from '../Catalogue/query';
import { useRealtimeReload } from '../Hooks/useRealtimeReload';

export function AccountDataProvider({ kind, id, children }: { kind: AccountData['kind']; id?: string | undefined; children: ReactNode }) {
  const auth = useAuth();
  const reloadIdentity = auth.reloadIdentity;
  const [search, setSearch] = useSearchParams();
  const positive = (key: string, fallback: number, max: number) => { const raw = search.get(key); const value = Number(raw); return raw && /^\d+$/.test(raw) && value > 0 && value <= max ? value : fallback; };
  const page = positive('pageNumber', 1, 2_147_483_647), pageSize = positive('pageSize', 12, 100);
  const selected = search.get('status');
  const status = selected !== null && /^[0-3]$/.test(selected) && Number(selected) <= (kind === 'reservations' ? 2 : 3) ? Number(selected) : null;
  const list = kind === 'reservations' || kind === 'orders';
  const allowed = kind === 'plan' ? !!auth.actor : auth.actor === 'customer';
  const canonical = new URLSearchParams();
  if (page !== 1) canonical.set('pageNumber', String(page));
  if (pageSize !== 12) canonical.set('pageSize', String(pageSize));
  if (status !== null) canonical.set('status', String(status));
  const queryKey = list ? canonical.toString() : '';
  useEffect(() => { if (list && search.toString() !== queryKey) setSearch(queryKey, { replace: true, preventScrollReset: true }); }, [list, search, queryKey, setSearch]);
  const load = useCallback(async (signal: AbortSignal): Promise<AccountData> => {
    if (!allowed) throw new ApiError('transport', { status: 403 });
    if (['reservation', 'order', 'plan'].includes(kind) && !isGuid(id)) throw new ApiError('transport', { status: 404 });
    switch (kind) {
      case 'profile': {
        try { return { kind, value: await getCurrentCustomer({ signal }) }; }
        catch (error: unknown) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) await reloadIdentity();
          throw error;
        }
      }
      case 'reservations': return { kind, value: await getMyReservations({ query: { pageNumber: page, pageSize, status: status as 0 | 1 | 2 | null } }, { signal }) };
      case 'reservation': return { kind, value: await getReservationById({ id: id! }, { signal }) };
      case 'orders': return { kind, value: await getMyOrders({ query: { pageNumber: page, pageSize, status: status as 0 | 1 | 2 | 3 | null } }, { signal }) };
      case 'order': return { kind, value: await getOrderById({ id: id! }, { signal }) };
      case 'plan': return { kind, value: await getProjectTimePlan({ projectId: id! }, { signal }) };
    }
  }, [kind, id, allowed, page, pageSize, status, reloadIdentity]);
  const scope = auth.actor ? `${auth.actor}:${auth.profile.id}:${auth.generation}` : 'anonymous';
  const { result, reload } = useCatalogueRead(`private:${scope}:${kind}:${id ?? ''}:${queryKey}`, load, allowed);
  const feature = kind === 'reservation' || kind === 'reservations' ? 'reservations' : kind === 'order' || kind === 'orders' ? 'orders' : kind === 'plan' ? 'timePlan' : undefined;
  useRealtimeReload(allowed ? feature : undefined, `${scope}:${kind}:${id ?? ''}:${queryKey}`, result.status === 'loading', reload, list ? undefined : id);
  useEffect(() => {
    if (result.status !== 'success' || (result.data.kind !== 'reservations' && result.data.kind !== 'orders')) return;
    const last = Math.max(1, result.data.value.totalPages);
    if (page > last) { const next = new URLSearchParams(queryKey); if (last === 1) next.delete('pageNumber'); else next.set('pageNumber', String(last)); setSearch(next, { replace: true, preventScrollReset: true }); }
  }, [result, page, queryKey, setSearch]);
  return <AccountDataContext value={{ result, reload, page, pageSize, status, update: (change) => {
    const next = new URLSearchParams(queryKey);
    const nextPage = change.page ?? 1;
    if (nextPage === 1) next.delete('pageNumber'); else next.set('pageNumber', String(nextPage));
    if (change.pageSize !== undefined) next.set('pageSize', String(change.pageSize));
    if (change.status !== undefined) { if (change.status === null) next.delete('status'); else next.set('status', String(change.status)); }
    setSearch(next, { preventScrollReset: true });
  } }}>{children}</AccountDataContext>;
}
