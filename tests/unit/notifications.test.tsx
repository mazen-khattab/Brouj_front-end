import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { LanguageSwitcher } from '../../src/Components/LanguageSwitcher';
import { useToast } from '../../src/Hooks/useToast';
import { renderUi } from '../renderUi';

function Example() {
  const notify = useToast();
  return <><button onClick={() => notify({ message: { key: 'showcase.success' } })}>Notify</button><LanguageSwitcher /></>;
}

afterEach(() => vi.useRealTimers());

test('a notification remains for 4999ms, expires at 5000ms, and clears its interval', () => {
  vi.useFakeTimers();
  renderUi(<Example />);
  fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
  act(() => vi.advanceTimersByTime(4999));
  expect(screen.getByRole('status')).toBeVisible();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
});

test('each notification has its own deadline and language switching does not reset it', () => {
  vi.useFakeTimers();
  const { unmount } = renderUi(<Example />);
  fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
  act(() => vi.advanceTimersByTime(2000));
  fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Arabic' }));
  expect(screen.getAllByRole('status')).toHaveLength(2);
  expect(screen.getAllByRole('status')[0]).toHaveTextContent('كل شيء جاهز');
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.getAllByRole('status')).toHaveLength(1);
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

test('manual dismissal, queue eviction and unmount clean up their intervals', () => {
  vi.useFakeTimers();
  const { unmount } = renderUi(<Example />);
  const notify = screen.getByRole('button', { name: 'Notify' });
  for (let count = 0; count < 5; count++) fireEvent.click(notify);
  expect(screen.getAllByRole('status')).toHaveLength(4);
  expect(vi.getTimerCount()).toBe(4);
  fireEvent.click(within(screen.getAllByRole('status')[0]!).getByRole('button', { name: 'Dismiss notification' }));
  expect(vi.getTimerCount()).toBe(3);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
