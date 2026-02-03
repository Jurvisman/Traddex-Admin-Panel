import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AdminShell } from './components';
import {
  AdminDashboardPage,
  AppConfigPage,
  CategoryPage,
  IndustryPage,
  LoginPage,
  MainCategoryPage,
  InquiryConfigPage,
  InquiryReportPage,
  OtpVerifyPage,
  ProductAttributePage,
  ProductPage,
  SubCategoryPage,
  SubscriptionAssignPage,
  SubscriptionFeaturePage,
  SubscriptionPlanPage,
} from './pages';
import './App.css';

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
    match: '/admin/industry',
    title: 'Industry',
    subtitle: 'Create and organize industries for the marketplace.',
  },
  {
    match: '/admin/main-category',
    title: 'Main Category',
    subtitle: 'Manage the main category list per industry.',
  },
  {
    match: '/admin/category',
    title: 'Category',
    subtitle: 'Manage categories under each main category.',
  },
  {
    match: '/admin/sub-category',
    title: 'Sub-Category',
    subtitle: 'Create sub-categories for deeper organization.',
  },
  {
    match: '/admin/product-attribute',
    title: 'Product Attributes',
    subtitle: 'Manage attribute definitions and category mappings.',
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
        items: [{ path: '/admin/dashboard', label: 'Dashboard' }],
      },
      {
        title: 'Master Management',
        items: [
          { path: '/admin/industry', label: 'Industry' },
          { path: '/admin/main-category', label: 'Main Category' },
          { path: '/admin/category', label: 'Category' },
          { path: '/admin/sub-category', label: 'Sub-Category' },
          { path: '/admin/product-attribute', label: 'Product Attributes' },
          { path: '/admin/products', label: 'Products' },
        ],
      },
      {
        title: 'Inquiry',
        items: [
          { path: '/admin/inquiry/config', label: 'Inquiry Config' },
          { path: '/admin/inquiry/report', label: 'Inquiry Report' },
        ],
      },
      {
        title: 'Subscriptions',
        items: [
          { path: '/admin/subscription/features', label: 'Features' },
          { path: '/admin/subscription/plans', label: 'Plans' },
          { path: '/admin/subscription/assignments', label: 'Assignments' },
        ],
      },
      {
        title: 'Configuration',
        items: [{ path: '/admin/app-config', label: 'App Config' }],
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
        <Route path="industry" element={<IndustryPage token={authToken} />} />
        <Route path="main-category" element={<MainCategoryPage token={authToken} />} />
        <Route path="category" element={<CategoryPage token={authToken} />} />
        <Route path="sub-category" element={<SubCategoryPage token={authToken} />} />
        <Route path="product-attribute" element={<ProductAttributePage token={authToken} />} />
        <Route path="products" element={<ProductPage token={authToken} adminUserId={authUserId} />} />
        <Route path="products/:id" element={<ProductPage token={authToken} adminUserId={authUserId} />} />
        <Route path="products/:id/edit" element={<ProductPage token={authToken} adminUserId={authUserId} />} />
        <Route path="inquiry/config" element={<InquiryConfigPage token={authToken} />} />
        <Route path="inquiry/report" element={<InquiryReportPage token={authToken} />} />
        <Route path="subscription/features" element={<SubscriptionFeaturePage token={authToken} />} />
        <Route path="subscription/plans" element={<SubscriptionPlanPage token={authToken} />} />
        <Route path="subscription/assignments" element={<SubscriptionAssignPage token={authToken} />} />
        <Route path="app-config" element={<AppConfigPage token={authToken} />} />
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
