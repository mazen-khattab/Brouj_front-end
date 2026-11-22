import type { BrowserContext } from '@playwright/test';
import { sessionCors } from './sessionFixtures';
import { ProjectType, type InitiativeStagePaymentDto, type ProjectDto, type ProjectListDto, type UnitDto, type UnitPaymentInstallmentDto } from '../../src/Types/contracts';

export const catalogueIds = {
  city: '10000000-0000-4000-8000-000000000001', city2: '10000000-0000-4000-8000-000000000002',
  area: '20000000-0000-4000-8000-000000000001',
  project: '30000000-0000-4000-8000-000000000001', unit: '40000000-0000-4000-8000-000000000001',
};
export const catalogueProject: ProjectDto = {
  id: catalogueIds.project, name: 'Garden Residence 1', areaId: catalogueIds.area,
  description: 'A description supplied by the catalogue.\nSecond paragraph. <b>Plain text</b>', latitude: 30.05, longitude: 31.2,
  size: 1200, projectType: 1, price: 12500000, floorCount: 5, plannedUnitCount: 20,
  startingMeterPrice: 999, unitSavingPercentage: 20,
  neighborPrice: 13000000, drawDate: '2026-12-01T12:00:00Z', isGarage: false, garagePrice: 0,
  amenities: [{ name: 'Garden', value: 'Shared outdoor space' }],
  images: [{ id: 'image-one', imagePath: 'C:\\PRIVATE-STORAGE\\project.webp', altText: 'Supplied photograph' }, { id: 'image-two', imagePath: '/PRIVATE-STORAGE/other.webp', altText: null }],
};
export const catalogueUnit: UnitDto = {
  id: catalogueIds.unit, projectId: catalogueIds.project, number: 'A-204', meterPrice: 999, floorNumber: 2,
  size: 100, neighborMeterPrice: 1250, totalPrice: 1234567.89, percentage: 9.876543,
  isAvailable: true, isGarage: false, garagePrice: 0,
  amenities: [{ name: 'Balcony', value: 'Garden view' }], images: catalogueProject.images,
  paymentPlan: [],
};
export const cataloguePaymentPlan: UnitPaymentInstallmentDto[] = [
  { installmentName: 'Down payment', installmentNumber: 1, installmentPercentage: 33.3333, installmentPeriodMonths: 0 },
  { installmentName: 'القسط الثاني B', installmentNumber: 3, installmentPercentage: 66.6667, installmentPeriodMonths: 6 },
];
export const initiativePaymentPlan: readonly InitiativeStagePaymentDto[] = [
  { stageId: '81ee47ee-35b8-4c35-bf38-43892311cd65', stageName: 'Foundations', unitPercentage: 10, stageCost: 10000 },
  { stageId: '6934bedc-2157-4729-acc3-b397bcd61647', stageName: 'التشطيبات B', unitPercentage: 10, stageCost: 1.2346 },
  { stageId: 'a1bb5aba-b5df-4df0-821e-68e7bc6ad951', stageName: 'Finishing', unitPercentage: 10, stageCost: null },
  { stageId: '1fd2ff9d-6d3a-45c3-94f8-4f5bd63b5652', stageName: 'Handover', unitPercentage: 10, stageCost: 0 },
];
export const cataloguePattern = /https:\/\/localhost:7249\/api\/v1\/(cities|areas|projects|units|terms-and-conditions)(?:\/|\?|$)/;

