function OtpForm({
  otpDigits,
  inputRefs,
  maskedPhone,
  isOtpReady,
  onOtpChange,
  onKeyDown,
  onResend,
  onEditNumber,
  onSubmit,
}) {
  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="otp-head">
        <div>
          <div className="otp-title">Enter the 6-digit OTP</div>
          <div className="otp-sub">Sent to {maskedPhone}. Expires in 60 seconds.</div>
        </div>
        <div className="otp-actions">
          <button type="button" className="text-button" onClick={onResend}>
            Resend
          </button>
          <button type="button" className="text-button" onClick={onEditNumber}>
            Edit number
          </button>
        </div>
      </div>
      <div className="otp-grid">
        {otpDigits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => (inputRefs.current[index] = element)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="otp-input"
            value={digit}
            onChange={(event) => onOtpChange(event.target.value, index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          />
        ))}
      </div>
      <button type="submit" className="primary-btn" disabled={!isOtpReady}>
        Verify and continue
      </button>
    </form>
  );
}

export default OtpForm;
