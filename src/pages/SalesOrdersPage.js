function SalesOrdersPage() {
  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Sales Orders</h2>
          <p className="panel-subtitle">Orders from the seller/business perspective.</p>
        </div>
      </div>
      <div className="panel card">
        <div className="empty-state">
          <p>SO Number · Seller/Business · Buyer Name · Order Date · Items · Total Amount · Payment/Delivery/Order Status. Click row for full order detail.</p>
        </div>
      </div>
    </div>
  );
}

export default SalesOrdersPage;
