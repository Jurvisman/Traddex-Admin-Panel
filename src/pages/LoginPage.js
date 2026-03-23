import { useEffect, useState } from 'react';
import { Banner, LoginForm } from '../components';
import AuthLayout from '../components/AuthLayout';
import { sendOtp } from '../services/authApi';
import { normalizePhone } from '../utils/phone';

function LoginPage({ initialPhone = '', onOtpSent }) {
  const [form, setForm] = useState({ phone: initialPhone });
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setForm({ phone: initialPhone });
  }, [initialPhone]);

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    const digits = normalizePhone(form.phone);
    if (!/^[0-9]{10}$/.test(digits)) {
      setMessage({
        type: 'error',
        text: 'Enter a valid 10-digit mobile number.',
      });
      return;
    }
    setIsSending(true);
    setMessage({ type: 'info', text: '' });
    try {
      await sendOtp(digits);
      setMessage({
        type: 'success',
        text: `Code sent to +91 ${digits}. It expires in 60 seconds.`,
      });
      if (onOtpSent) onOtpSent(digits);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send OTP. Try again.',
      });
      // eslint-disable-next-line no-console
      console.error('send-otp failed', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="login-panel">
        <header className="login-panel-header">
          <h1 className="login-panel-title">Login</h1>
          <p className="login-panel-subtitle">Sign in to access the Traddex admin panel.</p>
        </header>

        <Banner message={message} />
        <LoginForm
          form={form}
          onFieldChange={handleFieldChange}
          onSubmit={handleSendOtp}
          isSending={isSending}
        />
      </div>
    </AuthLayout>
  );
}

export default LoginPage;
