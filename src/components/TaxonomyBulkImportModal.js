
import { useRef, useState } from 'react';
import { commitTaxonomyImport, downloadTaxonomyTemplate, previewTaxonomyImport } from '../services/adminApi';

const ACTION_BADGE = {
  CREATE: { label: 'Create', color: '#16a34a', bg: '#dcfce7' },
  UPDATE: { label: 'Update', color: '#1d4ed8', bg: '#dbeafe' },
  SKIP: { label: 'Skip', color: '#92400e', bg: '#fef3c7' },
  EXISTING_IN_BATCH: { label: 'In Batch', color: '#6b7280', bg: '#f3f4f6' },
  ERROR: { label: 'Error', color: '#dc2626', bg: '#fee2e2' },
  WARNING: { label: 'Warning', color: '#d97706', bg: '#fef3c7' },
  NONE: { label: '—', color: '#9ca3af', bg: '#f9fafb' },
  N_A: { label: 'N/A', color: '#9ca3af', bg: '#f9fafb' },
};

function ActionBadge({ action }) {
  const cfg = ACTION_BADGE[action] || ACTION_BADGE.NONE;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="stat-card admin-stat" style={{ '--stat-accent': accent, minWidth: 120 }}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}

export default function TaxonomyBulkImportModal({ token, industries, onClose, onImportSuccess }) {
  const [industryId, setIndustryId] = useState('');
  const [mode, setMode] = useState('CREATE_ONLY');
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('setup'); // setup | preview | done
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTaxonomyTemplate(token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'taxonomy-import-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download template: ' + err.message);
    }
  };

  const handlePreview = async () => {
    if (!industryId) { setError('Please select an industry.'); return; }
    if (!file) { setError('Please select a CSV file.'); return; }
    setError('');
    setIsLoading(true);
    try {
      const resp = await previewTaxonomyImport(token, industryId, mode, file);
      setPreviewData(resp?.data || resp);
      setStep('preview');
    } catch (err) {
      setError('Preview failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;
    const rows = (previewData.rows || [])
      .filter((r) => !r.hasError)
      .map((r) => r.rowData);
    if (rows.length === 0) { setError('No valid rows to import.'); return; }
    setError('');
    setIsLoading(true);
    try {
      const resp = await commitTaxonomyImport(token, { industryId: Number(industryId), mode, rows });
      setImportResult(resp?.data || resp);
      setStep('done');
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setError('Import failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('setup');
    setPreviewData(null);
    setImportResult(null);
    setFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validRows = previewData ? (previewData.rows || []).filter((r) => !r.hasError) : [];
  const errorRows = previewData ? (previewData.rows || []).filter((r) => r.hasError) : [];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 40, paddingBottom: 40, overflowY: 'auto',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card, #fff)', borderRadius: 12, padding: 32,
        width: '95%', maxWidth: 960, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20 }}>Bulk Taxonomy Import</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #6b7280)', fontSize: 14 }}>
              Import Industry → Main Category → Category → Sub-Category in one shot via CSV.
            </p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose} style={{ flexShrink: 0 }}>
            Close
          </button>
        </div>

        {/* Error banner */}
        {error ? (
          <div className="banner banner-error" style={{ marginBottom: 16 }}>
            <p>{error}</p>
          </div>
        ) : null}

        {/* STEP: setup */}
        {step === 'setup' && (
          <>
            <div className="catalog-form">
              <div className="field-grid">
                <label className="field">
                  <span>Industry</span>
                  <select value={industryId} onChange={(e) => setIndustryId(e.target.value)} required>
                    <option value="">Select industry</option>
                    {(industries || []).map((ind) => (
                      <option key={ind.id} value={ind.id}>{ind.name}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Import Mode</span>
                  <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="CREATE_ONLY">Create Only (skip existing)</option>
                    <option value="CREATE_OR_UPDATE">Create or Update</option>
                  </select>
                </label>

                <label className="field field-span">
                  <span>CSV File</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setFile(e.target.files[0] || null)}
                  />
                  {file ? <span className="field-help">{file.name}</span> : null}
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <button type="button" className="ghost-btn" onClick={handleDownloadTemplate}>
                Download Sample CSV
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handlePreview}
                disabled={isLoading || !industryId || !file}
              >
                {isLoading ? 'Validating...' : 'Preview Import'}
              </button>
            </div>

            <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-surface, #f9fafb)', borderRadius: 8 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13 }}>CSV Column Reference</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #6b7280)', fontFamily: 'monospace', lineBreak: 'anywhere' }}>
                main_category_name, main_category_ordering, main_category_icon, main_category_image, main_category_path, main_category_active, category_name, category_ordering, category_icon, category_image, category_path, category_active, has_sub_category, sub_category_name, sub_category_ordering, sub_category_icon, sub_category_image, sub_category_path, sub_category_active
              </p>
            </div>
          </>
        )}

        {/* STEP: preview */}
        {step === 'preview' && previewData && (
          <>
            {/* Summary cards */}
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <SummaryCard label="Main Categories" value={`+${previewData.mainCategoriesToCreate} / ~${previewData.mainCategoriesToUpdate}`} accent="#8B5CF6" />
              <SummaryCard label="Categories" value={`+${previewData.categoriesToCreate} / ~${previewData.categoriesToUpdate}`} accent="#14B8A6" />
              <SummaryCard label="Sub-categories" value={`+${previewData.subCategoriesToCreate} / ~${previewData.subCategoriesToUpdate}`} accent="#0EA5E9" />
              <SummaryCard label="Rows" value={`${validRows.length} ok / ${errorRows.length} err`} accent={errorRows.length > 0 ? '#ef4444' : '#22c55e'} />
            </div>

            {errorRows.length > 0 ? (
              <div className="banner banner-error" style={{ marginBottom: 16 }}>
                <p><strong>{errorRows.length} row(s) have errors</strong> and will be skipped. Fix the CSV and re-upload to include them.</p>
              </div>
            ) : null}

            {/* Preview table */}
            <div className="table-shell" style={{ marginBottom: 20, maxHeight: 380, overflowY: 'auto' }}>
              <table className="admin-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Main Category</th>
                    <th>Category</th>
                    <th>Sub-Category</th>
                    <th>Warnings / Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {(previewData.rows || []).length === 0 ? (
                    <tr><td colSpan={5} className="empty-cell">No rows parsed.</td></tr>
                  ) : (
                    (previewData.rows || []).map((row) => (
                      <tr key={row.rowNumber} style={{ background: row.hasError ? '#fff1f2' : undefined }}>
                        <td style={{ color: '#9ca3af' }}>{row.rowNumber}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>{row.mainCategoryName || '—'}</span>
                            <ActionBadge action={row.mainCategoryAction} />
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>{row.categoryName || '—'}</span>
                            {row.categoryAction && row.categoryAction !== 'NONE' ? (
                              <ActionBadge action={row.categoryAction} />
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>{row.subCategoryName || '—'}</span>
                            {row.subCategoryAction && row.subCategoryAction !== 'N_A' ? (
                              <ActionBadge action={row.subCategoryAction} />
                            ) : null}
                          </div>
                        </td>
                        <td>
                          {(row.errors || []).map((e, i) => (
                            <span key={i} style={{ color: '#dc2626', fontSize: 12 }}>{e}</span>
                          ))}
                          {(row.warnings || []).map((w, i) => (
                            <span key={i} style={{ color: '#d97706', fontSize: 12 }}>{w}</span>
                          ))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" className="ghost-btn" onClick={handleReset} disabled={isLoading}>
                Back
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleCommit}
                disabled={isLoading || validRows.length === 0}
              >
                {isLoading ? 'Importing...' : `Confirm Import (${validRows.length} rows)`}
              </button>
            </div>
          </>
        )}

        {/* STEP: done */}
        {step === 'done' && importResult && (
          <>
            <div className="banner banner-success" style={{ marginBottom: 24 }}>
              <p><strong>Import complete!</strong></p>
            </div>
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <SummaryCard label="Main Cat Created" value={importResult.mainCategoriesCreated} accent="#8B5CF6" />
              <SummaryCard label="Main Cat Updated" value={importResult.mainCategoriesUpdated} accent="#a78bfa" />
              <SummaryCard label="Cat Created" value={importResult.categoriesCreated} accent="#14B8A6" />
              <SummaryCard label="Cat Updated" value={importResult.categoriesUpdated} accent="#5eead4" />
              <SummaryCard label="Sub-Cat Created" value={importResult.subCategoriesCreated} accent="#0EA5E9" />
              <SummaryCard label="Sub-Cat Updated" value={importResult.subCategoriesUpdated} accent="#7dd3fc" />
              <SummaryCard label="Skipped" value={importResult.rowsSkipped} accent="#6b7280" />
            </div>
            {(importResult.errors || []).length > 0 ? (
              <div className="banner banner-error" style={{ marginBottom: 16 }}>
                <p><strong>Some rows had errors:</strong></p>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {importResult.errors.map((e, i) => <li key={i} style={{ fontSize: 13 }}>{e}</li>)}
                </ul>
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="ghost-btn" onClick={handleReset}>
                Import More
              </button>
              <button type="button" className="primary-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
