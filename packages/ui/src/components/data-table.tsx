"use client";

import { Button } from "@packages/ui/components/button";
import { Skeleton } from "@packages/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/components/table";
import {
  flexRender,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";

// No sorting/filtering/pagination plugins registered — those are all
// handled server-side by the caller, so the table only needs the core row model.
const features = tableFeatures({});
export type DataTableFeatures = typeof features;

type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  /** True while the first load is in flight — renders skeleton rows under real headers. */
  loading?: boolean;
  /** True while a background refetch is in flight — renders a top bar loader over existing data instead of skeletons. */
  isFetching?: boolean;
  /** Error message, if the load failed. */
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyHint?: string;
  skeletonRows?: number;
};

/**
 * Thin wrapper around @tanstack/react-table. Loading/error/empty states are
 * handled here (not via the generic DataState) because a table needs its
 * headers to stay visible and its non-data rows to span all columns.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  loading = false,
  isFetching = false,
  error = null,
  onRetry,
  emptyTitle = "No results",
  emptyHint,
  skeletonRows = 3,
}: DataTableProps<TData>) {
  const table = useTable({
    features,
    columns,
    data,
  });

  const columnCount = columns.length;
  const headerGroups = table.getHeaderGroups();

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {!loading && isFetching && (
        <div className="absolute inset-x-0 -top-px z-10 h-0.5 overflow-hidden rounded-full bg-primary/20">
          <div className="h-full w-1/3 animate-[data-table-loader_1s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      )}
      <Table>
        <TableHeader>
          {headerGroups.map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: columnCount }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : error ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-32 text-center">
                <div className="grid justify-items-center gap-2" role="alert">
                  <p className="text-sm font-medium text-destructive">
                    Something went wrong
                  </p>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    {error}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onRetry ? onRetry() : window.location.reload()
                    }
                  >
                    Try again
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-32 text-center">
                <div className="grid justify-items-center gap-1.5">
                  <p className="text-sm font-medium">{emptyTitle}</p>
                  {emptyHint && (
                    <p className="max-w-xs text-sm text-muted-foreground">
                      {emptyHint}
                    </p>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
