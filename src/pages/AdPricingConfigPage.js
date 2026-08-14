import { useCallback, useEffect, useState } from 'react';
import { Banner } from '../components';
import {
  getAdPricingConfig,
  updateAdPricingConfig,
} from '../services/adminApi';

const PRICING_KEYS = [
  { key: 'BASE_RATE_FULL_BANNER', label: 'Base Coins: Full Banner (coins/hr)', category: 'Base Rates', desc: 'Standard banner at top of feed & homepage' },
  { key: 'BASE_RATE_MID_CARD',    label: 'Base Coins: Mid Card (coins/hr)',    category: 'Base Rates', desc: 'Embedded promotional card in product feeds' },
  { key: 'BASE_RATE_BOTTOM_STRIP', label: 'Base Coins: Bottom Strip (coins/hr)', category: 'Base Rates', desc: 'Compact sticky footer banner' },
  
  { key: 'TARGET_MULT_GLOBAL',  label: 'Multiplier: Global',  category: 'Target Multipliers', desc: 'All-India audience reach' },
  { key: 'TARGET_MULT_COUNTRY', label: 'Multiplier: Country', category: 'Target Multipliers', desc: 'Country-wide targeting multiplier' },
  { key: 'TARGET_MULT_STATE',   label: 'Multiplier: State',   category: 'Target Multipliers', desc: 'Targeting specific state audience' },
  { key: 'TARGET_MULT_CITY',    label: 'Multiplier: City',    category: 'Target Multipliers', desc: 'Targeting specific city/district' },
  { key: 'TARGET_MULT_RADIUS',  label: 'Multiplier: Radius',  category: 'Target Multipliers', desc: 'Local hyper-local radius around business' },
];

function AdPricingConfigPage({ token }) {
  const [config, setConfig] = useState({});
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await getAdPricingConfig(token);
      setConfig(response?.data?.config || {});
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch pricing config.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const calculatePreview = (pk) => {
    if (pk.category !== 'Target Multipliers') return null;
    
    const baseRates = PRICING_KEYS.filter(k => k.category === 'Base Rates');
    const multiplier = parseFloat(config[pk.key] || 0);
    
    return (
      <div style={{ marginTop: 8, fontSize: 12, color: '#059669', background: '#ecfdf5', padding: '8px 12px', borderRadius: 8, border: '1px solid #a7f3d0' }}>
        <strong>Live Hourly Cost Preview:</strong>
        <div style={{ marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {baseRates.map(br => {
             const base = parseFloat(config[br.key] || 0);
             const total = (base * multiplier).toFixed(2);
             const label = br.label.split(':')[1].split('(')[0].trim();
             return (
               <span key={br.key} style={{ fontWeight: 600 }}>
                 {label}: <span style={{ color: '#047857' }}>{total} coins/hr</span>
               </span>
             );
          })}
        </div>
      </div>
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      const numericConfig = {};
      Object.keys(config).forEach(k => {
        numericConfig[k] = parseFloat(config[k] || 0);
      });
      await updateAdPricingConfig(token, numericConfig);
      setMessage({ type: 'success', text: 'Pricing configuration updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [...new Set(PRICING_KEYS.map(pk => pk.category))];

  return (
    <div className="ad-pricing-page">
      <div className="panel-head category-list-head" style={{ marginBottom: 20 }}>
        <div className="category-list-head-left">
          <div>
            <h2 className="panel-title">Advertisement Pricing Engine</h2>
            <p className="panel-subtitle">Configure base hourly coin rates and targeting multipliers. Total cost = Base Coins × Multiplier × Hours.</p>
          </div>
        </div>
        <div className="users-head-actions">
          <button type="button" className="ghost-btn" onClick={loadConfig} disabled={isSaving || isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <Banner message={message} />
      
      <div className="panel card" style={{ padding: 24, maxWidth: 960 }}>
        {isLoading ? (
          <p className="empty-state">Loading configuration...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {categories.map((cat, idx) => (
              <div key={cat} style={{ marginBottom: idx === categories.length - 1 ? 16 : 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1.5px solid #e2e8f0', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>{cat}</h3>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>
                    {PRICING_KEYS.filter(pk => pk.category === cat).length} parameters
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {PRICING_KEYS.filter(pk => pk.category === cat).map(pk => (
                    <div key={pk.key} className="panel card" style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <label className="field" style={{ marginBottom: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>{pk.label}</span>
                        {pk.desc && (
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>
                            {pk.desc}
                          </span>
                        )}
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={config[pk.key] || ''}
                          onChange={(e) => handleChange(pk.key, e.target.value)}
                          placeholder="0.00"
                          required
                          style={{ background: '#ffffff', fontWeight: 600 }}
                        />
                      </label>
                      {calculatePreview(pk)}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="ghost-btn" onClick={loadConfig} disabled={isSaving}>
                Reset
              </button>
              <button type="submit" className="primary-btn" disabled={isSaving}>
                {isSaving ? 'Saving Changes...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdPricingConfigPage;
