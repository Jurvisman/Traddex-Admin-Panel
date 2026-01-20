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
    <form className="form otp-form" onSubmit={onSubmit}>
      <div className="otp-grid compact">
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
      <button type="submit" className="primary-btn full pill-btn-strong" disabled={!isOtpReady}>
        Continue
      </button>
      <div className="otp-links">
        <button type="button" className="ghost-link inline" onClick={onEditNumber}>
          Edit number
        </button>
        <button type="button" className="ghost-link inline" onClick={onResend}>
          Resend
        </button>
      </div>
    </form>
  );
}

export default OtpForm;
