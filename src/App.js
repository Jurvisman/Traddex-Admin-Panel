import { useState } from 'react';
import { DashboardPage, LoginPage, OtpVerifyPage } from './pages';
import './App.css';

function App() {
  const [page, setPage] = useState('login');
  const [phone, setPhone] = useState('');

  const handleOtpSent = (digits) => {
    setPhone(digits);
    setPage('otp');
  };

  const handleEditNumber = () => {
    setPage('login');
  };

  const handleVerified = () => {
    setPage('dashboard');
  };

  if (page === 'dashboard') {
    return <DashboardPage />;
  }

  if (page === 'otp') {
    return <OtpVerifyPage phone={phone} onEditNumber={handleEditNumber} onVerified={handleVerified} />;
  }

  return <LoginPage initialPhone={phone} onOtpSent={handleOtpSent} />;
}

export default App;
