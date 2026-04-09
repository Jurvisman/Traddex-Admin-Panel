import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components';
import { fetchKycAssistanceRequests, updateKycAssistanceStatus, fetchEmployees } from '../services/adminApi';

function KycAssistancePage({ token, currentUser }) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reqRes, empRes] = await Promise.all([
        fetchKycAssistanceRequests(token).catch(() => ({ data: [] })),
        fetchEmployees(token).catch(() => ({ data: [] }))
      ]);
      setRequests(reqRes?.data || []);
      setEmployees(empRes?.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load requests.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleUpdateStatus = async (id, status, note = null) => {
    try {
      await updateKycAssistanceStatus(token, id, status, note);
      setMessage({ type: 'success', text: 'Status updated successfully.' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update status.' });
    }
  };

  const handleOpenNoteModal = (request) => {
    setSelectedRequest(request);
    setAdminNote(request.adminNote || '');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!selectedRequest) return;
    try {
      await updateKycAssistanceStatus(token, selectedRequest.id, selectedRequest.status, adminNote);
      setMessage({ type: 'success', text: 'Note saved successfully.' });
      setIsNoteModalOpen(false);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to apply note.' });
    }
  };

  return (
    <div className="employee-page">
      <Banner message={message} />

      <section className="panel card users-table-card" style={{ marginTop: 24 }}>
        <div className="panel-header" style={{ padding: '24px 24px 0 24px' }}>
          <h2 className="panel-title">KYC & Onboarding Assistance</h2>
        </div>

        <div className="gsc-datatable-toolbar">
          <div className="gsc-datatable-toolbar-right">
            <div className="gsc-toolbar-search">
              <input
                type="search"
                placeholder="Search by business name..."
                aria-label="Search"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="empty-state">No requests found.</p>
        ) : (
          <div className="table-shell business-table-shell">
            <table className="admin-table users-table business-datatable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Business Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.businessName}</td>
                    <td><a href={`tel:${r.phoneNumber}`}>{r.phoneNumber}</a></td>
                    <td>
                      <span className={`status-pill ${r.status === 'COMPLETED' ? 'approved' : r.status === 'IN_PROGRESS' ? 'warning' : 'rejected'}`}>
                        {String(r.status).replace('_', ' ')}
                      </span>
                    </td>
                    <td>{r.assignedToName || 'Unassigned'}</td>
                    <td className="table-actions">
                      <div className="table-action-group" style={{ display: 'flex', gap: '8px' }}>
                        {r.status === 'SUBMITTED' ? (
                          <button className="secondary-btn small" onClick={() => handleUpdateStatus(r.id, 'ACCEPTED')}>Accept</button>
                        ) : null}
                        {r.status === 'ACCEPTED' ? (
                          <button className="secondary-btn small" onClick={() => handleUpdateStatus(r.id, 'IN_PROGRESS')}>Start</button>
                        ) : null}
                        {r.status === 'IN_PROGRESS' ? (
                          <button className="primary-btn small" onClick={() => handleUpdateStatus(r.id, 'COMPLETED')}>Complete</button>
                        ) : null}
                        
                        <button className="secondary-btn small" onClick={() => handleOpenNoteModal(r)}>Note</button>
                        <button className="ghost-btn small" onClick={() => navigate(`/admin/businesses/${r.userId}`)}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isNoteModalOpen && selectedRequest ? (
        <div className="bc-modal-overlay">
          <div className="bc-modal-content" style={{ maxWidth: 500 }}>
            <div className="bc-modal-header">
              <h3>Admin Note - {selectedRequest.businessName}</h3>
              <button className="bc-modal-close" onClick={() => setIsNoteModalOpen(false)}>✕</button>
            </div>
            <div className="bc-modal-body">
              <div className="bc-field">
                <label className="bc-field-label">Internal Note</label>
                <textarea
                  rows={4}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Enter any notes about this request..."
                />
              </div>
            </div>
            <div className="bc-modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setIsNoteModalOpen(false)}>Cancel</button>
              <button type="button" className="primary-btn" onClick={handleSaveNote}>Save Note</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default KycAssistancePage;
