function AuthLayout({ children }) {
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
          {children}
        </section>
      </div>
    </div>
  );
}

export default AuthLayout;
