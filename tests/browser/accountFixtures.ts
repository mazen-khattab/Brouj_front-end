import type { BrowserContext } from '@playwright/test';
import { sessionCors } from './sessionFixtures';
import { catalogueIds, catalogueServer } from './catalogueFixtures';
import type { OrderDto, ReservationDto, TimePlanDto } from '../../src/Types/contracts';

export const accountIds = { reservation: '50000000-0000-4000-8000-000000000001', created: '50000000-0000-4000-8000-000000000002', order: '60000000-0000-4000-8000-000000000001', foreign: '99999999-0000-4000-8000-000000000001' };
export async function accountServer(context: BrowserContext, actor: 'anonymous' | 'customer' | 'staff' = 'customer') {
  await catalogueServer(context);
  const profile = { id: '00000000-0000-0000-0000-000000000001', fName: 'Fixture', lName: 'Customer', email: 'customer@example.test', phone: '01000000000', identityNumber: '10000000000000' };
  const reservation: ReservationDto = { id: accountIds.reservation, unitId: catalogueIds.unit, unitNumber: 'A-204', projectName: 'Garden Residence', number: 'R-FIXTURE-ONE', status: 0, reservationDate: '2026-10-01T12:00:00Z', cancelledAt: null, orderId: null };
  const order: OrderDto = { id: accountIds.order, reservationId: accountIds.reservation, unitId: catalogueIds.unit, unitNumber: 'A-204', projectName: 'Garden Residence', number: 'O-FIXTURE-ONE', status: 1, totalPrice: 1234567.89, completedAt: null };
  const plan: TimePlanDto = { id: '70000000-0000-4000-8000-000000000001', projectId: catalogueIds.project, name: 'Published schedule', deliveryDate: '2027-12-01T12:00:00Z', stages: [
    { id: 'stage', name: 'Structure', sortOrder: 0, deliveryDate: '2027-06-01T12:00:00Z', items: [
      { id: 'item-one', name: 'Foundations', sortOrder: 0, status: 2, dueDate: '2026-12-01T12:00:00Z', confirmedDate: '2026-11-29T12:00:00Z', images: [{ id: 'image-one', imagePath: 'C:\\PRIVATE-PROGRESS\\image.webp', description: 'Published progress note.', sortOrder: 0 }] },
      { id: 'item-two', name: 'Upper floors', sortOrder: 1, status: 1, dueDate: '2027-05-01T12:00:00Z', confirmedDate: null, images: [] },
    ] },
  ] };
  const state = { actor, expired: false, rejectRefresh: false, createMode: 'success' as 'success' | 'duplicate' | 'unavailable' | 'network' | 'slow', cancelMode: 'success' as 'success' | 'conflict' | 'network', profileValidation: false, passwordMode: 'success' as 'success' | 'wrong' | 'invalidate' | 'network', readDelay: 0, profileReadsFail: 0 };
  const records: ReservationDto[] = [reservation];
  const calls: { path: string; method: string; query: URLSearchParams; body: unknown }[] = [];
  const cors = { ...sessionCors, 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS', 'access-control-allow-headers': 'Content-Type, X-CSRF-TOKEN' };
  await context.route('https://localhost:7249/api/**', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname; const method = request.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const isProfile = /\/(customers|users)\/me$/.test(path);
    const isPrivate = isProfile || path.includes('/reservations') || path.includes('/orders') || path.endsWith('/time-plan');
    if (!isPrivate && !path.includes('/auth/') && !path.endsWith('/change-password')) return route.fallback();
    const body = request.postData() ? request.postDataJSON() as unknown : undefined;
    calls.push({ path, method, query: url.searchParams, body });
    const ok = (data: unknown, status = 200) => route.fulfill({ status, headers: cors, json: { success: true, data, message: null } });
    const fail = (status: number, code?: number, errors?: unknown) => route.fulfill({ status, headers: cors, json: code ? { success: false, code, message: 'Not displayed', errors: errors ?? null } : { status } });
    if (path.endsWith('/auth/csrf')) return ok({ requestToken: 'account-proof' });
    if (/\/(login|register)$/.test(path)) { state.actor = path.includes('/users/') ? 'staff' : 'customer'; state.expired = false; return ok({ actorId: profile.id, expiresAt: '2099-01-01T00:00:00Z' }); }
    if (path.endsWith('/refresh')) { if (state.rejectRefresh) return fail(403); state.expired = false; return ok({ actorId: profile.id, expiresAt: '2099-01-01T00:00:00Z' }); }
    if (path.endsWith('/logout')) { state.actor = 'anonymous'; state.expired = false; return ok(profile.id); }
    if (state.actor === 'anonymous' || state.expired) return fail(401);
    if (method !== 'GET' && request.headers()['x-csrf-token'] !== 'account-proof') return fail(400);
    if (isProfile) {
      if ((path.includes('/customers/') && state.actor !== 'customer') || (path.includes('/users/') && state.actor !== 'staff')) return fail(403);
      if (method === 'PATCH') {
        if (state.profileValidation) return fail(400, 13, { Phone: ['Must not appear verbatim'] });
        Object.assign(profile, body); return ok(profile.id);
      }
      if (state.profileReadsFail > 0) { state.profileReadsFail -= 1; return fail(503); }
      return state.actor === 'customer' ? ok(profile) : ok({ id: profile.id, name: 'Staff fixture', email: 'staff@example.test', phone: '01000000000', role: 1, deletedAt: null });
    }
    if (path.endsWith('/change-password')) {
      if (state.passwordMode === 'wrong') return fail(401, 1);
      if (state.passwordMode === 'network') return route.abort('failed');
      if (state.passwordMode === 'invalidate') state.actor = 'anonymous';
      return ok(profile.id);
    }
    if (path.endsWith('/time-plan')) return ok(plan);
    if (state.actor !== 'customer') return fail(403);
    if (state.readDelay && method === 'GET') await new Promise((resolve) => setTimeout(resolve, state.readDelay));
    const paginate = <T extends { status: number },>(items: T[]) => {
      const query = url.searchParams, pageNumber = Number(query.get('pageNumber') ?? 1), pageSize = Number(query.get('pageSize') ?? 20);
      const filtered = query.has('status') ? items.filter((item) => String(item.status) === query.get('status')) : items;
      return ok({ items: filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), pageNumber, pageSize, totalCount: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) });
    };
    if (path === '/api/v1/reservations' && method === 'POST') {
      if (state.createMode === 'duplicate') return fail(409, 6);
      if (state.createMode === 'unavailable') return fail(409, 27);
      if (state.createMode === 'network') return route.abort('failed');
      if (state.createMode === 'slow') await new Promise((resolve) => setTimeout(resolve, 400));
      records.push({ ...reservation, id: accountIds.created, number: 'R-FIXTURE-CREATED', status: 0, cancelledAt: null, orderId: null });
      return ok(accountIds.created, 201);
    }
    if (path === '/api/v1/reservations/me') return paginate(records);
    if (path === '/api/v1/orders/me') return paginate([order]);
    if (path.startsWith('/api/v1/reservations/')) {
      const record = records.find((item) => item.id === path.split('/')[4]);
      if (!record) return fail(404, 5);
      if (path.endsWith('/cancel')) {
        if (state.cancelMode === 'network') return route.abort('failed');
        if (state.cancelMode === 'conflict') { record.status = 2; record.orderId = accountIds.order; return fail(409, 27); }
        record.status = 1; record.cancelledAt = '2026-10-29T12:00:00Z'; return ok(record.id);
      }
      return ok(record);
    }
    if (path.startsWith('/api/v1/admin/orders/')) return path.endsWith(accountIds.order) ? ok(order) : fail(404, 8);
    return fail(404);
  });
  return { state, calls, records, profile, plan };
}
