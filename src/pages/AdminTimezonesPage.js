import { useMemo, useState } from 'react';
import { Banner } from '../components';
import { importTimeZones } from '../services/adminApi';

const emptyMessage = { type: 'info', text: '' };

const formatBytes = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const order = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const scaled = bytes / 1024 ** order;
  const digits = order === 0 || scaled >= 10 ? 0 : 1;
  return `${scaled.toFixed(digits)} ${units[order]}`;
};

function AdminTimezonesPage({ token }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(emptyMessage);
  const [isUploading, setIsUploading] = useState(false);

  const fileLabel = useMemo(() => {
    if (!selectedFile) return 'No file selected';
    const name = selectedFile?.name || 'zone1970.tab';
    const size = formatBytes(selectedFile?.size);
    return `${name} • ${size}`;
  }, [selectedFile]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setResult(null);
    setMessage(emptyMessage);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setMessage(emptyMessage);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Select the zone1970.tab file before uploading.' });
      return;
    }
    if (!token) {
      setMessage({ type: 'error', text: 'Admin login required.' });
      return;
    }
    setIsUploading(true);
    setMessage(emptyMessage);
    try {
      const data = await importTimeZones(token, selectedFile, replaceExisting);
      setResult(data);
      setMessage({ type: 'success', text: 'Timezone list updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Failed to import timezones.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Timezones</h2>
          <p className="panel-subtitle">Upload the official IANA zone1970.tab file to refresh country timezones.</p>
        </div>
      </div>
      <Banner message={message} />

      <div className="panel card">
        <div className="panel-split">
          <h3 className="panel-subheading">Import file</h3>
          <span className="panel-hint">{fileLabel}</span>
        </div>
        <form className="field-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>zone1970.tab</span>
            <input type="file" accept=".tab,text/plain" onChange={handleFileChange} />
          </label>
          <label className="field">
            <span>Replace existing data</span>
            <select
              value={replaceExisting ? 'yes' : 'no'}
              onChange={(event) => setReplaceExisting(event.target.value === 'yes')}
            >
              <option value="yes">Yes, replace all rows</option>
              <option value="no">No, append new rows</option>
            </select>
          </label>
          <div className="field">
            <span>Actions</span>
            <div className="form-actions">
              <button type="button" className="ghost-btn" onClick={handleClear} disabled={isUploading}>
                Clear
              </button>
              <button type="submit" className="primary-btn" disabled={isUploading || !selectedFile}>
                {isUploading ? 'Uploading...' : 'Import Timezones'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {result ? (
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Last import summary</h3>
            <span className="panel-hint">{result.replaced ? 'Replaced existing data' : 'Appended data'}</span>
          </div>
          <div className="stat-grid">
            <div className="stat-card admin-stat">
              <p className="stat-label">Total lines</p>
              <p className="stat-value">{result.totalLines ?? 0}</p>
              <p className="stat-sub">Lines in file</p>
            </div>
            <div className="stat-card admin-stat">
              <p className="stat-label">Parsed rows</p>
              <p className="stat-value">{result.parsedRows ?? 0}</p>
              <p className="stat-sub">Valid entries</p>
            </div>
            <div className="stat-card admin-stat">
              <p className="stat-label">Inserted</p>
              <p className="stat-value">{result.inserted ?? 0}</p>
              <p className="stat-sub">New records</p>
            </div>
            <div className="stat-card admin-stat">
              <p className="stat-label">Duplicates skipped</p>
              <p className="stat-value">{result.skippedDuplicate ?? 0}</p>
              <p className="stat-sub">Already present</p>
            </div>
            <div className="stat-card admin-stat">
              <p className="stat-label">Invalid zones</p>
              <p className="stat-value">{result.invalidZones ?? 0}</p>
              <p className="stat-sub">Rejected entries</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminTimezonesPage;
