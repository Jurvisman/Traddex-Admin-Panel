function LoginForm({ form, onFieldChange, onSubmit, isSending }) {
  return (
    <form className="form" onSubmit={onSubmit}>
      <label className="input-label" htmlFor="phone">
        Mobile number
      </label>
      <div className="input-shell pill">
        <div className="country-chip" aria-label="India country code">
          <div className="country-code">+91</div>
        </div>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]{10}"
          autoComplete="tel-national"
          placeholder="Phone Number"
          value={form.phone}
          onChange={(event) => onFieldChange('phone', event.target.value.replace(/\D/g, ''))}
          minLength={10}
          maxLength={10}
          className="text-input"
          title="Enter a 10-digit mobile number."
          required
        />
      </div>
      <button type="submit" className="primary-btn full pill-btn-strong" disabled={isSending}>
        {isSending ? 'Sending...' : 'Continue'}
      </button>
    </form>
  );
}

export default LoginForm;
