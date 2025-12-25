function LoginForm({ form, onFieldChange, onSubmit }) {
  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="input-group">
        <label htmlFor="phone">Mobile number</label>
        <div className="input-row">
          <div className="input-prefix" aria-label="India country code +91">
            <span className="flag" role="img" aria-label="India">
              🇮🇳
            </span>
            <span className="dial-code">+91</span>
          </div>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            autoComplete="tel-national"
            placeholder="9876543210"
            value={form.phone}
            onChange={(event) => onFieldChange('phone', event.target.value.replace(/\D/g, ''))}
            minLength={10}
            maxLength={10}
            className="phone-input"
            title="Enter a 10-digit mobile number."
            required
          />
        </div>
        <div className="hint">We text the OTP; WhatsApp fallback is automatic.</div>
      </div>
      <button type="submit" className="primary-btn">
        Send OTP
      </button>
    </form>
  );
}

export default LoginForm;
