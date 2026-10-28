import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "./Feedback";
import { ui as styles } from './ui';

export interface TableColumn<T> {
  id: string;
  header: string;
  render: (row: T) => ReactNode;
}
interface Props<T> {
  caption: string;
  scrollLabel: string;
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  pending?: boolean;
}

export function DataTable<T>({
  caption,
  scrollLabel,
  columns,
  rows,
  rowKey,
  pending = false,
}: Props<T>) {
  const { t } = useTranslation();
  return (
    <div
      className={styles.tableRegion}
      role="region"
      aria-label={scrollLabel}
      tabIndex={0}
    >
      <table className={styles.table} aria-busy={pending || undefined}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pending ? (
            <tr>
              <td colSpan={columns.length}>
                <Loading />
              </td>
            </tr>
          ) : rows.length ? (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.id}>{column.render(row)}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>{t("emptyTitle")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
