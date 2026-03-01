import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AdminShell } from './components';
import {
  AdminDashboardPage,
  CatalogManagerPage,
  AppConfigPage,
  AdminTimezonesPage,
  LoginPage,
  InquiryConfigPage,
  InquiryReportPage,
  OtpVerifyPage,
  ProductAttributePage,
  ProductPage,
  SubscriptionAssignPage,
  SubscriptionFeaturePage,
  SubscriptionOverviewPage,
  SubscriptionPlanPage,
  AdminUsersPage,
  EmployeePage,
  RolePermissionPage,
  OrderDisputesPage,
  OrderReturnsPage,
} from './pages';
import { fetchMyPermissions } from './services/adminApi';
import './App.css';

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h7v7H4v-7Zm9-2h7v9h-7v-9Z"
        fill="currentColor"
      />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8.5-2.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM2.5 20a5.5 5.5 0 0 1 11 0v1h-11v-1Zm12 1v-1a7 7 0 0 0-1.2-3.9 5 5 0 0 1 8.2 3.9v1h-7Z"
        fill="currentColor"
      />
    </svg>
  ),
  employee: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM4 19a8 8 0 1 1 16 0v2H4v-2Zm16-8h-2V9h-2V7h2V5h2v2h2v2h-2v2Z"
        fill="currentColor"
      />
    </svg>
  ),
  catalog: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h7v6H4V6Zm9 0h7v4h-7V6ZM4 14h7v4H4v-4Zm9-2h7v6h-7v-6Z" fill="currentColor" />
    </svg>
  ),
  attributes: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 5h6v6H4V5Zm10 0h6v6h-6V5ZM4 13h6v6H4v-6Zm9 2h7v2h-7v-2Z"
        fill="currentColor"
      />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h10l2 4H5l2-4Zm-2 6h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9Zm5 2v2h4v-2h-4Z"
        fill="currentColor"
      />
    </svg>
  ),
  inquiryConfig: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3 4 7v6c0 4.4 3 7.6 8 9 5-1.4 8-4.6 8-9V7l-8-4Zm-1 6h2v5h-2V9Zm0 6h2v2h-2v-2Z"
        fill="currentColor"
      />
    </svg>
  ),
  inquiryReport: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h14v16H5V4Zm3 4h8v2H8V8Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z" fill="currentColor" />
    </svg>
  ),
  subOverview: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 5h16v4H4V5Zm0 6h7v8H4v-8Zm9 0h7v8h-7v-8Z"
        fill="currentColor"
      />
    </svg>
  ),
  subFeatures: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 3 7l9 4 9-4-9-4Zm9 6v8l-9 4-9-4V9l9 4 9-4Z" fill="currentColor" />
    </svg>
  ),
  subPlans: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h12v4H6V4Zm-2 6h16v10H4V10Zm4 2v6h2v-6H8Zm6 0v6h2v-6h-2Z" fill="currentColor" />
    </svg>
  ),
  subAssignments: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h10v3H7V4Zm-3 5h16v11H4V9Zm4 2v2h8v-2H8Zm0 4v2h5v-2H8Z"
        fill="currentColor"
      />
    </svg>
  ),
  appConfig: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4a2 2 0 0 1 2 2v1.1a6.8 6.8 0 0 1 1.9.8l.8-.8a2 2 0 1 1 2.8 2.8l-.8.8c.3.6.6 1.2.8 1.9H20a2 2 0 1 1 0 4h-1.1a6.8 6.8 0 0 1-.8 1.9l.8.8a2 2 0 1 1-2.8 2.8l-.8-.8c-.6.3-1.2.6-1.9.8V20a2 2 0 1 1-4 0v-1.1a6.8 6.8 0 0 1-1.9-.8l-.8.8a2 2 0 1 1-2.8-2.8l.8-.8a6.8 6.8 0 0 1-.8-1.9H4a2 2 0 1 1 0-4h1.1c.2-.7.5-1.3.8-1.9l-.8-.8a2 2 0 1 1 2.8-2.8l.8.8c.6-.3 1.2-.6 1.9-.8V6a2 2 0 0 1 2-2Zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
        fill="currentColor"
      />
    </svg>
  ),
  settingsRole: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Zm1 5v4h3v2h-3v3h-2v-3H8v-2h3V7h2Z"
        fill="currentColor"
      />
    </svg>
  ),
  timezones: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm1-13h-2v6l4.8 2.8 1-1.7-3.8-2.2V7Z"
        fill="currentColor"
      />
    </svg>
  ),
  disputes: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a9 9 0 0 0-9 9c0 3.9 2.5 7.3 6.1 8.5l2.4 2.6c.3.3.9.1.9-.3v-2.1h1.6a9 9 0 0 0 0-18Zm-3 8h6v2H9v-2Zm0-3h6v2H9V7Zm0 6h4v2H9v-2Z"
        fill="currentColor"
      />
    </svg>
  ),
  returns: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3Zm1 4v4l3 2-1 1.7-4-2.4V7h2Z"
        fill="currentColor"
      />
    </svg>
  ),
};

const NAV_TONES = {
  dashboard: { base: '#4F46E5', soft: 'rgba(79, 70, 229, 0.14)', shadow: 'rgba(79, 70, 229, 0.35)' },
  users: { base: '#16A34A', soft: 'rgba(22, 163, 74, 0.16)', shadow: 'rgba(22, 163, 74, 0.3)' },
  employee: { base: '#0EA5E9', soft: 'rgba(14, 165, 233, 0.16)', shadow: 'rgba(14, 165, 233, 0.3)' },
  catalog: { base: '#F59E0B', soft: 'rgba(245, 158, 11, 0.16)', shadow: 'rgba(245, 158, 11, 0.3)' },
  fields: { base: '#8B5CF6', soft: 'rgba(139, 92, 246, 0.16)', shadow: 'rgba(139, 92, 246, 0.3)' },
  products: { base: '#14B8A6', soft: 'rgba(20, 184, 166, 0.16)', shadow: 'rgba(20, 184, 166, 0.3)' },
  inquiryConfig: { base: '#F97316', soft: 'rgba(249, 115, 22, 0.16)', shadow: 'rgba(249, 115, 22, 0.3)' },
  inquiryReport: { base: '#EF4444', soft: 'rgba(239, 68, 68, 0.16)', shadow: 'rgba(239, 68, 68, 0.3)' },
  subOverview: { base: '#3B82F6', soft: 'rgba(59, 130, 246, 0.16)', shadow: 'rgba(59, 130, 246, 0.3)' },
  subFeatures: { base: '#10B981', soft: 'rgba(16, 185, 129, 0.16)', shadow: 'rgba(16, 185, 129, 0.3)' },
  subPlans: { base: '#A855F7', soft: 'rgba(168, 85, 247, 0.16)', shadow: 'rgba(168, 85, 247, 0.3)' },
  subAssignments: { base: '#EAB308', soft: 'rgba(234, 179, 8, 0.16)', shadow: 'rgba(234, 179, 8, 0.3)' },
  appConfig: { base: '#0EA5E9', soft: 'rgba(14, 165, 233, 0.16)', shadow: 'rgba(14, 165, 233, 0.3)' },
  settingsRole: { base: '#334155', soft: 'rgba(51, 65, 85, 0.14)', shadow: 'rgba(51, 65, 85, 0.3)' },
  timezones: { base: '#2563EB', soft: 'rgba(37, 99, 235, 0.16)', shadow: 'rgba(37, 99, 235, 0.3)' },
  disputes: { base: '#EF4444', soft: 'rgba(239, 68, 68, 0.16)', shadow: 'rgba(239, 68, 68, 0.3)' },
  returns: { base: '#F97316', soft: 'rgba(249, 115, 22, 0.16)', shadow: 'rgba(249, 115, 22, 0.3)' },
};

const DEFAULT_ADMIN_META = {
  title: 'Dashboard',
  subtitle: 'Track core counts and activity across Traddex.',
};

