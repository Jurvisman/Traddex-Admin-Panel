import { NavLink } from 'react-router-dom';

function AdminShell({ navItems, onLogout, pageTitle, pageSubtitle, children }) {
  return (
    <div className="admin-shell">
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
                    {item.label}
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
          <div>
            <p className="admin-kicker">Admin Panel</p>
            <h1 className="admin-title">{pageTitle || 'Dashboard'}</h1>
            {pageSubtitle ? <p className="admin-subtitle">{pageSubtitle}</p> : null}
          </div>
        </div>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}

export default AdminShell;
