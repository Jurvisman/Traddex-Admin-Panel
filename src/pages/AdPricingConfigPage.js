import { useCallback, useEffect, useState } from 'react';
import { Banner } from '../components';
import {
  getAdPricingConfig,
  updateAdPricingConfig,
} from '../services/adminApi';

const PRICING_KEYS = [
  { key: 'BASE_RATE_FULL_BANNER', label: 'Base Rate: Full Banner (₹/hr)', category: 'Base Rates' },
  { key: 'BASE_RATE_MID_CARD',    label: 'Base Rate: Mid Card (₹/hr)',    category: 'Base Rates' },
  { key: 'BASE_RATE_BOTTOM_STRIP', label: 'Base Rate: Bottom Strip (₹/hr)', category: 'Base Rates' },
  
  { key: 'TARGET_MULT_GLOBAL',  label: 'Multiplier: Global',  category: 'Target Multipliers' },
  { key: 'TARGET_MULT_COUNTRY', label: 'Multiplier: Country', category: 'Target Multipliers' },
  { key: 'TARGET_MULT_STATE',   label: 'Multiplier: State',   category: 'Target Multipliers' },
  { key: 'TARGET_MULT_CITY',    label: 'Multiplier: City',    category: 'Target Multipliers' },
  { key: 'TARGET_MULT_RADIUS',  label: 'Multiplier: Radius',  category: 'Target Multipliers' },
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
      // Backend returns PricingConfigResponse { config: Map<String, BigDecimal> }
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
    
    // Find matching base rates to show examples
    const baseRates = PRICING_KEYS.filter(k => k.category === 'Base Rates');
    const multiplier = parseFloat(config[pk.key] || 0);
    
    return (
      <div className="price-preview" style={{ marginTop: 8, fontSize: 12, color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: 6 }}>
        <strong>Preview Hourly Cost:</strong>
        <div style={{ marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {baseRates.map(br => {
             const base = parseFloat(config[br.key] || 0);
             const total = (base * multiplier).toFixed(2);
             const label = br.label.split(':')[1].split('(')[0].trim();
             return <span key={br.key}>{label}: ₹{total}</span>;
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
      // Ensure all values are numeric
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
      <Banner message={message} />
      
      <div className="panel-grid">
        <div className="panel-card">
          <div className="panel-header">
            <h3 className="panel-subheading">Advertisement Pricing Engine</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Configure base hourly rates and targeting multipliers. Total cost = Base Rate × Multiplier × Hours.
            </p>
          </div>

          {isLoading ? (
            <p className="empty-state">Loading configuration...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              {categories.map(cat => (
                <div key={cat} style={{ marginBottom: 32 }}>
                  <h4 style={{ marginBottom: 16, color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>{cat}</h4>
                  <div className="field-grid">
                    {PRICING_KEYS.filter(pk => pk.category === cat).map(pk => (
                      <div key={pk.key} className="field-container" style={{ marginBottom: 16 }}>
                        <label className="field">
                          <span>{pk.label}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={config[pk.key] || ''}
                            onChange={(e) => handleChange(pk.key, e.target.value)}
                            placeholder="0.00"
                            required
                          />
                        </label>
                        {calculatePreview(pk)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="form-actions" style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                <button type="submit" className="primary-btn" disabled={isSaving}>
                  {isSaving ? 'Saving Changes...' : 'Save Configuration'}
                </button>
                <button type="button" className="ghost-btn" onClick={loadConfig} disabled={isSaving}>
                  Reset
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdPricingConfigPage;
