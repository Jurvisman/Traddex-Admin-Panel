import { useEffect, useRef } from 'react';

const ICON_MORE = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 7a1.75 1.75 0 1 1 0-3.5A1.75 1.75 0 0 1 12 7Zm0 6.75a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Zm0 6.75a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z"
      fill="currentColor"
    />
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
        <div className="table-action-dropdown">
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