const ADMIN_META = [
  {
    match: '/admin/dashboard',
    ...DEFAULT_ADMIN_META,
  },
  {
    matchPrefix: '/admin/users',
    title: 'Users',
    subtitle: 'Monitor registered users and login activity.',
  },
  {
    match: '/admin/employees',
    title: 'Employees',
    subtitle: 'Create internal admin employees and assign roles.',
  },
  {
    match: '/admin/catalog-manager',
    title: 'Catalog Manager',
    subtitle: 'Manage industries, main categories, categories, and sub-categories together.',
  },
  {
    match: '/admin/product-attribute',
    title: 'Dynamic Fields',
    subtitle: 'Create custom fields that appear in product forms.',
  },
  {
    matchPrefix: '/admin/products',
    title: 'Products',
    subtitle: 'Create and manage products submitted by businesses.',
  },
  {
    match: '/admin/inquiry/config',
    title: 'Inquiry Config',
    subtitle: 'Tune premium vs normal distribution ratios.',
  },
  {
    match: '/admin/inquiry/report',
    title: 'Inquiry Report',
    subtitle: 'Monitor inquiry volume, assignments, and refunds.',
  },
  {
    match: '/admin/subscription/features',
    title: 'Subscription Features',
    subtitle: 'Manage the feature catalog that powers plan access.',
  },
  {
    match: '/admin/subscription/overview',
    title: 'Subscriptions',
    subtitle: 'Track plan performance, revenue, and subscriber activity.',
  },
  {
    match: '/admin/subscription/plans',
    title: 'Subscription Plans',
    subtitle: 'Create plans with pricing, durations, and feature limits.',
  },
  {
    match: '/admin/subscription/assignments',
    title: 'Assign Subscriptions',
    subtitle: 'Grant plans to users and review assignments.',
  },
  {
    match: '/admin/settings/roles',
    title: 'Role Permissions',
    subtitle: 'Manage roles and map CRUD permissions by menu/submenu.',
  },
  {
    match: '/admin/app-config',
    title: 'App Config',
    subtitle: 'Edit and publish dynamic UI configuration.',
  },
  {
    match: '/admin/timezones',
    title: 'Timezones',
    subtitle: 'Import IANA zone1970.tab to refresh timezone lookups.',
  },
  {
    match: '/admin/orders/disputes',
    title: 'Order Disputes',
    subtitle: 'Review disputes and close them with clear resolutions.',
  },
  {
    match: '/admin/orders/returns',
    title: 'Order Returns',
    subtitle: 'Override return requests and lock final outcomes.',
  },
];

const getAdminMeta = (pathname) => {
  const exact = ADMIN_META.find((item) => item.match === pathname);
  if (exact) return exact;
  const prefixed = ADMIN_META.find((item) => item.matchPrefix && pathname.startsWith(item.matchPrefix));
  return prefixed || DEFAULT_ADMIN_META;
};

const normalizeAdminPath = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw === '/') return '/';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

const buildPermissionState = (permissionPayload) => {
  const paths = new Set();
  const actions = new Set();
  const menuPermissions = Array.isArray(permissionPayload?.menuPermissions) ? permissionPayload.menuPermissions : [];

  menuPermissions.forEach((menu) => {
    (menu?.submenus || []).forEach((submenu) => {
      if (Number(submenu?.enabled) === 0) return;
      const submenuPath = normalizeAdminPath(submenu?.path);
      if (submenuPath) {
        paths.add(submenuPath);
      }
      (submenu?.actions || []).forEach((action) => {
        if (Number(action?.enabled) === 0) return;
        const code = String(action?.code || '').trim().toUpperCase();
        if (code) {
          actions.add(code);
        }
      });
    });
  });

  return { paths, actions };
};

const hasPathAccess = (allowedPaths, path) => {
  const normalized = normalizeAdminPath(path);
  if (!normalized) return false;
  if (allowedPaths.has(normalized)) return true;
  for (const basePath of allowedPaths) {
    if (normalized.startsWith(`${basePath}/`)) {
      return true;
    }
  }
  return false;
};

const getFirstLeafPath = (navGroups) => {
  for (const group of navGroups || []) {
    for (const item of group?.items || []) {
      if (Array.isArray(item?.children) && item.children.length > 0) {
        const childPath = item.children.find((child) => child?.path)?.path;
        if (childPath) return childPath;
      } else if (item?.path) {
        return item.path;
      }
    }
  }
  return '';
};

function PermissionGate({ isLoading, isAllowed, fallbackPath, children }) {
  if (isLoading) {
    return <div className="empty-state">Loading permissions...</div>;
  }
  if (!isAllowed) {
    return <Navigate to={fallbackPath || '/login'} replace />;
  }
  return children;
}

