import { useMemo, useState } from 'react';
import { AdminShell } from './components';
import {
  AdminDashboardPage,
  CategoryPage,
  IndustryPage,
  LoginPage,
  MainCategoryPage,
  OtpVerifyPage,
  ProductAttributePage,
  ProductPage,
  SubCategoryPage,
} from './pages';
import './App.css';

function App() {
  const [page, setPage] = useState('login');
  const [activePage, setActivePage] = useState('dashboard');
  const [phone, setPhone] = useState('');
  const [authToken, setAuthToken] = useState('');

  const handleOtpSent = (digits) => {
    setPhone(digits);
    setPage('otp');
  };

  const handleEditNumber = () => {
    setPage('login');
  };

  const handleVerified = (userData) => {
    setAuthToken(userData?.token || '');
    setPage('app');
    setActivePage('dashboard');
  };

  const navItems = useMemo(
    () => [
      {
        title: 'Overview',
        items: [{ id: 'dashboard', label: 'Dashboard' }],
      },
      {
        title: 'Master Management',
        items: [
          { id: 'industry', label: 'Industry' },
          { id: 'main-category', label: 'Main Category' },
          { id: 'category', label: 'Category' },
          { id: 'sub-category', label: 'Sub-Category' },
          { id: 'product-attribute', label: 'Product Attributes' },
          { id: 'product', label: 'Product' },
        ],
      },
    ],
    []
  );

  const pageConfig = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Track core counts and activity across Traddex.',
      component: AdminDashboardPage,
    },
    industry: {
      title: 'Industry',
      subtitle: 'Create and organize industries for the marketplace.',
      component: IndustryPage,
    },
    'main-category': {
      title: 'Main Category',
      subtitle: 'Manage the main category list per industry.',
      component: MainCategoryPage,
    },
    category: {
      title: 'Category',
      subtitle: 'Manage categories under each main category.',
      component: CategoryPage,
    },
    'sub-category': {
      title: 'Sub-Category',
      subtitle: 'Create sub-categories for deeper organization.',
      component: SubCategoryPage,
    },
    'product-attribute': {
      title: 'Product Attributes',
      subtitle: 'Manage attribute definitions and category mappings.',
      component: ProductAttributePage,
    },
    product: {
      title: 'Product',
      subtitle: 'Create and manage products submitted by businesses.',
      component: ProductPage,
    },
  };

  if (page === 'app') {
    const selected = pageConfig[activePage] || pageConfig.dashboard;
    const PageComponent = selected.component;
    return (
      <AdminShell
        navItems={navItems}
        currentPage={activePage}
        onNavigate={setActivePage}
        onLogout={() => {
          setAuthToken('');
          setPage('login');
        }}
        pageTitle={selected.title}
        pageSubtitle={selected.subtitle}
      >
        <PageComponent token={authToken} />
      </AdminShell>
    );
  }

  if (page === 'otp') {
    return <OtpVerifyPage phone={phone} onEditNumber={handleEditNumber} onVerified={handleVerified} />;
  }

  return <LoginPage initialPhone={phone} onOtpSent={handleOtpSent} />;
}

export default App;
