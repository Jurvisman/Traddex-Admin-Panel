import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
const buildUrl = (path) => `${API_BASE}/api${path}`;

const StorefrontManagementPage = ({ token }) => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING_SETUP');

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildUrl(`/admin/storefront/sites?status=${filter}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSites(data.data);
      }
    } catch (error) {
      console.error("Error fetching sites", error);
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const handlePublish = async (siteId) => {
    if (!window.confirm("Are you sure you want to publish this website? It will go live immediately.")) return;
    
    try {
      const response = await fetch(buildUrl(`/admin/storefront/sites/${siteId}/publish`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        alert("Website published successfully!");
        fetchSites();
      } else {
        alert("Failed to publish: " + data.message);
      }
    } catch (error) {
      alert("Failed to publish website: " + error.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Storefront Management</h1>
          <p>Review and publish merchant websites.</p>
        </div>
        <div className="admin-actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="admin-select"
            style={{ padding: '0.5rem', borderRadius: '4px' }}
          >
            <option value="PENDING_SETUP">Pending Setup</option>
            <option value="LIVE">Live Sites</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading sites...</div>
      ) : sites.length === 0 ? (
        <div className="empty-state">No sites found for this status.</div>
      ) : (
        <div className="datatable-container">
          <table className="datatable">
            <thead>
              <tr>
                <th>Business</th>
                <th>Industry</th>
                <th>Template</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.siteId}>
                  <td>
                    <strong>{site.businessName}</strong>
                    <br />
                    <small>{site.businessProfileId}</small>
                  </td>
                  <td>{site.industry}</td>
                  <td>{site.templateKey} ({site.templateVersion})</td>
                  <td>
                    <span className={`status-badge status-${site.status.toLowerCase()}`}>
                      {site.status}
                    </span>
                  </td>
                  <td>{new Date(site.updatedAt).toLocaleString()}</td>
                  <td>
                    {site.status === 'PENDING_SETUP' && (
                      <button 
                        onClick={() => handlePublish(site.siteId)}
                        className="btn-publish"
                        style={{ background: '#16a34a', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Publish Live
                      </button>
                    )}
                    {site.status === 'LIVE' && (
                      <button className="btn-secondary" style={{ padding: '0.4rem 1rem' }}>Manage</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StorefrontManagementPage;
