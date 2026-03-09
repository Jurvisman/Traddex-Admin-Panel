function PurchaseOrdersPage() {
  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Purchase Orders</h2>
          <p className="panel-subtitle">Orders where a buyer is purchasing from a seller/business.</p>
        </div>
      </div>
      <div className="panel card">
        <div className="empty-state">
          <p>PO Number · Buyer Name · Seller/Business Name · Order Date · Items · Total Amount · Payment/Delivery/Order Status. Click row for full order detail.</p>
        </div>
      </div>
    </div>
  );
}

export default PurchaseOrdersPage;
