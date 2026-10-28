import { fireEvent, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useState } from 'react';
import { Button } from '../../src/Components/Button';
import { Input, Checkbox, Select, Textarea } from '../../src/Components/Fields';
import { Pagination } from '../../src/Components/Pagination';
import { DataTable } from '../../src/Components/DataTable';
import { renderUi } from '../renderUi';

test('fields connect their translated label, hint, error and LTR identifier semantics', () => {
  renderUi(<><Input id="email" label="Email" type="email" hint="Use your email" error="Invalid email" />
    <Input id="password" label="Password" type="password" /><Checkbox id="check" label="Agree" pending />
    <Select id="select" label="View" pending><option>One</option></Select><Textarea id="notes" label="Notes" disabled /></>);
  expect(screen.getByLabelText('Email')).toHaveAttribute('dir', 'ltr');
  expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Use your email Invalid email');
  expect(screen.getByLabelText('Password')).toHaveAttribute('dir', 'ltr');
  for (const label of ['Agree', 'View', 'Notes']) expect(screen.getByLabelText(label)).toBeDisabled();
});

test('a pending button prevents duplicate actions and exposes its busy state', () => {
  const action = vi.fn();
  renderUi(<Button pending onClick={action}>Save</Button>);
  const button = screen.getByRole('button', { name: 'Saving…' });
  expect(button).toHaveAttribute('aria-busy', 'true');
  fireEvent.click(button);
  expect(action).not.toHaveBeenCalled();
});

function Pages({ total = 3, pending = false }: { total?: number; pending?: boolean }) {
  const [page, setPage] = useState(1);
  return <Pagination page={page} totalPages={total} onPageChange={setPage} pending={pending} />;
}

test('pagination stays within first/last bounds and updates its announcement', () => {
  renderUi(<Pages />);
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('Page 2 of 3')).toHaveAttribute('aria-current', 'page');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
  expect(screen.getByText('Page 2 of 3')).toBeVisible();
});

test.each([[0, false], [1, false], [3, true]] as const)('zero/single/pending pages disable unavailable navigation (%s, %s)', (total, pending) => {
  renderUi(<Pages total={total} pending={pending} />);
  expect(screen.getAllByRole('button')).toHaveLength(2);
  for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  if (!total) expect(screen.getByText('No pages')).toBeVisible();
});

test('a shrinking result count clamps the display without firing a request during rendering', () => {
  const change = vi.fn();
  renderUi(<Pagination page={8} totalPages={2} onPageChange={change} />);
  expect(screen.getByText('Page 2 of 2')).toBeVisible();
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
  expect(change).toHaveBeenCalledWith(1);
});

test('table scrolling is labeled and backend text remains escaped', () => {
  renderUi(<DataTable caption="Records" scrollLabel="Scrollable records" rows={['<img src=x onerror=alert(1)>']}
    rowKey={(row) => row} columns={[{ id: 'name', header: 'Name', render: (row) => row }]} />);
  expect(screen.getByRole('region', { name: 'Scrollable records' })).toHaveAttribute('tabindex', '0');
  expect(screen.getByRole('cell')).toHaveTextContent('<img src=x onerror=alert(1)>');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