export async function catalogueServer(context: BrowserContext) {
  const state = { failProjects: false, failTerms: false, missingTerms: false, missingProject: false, missingUnit: false, unitAvailable: true, projectCount: 25, regularProjectCount: 0, failCitiesLookup: false, failAreasLookup: false, unitPaymentPlan: false, initiativePaymentPlan: false };
  const calls: URL[] = []; const completed: string[] = [];
  await context.route(cataloguePattern, async (route) => {
    const url = new URL(route.request().url()); calls.push(url);
    const path = url.pathname.replace('/api/v1', '');
    const query = url.searchParams;
    const ok = (data: unknown) => route.fulfill({ headers: sessionCors, json: { success: true, data, message: null } });
    const fail = (status: number) => route.fulfill({ status, headers: sessionCors, json: { status } });
    if (route.request().method() !== 'GET') return fail(405);
    const page = <T,>(items: T[]) => {
      const pageNumber = Number(query.get('pageNumber') ?? 1), pageSize = Number(query.get('pageSize') ?? 20);
      return ok({ items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), totalCount: items.length, pageNumber, pageSize, totalPages: Math.ceil(items.length / pageSize) });
    };
    const search = query.get('search')?.toLowerCase() ?? '';
    const cities = [{ id: catalogueIds.city, name: 'Cairo' }, { id: catalogueIds.city2, name: 'Alexandria' }];
    const area = { id: catalogueIds.area, name: 'East Quarter', cityId: catalogueIds.city, cityName: 'Cairo' };
    if (path === '/cities/lookup') {
      if (state.failCitiesLookup) return fail(503);
      if (search === 'slow') {
        await new Promise((resolve) => setTimeout(resolve, 900)); completed.push('lookup-slow');
        try { return await ok([{ id: catalogueIds.city, name: 'Obsolete city' }]); } catch { return; }
      }
      if (search === 'latest') return ok([{ id: catalogueIds.city2, name: 'Latest city' }]);
      return ok(cities.filter((item) => item.name.toLowerCase().includes(search)));
    }
    if (path === '/areas/lookup') {
      if (state.failAreasLookup) return fail(503);
      return ok([{ id: area.id, name: area.name }].filter((item) => item.name.toLowerCase().includes(search)));
    }
    if (path === '/cities') return page(cities.filter((item) => item.name.toLowerCase().includes(search)));
    if (path.startsWith('/cities/') && path.endsWith('/areas')) return page(area.name.toLowerCase().includes(search) ? [area] : []);
    if (path.startsWith('/cities/')) return ok(cities.find((item) => item.id === path.split('/').at(-1)) ?? cities[0]);
    if (path === '/areas') return page([area].filter((item) => item.name.toLowerCase().includes(search) && (!query.has('cityId') || query.get('cityId') === item.cityId)));
    if (path.startsWith('/areas/')) return ok({ ...area, amenities: [{ name: 'Transport', value: 'Local connections' }] });
    if (path === '/projects') {
      if (state.failProjects) return fail(503);
      if (search === 'slow') {
        await new Promise((resolve) => setTimeout(resolve, 900)); completed.push('slow');
        try { return await page([{ ...catalogueProject, name: 'Obsolete project', areaName: area.name, cityId: catalogueIds.city }]); } catch { return; }
      }
      if (search === 'latest') return page([{ ...catalogueProject, name: 'Latest project', areaName: area.name, cityId: catalogueIds.city }]);
      const rows: ProjectListDto[] = Array.from({ length: state.projectCount }, (_, index) => ({
        id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, name: `Garden Residence ${index + 1}`,
        areaId: area.id, areaName: area.name, cityId: catalogueIds.city, projectType: 1, price: 12500000, size: 1200,
      }));
      const regular: ProjectListDto[] = Array.from({ length: state.regularProjectCount }, (_, index) => ({
        id: `30000000-0000-4000-8001-${String(index + 1).padStart(12, '0')}`, name: `Terrace Residence ${index + 1}`,
        areaId: area.id, areaName: area.name, cityId: catalogueIds.city, projectType: ProjectType.Regular, price: 9500000, size: 900,
      }));
      return page([...rows, ...regular].filter((item) => item.name.toLowerCase().includes(search) && (!query.has('cityId') || query.get('cityId') === item.cityId) && (!query.has('areaId') || query.get('areaId') === item.areaId) && (!query.has('projectType') || query.get('projectType') === String(item.projectType))));
    }
    if (path.startsWith('/projects/') && path.endsWith('/units')) return page([catalogueUnit].filter((item) => item.number.toLowerCase().includes(search)));
    if (path.endsWith('/time-plan')) return ok({ id: '70000000-0000-4000-8000-000000000001', projectId: catalogueIds.project, name: 'Published schedule', deliveryDate: '2027-12-01T12:00:00Z', stages: [] });
    if (path.startsWith('/projects/')) return state.missingProject ? fail(404) : ok(state.unitPaymentPlan ? { ...catalogueProject, projectType: ProjectType.Regular } : catalogueProject);
    if (path.startsWith('/units/')) return state.missingUnit || query.get('projectId') !== catalogueIds.project ? fail(404) : ok({
      ...catalogueUnit, isAvailable: state.unitAvailable,
      ...(state.initiativePaymentPlan && { percentage: 10 }),
      paymentPlan: state.unitPaymentPlan ? cataloguePaymentPlan : state.initiativePaymentPlan ? initiativePaymentPlan : catalogueUnit.paymentPlan,
    });
    if (path === '/terms-and-conditions/current') {
      if (state.failTerms || state.missingTerms) return fail(state.failTerms ? 503 : 404);
      return ok({ id: 'terms', title: 'Published terms', content: 'Supplied legal text.\n<b>This stays plain text.</b>', versionNumber: '3', effectiveDate: '2026-10-01T00:00:00Z', isActive: true });
    }
    return fail(404);
  });
  return { state, calls, completed };
}
