import { useMemo } from 'react';

const COUNT_LABELS = {
  mainCategories: 'Main categories',
  categories: 'Categories',
  subCategories: 'Sub-categories',
  products: 'Live products',
  services: 'Live services',
  businessProfiles: 'Business profiles',
  businessCategoryMappings: 'Business category mappings',
};

function TaxonomyDeleteImpactDialog({
  open,
  impact,
  loading = false,
  deleting = false,
  deactivating = false,
  canDeactivate = false,
  onCancel,
  onDelete,
  onDeactivate,
}) {
  const rows = useMemo(() => {
    const counts = impact?.counts || {};
    return Object.entries(counts)
      .map(([key, value]) => ({ key, label: COUNT_LABELS[key] || key, value: Number(value || 0) }))
      .filter((row) => row.value > 0);
  }, [impact]);

  if (!open) return null;

  const canDelete = Boolean(impact?.canDelete);
  const title = loading
    ? 'Checking usage'
    : canDelete
      ? `Delete ${impact?.taxonomyType || 'item'}?`
      : `Deactivate ${impact?.taxonomyType || 'item'} instead`;
  const busy = loading || deleting || deactivating;

  return (
    <div className="confirm-dialog-backdrop" onClick={busy ? undefined : onCancel}>
      <div className="confirm-dialog" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()}>
        <div className="confirm-dialog-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={canDelete ? '#6345ED' : '#dc2626'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">
          {loading
            ? 'Please wait while we check products, services, business profiles and child records.'
            : impact?.message || 'Review the dependent records before continuing.'}
        </p>

        {!loading && (
          <div style={{ textAlign: 'left', marginTop: 16 }}>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 10 }}>
              {impact?.taxonomyName || 'Selected item'}
            </div>
            {rows.length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {rows.map((row) => (
                  <div
                    key={row.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '9px 11px',
                      borderRadius: 10,
                      background: '#f9fafb',
                      border: '1px solid #eef0f4',
                    }}
                  >
                    <span style={{ color: '#4b5563' }}>{row.label}</span>
                    <strong style={{ color: '#111827' }}>{row.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f0fdf4', color: '#15803d', fontWeight: 600 }}>
                No dependent records found.
              </div>
            )}
          </div>
        )}

        <div className="confirm-dialog-actions">
          <button type="button" className="ghost-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          {!loading && !canDelete && canDeactivate && (
            <button type="button" className="primary-btn compact" onClick={onDeactivate} disabled={busy}>
              {deactivating ? 'Deactivating...' : 'Deactivate instead'}
            </button>
          )}
          {!loading && canDelete && (
            <button type="button" className="primary-btn compact confirm-danger-btn" onClick={onDelete} disabled={busy}>
              {deleting ? 'Deleting...' : 'Delete permanently'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaxonomyDeleteImpactDialog;
