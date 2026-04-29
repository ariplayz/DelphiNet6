import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (value: T) => React.ReactNode;
}

interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  keyField: string;
  onRowClick?: (row: T) => void;
}

export function Table<T extends Record<string, unknown>>({ columns, data, keyField, onRowClick }: TableProps<T>) {
  return (
    <div className="bg-bg-surface rounded-xl border border-border overflow-hidden">
      {/* Desktop / tablet table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className="border-t border-border hover:bg-bg-hover transition-colors cursor-pointer"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-text-primary">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-text-secondary">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card stack */}
      <div className="sm:hidden divide-y divide-border">
        {data.map((row) => (
          <button
            key={String(row[keyField])}
            type="button"
            onClick={() => onRowClick?.(row)}
            className="w-full text-left p-4 hover:bg-bg-hover active:bg-bg-hover transition-colors touch-manipulation"
          >
            <div className="flex flex-col gap-1.5">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-start gap-3">
                  <span className="text-xs text-text-secondary uppercase tracking-wider flex-shrink-0">
                    {col.header}
                  </span>
                  <span className="text-sm text-text-primary text-right min-w-0">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </span>
                </div>
              ))}
            </div>
          </button>
        ))}
        {data.length === 0 && (
          <div className="p-8 text-center text-text-secondary text-sm">No data</div>
        )}
      </div>
    </div>
  );
}
