import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { createEmployee, deleteEmployee, fetchEmployees, listRoles, updateEmployee } from '../services/adminApi';

const normalize = (value) => String(value || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const getRoleId = (role) => role?.id || role?.roles_id || role?.roleId || null;
const getRoleName = (role) => role?.name || role?.role_name || role?.roleName || 'Unknown';

const createInitialForm = () => ({
  name: '',
  number: '',
  role: '',
  active: '1',
  verify: '1',
  timeZone: 'UTC',
});

function EmployeePage({ token }) {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createInitialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  const loadData = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [employeesResponse, rolesResponse] = await Promise.all([fetchEmployees(token), listRoles(token)]);
      setEmployees(Array.isArray(employeesResponse?.data) ? employeesResponse.data : []);
      setRoles(Array.isArray(rolesResponse?.data) ? rolesResponse.data : []);
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

  const filteredEmployees = useMemo(() => {
    const term = normalize(query);
    if (!term) return employees;
    return employees.filter((employee) => {
      const haystack = [employee?.name, employee?.number, employee?.roleName, employee?.timeZone]
        .map(normalize)
        .join(' ');
      return haystack.includes(term);
    });
  }, [employees, query]);

  const resetForm = () => {
    setEditingId(null);
    setForm(createInitialForm());
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      const payload = {
        name: form.name.trim(),
        number: form.number.trim(),
        role: form.role,
        active: Number(form.active),
        verify: Number(form.verify),
        timeZone: form.timeZone.trim() || null,
      };
      if (editingId) {
        await updateEmployee(token, editingId, payload);
        setMessage({ type: 'success', text: 'Employee updated successfully.' });
      } else {
        await createEmployee(token, payload);
        setMessage({ type: 'success', text: 'Employee created successfully.' });
      }
      resetForm();
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save employee.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingId(employee?.id || null);
    setForm({
      name: employee?.name || '',
      number: employee?.number || '',
      role: employee?.roleId ? String(employee.roleId) : '',
      active: employee?.active !== undefined && employee?.active !== null ? String(employee.active) : '1',
      verify: employee?.verify !== undefined && employee?.verify !== null ? String(employee.verify) : '1',
      timeZone: employee?.timeZone || 'UTC',
    });
  };

  const handleDelete = async (employee) => {
    if (!employee?.id) return;
    const ok = window.confirm(`Delete employee ${employee?.name || employee?.number}?`);
    if (!ok) return;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteEmployee(token, employee.id);
      if (editingId === employee.id) resetForm();
      await loadData();
      setMessage({ type: 'success', text: 'Employee deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete employee.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="employee-page">
      <div className="users-head">
        <div>
          <h2 className="panel-title">Employees</h2>
          <p className="panel-subtitle">Create internal admin users and assign roles.</p>
        </div>
        <div className="users-head-actions">
          <button type="button" className="ghost-btn" onClick={loadData} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <Banner message={message} />

      <section className="panel card">
        <h3 className="panel-title">{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
        <form className="field-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="Employee name"
              required
            />
          </label>
          <label className="field">
            <span>Mobile Number</span>
            <input
              type="tel"
              value={form.number}
              onChange={(event) => handleChange('number', event.target.value)}
              placeholder="10-digit number"
              required
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={form.role} onChange={(event) => handleChange('role', event.target.value)} required>
              <option value="">Select role</option>
              {roles.map((role) => {
                const roleId = getRoleId(role);
                return (
                  <option key={roleId || getRoleName(role)} value={roleId ? String(roleId) : getRoleName(role)}>
                    {getRoleName(role)}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={form.active} onChange={(event) => handleChange('active', event.target.value)}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </label>
          <label className="field">
            <span>Verify</span>
            <select value={form.verify} onChange={(event) => handleChange('verify', event.target.value)}>
              <option value="1">Verified</option>
              <option value="0">Pending</option>
            </select>
          </label>
          <label className="field">
            <span>Timezone</span>
            <input
              type="text"
              value={form.timeZone}
              onChange={(event) => handleChange('timeZone', event.target.value)}
              placeholder="UTC"
            />
          </label>
          <div className="field field-span form-actions">
            {editingId ? (
              <button type="button" className="ghost-btn" onClick={resetForm} disabled={isSaving}>
                Cancel
              </button>
            ) : null}
            <button type="submit" className="primary-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel card users-table-card">
        <div className="users-search">
          <span className="icon icon-search" />
          <input
            type="search"
            placeholder="Search by name, number, role..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" className="ghost-btn small" onClick={() => setQuery('')}>
              Clear
            </button>
          ) : null}
        </div>

        {filteredEmployees.length === 0 ? (
          <p className="empty-state">No employees found.</p>
        ) : (
          <div className="table-shell">
            <table className="admin-table users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Scope</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => {
                  const id = employee?.id || employee?.userId;
                  const isActive = Number(employee?.active) === 1;
                  return (
                    <tr key={id}>
                      <td>{employee?.name || '-'}</td>
                      <td>{employee?.number || '-'}</td>
                      <td>{employee?.roleName || '-'}</td>
                      <td>
                        <span className={`status-pill ${isActive ? 'verified' : 'pending'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{employee?.accountScope || employee?.account_scope || 'EMPLOYEE'}</td>
                      <td>{formatDate(employee?.createdAt || employee?.created_at)}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="ghost-btn small" onClick={() => handleEdit(employee)}>
                            Edit
                          </button>
                          <button type="button" className="ghost-btn small" onClick={() => handleDelete(employee)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default EmployeePage;
