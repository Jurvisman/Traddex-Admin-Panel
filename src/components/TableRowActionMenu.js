import { useEffect, useRef, useState } from 'react';

const ICON_MORE = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="5" cy="12" r="1.75" fill="currentColor" />
    <circle cx="12" cy="12" r="1.75" fill="currentColor" />
    <circle cx="19" cy="12" r="1.75" fill="currentColor" />
  </svg>
);

const ICON_EDIT = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 16.7V19h2.3l9.9-9.9-2.3-2.3-9.9 9.9Zm13.7-8.4a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.3 1.3 2.3 2.3 1.3-1.3Z"
      fill="currentColor"
    />
  </svg>
);

const ICON_TRASH = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Reusable 3-dots row action menu for admin datatables.
 * @param {string|number} rowId - Unique id for this row (e.g. item.id)
 * @param {string|number|null} openRowId - Currently open menu row id
 * @param {(id: string|number|null) => void} onToggle - Called when trigger is clicked
 * @param {Array<{ label: string, onClick: () => void, icon?: ReactNode, danger?: boolean }>} actions - Menu items
 */
function TableRowActionMenu({ rowId, openRowId, onToggle, actions }) {
  const menuRef = useRef(null);
  const isOpen = openRowId === rowId;
  const [dropdownStyle, setDropdownStyle] = useState(null);

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

  // When menu is open, decide whether to render dropdown above or below
  // Position dropdown using viewport coordinates so it doesn't get cut off
  useEffect(() => {
    if (!isOpen) return;
    const menuEl = menuRef.current;
    if (!menuEl) return;

    const measurePlacement = () => {
      const triggerRect = menuEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const margin = 12;
      const estimatedHeight = actions.length * 40 + 20;

      let top = triggerRect.bottom + 6;
      if (top + estimatedHeight + margin > viewportHeight) {
        top = Math.max(margin, triggerRect.top - estimatedHeight - 6);
      }

      const right = Math.max(0, window.innerWidth - triggerRect.right);

      setDropdownStyle({
        position: 'fixed',
        top,
        right,
        zIndex: 60,
      });
    };

    const rafId = window.requestAnimationFrame(measurePlacement);
    window.addEventListener('resize', measurePlacement);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', measurePlacement);
    };
  }, [isOpen, actions.length]);

  const getIcon = (action, index) => {
    if (action.icon) return action.icon;
    if (action.danger) return ICON_TRASH;
    return ICON_EDIT;
  };

  return (
    <div className="table-action-menu" ref={menuRef}>
      <button
        type="button"
        className="table-action-trigger"
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
        <div className="table-action-dropdown" style={dropdownStyle || undefined}>
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
              <span className="table-action-menu-icon">{getIcon(action, index)}</span>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default TableRowActionMenu;
