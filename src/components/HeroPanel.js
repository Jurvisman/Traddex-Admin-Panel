function HeroPanel() {
  return (
    <aside className="hero">
      <div className="hero-header">
        <div className="brand">
          <span className="brand-mark">BRP</span>
          <span className="brand-name">Command</span>
        </div>
        <div className="badge">Ops only</div>
      </div>
      <div className="hero-body">
        <h2>Login with device verification</h2>
        <p>
          Every session starts with an OTP check. Bring your phone, confirm the code, and we will
          open the admin surface.
        </p>
        <div className="hero-grid">
          <div className="hero-card">
            <div className="hero-label">Fallback</div>
            <div className="hero-value">SMS / WhatsApp</div>
            <div className="hero-sub">Routes auto switch when latency spikes.</div>
          </div>
          <div className="hero-card">
            <div className="hero-label">Valid for</div>
            <div className="hero-value">60s</div>
            <div className="hero-sub">Codes expire fast to protect desk access.</div>
          </div>
          <div className="hero-card">
            <div className="hero-label">Audit-ready</div>
            <div className="hero-value">Logged</div>
            <div className="hero-sub">We log origin, device, and result.</div>
          </div>
        </div>
        <ul className="hero-list">
          <li>Use work email so we can route your OTP.</li>
          <li>Keep the browser open; code entry saves progress.</li>
          <li>Need help? Ping the control room guardrail channel.</li>
        </ul>
      </div>
      <div className="hero-footer">
        <div className="stat">
          <div className="stat-value">99.95%</div>
          <div className="stat-label">Successful OTP delivery</div>
        </div>
        <div className="stat">
          <div className="stat-value">2m 14s</div>
          <div className="stat-label">Avg unlock time</div>
        </div>
      </div>
    </aside>
  );
}

export default HeroPanel;
