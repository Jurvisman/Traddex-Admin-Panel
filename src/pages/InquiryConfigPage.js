import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { getInquiryConfig, updateInquiryConfig } from '../services/adminApi';

const buildFormState = (ratio) => ({
  premiumRatio: ratio !== null && ratio !== undefined ? String(ratio) : '70',
});

function InquiryConfigPage({ token }) {
  const [form, setForm] = useState(buildFormState(70));
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const premiumValue = useMemo(() => Number(form.premiumRatio || 0), [form.premiumRatio]);
  const normalValue = useMemo(() => Math.max(0, 100 - premiumValue), [premiumValue]);

  const loadConfig = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await getInquiryConfig(token);
      const data = response?.data;
      setForm(buildFormState(data?.premium_ratio ?? 70));
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load inquiry config.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Number.isNaN(premiumValue) || premiumValue < 0 || premiumValue > 100) {
      setMessage({ type: 'error', text: 'Premium ratio must be between 0 and 100.' });
      return;
    }
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateInquiryConfig(token, { premium_ratio: premiumValue });
      setMessage({ type: 'success', text: 'Inquiry ratio updated.' });
      await loadConfig();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update inquiry config.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Inquiry Config</h2>
          <p className="panel-subtitle">Control the premium vs normal distribution split.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadConfig} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <Banner message={message} />
      <div className="stat-grid">
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F97316' }}>
          <p className="stat-label">Premium ratio</p>
          <p className="stat-value">{premiumValue}%</p>
          <p className="stat-sub">Priority distribution</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Normal ratio</p>
          <p className="stat-value">{normalValue}%</p>
          <p className="stat-sub">Standard distribution</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#16A34A' }}>
          <p className="stat-label">Total split</p>
          <p className="stat-value">100%</p>
          <p className="stat-sub">Combined ratio</p>
        </div>
      </div>
      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Distribution ratio</h3>
            <span className="chip">
              Premium {premiumValue}% • Normal {normalValue}%
            </span>
          </div>
          <form className="field-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Premium ratio (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.premiumRatio}
                onChange={(event) => setForm({ premiumRatio: event.target.value })}
                placeholder="70"
                required
              />
            </label>
            <label className="field">
              <span>Normal ratio (%)</span>
              <input type="number" value={normalValue} readOnly />
            </label>
            <div className="field">
              <span>Note</span>
              <p className="hint">
                The normal ratio is automatically calculated as 100 - premium.
              </p>
            </div>
            <div className="field">
              <button type="submit" className="primary-btn full" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save ratio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InquiryConfigPage;
