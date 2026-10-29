import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useCallback } from 'react';
import { readCatalogueQuery, writeCatalogueQuery } from '../../src/Catalogue/query';
import { createMediaResolver, resolveMedia } from '../../src/Catalogue/media';
import { useCatalogueRead } from '../../src/Hooks/useCatalogueRead';
import { MediaGallery } from '../../src/Components/Catalogue/MediaGallery';
import { renderUi } from '../renderUi';

const city = '00000000-0000-0000-0000-000000000001';
test('URL filters round-trip only approved values and numeric enums', () => {
  const query = readCatalogueQuery(new URLSearchParams(`search=hello&cityId=${city}&projectType=0&pageNumber=3&pageSize=24&sort=price&isAvailable=true`), true);
  expect(query).toEqual({ search: 'hello', cityId: city, projectType: 0, pageNumber: 3, pageSize: 24 });
  expect(readCatalogueQuery(writeCatalogueQuery(query), true)).toEqual(query);
  expect(writeCatalogueQuery(query).has('sort')).toBe(false);
  expect(readCatalogueQuery(new URLSearchParams('cityId=' + city + '&projectType=1&search=unit'), false)).toEqual({ search: 'unit', pageNumber: 1, pageSize: 12 });
});
test.each(['pageNumber=0&pageSize=101', 'pageNumber=-2&pageSize=0', 'pageNumber=Infinity&pageSize=NaN', 'pageNumber=2147483648&pageSize=1.5'])('invalid pagination is normalized: %s', (raw) => {
  expect(readCatalogueQuery(new URLSearchParams(raw), true)).toEqual({ pageNumber: 1, pageSize: 12 });
});
test('invalid GUIDs/types are omitted and text respects the backend maximum', () => {
  expect(readCatalogueQuery(new URLSearchParams('cityId=bad&areaId=00000000-0000-0000-0000-000000000000&projectType=Initiative'), true)).toEqual({ pageNumber: 1, pageSize: 12 });
  expect(readCatalogueQuery(new URLSearchParams('search=' + 'x'.repeat(101)), false).search).toHaveLength(100);
});

test('storage paths and origin-only configuration never become image URLs', () => {
  expect(resolveMedia('C:\\private\\image.png')).toBeUndefined();
  expect(resolveMedia('https://media.example.test/image.png')).toBeUndefined();
  expect(createMediaResolver()('uploads/a.png')).toBeUndefined();
});
test.each(['http://media.example.test/a.png', 'https://evil.test/a.png', 'https://media.example.test.evil.test/a.png', 'https://user:password@media.example.test/a.png', '//media.example.test/a.png', 'file:///a.png', 'C:\\private\\a.png', 'https://media.example.test/a.png#fragment'])('rejects unapproved mapped image candidate: %s', (candidate) => {
  expect(createMediaResolver({ origin: 'https://media.example.test', mapIdentifier: () => candidate })('storage-key')).toBeUndefined();
});
test('only an explicit mapping to the exact approved HTTPS origin is accepted', () => {
  const mapping = vi.fn((id: string) => id === 'known' ? 'https://media.example.test/approved/a.webp' : undefined);
  const resolver = createMediaResolver({ origin: 'https://media.example.test', mapIdentifier: mapping });
  expect(resolver('known')).toBe('https://media.example.test/approved/a.webp');
  expect(resolver('unknown')).toBeUndefined();
  expect(createMediaResolver({ origin: 'http://media.example.test', mapIdentifier: mapping })('known')).toBeUndefined();
  expect(createMediaResolver({ origin: 'https://media.example.test', mapIdentifier: () => { throw new Error('private mapping failure'); } })('known')).toBeUndefined();
});
test('gallery hides identifiers, localizes navigation and survives a broken approved image', () => {
  const resolver = createMediaResolver({ origin: 'https://media.example.test', mapIdentifier: () => 'https://media.example.test/a.png' });
  const { container } = renderUi(<MediaGallery images={[{ id: 'a', imagePath: 'PRIVATE-DISK-IDENTIFIER', altText: 'Supplied alt' }, { id: 'b', imagePath: 'PRIVATE-SECOND', altText: null }]} resolver={resolver} />);
  expect(container.outerHTML).not.toContain('PRIVATE');
  fireEvent.error(screen.getByRole('img', { name: 'Supplied alt' }));
  expect(screen.getByRole('img', { name: 'Photo unavailable' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  expect(screen.getByRole('img', { name: 'Property photograph' })).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Photo 2 of 2');
  expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled();
});

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }
test('out-of-order catalogue reads cannot replace current data, even when a loader ignores abort', async () => {
  const first = deferred<string>(); const second = deferred<string>();
  const signals: AbortSignal[] = [];
  const request = vi.fn((key: string, signal: AbortSignal) => { signals.push(signal); return key === 'first' ? first.promise : second.promise; });
  const hook = renderHook(({ id }) => useCatalogueRead(id, useCallback((signal) => request(id, signal), [id])), { initialProps: { id: 'first' } });
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  hook.rerender({ id: 'second' });
  expect(hook.result.current.result.status).toBe('loading');
  expect(signals[0]!.aborted).toBe(true);
  await act(async () => { second.resolve('current'); });
  expect(hook.result.current.result).toEqual({ status: 'success', data: 'current' });
  await act(async () => { first.resolve('obsolete'); });
  expect(hook.result.current.result).toEqual({ status: 'success', data: 'current' });
});
test('changing detail IDs hides previous content immediately; unmount aborts the pending read', async () => {
  const request = vi.fn<(signal: AbortSignal) => Promise<string>>().mockResolvedValue('initial');
  const hook = renderHook(({ id }) => useCatalogueRead(id, request), { initialProps: { id: 'one' } });
  await waitFor(() => expect(hook.result.current.result.status).toBe('success'));
  request.mockImplementation(() => new Promise(() => {}));
  hook.rerender({ id: 'two' });
  expect(hook.result.current.result.status).toBe('loading');
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  hook.unmount();
  expect(request.mock.calls[1]![0].aborted).toBe(true);
});
test('failure/retry discards old content and a disabled read never dispatches', async () => {
  const request = vi.fn<(signal: AbortSignal) => Promise<string>>().mockRejectedValueOnce(new Error('not for display')).mockResolvedValue('retried');
  const hook = renderHook(({ enabled }) => useCatalogueRead('same', request, enabled), { initialProps: { enabled: false } });
  expect(hook.result.current.result.status).toBe('idle'); expect(request).not.toHaveBeenCalled();
  hook.rerender({ enabled: true });
  await waitFor(() => expect(hook.result.current.result.status).toBe('error'));
  act(() => hook.result.current.reload());
  expect(hook.result.current.result.status).toBe('loading');
  await waitFor(() => expect(hook.result.current.result).toEqual({ status: 'success', data: 'retried' }));
});
