import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { UnitGallery } from '../../src/Features/Units/Public/UnitGallery';
import { createMediaResolver } from '../../src/Media/delivery';
import { renderUi } from '../renderUi';

const images = [1, 2].map(index => ({ id: String(index), imagePath: `PRIVATE-${index}`, altText: `Residence ${index}` }));
const resolver = createMediaResolver({ origin: 'https://media.example.test',
  mapIdentifier: identifier => `https://media.example.test/${identifier === 'PRIVATE-1' ? 'one' : 'two'}.webp` });
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => vi.restoreAllMocks());

test('approved gallery images support thumbnails, zoom, keyboard navigation and focus restoration', () => {
  const { container } = renderUi(<UnitGallery images={images} resolver={resolver} />);
  fireEvent.click(screen.getByRole('button', { name: 'Photo 2 of 2' }));
  const zoom = screen.getByRole('button', { name: 'Enlarge photograph' });
  zoom.focus(); fireEvent.click(zoom);
  const dialog = screen.getByRole('dialog');
  expect(dialog.querySelector('.ud-lightbox')).toHaveFocus();
  expect(within(dialog).getByRole('img')).toHaveAttribute('src', 'https://media.example.test/two.webp');
  fireEvent.keyDown(within(dialog).getByRole('img'), { key: 'ArrowLeft' });
  expect(within(dialog).getByRole('img')).toHaveAttribute('src', 'https://media.example.test/one.webp');
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(zoom).toHaveFocus();
  expect(container.innerHTML).not.toContain('PRIVATE-');
});

test('failed approved images and unmapped identifiers fall back without an unusable zoom action', () => {
  const view = renderUi(<UnitGallery images={images} resolver={resolver} />);
  fireEvent.error(view.container.querySelector('.ud-gallery-main img')!);
  expect(screen.queryByRole('button', { name: 'Enlarge photograph' })).toBeNull();
  expect(screen.getAllByRole('img', { name: 'Photo unavailable' }).length).toBeGreaterThan(0);
  view.unmount();
  const fallback = renderUi(<UnitGallery images={images} />);
  expect(fallback.container.querySelector('img')).toBeNull();
  expect(fallback.container.innerHTML).not.toContain('PRIVATE-');
});
