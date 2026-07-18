'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  error?: string | null;
  getSearchText: (row: T) => string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  rowActions?: (row: T) => React.ReactNode;
}

const PAGE_SIZE = 10;

export function DataTable<T>({
  columns,
  rows,
  isLoading,
  error,
  getSearchText,
  searchPlaceholder = 'Search…',
  emptyLabel = 'No records yet',
  rowActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) => getSearchText(row).toLowerCase().includes(q));
  }, [rows, search, getSearchText]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-md">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-input bg-background py-sm pl-9 pr-md text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-ambient">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-md py-sm font-medium">
                  {col.label}
                </th>
              ))}
              {rowActions && <th className="px-md py-sm font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={columns.length + 1} className="px-md py-md text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={columns.length + 1} className="px-md py-md text-destructive">
                  {error}
                </td>
              </tr>
            )}
            {!isLoading && !error && pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-md py-md text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            )}
            {pageRows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-md py-sm text-foreground">
                    {col.render(row)}
                  </td>
                ))}
                {rowActions && <td className="whitespace-nowrap px-md py-sm">{rowActions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}-{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length}
          </span>
          {pageCount > 1 && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="cursor-pointer rounded border border-border px-sm py-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                className="cursor-pointer rounded border border-border px-sm py-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
