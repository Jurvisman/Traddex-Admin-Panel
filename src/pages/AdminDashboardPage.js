import { useEffect, useState } from 'react';
import { Banner } from '../components';
import { fetchUsers } from '../services/adminApi';

const emptyStats = {
  total: 0,
  business: 0,
  users: 0,
};

function AdminDashboardPage({ token }) {
  const [stats, setStats] = useState(emptyStats);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetchUsers(token);
      const users = response?.data || [];
      const businessCount = users.filter((user) => user.userType === 'BUSINESS').length;
      const userCount = users.filter((user) => user.userType === 'USER').length;
      setStats({
        total: users.length,
        business: businessCount,
        users: userCount,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load dashboard stats.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Overview</h2>
          <p className="panel-subtitle">Quick counts across Traddex users and businesses.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadStats} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <Banner message={message} />
      <div className="stat-grid">
        <div className="stat-card admin-stat">
          <p className="stat-label">Total accounts</p>
          <p className="stat-value">{stats.total}</p>
          <p className="stat-sub">All registered profiles</p>
        </div>
        <div className="stat-card admin-stat">
          <p className="stat-label">Business profiles</p>
          <p className="stat-value">{stats.business}</p>
          <p className="stat-sub">Business userType</p>
        </div>
        <div className="stat-card admin-stat">
          <p className="stat-label">Individual users</p>
          <p className="stat-value">{stats.users}</p>
          <p className="stat-sub">User userType</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
