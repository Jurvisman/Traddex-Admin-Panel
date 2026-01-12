import { useEffect, useRef, useState } from 'react';
import { Banner, LoginForm, OtpForm } from '../components';
import DashboardPage from './DashboardPage';

const OTP_LENGTH = 6;
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

function LoginPage() {
  const [form, setForm] = useState({ phone: '' });
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [step, setStep] = useState('login');
  const [message, setMessage] = useState({
    type: 'info',
    text: '',
  });
  const [isSending, setIsSending] = useState(false);
  const inputRefs = useRef([]);

  const maskedPhone = (() => {
    const digits = (form.phone || '').replace(/\D/g, '');
    if (!digits) return '****';
    const last4 = digits.slice(-4);
    const masked = digits.length > 4 ? `${'*'.repeat(digits.length - 4)}${last4}` : last4.padStart(4, '*');
    return `+91 ${masked}`;
  })();

  useEffect(() => {
    if (step === 'otp') {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    const digits = (form.phone || '').replace(/\D/g, '');
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
      const response = await fetch(`${API_BASE}/api/users/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'TradeX-API-Key-2024',
        },
        body: JSON.stringify({ mobileNumber: digits }),
      });

      if (!response.ok) {
        let errorDetail = `Failed to send OTP. Status ${response.status}`;
        try {
          const data = await response.json();
          if (data?.message) errorDetail = data.message;
        } catch (error) {
          try {
            const text = await response.text();
            if (text) errorDetail = text;
          } catch (inner) {
            // ignore parse errors
          }
        }
        throw new Error(errorDetail);
      }

      setStep('otp');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setMessage({
        type: 'success',
        text: `Code sent to +91 ${digits}. It expires in 60 seconds.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send OTP. Try again.',
      });
      // Surface details in console for debugging 4xx from backend
      // eslint-disable-next-line no-console
      console.error('send-otp failed', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = (event) => {
    event.preventDefault();
    if (otpDigits.some((digit) => digit === '')) {
      setMessage({ type: 'error', text: 'Add all six digits to verify this device.' });
      return;
    }
    setStep('home');
    setMessage({ type: 'success', text: 'Device verified. Welcome to the dashboard.' });
  };

  const handleResend = () => {
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
    setMessage({ type: 'info', text: `New code sent to ${maskedPhone}.` });
  };

  const handleEditNumber = () => {
    setStep('login');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setMessage({
      type: 'info',
      text: 'Update your mobile number and request a new one-time passcode.',
    });
  };

  const handleLogout = () => {
    setStep('login');
    setForm({ phone: '' });
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setMessage({
      type: 'info',
      text: '',
    });
  };

  const isOtpReady = otpDigits.every((digit) => digit !== '');

  if (step === 'home') {
    const digits = (form.phone || '').replace(/\D/g, '');
    const fullPhone = digits ? `+91${digits}` : '';
    return <DashboardPage onLogout={handleLogout} userEmail={fullPhone} />;
  }

  const title = step === 'login' ? 'Admin login with OTP' : 'Verify OTP';
  const subtitle =
    step === 'login'
      ? 'Enter your mobile number to receive a one-time passcode.'
      : `We sent a 6-digit code to ${maskedPhone}.`;

  return (
    <div className="auth-viewport minimal-bg">
      <div className="glow blur-1" aria-hidden />
      <div className="glow blur-2" aria-hidden />
      <div className="auth-center">
        <section className="card-compact">
          <div className="brand-block">
            <h1 className="brand-title">Traddex</h1>
            <p className="tagline">One platform for every trade.</p>
          </div>

          {step === 'login' ? (
            <>
              <LoginForm
                form={form}
                onFieldChange={handleFieldChange}
                onSubmit={handleSendOtp}
                isSending={isSending}
              />
            </>
          ) : (
            <>
              <header className="otp-hero">
                <h2 className="otp-heading">Enter OTP</h2>
                <p className="muted-text">
                  We have sent a verification code to <span className="highlight">{maskedPhone}</span>
                </p>
              </header>
              <OtpForm
                otpDigits={otpDigits}
                inputRefs={inputRefs}
                maskedPhone={maskedPhone}
                isOtpReady={isOtpReady}
                onOtpChange={handleOtpChange}
                onKeyDown={handleKeyDown}
                onResend={handleResend}
                onEditNumber={handleEditNumber}
                onSubmit={handleVerify}
              />
              <p className="otp-hint">
                Didn't receive the code?{' '}
                <button type="button" className="ghost-link inline" onClick={handleResend}>
                  Resend
                </button>
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