function RequireAuth({ token, children }) {
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function AdminLayout({ navItems, onLogout }) {
  const location = useLocation();
  const pageMeta = useMemo(() => getAdminMeta(location.pathname), [location.pathname]);

  return (
    <AdminShell
      navItems={navItems}
      onLogout={onLogout}
      pageTitle={pageMeta.title}
      pageSubtitle={pageMeta.subtitle}
    >
      <Outlet />
    </AdminShell>
  );
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || '');
  const [authUserId, setAuthUserId] = useState(() => {
    const stored = localStorage.getItem('authUserId');
    return stored ? Number(stored) : null;
  });
  const [redirectPath, setRedirectPath] = useState('/admin/dashboard');
  const [permissionPayload, setPermissionPayload] = useState(null);
  const [isPermissionLoading, setIsPermissionLoading] = useState(false);

  useEffect(() => {
    const fromPath = location.state?.from?.pathname;
    const redirectTo = location.state?.redirectTo;
    if (fromPath) {
      setRedirectPath(fromPath);
      return;
    }
    if (redirectTo) {
      setRedirectPath(redirectTo);
      return;
    }
    if (location.pathname === '/login') {
      setRedirectPath('/admin/dashboard');
    }
  }, [location.pathname, location.state]);

  useEffect(() => {
    if (!authToken) {
      setPermissionPayload(null);
      setIsPermissionLoading(false);
      return;
    }

    let active = true;
    const loadPermissions = async () => {
      setIsPermissionLoading(true);
      try {
        const response = await fetchMyPermissions(authToken);
        if (!active) return;
        if (response?.menuPermissions) {
          setPermissionPayload(response);
        } else if (response?.data?.menuPermissions) {
          setPermissionPayload(response.data);
        } else {
          setPermissionPayload({ menuPermissions: [] });
        }
      } catch (error) {
        if (!active) return;
        setPermissionPayload({ menuPermissions: [] });
      } finally {
        if (active) {
          setIsPermissionLoading(false);
        }
      }
    };

    loadPermissions();
    return () => {
      active = false;
    };
  }, [authToken]);

  const allNavItems = useMemo(
    () => [
      {
        title: 'Menu',
        items: [
          { path: '/admin/dashboard', label: 'Dashboard', icon: ICONS.dashboard, tone: NAV_TONES.dashboard },
          { path: '/admin/users', label: 'Users', icon: ICONS.users, tone: NAV_TONES.users },
          { path: '/admin/employees', label: 'Employee', icon: ICONS.employee, tone: NAV_TONES.employee },
          {
            key: 'master-management-root',
            label: 'Master Management',
            icon: ICONS.catalog,
            tone: NAV_TONES.catalog,
            children: [
              {
                path: '/admin/products',
                label: 'Products',
                icon: ICONS.products,
                tone: NAV_TONES.products,
              },
              {
                path: '/admin/catalog-manager',
                label: 'Catalog Manager',
                icon: ICONS.catalog,
                tone: NAV_TONES.catalog,
              },
              { path: '/admin/product-attribute', label: 'Dynamic Fields', icon: ICONS.attributes, tone: NAV_TONES.fields },
            ],
          },
          {
            key: 'inquiry-root',
            label: 'Inquiry',
            icon: ICONS.inquiryConfig,
            tone: NAV_TONES.inquiryConfig,
            children: [
              { path: '/admin/inquiry/config', label: 'Inquiry Config', icon: ICONS.inquiryConfig, tone: NAV_TONES.inquiryConfig },
              { path: '/admin/inquiry/report', label: 'Inquiry Report', icon: ICONS.inquiryReport, tone: NAV_TONES.inquiryReport },
            ],
          },
          {
            key: 'subscription-root',
            label: 'Subscription',
            icon: ICONS.subOverview,
            tone: NAV_TONES.subOverview,
            children: [
              {
                path: '/admin/subscription/overview',
                label: 'Overview',
                icon: ICONS.subOverview,
                tone: NAV_TONES.subOverview,
              },
              {
                path: '/admin/subscription/features',
                label: 'Features',
                icon: ICONS.subFeatures,
                tone: NAV_TONES.subFeatures,
              },
              {
                path: '/admin/subscription/plans',
                label: 'Plans',
                icon: ICONS.subPlans,
                tone: NAV_TONES.subPlans,
              },
              {
                path: '/admin/subscription/assignments',
                label: 'Assignments',
                icon: ICONS.subAssignments,
                tone: NAV_TONES.subAssignments,
              },
            ],
          },
          {
            key: 'configuration-root',
            label: 'Configuration',
            icon: ICONS.appConfig,
            tone: NAV_TONES.appConfig,
            children: [
              {
                path: '/admin/settings/roles',
                label: 'Role Permissions',
                icon: ICONS.settingsRole,
                tone: NAV_TONES.settingsRole,
              },
              { path: '/admin/app-config', label: 'App Config', icon: ICONS.appConfig, tone: NAV_TONES.appConfig },
            ],
          },
          {
            key: 'location-root',
            label: 'Location',
            icon: ICONS.timezones,
            tone: NAV_TONES.timezones,
            children: [{ path: '/admin/timezones', label: 'Timezones', icon: ICONS.timezones, tone: NAV_TONES.timezones }],
          },
          {
            key: 'order-root',
            label: 'Order',
            icon: ICONS.disputes,
            tone: NAV_TONES.disputes,
            children: [
              { path: '/admin/orders/disputes', label: 'Dispute', icon: ICONS.disputes, tone: NAV_TONES.disputes },
              { path: '/admin/orders/returns', label: 'Return', icon: ICONS.returns, tone: NAV_TONES.returns },
            ],
          },
        ],
      },
    ],
    []
  );

  const permissionState = useMemo(() => buildPermissionState(permissionPayload), [permissionPayload]);
  const allowedPaths = permissionState.paths;
  const allowedActionCodes = permissionState.actions;

  const canAccessPath = (path) => {
    if (!authToken) return false;
    if (isPermissionLoading) return true;
    if (!path) return true;
    return hasPathAccess(allowedPaths, path);
  };

  const navItems = useMemo(() => {
    if (!authToken) return allNavItems;
    if (isPermissionLoading) return [];

    return allNavItems
      .map((group) => {
        const visibleItems = (group?.items || [])
          .map((item) => {
            if (Array.isArray(item?.children) && item.children.length > 0) {
              const visibleChildren = item.children.filter((child) => hasPathAccess(allowedPaths, child?.path));
              if (visibleChildren.length === 0) return null;
              return { ...item, children: visibleChildren };
            }
            return hasPathAccess(allowedPaths, item?.path) ? item : null;
          })
          .filter(Boolean);
        if (visibleItems.length === 0) return null;
        return { ...group, items: visibleItems };
      })
      .filter(Boolean);
  }, [allNavItems, authToken, isPermissionLoading, allowedPaths]);

  const firstAllowedAdminPath = useMemo(() => getFirstLeafPath(navItems), [navItems]);
  const defaultAdminPath = firstAllowedAdminPath || '/admin/dashboard';
  const routeFallbackPath = firstAllowedAdminPath || '/login';

  useEffect(() => {
    if (!authToken || isPermissionLoading) return;
    if (!location.pathname.startsWith('/admin')) return;
    if (canAccessPath(location.pathname)) return;
    navigate(routeFallbackPath, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, isPermissionLoading, location.pathname, routeFallbackPath]);

  const handleOtpSent = (digits) => {
    setPhone(digits);
    navigate('/otp', { state: { redirectTo: redirectPath } });
  };

  const handleEditNumber = () => {
    navigate('/login', { state: { redirectTo: redirectPath } });
  };

  const handleVerified = (userData, nextPath) => {
    const accountScope = String(userData?.accountScope || userData?.account_scope || '').toUpperCase();
    if (accountScope !== 'EMPLOYEE') {
      throw new Error('This account is not allowed in Admin Panel. Please use an employee account.');
    }

    const token = userData?.token || '';
    const userId = userData?.id || null;
    setAuthToken(token);
    setAuthUserId(userId);
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
    if (userId) {
      localStorage.setItem('authUserId', String(userId));
    } else {
      localStorage.removeItem('authUserId');
    }
    navigate(nextPath || redirectPath || '/admin', { replace: true });
  };

  const handleLogout = () => {
    setAuthToken('');
    setAuthUserId(null);
    setPermissionPayload(null);
    setIsPermissionLoading(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUserId');
    navigate('/login', { replace: true });
  };

  const defaultRoute = authToken ? defaultAdminPath : '/login';
  const otpRedirect = location.state?.redirectTo || redirectPath;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route
        path="/login"
        element={
          authToken ? (
            <Navigate to={defaultAdminPath} replace />
          ) : (
            <LoginPage initialPhone={phone} onOtpSent={handleOtpSent} />
          )
        }
      />
      <Route
        path="/otp"
        element={
          authToken ? (
            <Navigate to={defaultAdminPath} replace />
          ) : (
            <OtpVerifyPage
              phone={phone}
              onEditNumber={handleEditNumber}
              onVerified={(userData) => handleVerified(userData, otpRedirect)}
            />
          )
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth token={authToken}>
            <AdminLayout navItems={navItems} onLogout={handleLogout} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to={defaultAdminPath} replace />} />
        <Route
          path="dashboard"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/dashboard')}
              fallbackPath={routeFallbackPath}
            >
              <AdminDashboardPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="users"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={
                canAccessPath('/admin/users') &&
                (allowedActionCodes.size === 0 || allowedActionCodes.has('ADMIN_USERS_READ'))
              }
              fallbackPath={routeFallbackPath}
            >
              <AdminUsersPage token={authToken} allowedActions={allowedActionCodes} />
            </PermissionGate>
          }
        />
        <Route
          path="users/:id"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={
                canAccessPath('/admin/users') &&
                (allowedActionCodes.size === 0 || allowedActionCodes.has('ADMIN_USERS_READ'))
              }
              fallbackPath={routeFallbackPath}
            >
              <AdminUsersPage token={authToken} allowedActions={allowedActionCodes} />
            </PermissionGate>
          }
        />
        <Route
          path="employees"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={
                canAccessPath('/admin/employees') &&
                (allowedActionCodes.size === 0 || allowedActionCodes.has('ADMIN_EMPLOYEES_READ'))
              }
              fallbackPath={routeFallbackPath}
            >
              <EmployeePage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="catalog-manager"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/catalog-manager')}
              fallbackPath={routeFallbackPath}
            >
              <CatalogManagerPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="product-attribute"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/product-attribute')}
              fallbackPath={routeFallbackPath}
            >
              <ProductAttributePage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="products"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/products')}
              fallbackPath={routeFallbackPath}
            >
              <ProductPage token={authToken} adminUserId={authUserId} />
            </PermissionGate>
          }
        />
        <Route
          path="products/:id"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/products')}
              fallbackPath={routeFallbackPath}
            >
              <ProductPage token={authToken} adminUserId={authUserId} />
            </PermissionGate>
          }
        />
        <Route
          path="products/:id/edit"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/products')}
              fallbackPath={routeFallbackPath}
            >
              <ProductPage token={authToken} adminUserId={authUserId} />
            </PermissionGate>
          }
        />
        <Route
          path="inquiry/config"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/inquiry/config')}
              fallbackPath={routeFallbackPath}
            >
              <InquiryConfigPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="inquiry/report"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/inquiry/report')}
              fallbackPath={routeFallbackPath}
            >
              <InquiryReportPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="subscription/overview"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/subscription/overview')}
              fallbackPath={routeFallbackPath}
            >
              <SubscriptionOverviewPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="subscription/features"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/subscription/features')}
              fallbackPath={routeFallbackPath}
            >
              <SubscriptionFeaturePage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="subscription/plans"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/subscription/plans')}
              fallbackPath={routeFallbackPath}
            >
              <SubscriptionPlanPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="subscription/assignments"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/subscription/assignments')}
              fallbackPath={routeFallbackPath}
            >
              <SubscriptionAssignPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="settings/roles"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/settings/roles')}
              fallbackPath={routeFallbackPath}
            >
              <RolePermissionPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="app-config"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/app-config')}
              fallbackPath={routeFallbackPath}
            >
              <AppConfigPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="timezones"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/timezones')}
              fallbackPath={routeFallbackPath}
            >
              <AdminTimezonesPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="orders/disputes"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/orders/disputes')}
              fallbackPath={routeFallbackPath}
            >
              <OrderDisputesPage token={authToken} />
            </PermissionGate>
          }
        />
        <Route
          path="orders/returns"
          element={
            <PermissionGate
              isLoading={isPermissionLoading}
              isAllowed={canAccessPath('/admin/orders/returns')}
              fallbackPath={routeFallbackPath}
            >
              <OrderReturnsPage token={authToken} />
            </PermissionGate>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
