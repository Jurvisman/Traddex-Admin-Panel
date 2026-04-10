function AuthLayout({ children }) {
  return (
    <div className="auth-viewport minimal-bg">
      <div className="login-layout">
        <aside className="login-illustration-pane">
          <div className="login-illustration-content">
            <div className="login-logo-center-group">
              <img src="/deal360-logo.png" alt="Deal 360 Logo" className="login-logo-image-center" />
            </div>
            <img src="/login-illustration.png" alt="Portal Illustration" className="login-main-illustration" />
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
