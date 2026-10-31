import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ProgressGallery } from '../../src/Components/Catalogue/ProgressGallery';
import { ProjectTimePlan } from '../../src/Components/Catalogue/ProjectTimePlan';
import { UnitCarousel } from '../../src/Components/Catalogue/UnitCarousel';
import { createMediaResolver } from '../../src/Catalogue/media';
import * as Units from '../../src/Services/Units';
import * as Plans from '../../src/Services/TimePlans';
import type { PaginationResult, UnitListDto, TimePlanDto } from '../../src/Types/contracts';
import { ApiError } from '../../src/Types/failures';
import { renderUi } from '../renderUi';
import { LocaleProvider } from '../../src/Context/LocaleProvider';
import { ToastProvider } from '../../src/Context/ToastProvider';

const id = '30000000-0000-4000-8000-000000000001';
const images = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `image-${index}`, imagePath: `PRIVATE-STORAGE-${index}`, description: `Photo note ${index + 1}`, sortOrder: index }));
const page = (number: number, total = 27): PaginationResult<UnitListDto> => ({
  pageNumber: number, pageSize: 12, totalCount: total, totalPages: Math.ceil(total / 12),
  items: Array.from({ length: Math.min(12, total - (number - 1) * 12) }, (_, index) => ({ id: `${id}-${(number - 1) * 12 + index}`, projectId: id, number: `A-${(number - 1) * 12 + index + 1}`, totalPrice: 1230000, meterPrice: 10000, size: 123, floorNumber: 1, isAvailable: true, neighborMeterPrice: null, percentage: null, isGarage: false, garagePrice: 0 })),
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query.includes('1280') || query.includes('768') })));
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test.each([0, 1, 3, 4, 6])('progress gallery represents %i images without exposing stored paths', (count) => {
  const { container } = renderUi(<ProgressGallery name="Structure" images={images(count)} />);
  expect(container.outerHTML).not.toContain('PRIVATE-STORAGE');
  expect(screen.queryAllByRole('button', { name: /Open photograph/ })).toHaveLength(Math.min(3, count));
  if (count > 3) expect(screen.getByRole('button', { name: `Show all ${count} photographs for Structure` })).toHaveTextContent(`+${count - 3}`);
  else expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
  if (!count) expect(screen.getByText('Photos are not available yet.')).toBeVisible();
});

