import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { createEmployee, deleteEmployee, fetchEmployees, listRoles, updateEmployee } from '../services/adminApi';

const normalize = (value) => String(value || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getRoleId   = (role) => role?.id || role?.roles_id || role?.roleId || null;
const getRoleName = (role) => role?.name || role?.role_name || role?.roleName || 'Unknown';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const paginateItems = (items, page, pageSize) => {
  const list = Array.isArray(items) ? items : [];
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage  = Math.min(Math.max(page, 0), totalPages - 1);
  const start     = safePage * pageSize;
  const end       = Math.min(start + pageSize, totalItems);
  return { items: list.slice(start, end), totalItems, totalPages, page: safePage, start, end };
};

const createInitialForm = () => ({
  name: '', number: '', role: '', active: '1', verify: '1', timeZone: 'UTC',
});

/* ── Small helpers ───────────────────────────────────────────────── */
function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <>
      <span className="mv-detail-label">{label}</span>
      <span className="mv-detail-value">{value}</span>
    </>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`status-pill ${Number(active) === 1 ? 'status-verified' : 'status-inactive'}`}>
      {Number(active) === 1 ? 'Active' : 'Inactive'}
    </span>
  );
}

function VerifyBadge({ verify }) {
  return (
    <span className={`status-pill ${Number(verify) === 1 ? 'status-verified' : 'status-pending'}`}>
      {Number(verify) === 1 ? 'Verified' : 'Pending'}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
function EmployeePage({ token }) {
  const [employees, setEmployees]       = useState([]);
  const [roles, setRoles]               = useState([]);
  const [query, setQuery]               = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [form, setForm]                 = useState(createInitialForm);
  const [message, setMessage]           = useState({ type: 'info', text: '' });
  const [showForm, setShowForm]         = useState(false);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [page, setPage]                 = useState(0);
  const [pageSize, setPageSize]         = useState(10);

  // Side view panel
  const [viewEmployee, setViewEmployee] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [empRes, rolesRes] = await Promise.all([fetchEmployees(token), listRoles(token)]);
      setEmployees(Array.isArray(empRes?.data) ? empRes.data : []);
      setRoles(Array.isArray(rolesRes?.data) ? rolesRes.data : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load employees.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Stats ──────────────────────────────────────────────────── */
  const activeCount   = useMemo(() => employees.filter((e) => Number(e?.active) === 1).length, [employees]);
  const inactiveCount = useMemo(() => employees.filter((e) => Number(e?.active) !== 1).length, [employees]);

  /* ── Filter + Search ────────────────────────────────────────── */
  const filteredEmployees = useMemo(() => {
    const term = normalize(query);
    return employees.filter((emp) => {
      if (term) {
        const haystack = [emp?.name, emp?.number, emp?.roleName, emp?.timeZone, emp?.accountScope]
          .map(normalize).join(' ');
        if (!haystack.includes(term)) return false;
      }
      if (filterStatus) {
        const isActive = Number(emp?.active) === 1;
        if (filterStatus === 'active'   && !isActive) return false;
        if (filterStatus === 'inactive' && isActive)  return false;
      }
      return true;
    });
  }, [employees, query, filterStatus]);

  const pagedEmployees = useMemo(
    () => paginateItems(filteredEmployees, page, pageSize),
    [filteredEmployees, page, pageSize]
  );

  useEffect(() => { setPage(0); }, [query, filterStatus]);

  /* ── Form / CRUD handlers ───────────────────────────────────── */
  const resetForm = () => { setEditingId(null); setForm(createInitialForm()); };

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      const payload = {
        name:     form.name.trim(),
        number:   form.number.trim(),
        role:     form.role,
        active:   Number(form.active),
        verify:   Number(form.verify),
        timeZone: form.timeZone.trim() || null,
      };
      if (editingId) {
        await updateEmployee(token, editingId, payload);
        // Refresh view panel if we edited the currently viewed employee
        if (viewEmployee?.id === editingId) {
          setViewEmployee((prev) => ({ ...prev, ...payload, roleId: prev?.roleId }));
        }
        setMessage({ type: 'success', text: 'Employee updated successfully.' });
      } else {
        await createEmployee(token, payload);
        setMessage({ type: 'success', text: 'Employee created successfully.' });
      }
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save employee.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (emp) => {
    setEditingId(emp?.id || null);
    setForm({
      name:     emp?.name || '',
      number:   emp?.number || '',
      role:     emp?.roleId ? String(emp.roleId) : '',
      active:   emp?.active !== undefined && emp?.active !== null ? String(emp.active) : '1',
      verify:   emp?.verify !== undefined && emp?.verify !== null ? String(emp.verify) : '1',
      timeZone: emp?.timeZone || 'UTC',
    });
    setShowForm(true);
  };

  const handleDelete = async (emp) => {
    if (!emp?.id) return;
    const ok = window.confirm(`Delete employee ${emp?.name || emp?.number}?`);
    if (!ok) return;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteEmployee(token, emp.id);
      if (editingId === emp.id) resetForm();
      if (viewEmployee?.id === emp.id) setViewEmployee(null);
      await loadData();
      setMessage({ type: 'success', text: 'Employee deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete employee.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (emp) => {
    setViewEmployee(emp);
    setShowForm(false);
  };

  /* ── Select-all ─────────────────────────────────────────────── */
  const allPageSelected = pagedEmployees.items.length > 0 &&
    pagedEmployees.items.every((e) => selectedRows.has(e?.id));

  const toggleSelectAll = () => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pagedEmployees.items.forEach((e) => next.delete(e?.id));
      } else {
        pagedEmployees.items.forEach((e) => { if (e?.id) next.add(e?.id); });
      }
      return next;
    });
  };

  /* ── Side view panel ────────────────────────────────────────── */
  const renderViewPanel = () => {
    if (!viewEmployee) return null;
    const emp = viewEmployee;
    const isActive = Number(emp?.active) === 1;
    const isVerified = Number(emp?.verify) === 1;

    return (
      <div className="mv-panel card">
        {/* Header */}
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewEmployee(null)}>
              ← Back
            </button>
            <h3 className="mv-panel-title">{emp.name || 'Employee'}</h3>
            <StatusBadge active={emp.active} />
          </div>
          <button
            type="button"
            className="ghost-btn small"
            onClick={() => handleEdit(emp)}
          >
            Edit
          </button>
        </div>

        {/* Avatar + name block */}
        <div className="mv-section">
          <div className="mv-emp-avatar-row">
            <div className="mv-emp-avatar">
              {String(emp.name || 'E').trim()[0].toUpperCase()}
            </div>
            <div className="mv-emp-avatar-info">
              <strong>{emp.name || '-'}</strong>
              <span>{emp.number || '-'}</span>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="mv-section">
          <p className="mv-section-label">Basic Info</p>
          <div className="mv-detail-grid">
            <DetailRow label="Name"       value={emp.name} />
            <DetailRow label="Mobile"     value={emp.number} />
            <DetailRow label="Role"       value={emp.roleName} />
            <DetailRow label="Timezone"   value={emp.timeZone} />
            <DetailRow label="Scope"      value={emp.accountScope || emp.account_scope || 'Employee'} />
            <DetailRow label="Joined"     value={formatDate(emp.createdAt || emp.created_at)} />
          </div>
        </div>

        {/* Status */}
        <div className="mv-section">
          <p className="mv-section-label">Status</p>
          <div className="mv-detail-grid">
            <span className="mv-detail-label">Account</span>
            <span className="mv-detail-value"><StatusBadge active={emp.active} /></span>
            <span className="mv-detail-label">Verification</span>
            <span className="mv-detail-value"><VerifyBadge verify={emp.verify} /></span>
          </div>
        </div>

        {/* Actions */}
        <div className="mv-section mv-panel-footer-actions">
          <button
            type="button"
            className="ghost-btn small"
            onClick={() => handleEdit(emp)}
          >
            Edit Employee
          </button>
          <button
            type="button"
            className="ghost-btn small danger"
            onClick={() => handleDelete(emp)}
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="users-page business-page employee-page">
      <Banner message={message} />

      {/* ── Add / Edit Modal ─────────────────────────────────────── */}
      {showForm ? (
        <div className="admin-modal-backdrop" onClick={() => { resetForm(); setShowForm(false); }}>
          <form
            className="admin-modal employee-modal"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
              <button type="button" className="ghost-btn small" onClick={() => { resetForm(); setShowForm(false); }}>
                ✕
              </button>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Name <span className="field-required">*</span></span>
                <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Employee full name" required />
              </label>
              <label className="field">
                <span>Mobile Number <span className="field-required">*</span></span>
                <input type="tel" value={form.number} onChange={(e) => handleChange('number', e.target.value)}
                  placeholder="10-digit number" required maxLength={10} />
              </label>
              <label className="field">
                <span>Role <span className="field-required">*</span></span>
                <select value={form.role} onChange={(e) => handleChange('role', e.target.value)} required>
                  <option value="">— Select role —</option>
                  {roles.map((role) => {
                    const rid = getRoleId(role);
                    return (
                      <option key={rid || getRoleName(role)} value={rid ? String(rid) : getRoleName(role)}>
                        {getRoleName(role)}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select value={form.active} onChange={(e) => handleChange('active', e.target.value)}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field">
                <span>Verification</span>
                <select value={form.verify} onChange={(e) => handleChange('verify', e.target.value)}>
                  <option value="1">Verified</option>
                  <option value="0">Pending</option>
                </select>
              </label>
              <label className="field">
                <span>Timezone</span>
                <input type="text" value={form.timeZone} onChange={(e) => handleChange('timeZone', e.target.value)}
                  placeholder="UTC" />
              </label>
            </div>

            <div className="form-actions employee-modal-actions">
              <button type="button" className="ghost-btn" onClick={() => { resetForm(); setShowForm(false); }}
                disabled={isSaving}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingId ? 'Update Employee' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* ── Stats bar ────────────────────────────────────────────── */}
      <div className="users-filters">
        <span className="status-chip login">{activeCount} Active</span>
        <span className="status-chip logout">{inactiveCount} Inactive</span>
        <button
          type="button"
          className="primary-btn small bdt-add-btn"
          onClick={() => { resetForm(); setViewEmployee(null); setShowForm(true); }}
        >
          + Add Employee
        </button>
      </div>

      {/* ── mv-layout: table left + view panel right ─────────────── */}
      <div className={`mv-layout${viewEmployee ? ' mv-layout--split' : ''}`}>

        {/* Table card */}
        <div className="panel card users-table-card">
          {/* Toolbar */}
          <div className="panel-split">
            <div className="category-list-head-left">
              <div className="gsc-datatable-toolbar-left">
                <div className="bdt-toolbar-wrap">
                  <button
                    type="button"
                    className={`gsc-toolbar-btn ${showFilterPanel ? 'active' : ''}`}
                    onClick={() => setShowFilterPanel((v) => !v)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 12h10M4 18h6" />
                    </svg>
                    Filter{filterStatus ? ' •' : ''}
                  </button>
                  {showFilterPanel && (
                    <div className="bdt-dropdown-panel">
                      <p className="bdt-dropdown-label">Status</p>
                      {[
                        { value: '', label: 'All' },
                        { value: 'active',   label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`bdt-dropdown-option ${filterStatus === opt.value ? 'selected' : ''}`}
                          onClick={() => { setFilterStatus(opt.value); setShowFilterPanel(false); }}
                        >
                          {opt.label}
                        </button>
                      ))}
                      {filterStatus ? (
                        <button
                          type="button"
                          className="bdt-dropdown-option danger"
                          onClick={() => { setFilterStatus(''); setShowFilterPanel(false); }}
                        >
                          Clear Filter
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search employees..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search employees"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <p className="empty-state">Loading employees...</p>
          ) : filteredEmployees.length === 0 ? (
            <p className="empty-state">No employees found.</p>
          ) : (
            <div className="table-shell business-table-shell">
              <table className="admin-table users-table business-datatable">
                <thead>
                  <tr>
                    <th className="bdt-checkbox-col">
                      <input
                        type="checkbox"
                        className="select-checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        title="Select all on this page"
                      />
                    </th>
                    <th>Sr No</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Verification</th>
                    <th>Joined</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEmployees.items.map((emp, index) => {
                    const id       = emp?.id || emp?.userId;
                    const isActive = Number(emp?.active) === 1;
                    const isViewing = viewEmployee?.id === id;
                    return (
                      <tr
                        key={id}
                        className={`${selectedRows.has(id) ? 'bdt-row-selected' : ''} ${isViewing ? 'mv-row-active' : ''}`}
                        onClick={() => handleView(emp)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="bdt-checkbox-col" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="select-checkbox"
                            checked={selectedRows.has(id)}
                            onChange={(e) => {
                              setSelectedRows((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(id);
                                else next.delete(id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td>{pagedEmployees.start + index + 1}</td>
                        <td>
                          <span className="bdt-name-link">{emp?.name || '-'}</span>
                        </td>
                        <td>{emp?.number || '-'}</td>
                        <td>{emp?.roleName || '-'}</td>
                        <td>
                          <span className={`status-pill ${isActive ? 'status-verified' : 'status-inactive'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${Number(emp?.verify) === 1 ? 'status-verified' : 'status-pending'}`}>
                            {Number(emp?.verify) === 1 ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td>{formatDate(emp?.createdAt || emp?.created_at)}</td>
                        <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="table-action-group">
                            <TableRowActionMenu
                              rowId={id}
                              openRowId={openActionRowId}
                              onToggle={setOpenActionRowId}
                              actions={[
                                { label: 'View',   onClick: () => handleView(emp) },
                                { label: 'Edit',   onClick: () => handleEdit(emp) },
                                { label: 'Delete', onClick: () => handleDelete(emp), danger: true },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div className="bv-table-footer">
                <div className="table-record-count">
                  <span>
                    Showing {pagedEmployees.totalItems ? pagedEmployees.start + 1 : 0}–{pagedEmployees.end} of {filteredEmployees.length} employees
                  </span>
                  {(query || filterStatus) ? (
                    <span className="bdt-no-more">Filtered from {employees.length} total</span>
                  ) : null}
                </div>

                <div className="product-pagination-controls">
                  <label className="product-pagination-size">
                    <span>Rows</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value) || 10); setPage(0); }}
                    >
                      {PAGE_SIZE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>

                  <div className="bv-table-pagination">
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={pagedEmployees.page === 0 || isLoading}
                      onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    >
                      {'< Prev'}
                    </button>
                    <span>Page {pagedEmployees.page + 1} / {pagedEmployees.totalPages}</span>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={pagedEmployees.page >= pagedEmployees.totalPages - 1 || isLoading}
                      onClick={() => setPage((p) => Math.min(p + 1, pagedEmployees.totalPages - 1))}
                    >
                      {'Next >'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side view panel */}
        {renderViewPanel()}
      </div>
    </div>
  );
}

export default EmployeePage;
