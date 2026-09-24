'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  bulkActions?: React.ReactNode;
  pageSize?: number;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: React.ReactNode;
  renderMobileCard?: (item: T, isSelected: boolean, onToggleSelect: () => void) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  error = null,
  onRetry,
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchFilter,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  bulkActions,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptySubtitle = 'Get started by creating a new entry or adjusting filters.',
  emptyAction,
  renderMobileCard,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map((c) => c.key)),
  );
  const [showColMenu, setShowColMenu] = useState(false);

  // Filter Data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    if (searchFilter) {
      return data.filter((item) => searchFilter(item, searchQuery.trim()));
    }
    const query = searchQuery.toLowerCase();
    return data.filter((item: any) =>
      Object.values(item).some(
        (val) => val && String(val).toLowerCase().includes(query),
      ),
    );
  }, [data, searchQuery, searchFilter]);

  // Sort Data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const comparison = valA > valB ? 1 : -1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedKeys.has(keyExtractor(item)));

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (isAllSelected) {
      paginatedData.forEach((item) => next.delete(keyExtractor(item)));
    } else {
      paginatedData.forEach((item) => next.add(keyExtractor(item)));
    }
    onSelectionChange(next);
  };

  const toggleSelectItem = (key: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  };

  const toggleColumnVisibility = (key: string) => {
    const next = new Set(visibleColumns);
    if (next.has(key)) {
      if (next.size > 1) next.delete(key);
    } else {
      next.add(key);
    }
    setVisibleColumns(next);
  };

  return (
    <div className="w-full flex flex-col gap-3 text-start">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {searchable && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full ps-10 pe-3.5 py-2.5 bg-app-subtle/80 dark:bg-app-surface border border-app-border rounded-btn text-xs sm:text-sm text-app-text placeholder:text-app-muted/60 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition"
            />
          </div>
        )}

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectable && selectedKeys.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-btn bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                {selectedKeys.size} selected
              </span>
              {bulkActions}
            </div>
          )}

          {/* Column Visibility Menu */}
          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-btn border border-app-border bg-app-card hover:bg-app-subtle text-xs font-semibold text-app-text transition shadow-soft-xs"
              title="Columns"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Columns</span>
            </button>
            {showColMenu && (
              <div className="absolute end-0 mt-2 w-48 p-2 rounded-btn bg-app-surface border border-app-border shadow-soft-xl z-40 animate-scale-in">
                <p className="text-[11px] font-bold text-app-muted uppercase tracking-wider px-2 py-1">
                  Toggle Columns
                </p>
                {columns.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumnVisibility(col.key)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-btn text-xs hover:bg-app-subtle text-app-text transition cursor-pointer"
                  >
                    <span>{col.header}</span>
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.key)}
                      readOnly
                      className="rounded accent-brand-primary cursor-pointer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="w-full rounded-card border border-app-border bg-app-card overflow-hidden shadow-soft-xs">
        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full rounded-btn skeleton-shimmer bg-app-subtle/50" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="w-10 h-10 text-brand-danger mb-3" />
            <h4 className="text-base font-semibold text-app-text">Failed to load data</h4>
            <p className="text-xs text-app-muted max-w-sm mt-1">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 px-4 py-2 rounded-btn text-xs font-semibold bg-app-subtle hover:bg-app-surface text-app-text border border-app-border transition"
              >
                Retry Request
              </button>
            )}
          </div>
        ) : sortedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Inbox className="w-10 h-10 text-app-muted mb-3 opacity-60" />
            <h4 className="text-base font-semibold text-app-text">{emptyTitle}</h4>
            <p className="text-xs text-app-muted max-w-sm mt-1">{emptySubtitle}</p>
            {emptyAction && <div className="mt-4">{emptyAction}</div>}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-app-border bg-app-subtle/40 text-app-muted font-semibold uppercase tracking-wider">
                    {selectable && (
                      <th className="w-10 px-4 py-3.5 text-center">
                        <button
                          onClick={toggleSelectAll}
                          className="text-app-muted hover:text-app-text flex items-center justify-center mx-auto"
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                    )}
                    {columns
                      .filter((c) => visibleColumns.has(c.key))
                      .map((col) => (
                        <th
                          key={col.key}
                          onClick={() => col.sortable && handleSort(col.key)}
                          className={clsx(
                            'px-4 py-3.5 text-start select-none',
                            col.sortable && 'cursor-pointer hover:text-app-text transition',
                            col.className,
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col.header}</span>
                            {col.sortable && (
                              <span className="text-app-muted">
                                {sortKey === col.key ? (
                                  sortOrder === 'asc' ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-brand-primary" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-brand-primary" />
                                  )
                                ) : (
                                  <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/60">
                  {paginatedData.map((item) => {
                    const key = keyExtractor(item);
                    const isSelected = selectedKeys.has(key);
                    return (
                      <tr
                        key={key}
                        className={clsx(
                          'hover:bg-app-subtle/50 dark:hover:bg-app-surface/60 transition-colors',
                          isSelected && 'bg-brand-primary/5',
                        )}
                      >
                        {selectable && (
                          <td className="w-10 px-4 py-3 text-center">
                            <button
                              onClick={() => toggleSelectItem(key)}
                              className="text-app-muted hover:text-app-text flex items-center justify-center mx-auto"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-brand-primary" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        )}
                        {columns
                          .filter((c) => visibleColumns.has(c.key))
                          .map((col) => (
                            <td key={col.key} className={clsx('px-4 py-3 text-app-text', col.className)}>
                              {col.render ? col.render(item) : (item as any)[col.key] || '—'}
                            </td>
                          ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards / Responsive View */}
            <div className="md:hidden divide-y divide-app-border">
              {paginatedData.map((item) => {
                const key = keyExtractor(item);
                const isSelected = selectedKeys.has(key);
                if (renderMobileCard) {
                  return (
                    <div key={key} className="p-3">
                      {renderMobileCard(item, isSelected, () => toggleSelectItem(key))}
                    </div>
                  );
                }
                return (
                  <div
                    key={key}
                    className={clsx(
                      'p-4 flex flex-col gap-2.5 transition-colors',
                      isSelected && 'bg-brand-primary/5',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {selectable && (
                        <button
                          onClick={() => toggleSelectItem(key)}
                          className="text-app-muted hover:text-app-text"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        {columns.length > 0 && (
                          <div className="font-semibold text-sm text-app-text truncate">
                            {columns[0].render ? columns[0].render(item) : (item as any)[columns[0].key]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-app-border/60">
                      {columns.slice(1, 5).map((col) => (
                        <div key={col.key} className="flex flex-col">
                          <span className="text-[10px] text-app-muted uppercase font-semibold">
                            {col.header}
                          </span>
                          <span className="text-app-text truncate">
                            {col.render ? col.render(item) : (item as any)[col.key] || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {sortedData.length > pageSize && (
          <div className="px-5 py-3 border-t border-app-border bg-app-subtle/30 flex items-center justify-between text-xs text-app-muted">
            <span>
              Showing {Math.min((currentPage - 1) * pageSize + 1, sortedData.length)} to{' '}
              {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-btn border border-app-border hover:bg-app-subtle text-app-text disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
              <span className="px-2 font-semibold text-app-text">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-btn border border-app-border hover:bg-app-subtle text-app-text disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
