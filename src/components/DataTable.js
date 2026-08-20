import React, { useMemo, useState } from 'react';

/* ── Lightweight Inline SVG Icons (Zero external dependency) ─── */
const SearchIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const CloseIcon = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const ChevronLeftIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ChevronRightIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const ChevronsLeftIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
  </svg>
);

const ChevronsRightIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 17 5-5-5-5M13 17l5-5-5-5" />
  </svg>
);

const ArrowUpDownIcon = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
  </svg>
);

const ArrowUpIcon = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m5 12 7-7 7 7M12 19V5" />
  </svg>
);

const ArrowDownIcon = ({ size = 13, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

const InboxIcon = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const flattenValues = (obj) => {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(flattenValues).join(' ');
  }
  if (typeof obj === 'object') {
    return Object.values(obj).map(flattenValues).join(' ');
  }
  return '';
};

/**
 * Unified, Enterprise-grade Responsive DataTable for TradeX Admin Panel.
 */
export function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  hideSearch = false,
  toolbarLeft = null,
  toolbarRight = null,
  page = 0,
  pageSize = 10,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  emptyTitle = 'No records found',
  emptyDescription = 'There are no matching entries to display at this time.',
  className = '',
  onRowClick = null,
  keyExtractor = (row, index) => row?.id ?? row?._id ?? index,
}) {
  // Local sort state
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [localSearch, setLocalSearch] = useState('');
  const [localPage, setLocalPage] = useState(0);

  // Active page calculation
  const hasPageHandler = onPageChange !== undefined;
  const activePage = Math.max(0, hasPageHandler ? page : localPage);
  const handlePageChange = (newPage) => {
    if (hasPageHandler) {
      onPageChange(newPage);
    } else {
      setLocalPage(newPage);
    }
  };

  const activeSearch = onSearchChange ? search : localSearch;
  const handleSearchInput = (val) => {
    if (onSearchChange) {
      onSearchChange(val);
      if (hasPageHandler) onPageChange(0);
    } else {
      setLocalSearch(val);
      setLocalPage(0);
    }
  };

  const handleSort = (key, sortable) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Client-side filtering & sorting fallback
  const processedData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];

    if (!onSearchChange && localSearch.trim()) {
      const q = localSearch.trim().toLowerCase();
      result = result.filter((item) =>
        flattenValues(item).toLowerCase().includes(q)
      );
    }

    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, onSearchChange, localSearch, sortKey, sortOrder]);

  // Total count calculation
  const total = useMemo(() => {
    if (totalItems !== undefined && totalItems !== null && !Number.isNaN(Number(totalItems))) {
      return Math.max(0, Number(totalItems));
    }
    return processedData.length;
  }, [totalItems, processedData.length]);

  // Determine if server already returned a sliced single page vs in-memory array that needs slicing
  const isServerSideSliced = useMemo(() => {
    // If the data contains more items than pageSize, it MUST be sliced by DataTable
    if (processedData.length > pageSize) {
      return false;
    }
    // If total is greater than the data length, it means server returned only current page slice
    if (totalItems !== undefined && totalItems !== null && Number(totalItems) > processedData.length) {
      return true;
    }
    return false;
  }, [processedData.length, pageSize, totalItems]);

  const displayData = useMemo(() => {
    if (isServerSideSliced) {
      return processedData;
    }
    const start = activePage * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, isServerSideSliced, activePage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : activePage * pageSize + (displayData.length > 0 ? 1 : 0);
  const endItem = total === 0 ? 0 : Math.min(activePage * pageSize + displayData.length, total);

  return (
    <div className={`datatable-unified-container ${className}`}>
      {/* ── Top Toolbar: Left (Filters/Tabs) & Right (Search/Buttons) ── */}
      {(!hideSearch || toolbarLeft || toolbarRight) && (
        <div className="datatable-toolbar-wrapper">
          <div className="datatable-toolbar-left">{toolbarLeft}</div>

          <div className="datatable-toolbar-right">
            {!hideSearch && (
              <div className="datatable-search-input-wrap">
                <SearchIcon size={16} className="datatable-search-icon" />
                <input
                  type="text"
                  className="datatable-search-input"
                  placeholder={searchPlaceholder}
                  value={activeSearch}
                  onChange={(e) => handleSearchInput(e.target.value)}
                />
                {activeSearch && (
                  <button
                    type="button"
                    className="datatable-search-clear-btn"
                    onClick={() => handleSearchInput('')}
                    title="Clear search"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>
            )}
            {toolbarRight}
          </div>
        </div>
      )}

      {/* ── Table Shell & Horizontal Scroll Wrapper ── */}
      <div className="datatable-scroll-shell">
        <table className="datatable-gsc-table">
          <thead>
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                      textAlign: col.align || 'left',
                      cursor: col.sortable ? 'pointer' : 'default',
                    }}
                    className={col.sortable ? 'is-sortable' : ''}
                    onClick={() => handleSort(col.key, col.sortable)}
                  >
                    <div className={`th-content align-${col.align || 'left'}`}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="th-sort-icon">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ArrowUpIcon size={13} />
                            ) : (
                              <ArrowDownIcon size={13} />
                            )
                          ) : (
                            <ArrowUpDownIcon size={13} className="sort-idle" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              /* Loading Skeleton Rows */
              Array.from({ length: Math.min(pageSize, 5) }).map((_, rIdx) => (
                <tr key={`loading-row-${rIdx}`} className="datatable-loading-row">
                  {columns.map((col, cIdx) => (
                    <td key={`loading-cell-${rIdx}-${col.key || cIdx}`}>
                      <div
                        className="datatable-skeleton-box"
                        style={{ width: cIdx === 0 ? '70%' : '85%' }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayData.length > 0 ? (
              /* Data Rows */
              displayData.map((row, index) => {
                const rowKey = keyExtractor(row, index);
                return (
                  <tr
                    key={rowKey}
                    className={`datatable-row ${onRowClick ? 'is-clickable' : ''}`}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((col) => {
                      const rawValue = row[col.key];
                      const rendered = col.render
                        ? col.render(rawValue, row, index)
                        : (rawValue ?? '-');
                      return (
                        <td
                          key={`cell-${rowKey}-${col.key}`}
                          style={{
                            textAlign: col.align || 'left',
                            width: col.width,
                            minWidth: col.minWidth,
                          }}
                        >
                          {rendered}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              /* Empty State */
              <tr className="datatable-empty-row">
                <td colSpan={columns.length || 1}>
                  <div className="datatable-empty-state">
                    <div className="datatable-empty-icon-wrap">
                      <InboxIcon size={32} />
                    </div>
                    <h4 className="datatable-empty-title">{emptyTitle}</h4>
                    <p className="datatable-empty-desc">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Bottom Pagination Footer ── */}
      <div className="datatable-pagination-footer">
        <div className="datatable-pagination-meta">
          <span>
            Showing <strong>{startItem}</strong> - <strong>{endItem}</strong> of{' '}
            <strong>{total}</strong> entries
          </span>

          {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
            <div className="datatable-pagesize-select-wrap">
              <label>Rows:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  onPageSizeChange(newSize);
                  handlePageChange(0);
                }}
                className="datatable-pagesize-select"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="datatable-pagination-nav">
          <button
            type="button"
            className="datatable-page-btn"
            disabled={activePage === 0 || isLoading}
            onClick={() => handlePageChange(0)}
            title="First page"
          >
            <ChevronsLeftIcon size={16} />
          </button>
          <button
            type="button"
            className="datatable-page-btn"
            disabled={activePage === 0 || isLoading}
            onClick={() => handlePageChange(activePage - 1)}
            title="Previous page"
          >
            <ChevronLeftIcon size={16} />
          </button>

          <span className="datatable-page-current">
            Page <strong>{activePage + 1}</strong> of <strong>{totalPages}</strong>
          </span>

          <button
            type="button"
            className="datatable-page-btn"
            disabled={activePage >= totalPages - 1 || isLoading}
            onClick={() => handlePageChange(activePage + 1)}
            title="Next page"
          >
            <ChevronRightIcon size={16} />
          </button>
          <button
            type="button"
            className="datatable-page-btn"
            disabled={activePage >= totalPages - 1 || isLoading}
            onClick={() => handlePageChange(totalPages - 1)}
            title="Last page"
          >
            <ChevronsRightIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
