import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const MOBILE_BREAKPOINT = 1080;

const isPathActive = (pathname, path) => {
  if (!pathname || !path) return false;
  return pathname === path || pathname.startsWith(`${path}/`);
};

const getMenuKey = (groupTitle, item) => item.key || item.path || `${groupTitle}-${item.label}`;

const getAvatarLabel = (value) => {
  const text = String(value || 'TradeX').trim();
  if (!text) return 'TX';
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const toStageLabel = (segment, fallbackTitle) => {
  const value = String(segment || '').trim();
  if (!value) return fallbackTitle || 'Dashboard';
  if (/^\d+$/.test(value)) return fallbackTitle || 'Details';
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

function AdminShell({ navItems, onLogout, pageTitle, pageSubtitle, children }) {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const syncViewport = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

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

  const showExpandedSidebar = isMobile || isSidebarOpen;
  const routeSegments = location.pathname.split('/').filter(Boolean).slice(1);
  const stageParts = routeSegments.length
    ? routeSegments.map((segment) => toStageLabel(segment, pageTitle))
    : [pageTitle || 'Dashboard'];
  const shouldShowBack = routeSegments.length > 1;
  const shouldShowStageNote = Boolean(pageSubtitle) && routeSegments.length > 1;
  const shouldHideStageHead = /^\/admin\/products\/[^/]+(?:\/edit)?$/i.test(location.pathname);
  const sidebarStateClass = isMobile
    ? isSidebarOpen
      ? 'is-open is-mobile'
      : 'is-mobile'
    : isSidebarOpen
      ? 'is-open'
      : 'is-collapsed';

  const handleLinkClick = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="admin-shell-gsc">
      {isMobile && isSidebarOpen ? (
        <button type="button" className="admin-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} aria-label="Close menu" />
      ) : null}

      <aside className={`admin-sidebar ${sidebarStateClass}`}>
        <div className="admin-brand">
          {showExpandedSidebar ? (
            <div className="brand-copy">
              <div className="brand-title">TRAD<span className="brand-title-accent">D</span>EX</div>
              <div className="brand-tag">ADMIN PANEL</div>
            </div>
          ) : null}
        </div>

        <nav className="admin-nav" aria-label="Admin menu">
          {navItems.map((group) => (
            <div key={group.title} className="admin-nav-group">
              {showExpandedSidebar && group.title && group.title !== 'Menu' ? (
                <div className="admin-nav-title">{group.title}</div>
              ) : null}

              <div className="admin-nav-items">
                {group.items.map((item) => {
                  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                  const menuKey = getMenuKey(group.title, item);

                  if (!hasChildren) {
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        title={!showExpandedSidebar ? item.label : undefined}
                        end={item.exact === true}
                        className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                        onClick={handleLinkClick}
                      >
                        {item.icon ? <span className="admin-nav-icon">{item.icon}</span> : null}
                        {showExpandedSidebar ? <span className="admin-nav-label">{item.label}</span> : null}
                      </NavLink>
                    );
                  }

                  const menuActive = item.children.some((child) => isPathActive(location.pathname, child.path));
                  const menuExpanded = expandedMenus[menuKey] ?? menuActive;

                  return (
                    <div key={menuKey} className={`admin-nav-parent ${menuExpanded ? 'expanded' : ''}`}>
                      <button
                        type="button"
                        title={!showExpandedSidebar ? item.label : undefined}
                        className={`admin-nav-item admin-nav-parent-trigger ${menuActive ? 'active' : ''}`}
                        onClick={() => {
                          if (!showExpandedSidebar) {
                            setIsSidebarOpen(true);
                            return;
                          }
                          setExpandedMenus((prev) => ({ ...prev, [menuKey]: !menuExpanded }));
                        }}
                      >
                        {item.icon ? <span className="admin-nav-icon">{item.icon}</span> : null}
                        {showExpandedSidebar ? <span className="admin-nav-label">{item.label}</span> : null}
                        {showExpandedSidebar ? (
                          <span className={`admin-nav-caret ${menuExpanded ? 'open' : ''}`} aria-hidden="true">
                            <svg viewBox="0 0 20 20">
                              <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                            </svg>
                          </span>
                        ) : null}
                      </button>

                      {showExpandedSidebar && menuExpanded ? (
                        <div className="admin-subnav-items">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              className={({ isActive }) => `admin-nav-subitem ${isActive ? 'active' : ''}`}
                              onClick={handleLinkClick}
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

        <div className="admin-sidebar-footer">
          <button type="button" className="admin-logout" onClick={onLogout} title={!showExpandedSidebar ? 'Logout' : undefined}>
            <span className="admin-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m4-4 4-4-4-4m-6 4h10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {showExpandedSidebar ? <span>Logout</span> : null}
          </button>
        </div>
      </aside>

      <div className={`admin-main-shell ${!isMobile && isSidebarOpen ? 'sidebar-open' : ''} ${!isMobile && !isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-menu-toggle"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <span />
              <span />
              <span />
            </button>

            <button type="button" className="admin-quick-action">
              <span className="admin-quick-action-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span>Quick Action</span>
              <span className="admin-quick-action-caret" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
            </button>
          </div>

          <div className="admin-topbar-center">
            <label className="admin-search">
              <input type="search" placeholder="Search" aria-label="Search" />
              <span className="icon icon-search" />
            </label>
          </div>

          <div className="admin-topbar-actions">
            <button type="button" className="admin-year-chip">
              <span>2026 - 25</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>

            <button type="button" className="admin-support-link">
              <span className="admin-support-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M12 18v-2m-6 0v-4a6 6 0 0 1 12 0v4m-9 0a2 2 0 1 0 4 0v-1m1 1a2 2 0 1 0 4 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>Connect With Us</span>
            </button>

            <button type="button" className="admin-icon-btn" aria-label="Help">
              <svg className="admin-icon" viewBox="0 0 24 24">
                <path
                  d="M12 17h.01M9.25 9.5a2.75 2.75 0 1 1 4.67 1.97c-.7.68-1.42 1.2-1.42 2.28V14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>

            <button type="button" className="admin-icon-btn" aria-label="Notifications">
              <svg className="admin-icon" viewBox="0 0 24 24">
                <path
                  d="M12 3a5 5 0 0 0-5 5v2.2c0 .7-.3 1.4-.8 2l-1.2 1.5c-.4.5 0 1.3.7 1.3h14.6c.7 0 1.1-.8.7-1.3l-1.2-1.5c-.5-.6-.8-1.3-.8-2V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.4-2H9.6A2.5 2.5 0 0 0 12 21Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <div className="admin-avatar" aria-label="Admin profile">
              {getAvatarLabel(pageTitle)}
            </div>
          </div>
        </header>

        <main className="admin-main">
          <div className="admin-stage">
            {!shouldHideStageHead ? (
              <div className={`admin-stage-head ${!shouldShowBack && !shouldShowStageNote ? 'is-compact' : ''}`}>
                <div className="admin-stage-copy">
                  <p className="admin-stage-path">{stageParts.join(' / ')}</p>
                  {shouldShowStageNote ? <p className="admin-stage-note">{pageSubtitle}</p> : null}
                </div>
              </div>
            ) : null}
            <div className="admin-content">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminShell;
