import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const THEME_KEY = 'adminTheme';

const isPathActive = (pathname, path) => {
  if (!pathname || !path) return false;
  return pathname === path || pathname.startsWith(`${path}/`);
};

const getMenuKey = (groupTitle, item) => item.key || item.path || `${groupTitle}-${item.label}`;

function AdminShell({ navItems, onLogout, pageTitle, pageSubtitle, children }) {
  const [theme, setTheme] = useState(() => (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'));
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setExpandedMenus((prev) => {
      let changed = false;
      const next = { ...prev };

      navItems.forEach((group) => {
        group.items.forEach((item) => {
          if (!Array.isArray(item.children) || item.children.length === 0) return;
          const active = item.children.some((child) => isPathActive(location.pathname, child.path));
          if (active) {
            const key = getMenuKey(group.title, item);
            if (!next[key]) {
              next[key] = true;
              changed = true;
            }
          }
        });
      });

      return changed ? next : prev;
    });
  }, [location.pathname, navItems]);

  return (
    <div className={`admin-shell ${theme === 'light' ? 'theme-light' : 'theme-dark'}`}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="brand-title">Traddex</div>
          <div className="brand-tag">Admin Console</div>
        </div>
        <nav className="admin-nav">
          {navItems.map((group) => (
            <div key={group.title} className="admin-nav-group">
              <div className="admin-nav-title">{group.title}</div>
              <div className="admin-nav-items">
                {group.items.map((item) => {
                  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                  const menuKey = getMenuKey(group.title, item);
                  const menuStyle = item.tone
                    ? {
                        '--nav-tone': item.tone.base,
                        '--nav-tone-soft': item.tone.soft,
                        '--nav-tone-shadow': item.tone.shadow,
                      }
                    : undefined;

                  if (!hasChildren) {
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        style={menuStyle}
                        className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                      >
                        {item.icon ? <span className="admin-nav-icon">{item.icon}</span> : null}
                        <span className="admin-nav-label">{item.label}</span>
                      </NavLink>
                    );
                  }

                  const menuActive = item.children.some((child) => isPathActive(location.pathname, child.path));
                  const menuExpanded = expandedMenus[menuKey] ?? menuActive;

                  return (
                    <div key={menuKey} className={`admin-nav-parent ${menuExpanded ? 'expanded' : ''}`}>
                      <button
                        type="button"
                        style={menuStyle}
                        className={`admin-nav-item admin-nav-parent-trigger ${menuActive ? 'active' : ''}`}
                        onClick={() => setExpandedMenus((prev) => ({ ...prev, [menuKey]: !menuExpanded }))}
                      >
                        {item.icon ? <span className="admin-nav-icon">{item.icon}</span> : null}
                        <span className="admin-nav-label">{item.label}</span>
                        <span className={`admin-nav-caret ${menuExpanded ? 'open' : ''}`} aria-hidden="true">
                          <svg viewBox="0 0 20 20">
                            <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                          </svg>
                        </span>
                      </button>
                      {menuExpanded ? (
                        <div className="admin-subnav-items">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              style={
                                child.tone
                                  ? {
                                      '--nav-tone': child.tone.base,
                                      '--nav-tone-soft': child.tone.soft,
                                      '--nav-tone-shadow': child.tone.shadow,
                                    }
                                  : menuStyle
                              }
                              className={({ isActive }) => `admin-nav-subitem ${isActive ? 'active' : ''}`}
                            >
                              <span className="admin-nav-subdot" aria-hidden="true" />
                              <span className="admin-nav-label">{child.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <button type="button" className="ghost-btn admin-logout" onClick={onLogout}>
          Logout
        </button>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div className="admin-topbar-info">
            <p className="admin-kicker">Admin Panel</p>
            <h1 className="admin-title">{pageTitle || 'Dashboard'}</h1>
            {pageSubtitle ? <p className="admin-subtitle">{pageSubtitle}</p> : null}
          </div>
          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-theme-toggle"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            >
              <span className={`theme-dot ${theme === 'light' ? 'light' : 'dark'}`} />
              {theme === 'light' ? 'Light' : 'Dark'}
            </button>
            <label className="admin-search">
              <span className="icon icon-search" />
              <input type="search" placeholder="Search..." aria-label="Search" />
            </label>
            <button type="button" className="admin-icon-btn" aria-label="Notifications">
              <svg className="admin-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 3a5 5 0 0 0-5 5v2.2c0 .7-.3 1.4-.8 2l-1.2 1.5c-.4.5 0 1.3.7 1.3h14.6c.7 0 1.1-.8.7-1.3l-1.2-1.5c-.5-.6-.8-1.3-.8-2V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 21Z"
                  fill="currentColor"
                />
              </svg>
              <span className="admin-icon-badge">3</span>
            </button>
            <div className="admin-avatar" aria-label="Admin">
              A
            </div>
          </div>
        </div>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}

export default AdminShell;
