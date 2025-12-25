import { useMemo, useState } from "react";

const CATEGORY_LIST = ["Men", "Women", "Kids", "Footwear", "Accessories", "Wholesale"];

const QUICK_STATS = [
  { label: "Products viewed today", value: "2,430", sub: "12% higher vs yesterday" },
  { label: "Bulk enquiries today", value: "180", sub: "Ready stock sellers only" },
  { label: "Active sellers nearby", value: "64", sub: "Within 5 km radius" },
];

const SELLERS = [
  {
    id: "asha-fashion",
    name: "Asha Fashion House",
    rating: 4.9,
    ratingCount: 154,
    verified: true,
    distance: "1.2 km",
    type: "Retail + Wholesale",
    moq: "50 pcs",
    dispatch: "6 hrs",
    speciality: "Silk sarees, embroidered kurtas & handcrafted dupattas",
  },
  {
    id: "metro-threads",
    name: "Metro Threads Collective",
    rating: 4.7,
    ratingCount: 98,
    verified: true,
    distance: "2.8 km",
    type: "Wholesale",
    moq: "120 pcs",
    dispatch: "1 day",
    speciality: "Seasonal outerwear and athleisure for men",
  },
  {
    id: "lilypad-kids",
    name: "Lilypad Kidswear",
    rating: 4.8,
    ratingCount: 63,
    verified: false,
    distance: "3.1 km",
    type: "Retail",
    moq: "30 pcs",
    dispatch: "8 hrs",
    speciality: "Organic cotton separates for kids & infants",
  },
];

const TRUST_INDICATORS = [
  { label: "Verified Sellers", description: "Profiles vetted by the Traddex quality desk." },
  { label: "Easy Returns", description: "Simple replacements with doorstep pickup." },
  { label: "Quality Checked", description: "Samples inspected before dispatch." },
  { label: "Secure Payments", description: "Escrow-ready payments with multiple modes." },
];

const NEW_ARRIVALS = [
  {
    id: "linen-kurta",
    name: "Tropical Linen Kurta",
    price: "Rs. 1,250",
    moq: "20 pcs",
    dispatch: "12 hrs",
    seller: "Asha Fashion House",
    tag: "Trending",
    category: "Men",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "organza-saree",
    name: "Pastel Organza Saree",
    price: "Rs. 2,450",
    moq: "10 pcs",
    dispatch: "14 hrs",
    seller: "Asha Fashion House",
    tag: "Best price",
    category: "Women",
    image:
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "denim-set",
    name: "Urban Denim Set",
    price: "Rs. 850",
    moq: "25 pcs",
    dispatch: "10 hrs",
    seller: "Lilypad Kidswear",
    tag: "Trending",
    category: "Kids",
    image:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "sneakers",
    name: "Core Runner Sneakers",
    price: "Rs. 1,650",
    moq: "40 pairs",
    dispatch: "1 day",
    seller: "Metro Threads Collective",
    tag: "Best price",
    category: "Footwear",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "bead-set",
    name: "Artisan Bead Necklace",
    price: "Rs. 420",
    moq: "50 pcs",
    dispatch: "6 hrs",
    seller: "Asha Fashion House",
    tag: "Trending",
    category: "Accessories",
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "linen-dress",
    name: "Bulk Harvest Linen Dress",
    price: "Rs. 980",
    moq: "200 pcs",
    dispatch: "2 days",
    seller: "Metro Threads Collective",
    tag: "Best price",
    category: "Wholesale",
    image:
      "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=600&q=80",
  },
];

const FILTER_CHIPS = ["MOQ", "Price", "Distance", "Verified", "Ready Stock", "Bulk Deals"];

const FASHION_THIS_MONTH = {
  orders: "1,820",
  revenue: "Rs. 42.8L",
  category: "Ethnicwear",
  seller: "Asha Fashion House",
};

