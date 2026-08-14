import { useEffect, useMemo, useState } from 'react';
import { Banner, DataTable, TableRowActionMenu } from '../components';
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
  const [filterRole, setFilterRole]     = useState('');
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

  const resetForm = () => { setEditingId(null); setForm(createInitialForm()); };
  const openCreateModal = () => { resetForm(); setViewEmployee(null); setShowForm(true); };

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
        if ((filterStatus === '1' || filterStatus === 'active') && !isActive) return false;
        if ((filterStatus === '0' || filterStatus === 'inactive') && isActive) return false;
      }
      if (filterRole) {
        const empRoleId = String(emp?.roleId || emp?.roles_id || emp?.role || '');
        if (empRoleId !== String(filterRole)) return false;
      }
      return true;
    });
  }, [employees, query, filterStatus, filterRole]);

  const pagedEmployees = useMemo(
    () => paginateItems(filteredEmployees, page, pageSize),
    [filteredEmployees, page, pageSize]
  );

  useEffect(() => { setPage(0); }, [query, filterStatus, filterRole]);

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
          <DataTable
            columns={[
              {
                key: 'select',
                header: (
                  <input
                    type="checkbox"
                    className="select-checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    title="Select all on this page"
                  />
                ),
                width: '44px',
                render: (_, emp) => {
                  const id = emp?.id || emp?.userId;
                  return (
                    <input
                      type="checkbox"
                      className="select-checkbox"
                      checked={selectedRows.has(id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        setSelectedRows((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(id);
                          else next.delete(id);
                          return next;
                        });
                      }}
                    />
                  );
                },
              },
              {
                key: 'srNo',
                header: 'Sr No',
                width: '70px',
                render: (_, __, index) => pagedEmployees.start + index + 1,
              },
              {
                key: 'name',
                header: 'Name',
                sortable: true,
                render: (val, emp) => (
                  <span
                    className="bdt-name-link"
                    style={{ color: '#6345ED', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(emp);
                    }}
                  >
                    {val || emp?.name || '-'}
                  </span>
                ),
              },
              {
                key: 'number',
                header: 'Mobile',
                sortable: true,
                render: (val) => val || '-',
              },
              {
                key: 'roleName',
                header: 'Role',
                sortable: true,
                render: (val) => val || '-',
              },
              {
                key: 'active',
                header: 'Status',
                sortable: true,
                render: (val) => <StatusBadge active={val} />,
              },
              {
                key: 'verify',
                header: 'Verification',
                sortable: true,
                render: (val) => <VerifyBadge verify={val} />,
              },
              {
                key: 'createdAt',
                header: 'Joined',
                sortable: true,
                render: (_, emp) => formatDate(emp?.createdAt || emp?.created_at),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, emp) => {
                  const id = emp?.id || emp?.userId;
                  return (
                    <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                      <TableRowActionMenu
                        rowId={id}
                        openRowId={openActionRowId}
                        onToggle={setOpenActionRowId}
                        actions={[
                          { label: 'View', onClick: () => handleView(emp) },
                          { label: 'Edit', onClick: () => handleEdit(emp) },
                          { label: 'Delete', onClick: () => handleDelete(emp), danger: true },
                        ]}
                      />
                    </div>
                  );
                },
              },
            ]}
            data={filteredEmployees}
            isLoading={isLoading}
            search={query}
            onSearchChange={(val) => { setQuery(val); setPage(0); }}
            searchPlaceholder="Search employees..."
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onRowClick={(emp) => handleView(emp)}
            emptyTitle="No employees found"
            emptyDescription="No employees match your search and filter criteria."
            toolbarLeft={
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="gsc-toolbar-btn"
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                  aria-label="Filter status"
                  style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">All Statuses</option>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
                <select
                  className="gsc-toolbar-btn"
                  value={filterRole}
                  onChange={(e) => { setFilterRole(e.target.value); setPage(0); }}
                  aria-label="Filter role"
                  style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">All Roles</option>
                  {roles.map((r) => {
                    const rId = getRoleId(r);
                    return <option key={rId} value={rId}>{getRoleName(r)}</option>;
                  })}
                </select>
              </div>
            }
            toolbarRight={
              <button
                type="button"
                className="gsc-create-btn"
                onClick={openCreateModal}
                title="Add new employee"
                aria-label="Add new employee"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            }
          />
        </div>

        {/* Side view panel */}
        {renderViewPanel()}
      </div>
    </div>
  );
}

export default EmployeePage;
