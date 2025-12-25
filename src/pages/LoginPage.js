import { useEffect, useRef, useState } from 'react';
import { Banner, LoginForm, OtpForm } from '../components';
import DashboardPage from './DashboardPage';

const OTP_LENGTH = 6;

function LoginPage() {
  const [form, setForm] = useState({ phone: '' });
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [step, setStep] = useState('login');
  const [message, setMessage] = useState({
    type: 'info',
    // text: 'Use a one-time passcode to secure entry to the command console.',
  });
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

  const handleSendOtp = (event) => {
    event.preventDefault();
    const digits = (form.phone || '').replace(/\D/g, '');
    if (!/^[0-9]{10}$/.test(digits)) {
      setMessage({
        type: 'error',
        text: 'Enter a valid 10-digit mobile number.',
      });
      return;
    }
    setStep('otp');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setMessage({
      type: 'info',
      text: `Code sent to ${maskedPhone}. It expires in 60 seconds.`,
    });
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
      // text: 'Use a one-time passcode to secure entry to the command console.',
    });
  };

  const isOtpReady = otpDigits.every((digit) => digit !== '');

  if (step === 'home') {
    const digits = (form.phone || '').replace(/\D/g, '');
    const fullPhone = digits ? `+91${digits}` : '';
    return <DashboardPage onLogout={handleLogout} userEmail={fullPhone} />;
  }

  const title = step === 'login' ? 'Login to Traddex' : 'Verify OTP';
  const subtitle =
    step === 'login'
      ? 'Enter your mobile number to receive a one-time passcode.'
      : `We sent a 6-digit code to ${maskedPhone}.`;

  return (
    <div className="page simple-page">
      <div className="shell simple-shell">
        <main className="form-panel simple-card">
          <div className="panel-head">
            <div className="crumb subtle">Login</div>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>

          <Banner message={message} />

          {step === 'login' ? (
            <>
              <LoginForm form={form} onFieldChange={handleFieldChange} onSubmit={handleSendOtp} />
            </>
          ) : (
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
          )}
        </main>
      </div>
    </div>
  );
}

export default LoginPage;
