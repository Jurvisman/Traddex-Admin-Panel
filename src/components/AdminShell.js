import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

const THEME_KEY = 'adminTheme';

function AdminShell({ navItems, onLogout, pageTitle, pageSubtitle, children }) {
  const [theme, setTheme] = useState(() => (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                  >
                    {item.icon ? <span className="admin-nav-icon">{item.icon}</span> : null}
                    <span className="admin-nav-label">{item.label}</span>
                  </NavLink>
                ))}
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