const BULK_DEALS = [
  {
    id: "monsoon-outerwear",
    title: "Monsoon Water-resistant Outerwear",
    pricing: "MOQ 500+ | Rs. 350 per piece",
    manufacturer: "Metro Outer Co.",
    extra: "Free lining upgrades on orders above 1,000 pieces",
  },
  {
    id: "resort-kurta",
    title: "Resort Wear Kurta Sets",
    pricing: "MOQ 300+ | Rs. 520 per set",
    manufacturer: "Asha Fabric Studio",
    extra: "Custom embroidery available in 5 shades",
  },
  {
    id: "kids-combo",
    title: "Kids Combo Drops",
    pricing: "MOQ 400+ | Rs. 480 per combo",
    manufacturer: "Lilypad Kidswear",
    extra: "Includes washable labels and swing tags",
  },
];

const TRENDING_SEARCHES = [
  "Summer linen sarees",
  "Mens athleisure sets",
  "Kids organic cotton",
  "Best price footwear",
  "Bulk bridal wear",
  "Hybrid accessories",
];

const WHY_BUY_FROM_US = [
  "Verified local sellers",
  "Retail + Wholesale support",
  "Fast delivery",
  "Direct seller contact",
  "Secure payments",
];

function DashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_LIST[0]);

  const arrivals = useMemo(() => {
    const matching = NEW_ARRIVALS.filter((product) => product.category === selectedCategory);
    return matching.length ? matching : NEW_ARRIVALS;
  }, [selectedCategory]);

  return (
    <div className="market-shell">
      <header className="market-hero">
        <div>
          <p className="hero-kicker">B2B fashion marketplace</p>
          <h1>Order ready stock from verified sellers near you</h1>
          <p className="hero-subtitle">
            Curated categories, live seller availability, and instant contact buttons keep you ahead of the season.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" type="button">
              Call for catalogue
            </button>
            <button className="ghost-btn" type="button">
              WhatsApp catalogue
            </button>
          </div>
        </div>
        <div className="hero-meta">
          <div>
            <div className="hero-meta-value">128</div>
            <div className="hero-meta-label">Verified sellers online</div>
          </div>
          <div>
            <div className="hero-meta-value">18 mins</div>
            <div className="hero-meta-label">Avg response time</div>
          </div>
          <div>
            <div className="hero-meta-value">4.8 / 5</div>
            <div className="hero-meta-label">Avg seller rating</div>
          </div>
        </div>
      </header>

      <section className="category-row" aria-label="Shop by category">
        {CATEGORY_LIST.map((category) => (
          <button
            key={category}
            type="button"
            className={`category-chip ${selectedCategory === category ? "active" : ""}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </section>

      <section className="stats-strip" aria-label="Quick stats">
        {QUICK_STATS.map((stat) => (
          <article key={stat.label} className="stat-card">
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
            <p className="stat-sub">{stat.sub}</p>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="kicker">Fashion Shops Near You</p>
            <h2>Choose a trusted seller</h2>
          </div>
          <button className="text-button" type="button">
            View all sellers
          </button>
        </div>
        <div className="shop-grid">
          {SELLERS.map((seller) => (
            <article key={seller.id} className="shop-card">
              <div className="shop-card-top">
                <div>
                  <p className="seller-name">{seller.name}</p>
                  <div className="shop-card-meta">
                    <span>
                      {seller.rating} / 5 <span className="muted">({seller.ratingCount} reviews)</span>
                    </span>
                    <span className="muted">{seller.distance}</span>
                  </div>
                </div>
                {seller.verified && <span className="verified-pill">Verified</span>}
              </div>
              <div className="shop-card-body">
                <div className="shop-card-row">
                  <span className="chip">{seller.type}</span>
                  <span className="chip subtle">MOQ {seller.moq}</span>
                  <span className="chip subtle">Dispatch {seller.dispatch}</span>
                </div>
                <p className="shop-speciality">{seller.speciality}</p>
              </div>
              <div className="shop-card-cta">
                <button type="button" className="ghost-btn small">
                  Call
                </button>
                <button type="button" className="ghost-btn small">
                  WhatsApp
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="trust-grid" aria-label="Trust indicators">
        {TRUST_INDICATORS.map((item) => (
          <article key={item.label} className="trust-card">
            <p className="trust-label">{item.label}</p>
            <p className="trust-description">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="kicker">New Arrivals</p>
            <h2>{selectedCategory} spotlight</h2>
          </div>
          <button className="text-button" type="button">
            See all listings
          </button>
        </div>
        <div className="product-grid">
          {arrivals.map((product) => (
            <article key={product.id} className="product-card">
              <div className="product-image">
                <img src={product.image} alt={product.name} loading="lazy" />
                <span className={`product-tag ${product.tag === "Trending" ? "product-tag-trending" : ""}`}>
                  {product.tag}
                </span>
              </div>
              <div className="product-body">
                <p className="product-name">{product.name}</p>
                <p className="product-price">{product.price}</p>
                <p className="product-meta">
                  MOQ {product.moq} - Dispatch {product.dispatch}
                </p>
                <p className="product-seller">{product.seller}</p>
              </div>
              <button type="button" className="primary-btn full">
                Call seller
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="chip-row" aria-label="Filter chips">
        {FILTER_CHIPS.map((chip) => (
          <button key={chip} type="button" className="chip-filter">
            {chip}
          </button>
        ))}
      </section>

      <section className="section">
        <article className="analytics-card">
          <div className="section-head">
            <div>
              <p className="kicker">Fashion This Month</p>
              <h2>Market pulse</h2>
            </div>
            <button className="text-button" type="button">
              Download report
            </button>
          </div>
          <div className="analytics-body">
            <div>
              <p className="analytics-label">Total orders</p>
              <p className="analytics-value">{FASHION_THIS_MONTH.orders}</p>
            </div>
            <div>
              <p className="analytics-label">Total revenue</p>
              <p className="analytics-value">{FASHION_THIS_MONTH.revenue}</p>
            </div>
            <div>
              <p className="analytics-label">Top category</p>
              <p className="analytics-value">{FASHION_THIS_MONTH.category}</p>
            </div>
            <div>
              <p className="analytics-label">Top seller</p>
              <p className="analytics-value">{FASHION_THIS_MONTH.seller}</p>
            </div>
          </div>
          <div className="analytics-footer">
            <button type="button" className="primary-btn">
              Call for insight
            </button>
          </div>
        </article>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="kicker">B2B Bulk Deals</p>
            <h2>Ready-made price breaks</h2>
          </div>
          <button className="text-button" type="button">
            Create custom deal
          </button>
        </div>
        <div className="bulk-grid">
          {BULK_DEALS.map((deal) => (
            <article key={deal.id} className="bulk-card">
              <p className="bulk-title">{deal.title}</p>
              <p className="bulk-pricing">{deal.pricing}</p>
              <p className="bulk-manufacturer">Manufacturer / Wholesaler: {deal.manufacturer}</p>
              <p className="bulk-extra">{deal.extra}</p>
              <button type="button" className="ghost-btn">
                Call for enquiry
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="section bottom-row">
        <article className="card trending-card">
          <div className="section-head">
            <div>
              <p className="kicker">Trending Searches</p>
              <h3>Top keywords</h3>
            </div>
            <button className="text-button" type="button">
              Copy list
            </button>
          </div>
          <ul className="trending-list">
            {TRENDING_SEARCHES.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </article>
        <article className="card why-card">
          <div className="section-head">
            <div>
              <p className="kicker">Why buy from us</p>
              <h3>What keeps partners loyal</h3>
            </div>
          </div>
          <ul className="why-list">
            {WHY_BUY_FROM_US.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

export default DashboardPage;
