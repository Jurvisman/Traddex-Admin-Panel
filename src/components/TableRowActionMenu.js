import { useEffect, useRef, useState } from 'react';

const ICON_MORE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const ICON_VIEW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#6345ED" strokeWidth="2" style={{ width: 16, height: 16 }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ICON_EDIT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" style={{ width: 16, height: 16 }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ICON_TRASH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ width: 16, height: 16 }}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ICON_POWER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

/**
 * Reusable 3-dots row action menu for admin datatables.
 * Exact match with ProductPage action menu.
 */
function TableRowActionMenu({ rowId, openRowId, onToggle, actions }) {
  const menuRef = useRef(null);
  const isOpen = openRowId === rowId;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onToggle(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, onToggle]);

  const getIcon = (action) => {
    if (action.icon) return action.icon;
    const label = String(action.label || '').toLowerCase();
    if (label.includes('view')) return ICON_VIEW;
    if (label.includes('edit')) return ICON_EDIT;
    if (label.includes('delete') || label.includes('remove') || action.danger) return ICON_TRASH;
    if (label.includes('activate') || label.includes('deactivate')) return ICON_POWER;
    return ICON_EDIT;
  };

  return (
    <div className="product-table-action-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="icon-btn product-table-action-trigger"
        aria-label="Actions"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(isOpen ? null : rowId);
        }}
      >
        {ICON_MORE}
      </button>
      {isOpen ? (
        <div className="product-table-action-dropdown">
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              className={action.danger ? 'danger' : ''}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(null);
                action.onClick();
              }}
            >
              <span className="gsc-product-view-menu-icon">{getIcon(action)}</span>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default TableRowActionMenu;
