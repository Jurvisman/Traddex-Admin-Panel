function AuthLayout({ children }) {
  return (
    <div className="auth-viewport minimal-bg">
      <div className="login-layout">
        <aside className="login-illustration-pane">
          <div className="login-illustration-content">
            <div className="login-logo-block">
              <span className="login-logo-main">Traddex</span>
              <p className="login-logo-subtitle">Admin Universe</p>
            </div>
          </div>
        </aside>
        <main className="login-form-pane">
          <div className="login-form-shell">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AuthLayout;
