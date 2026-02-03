import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner } from '../components';
import {
  assignSubscriptionPlan,
  fetchUsers,
  listSubscriptionAssignments,
  listSubscriptionPlans,
} from '../services/adminApi';

const initialForm = {
  user_id: '',
  plan_id: '',
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

function SubscriptionAssignPage({ token }) {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filterUserId, setFilterUserId] = useState('');
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const didInitRef = useRef(false);

  const selectedUser = useMemo(
    () => users.find((user) => String(user.id) === String(form.user_id)),
    [users, form.user_id]
  );

  const availablePlans = useMemo(() => {
    const activePlans = plans.filter((plan) => plan.is_active === 1);
    if (!selectedUser?.userType) return activePlans;
    return activePlans.filter((plan) => plan.user_type === selectedUser.userType);
  }, [plans, selectedUser]);

  const loadUsers = async () => {
    const response = await fetchUsers(token);
    setUsers(response?.data || []);
  };

  const loadPlans = async () => {
    const response = await listSubscriptionPlans(token);
    setPlans(response?.data?.plans || []);
  };

  const loadAssignments = async (userId) => {
    const response = await listSubscriptionAssignments(token, userId ? { user_id: userId } : {});
    setAssignments(response?.data?.subscriptions || []);
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    Promise.all([loadUsers(), loadPlans(), loadAssignments()])
      .catch((error) => {
        setMessage({ type: 'error', text: error.message || 'Failed to load subscription assignments.' });
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'user_id') {
        next.plan_id = '';
      }
      return next;
    });
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    if (!form.user_id || !form.plan_id) {
      setMessage({ type: 'error', text: 'Select a user and a plan to assign.' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await assignSubscriptionPlan(token, {
        user_id: Number(form.user_id),
        plan_id: Number(form.plan_id),
      });
      setForm((prev) => ({ ...prev, plan_id: '' }));
      await loadAssignments(filterUserId || form.user_id);
      setMessage({ type: 'success', text: 'Subscription assigned successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to assign subscription.' });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = () => {
    loadAssignments(filterUserId);
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Assign Subscriptions</h2>
          <p className="panel-subtitle">Grant plans to users and monitor assignment history.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={() => loadAssignments(filterUserId)} disabled={isLoading}>
          Refresh
        </button>
      </div>
      <Banner message={message} />

      <div className="panel-grid">
        <div className="panel card">
          <h3 className="panel-subheading">Assign a plan</h3>
          <form className="field-grid" onSubmit={handleAssign}>
            <label className="field">
              <span>User</span>
              <select
                value={form.user_id}
                onChange={(event) => handleChange('user_id', event.target.value)}
                required
              >
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.userType})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Plan</span>
              <select
                value={form.plan_id}
                onChange={(event) => handleChange('plan_id', event.target.value)}
                required
              >
                <option value="">Select plan</option>
                {availablePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.plan_name} ({plan.user_type})
                  </option>
                ))}
              </select>
            </label>
            <div className="field field-span">
              <button type="submit" className="primary-btn compact" disabled={isLoading}>
                {isLoading ? 'Assigning...' : 'Assign plan'}
              </button>
            </div>
          </form>
        </div>

        <div className="panel card">
          <h3 className="panel-subheading">Assignment history</h3>
          <div className="field-grid">
            <label className="field">
              <span>Filter by user</span>
              <select value={filterUserId} onChange={(event) => setFilterUserId(event.target.value)}>
                <option value="">All users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.userType})
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>&nbsp;</span>
              <div className="inline-row">
                <button type="button" className="ghost-btn small" onClick={applyFilter}>
                  Apply
                </button>
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => {
                    setFilterUserId('');
                    loadAssignments();
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          {assignments.length === 0 ? (
            <p className="empty-state">No assignments yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.user_label || `User #${item.user_id}`}</td>
                      <td>{item.plan_name || '-'}</td>
                      <td>{item.status}</td>
                      <td>{formatDate(item.start_date)}</td>
                      <td>{formatDate(item.end_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubscriptionAssignPage;
