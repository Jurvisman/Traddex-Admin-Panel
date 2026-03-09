function SupportPage() {
  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Support</h2>
          <p className="panel-subtitle">Customer tickets, inquiries, and complaint management.</p>
        </div>
      </div>
      <div className="panel card">
        <div className="empty-state">
          <p>Support ticket list will appear here. Status workflow: Open → Assigned → In Progress → Waiting for Customer → Resolved → Closed.</p>
        </div>
      </div>
    </div>
  );
}

export default SupportPage;