test('one dialog switches between all images and viewer, restoring grid and trigger focus', () => {
  renderUi(<ProgressGallery name="Structure" images={images(6)} />);
  const trigger = screen.getByRole('button', { name: 'Show all 6 photographs for Structure' });
  trigger.focus(); fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog');
  expect(document.documentElement.style.overflow).toBe('hidden');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Open photograph 5 for Structure' }));
  expect(within(dialog).getByText('Photo 5 of 6')).toBeVisible();
  expect(within(dialog).getByText('Photo note 5')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Back to all photographs' }));
  expect(within(dialog).getByRole('button', { name: 'Open photograph 5 for Structure' })).toHaveFocus();
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(trigger).toHaveFocus();
  expect(document.documentElement.style.overflow).not.toBe('hidden');
});

test('enlarged approved images fall back safely on delivery failure', () => {
  const resolver = createMediaResolver({ origin: 'https://media.example.test', mapIdentifier: () => 'https://media.example.test/approved.webp' });
  const { container } = renderUi(<ProgressGallery name="Structure" images={images(1)} resolver={resolver} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open photograph 1 for Structure' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.error(within(dialog).getByRole('img', { name: 'Photo note 1' }));
  expect(within(dialog).getByRole('img', { name: 'Photo unavailable' })).toBeVisible();
  expect(container.outerHTML).not.toContain('PRIVATE-STORAGE');
});

test('carousel retains three batches, retries only a failed batch, and never navigates on card click', async () => {
  let failSecond = true;
  const read = vi.spyOn(Units, 'getUnitsByProject').mockImplementation(async ({ query }) => {
    const number = query?.pageNumber ?? 1;
    if (number === 2 && failSecond) throw new ApiError('transport', { status: 503 });
    return page(number);
  });
  renderUi(<UnitCarousel projectId={id} />);
  await screen.findByRole('button', { name: 'Unit A-1' });
  expect(screen.getAllByRole('article')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Unit A-1' }));
  expect(screen.getByText('Unit details are coming soon.')).toBeVisible();
  const next = screen.getByRole('button', { name: 'Next units' });
  fireEvent.click(next); fireEvent.click(next);
  await screen.findByText('More units could not load');
  expect(screen.getByRole('button', { name: 'Unit A-7' })).toBeVisible();
  failSecond = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(read).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(screen.queryByText('Loading more units')).toBeNull());
  for (let index = 0; index < 6; index++) fireEvent.click(next);
  await waitFor(() => expect(read).toHaveBeenCalledTimes(4));
  await waitFor(() => expect(screen.queryByText('Loading more units')).toBeNull());
  fireEvent.click(next);
  expect(screen.getByRole('button', { name: 'Unit A-27' })).toBeVisible();
  expect(next).toBeDisabled();
  fireEvent.keyDown(screen.getAllByRole('region').find((node) => node.hasAttribute('aria-roledescription'))!, { key: 'Home' });
  expect(screen.getByRole('button', { name: 'Unit A-1' })).toBeVisible();
  expect(read.mock.calls.map(([args]) => args.query)).toEqual([1, 2, 2, 3].map((pageNumber) => ({ pageNumber, pageSize: 12 })));
});

test('project change aborts a carousel read and rejects its late response', async () => {
  let resolve!: (value: PaginationResult<UnitListDto>) => void;
  const pending = new Promise<PaginationResult<UnitListDto>>((yes) => { resolve = yes; });
  const read = vi.spyOn(Units, 'getUnitsByProject').mockReturnValueOnce(pending).mockResolvedValueOnce({ ...page(1, 1), items: [{ ...page(1, 1).items[0]!, number: 'NEW' }] });
  const view = renderUi(<UnitCarousel projectId={id} />);
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  view.rerender(<LocaleProvider instance={view.instance}><ToastProvider><UnitCarousel projectId={`${id}-new`} /></ToastProvider></LocaleProvider>);
  await screen.findByRole('button', { name: 'Unit NEW' });
  expect(read.mock.calls[0]![1]?.signal?.aborted).toBe(true);
  await act(async () => { resolve(page(1)); });
  expect(screen.queryByRole('button', { name: 'Unit A-1' })).toBeNull();
});

test('public plan keeps server ordering, unknown status and missing-plan retry behavior', async () => {
  const plan: TimePlanDto = { id: 'plan', projectId: id, name: 'Published schedule', deliveryDate: '2027-01-01T00:00:00Z', stages: [
    { id: 'z', name: 'First supplied stage', sortOrder: 2, deliveryDate: '2027-01-01T00:00:00Z', items: [{ id: 'item', name: 'Work item', sortOrder: 1, status: 99 as 0, dueDate: '2026-12-01T00:00:00Z', confirmedDate: null, images: [] }] },
    { id: 'a', name: 'Second supplied stage', sortOrder: 1, deliveryDate: '2027-01-01T00:00:00Z', items: [] },
  ] };
  const read = vi.spyOn(Plans, 'getProjectTimePlan').mockRejectedValueOnce(new ApiError('transport', { status: 404 })).mockResolvedValueOnce(plan);
  const { container } = renderUi(<ProjectTimePlan projectId={id} />);
  await screen.findByText('The time plan is not available yet');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('Published schedule');
  expect(read).toHaveBeenCalledTimes(2);
  const stages = container.querySelectorAll('details');
  expect(stages[0]).toHaveAttribute('open'); expect(stages[1]).not.toHaveAttribute('open');
  expect(stages[0]).toHaveTextContent('First supplied stage');
  expect(screen.getByText('Unspecified')).toBeVisible();
});
