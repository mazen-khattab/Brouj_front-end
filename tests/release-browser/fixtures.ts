import type { BrowserContext } from '@playwright/test';
import { catalogueIds, catalogueProject, catalogueUnit } from '../browser/catalogueFixtures';
import { planningPlan, planningTemplate, planningIds } from '../browser/planningFixtures';
import { syntheticCustomer, syntheticOrder, syntheticReservation } from '../browser/adminOperationsFixtures';
import { governanceTerms, governanceStaff, governanceLog } from '../browser/governanceFixtures';

/** Synthetic read-only HTTP fixtures for the compiled artifact. No live backend claim. */
export async function releaseServer(context: BrowserContext) {
  const state = { actor: 'anonymous' as 'anonymous' | 'customer' | 'superAdmin', unknown: [] as string[] };
  await context.route('https://api.brouj.com/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const headers = { 'access-control-allow-origin': 'https://localhost:4173', 'access-control-allow-credentials': 'true', 'cache-control': 'no-store' };
    const ok = (data: unknown) => route.fulfill({ headers, json: { success: true, data, message: null } });
    const fail = (status: number) => route.fulfill({ status, headers, json: { status } });
    if (request.method() !== 'GET') {
      state.unknown.push('Unexpected mutation');
      return fail(405);
    }
    if (path === '/customers/me') {
      return state.actor === 'customer' ? ok({ ...syntheticCustomer, identityNumber: '10000000000000' }) : fail(state.actor === 'anonymous' ? 401 : 403);
    }
    if (path === '/users/me') {
      return state.actor === 'superAdmin' ? ok({ ...governanceStaff, role: 0 }) : fail(state.actor === 'anonymous' ? 401 : 403);
    }
    const city = { id: catalogueIds.city, name: 'Cairo' };
    const area = { id: catalogueIds.area, name: 'East Quarter', cityId: city.id, cityName: city.name, amenities: [] };

    function page<T>(items: T[]) {
      const pageNumber = Number(url.searchParams.get('pageNumber') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
      return ok({ items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), pageNumber, pageSize, totalCount: items.length, totalPages: Math.ceil(items.length / pageSize) });
    }

    if (path === '/cities') {
      return page([city]);
    }
    if (path.endsWith('/areas') || path === '/areas') {
      return page([area]);
    }
    if (path.startsWith('/cities/')) {
      return ok(city);
    }
    if (path.startsWith('/areas/')) {
      return ok(area);
    }
    if (path.endsWith('/time-plan')) {
      return state.actor === 'anonymous' ? fail(401) : ok(planningPlan);
    }
    if (path.endsWith('/units')) {
      return page([catalogueUnit]);
    }
    if (path === '/projects') {
      return page([{ ...catalogueProject, areaName: area.name, cityId: city.id }]);
    }
    if (path.startsWith('/projects/')) {
      return ok(catalogueProject);
    }
    if (path.startsWith('/units/')) {
      return ok(catalogueUnit);
    }
    if (path === '/terms-and-conditions/current') {
      return ok(governanceTerms);
    }
    if (state.actor === 'anonymous') {
      return fail(401);
    }
    if (path === '/reservations/me') {
      return page([syntheticReservation]);
    }
    if (path.startsWith('/reservations/')) {
      return ok(syntheticReservation);
    }
    if (path === '/orders/me') {
      return page([syntheticOrder]);
    }
    if (path.startsWith('/admin/orders/')) {
      return ok(syntheticOrder);
    }
    if (state.actor !== 'superAdmin') {
      return fail(403);
    }
    const itemTemplate = { id: planningIds.itemTemplate, name: 'Reusable inspection', code: 'INSPECTION', isActive: true };
    for (const [collection, row] of Object.entries({ customers: syntheticCustomer, reservations: syntheticReservation, orders: syntheticOrder, 'stage-templates': planningTemplate, 'item-templates': itemTemplate, 'terms-and-conditions': governanceTerms, users: governanceStaff, 'activity-logs': governanceLog })) {
      if (path === `/admin/${collection}`) {
        return page([row]);
      }
      if (path.startsWith(`/admin/${collection}/`)) {
        return ok(row);
      }
    }
    state.unknown.push(path);
    return fail(404);
  });
  return state;
}
