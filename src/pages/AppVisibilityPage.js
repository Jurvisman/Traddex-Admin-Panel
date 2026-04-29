import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { fetchAppVisibilityScope, saveAppVisibilityScope } from '../services/adminApi';
import { usePermissions } from '../shared/permissions';

const SCOPES = ['USER', 'BUSINESS'];

const AREA_META = {
  BOTTOM_NAV: { title: 'Bottom Navigation', description: 'Controls the main tab bar inside the mobile app.' },
  PROFILE_MENU: { title: 'Profile Menu', description: 'Controls account, app, and legal actions in profile.' },
  QUICK_ACTION: { title: 'Quick Actions', description: 'Controls shortcut cards shown near the top of profile.' },
  BLOCKED_ROUTE: { title: 'Blocked Routes', description: 'Routes that should be blocked for this scope.' },
};

const AREA_ORDER = ['BOTTOM_NAV', 'PROFILE_MENU', 'QUICK_ACTION', 'BLOCKED_ROUTE'];

const normalizeItems = (data, scope) => {
  const groups = [
    ...(data?.bottomNav || []),
    ...(data?.profileMenu || []),
    ...(data?.quickActions || []),
    ...(data?.blockedRoutes || []),
  ];
  return groups.map((item, index) => ({
    id: item.id,
    scope,
    area: item.area,
    itemKey: item.itemKey || '',
    label: item.label || '',
    route: item.route || '',
    icon: item.icon || '',
    visible: item.visible !== false,
    sortOrder: item.sortOrder ?? (index + 1) * 10,
  }));
};

const sortItems = (items) =>
  [...items].sort((left, right) => {
    const areaDiff = AREA_ORDER.indexOf(left.area) - AREA_ORDER.indexOf(right.area);
    if (areaDiff !== 0) return areaDiff;
    return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  });

function AppVisibilityPage({ token }) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('ADMIN_APP_VISIBILITY_UPDATE');
  const [scope, setScope] = useState('USER');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  const groupedItems = useMemo(() => {
    const grouped = {};
    AREA_ORDER.forEach((area) => {
      grouped[area] = sortItems(items.filter((item) => item.area === area));
    });
    return grouped;
  }, [items]);

  const loadScope = async (nextScope = scope) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetchAppVisibilityScope(token, nextScope);
      const data = response?.data || response;
      setItems(normalizeItems(data, nextScope));
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load app visibility settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScope(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const updateItem = (area, itemKey, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.area === area && item.itemKey === itemKey ? { ...item, [field]: value } : item
      )
    );
  };

  const save = async () => {
    if (!canUpdate) return;
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      const payload = items.map((item) => ({
        ...item,
        sortOrder: Number(item.sortOrder) || 0,
      }));
      const response = await saveAppVisibilityScope(token, scope, payload);
      const data = response?.data || response;
      setItems(normalizeItems(data, scope));
      setMessage({ type: 'success', text: 'App visibility settings saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save app visibility settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-visibility-page">
      {message.text ? <Banner type={message.type}>{message.text}</Banner> : null}

      <div className="app-visibility-toolbar">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>App Visibility</h2>
          <p>Manage what USER and BUSINESS accounts see in the mobile app.</p>
        </div>
        <div className="app-visibility-actions">
          <div className="scope-switcher" role="tablist" aria-label="Visibility scope">
            {SCOPES.map((value) => (
              <button
                key={value}
                type="button"
                className={scope === value ? 'active' : ''}
                onClick={() => setScope(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <button type="button" className="secondary-action" onClick={() => loadScope(scope)} disabled={isLoading}>
            Reset
          </button>
          <button type="button" className="primary-action" onClick={save} disabled={!canUpdate || isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {!canUpdate ? (
        <div className="app-visibility-note">You can view this page, but update permission is required to save changes.</div>
      ) : null}

      {isLoading ? (
        <div className="empty-state">Loading app visibility settings...</div>
      ) : (
        <div className="app-visibility-sections">
          {AREA_ORDER.map((area) => (
            <section key={area} className="visibility-section">
              <div className="visibility-section-head">
                <div>
                  <h3>{AREA_META[area].title}</h3>
                  <p>{AREA_META[area].description}</p>
                </div>
                <span>{groupedItems[area]?.length || 0} items</span>
              </div>

              <div className="visibility-list">
                {(groupedItems[area] || []).map((item) => (
                  <div key={`${item.area}-${item.itemKey}`} className="visibility-row">
                    <label className="toggle-field">
                      <input
                        type="checkbox"
                        checked={item.visible}
                        disabled={!canUpdate}
                        onChange={(event) => updateItem(item.area, item.itemKey, 'visible', event.target.checked)}
                      />
                      <span />
                    </label>

                    <div className="visibility-key">
                      <strong>{item.itemKey}</strong>
                      <small>{item.area}</small>
                    </div>

                    <label>
                      <span>Label</span>
                      <input
                        value={item.label}
                        disabled={!canUpdate}
                        onChange={(event) => updateItem(item.area, item.itemKey, 'label', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Route</span>
                      <input
                        value={item.route}
                        disabled={!canUpdate}
                        onChange={(event) => updateItem(item.area, item.itemKey, 'route', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Icon</span>
                      <input
                        value={item.icon}
                        disabled={!canUpdate}
                        onChange={(event) => updateItem(item.area, item.itemKey, 'icon', event.target.value)}
                      />
                    </label>
                    <label className="order-field">
                      <span>Order</span>
                      <input
                        type="number"
                        value={item.sortOrder}
                        disabled={!canUpdate}
                        onChange={(event) => updateItem(item.area, item.itemKey, 'sortOrder', event.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default AppVisibilityPage;
