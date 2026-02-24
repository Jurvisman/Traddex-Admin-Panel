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
  OrderDisputesPage,
  OrderReturnsPage,
} from './pages';
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
    match: '/admin/users',
    title: 'Users',
    subtitle: 'Monitor registered users and login activity.',
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

  const navItems = useMemo(
    () => [
      {
        title: 'Overview',
        items: [
          {
            path: '/admin/dashboard',
            label: 'Dashboard',
            icon: ICONS.dashboard,
            tone: NAV_TONES.dashboard,
          },
        ],
      },
      {
        title: 'Users',
        items: [{ path: '/admin/users', label: 'Users', icon: ICONS.users, tone: NAV_TONES.users }],
      },
      {
        title: 'Master Management',
        items: [
          { path: '/admin/catalog-manager', label: 'Catalog Manager', icon: ICONS.catalog, tone: NAV_TONES.catalog },
          {
            path: '/admin/product-attribute',
            label: 'Dynamic Fields',
            icon: ICONS.attributes,
            tone: NAV_TONES.fields,
          },
          { path: '/admin/products', label: 'Products', icon: ICONS.products, tone: NAV_TONES.products },
        ],
      },
      {
        title: 'Inquiry',
        items: [
          {
            path: '/admin/inquiry/config',
            label: 'Inquiry Config',
            icon: ICONS.inquiryConfig,
            tone: NAV_TONES.inquiryConfig,
          },
          {
            path: '/admin/inquiry/report',
            label: 'Inquiry Report',
            icon: ICONS.inquiryReport,
            tone: NAV_TONES.inquiryReport,
          },
        ],
      },
      {
        title: 'Subscriptions',
        items: [
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
        title: 'Configuration',
        items: [{ path: '/admin/app-config', label: 'App Config', icon: ICONS.appConfig, tone: NAV_TONES.appConfig }],
      },
      {
        title: 'Locations',
        items: [
          { path: '/admin/timezones', label: 'Timezones', icon: ICONS.timezones, tone: NAV_TONES.timezones },
        ],
      },
      {
        title: 'Orders',
        items: [
          {
            path: '/admin/orders/disputes',
            label: 'Disputes',
            icon: ICONS.disputes,
            tone: NAV_TONES.disputes,
          },
          {
            path: '/admin/orders/returns',
            label: 'Returns',
            icon: ICONS.returns,
            tone: NAV_TONES.returns,
          },
        ],
      },
    ],
    []
  );

  const handleOtpSent = (digits) => {
    setPhone(digits);
    navigate('/otp', { state: { redirectTo: redirectPath } });
  };

  const handleEditNumber = () => {
    navigate('/login', { state: { redirectTo: redirectPath } });
  };

  const handleVerified = (userData, nextPath) => {
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
    navigate(nextPath || redirectPath || '/admin/dashboard', { replace: true });
  };

  const handleLogout = () => {
    setAuthToken('');
    setAuthUserId(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUserId');
    navigate('/login', { replace: true });
  };

  const defaultRoute = authToken ? '/admin/dashboard' : '/login';
  const otpRedirect = location.state?.redirectTo || redirectPath;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route
        path="/login"
        element={
          authToken ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <LoginPage initialPhone={phone} onOtpSent={handleOtpSent} />
          )
        }
      />
      <Route
        path="/otp"
        element={
          authToken ? (
            <Navigate to="/admin/dashboard" replace />
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
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage token={authToken} />} />
        <Route path="users" element={<AdminUsersPage token={authToken} />} />
        <Route path="catalog-manager" element={<CatalogManagerPage token={authToken} />} />
        <Route path="product-attribute" element={<ProductAttributePage token={authToken} />} />
        <Route path="products" element={<ProductPage token={authToken} adminUserId={authUserId} />} />
        <Route path="products/:id" element={<ProductPage token={authToken} adminUserId={authUserId} />} />
        <Route path="products/:id/edit" element={<ProductPage token={authToken} adminUserId={authUserId} />} />
        <Route path="inquiry/config" element={<InquiryConfigPage token={authToken} />} />
        <Route path="inquiry/report" element={<InquiryReportPage token={authToken} />} />
        <Route path="subscription/overview" element={<SubscriptionOverviewPage token={authToken} />} />
        <Route path="subscription/features" element={<SubscriptionFeaturePage token={authToken} />} />
        <Route path="subscription/plans" element={<SubscriptionPlanPage token={authToken} />} />
        <Route path="subscription/assignments" element={<SubscriptionAssignPage token={authToken} />} />
        <Route path="app-config" element={<AppConfigPage token={authToken} />} />
        <Route path="timezones" element={<AdminTimezonesPage token={authToken} />} />
        <Route path="orders/disputes" element={<OrderDisputesPage token={authToken} />} />
        <Route path="orders/returns" element={<OrderReturnsPage token={authToken} />} />
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
