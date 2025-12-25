function PolicyCard() {
  return (
    <div className="policy-card">
      <div className="policy-chip">Session rules</div>
      <div>
        <div className="policy-title">OTP required on every login</div>
        <div className="policy-sub">
          Codes expire fast, devices are remembered for 12 hours, and all login events are written
          to audit logs.
        </div>
      </div>
    </div>
  );
}

export default PolicyCard;
