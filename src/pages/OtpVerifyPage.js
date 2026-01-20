import { useEffect, useRef, useState } from 'react';
import { Banner, OtpForm } from '../components';
import AuthLayout from '../components/AuthLayout';
import { sendOtp, verifyOtp } from '../services/authApi';
import { maskPhone, normalizePhone } from '../utils/phone';

const OTP_LENGTH = 6;

function OtpVerifyPage({ phone = '', onEditNumber, onVerified }) {
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef([]);

  const maskedPhone = maskPhone(phone);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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
    const digits = normalizePhone(phone);
    if (!/^[0-9]{10}$/.test(digits)) {
      setMessage({ type: 'error', text: 'Add a valid mobile number to verify OTP.' });
      return;
    }

    const otpCode = otpDigits.join('');
    setIsVerifying(true);
    setMessage({ type: 'info', text: '' });
    verifyOtp(digits, otpCode)
      .then(() => {
        if (onVerified) onVerified();
      })
      .catch((error) => {
        setMessage({
          type: 'error',
          text: error.message || 'OTP verification failed. Try again.',
        });
        // eslint-disable-next-line no-console
        console.error('verify-otp failed', error);
      })
      .finally(() => {
        setIsVerifying(false);
      });
  };

  const handleResend = async () => {
    const digits = normalizePhone(phone);
    if (!/^[0-9]{10}$/.test(digits)) {
      setMessage({ type: 'error', text: 'Add a valid mobile number to resend the code.' });
      return;
    }

    setIsResending(true);
    setMessage({ type: 'info', text: '' });
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();

    try {
      await sendOtp(digits);
      setMessage({ type: 'success', text: `New code sent to ${maskPhone(digits)}.` });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to resend OTP. Try again.',
      });
      // eslint-disable-next-line no-console
      console.error('resend-otp failed', error);
    } finally {
      setIsResending(false);
    }
  };

  const isOtpReady = otpDigits.every((digit) => digit !== '');

  return (
    <AuthLayout>
      <header className="otp-hero">
        <h2 className="otp-heading">Enter OTP</h2>
        <p className="muted-text">
          We have sent a verification code to <span className="highlight">{maskedPhone}</span>
        </p>
      </header>
      <Banner message={message} />
      <OtpForm
        otpDigits={otpDigits}
        inputRefs={inputRefs}
        isOtpReady={isOtpReady}
        isResending={isResending}
        isVerifying={isVerifying}
        onOtpChange={handleOtpChange}
        onKeyDown={handleKeyDown}
        onResend={handleResend}
        onEditNumber={onEditNumber}
        onSubmit={handleVerify}
      />
      <p className="otp-hint">
        Didn&apos;t receive the code?{' '}
        <button type="button" className="ghost-link inline" onClick={handleResend} disabled={isResending}>
          Resend
        </button>
      </p>
    </AuthLayout>
  );
}

export default OtpVerifyPage;
