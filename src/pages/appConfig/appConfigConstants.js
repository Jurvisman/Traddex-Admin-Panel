export const emptyMessage = { type: 'info', text: '' };

export const parseJson = (value) => {
  if (!value || !value.trim()) return { data: null, error: 'Config JSON is required.' };
  try {
    const parsed = JSON.parse(value);
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      return { data: null, error: 'Config must be a JSON object.' };
    }
    return { data: parsed, error: null };
  } catch (error) {
    return { data: null, error: 'Config must be valid JSON.' };
  }
};

export const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-');
export const parseCsvList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
export const formatCsvList = (value) => (Array.isArray(value) ? value.filter(Boolean).join(', ') : '');
export const parseAspectRatioValue = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) {
    const [w, h] = trimmed.split(':').map((part) => Number(part));
    if (w > 0 && h > 0) return w / h;
  }
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && numeric > 0) return numeric;
  return null;
};
export const toLocalInputValue = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};
export const fromLocalInputValue = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
};
export const isHardcodedSection = (section) => section?.type === 'hardcoded';
export const isHomeMainPage = (page) => page?.id === 'home_main' || page?.route === '/home';

export const screenSectionTypeOptions = [
  { value: 'carousel', label: 'Carousel' },
  { value: 'hero_carousel', label: 'Hero carousel (SDUI)' },
  { value: 'promo_hero_banner', label: 'Promo hero banner (SDUI)' },
  { value: 'split_promo_row', label: 'Split promo row (SDUI)' },
  { value: 'horizontalList', label: 'Horizontal list' },
  { value: 'horizontal_scroll_list', label: 'Horizontal featured list (SDUI)' },
  { value: 'quick_action_row', label: 'Quick action row (SDUI)' },
  { value: 'grid', label: 'Product grid' },
  { value: 'column_grid', label: 'Column grid (SDUI)' },
  { value: 'category_icon_grid', label: 'Category icon grid (SDUI)' },
  { value: 'brand_logo_grid', label: 'Brand showcase (SDUI)' },
  { value: 'media_overlay_carousel', label: 'Media overlay carousel (SDUI)' },
  { value: 'product_card_carousel', label: 'Product card carousel (SDUI)' },
  { value: 'info_list', label: 'Info list (SDUI)' },
  { value: 'categoryPreviewGrid', label: 'Category preview grid' },
  { value: 'campaignBento', label: 'Campaign bento' },
  { value: 'list', label: 'List' },
  { value: 'banner', label: 'Banner' },
  { value: 'card', label: 'Card' },
  { value: 'twoColumn', label: 'Two column' },
  { value: 'spacer', label: 'Spacer' },
  { value: 'title', label: 'Title' },
  { value: 'video', label: 'Video' },
  { value: 'icon_list', label: 'Icon list' },
  { value: 'chip_scroll', label: 'Chip scroll' },
  { value: 'category_showcase', label: 'Category Showcase' },
  { value: 'tabbed_product_shelf', label: 'Tabbed Product Shelf (SDUI)' },
  { value: 'shop_card_carousel', label: 'Shop card carousel (SDUI)' },
];

export const defaultBlockTypeBySectionType = {
  banner: 'heroBanner',
  promo_hero_banner: 'promo_hero_banner',
  split_promo_row: 'split_promo_row',
  title: 'sectionTitle',
  grid: 'multiItemGrid',
  categoryPreviewGrid: 'categoryPreviewGrid',
  campaignBento: 'campaignBento',
  campaign: 'campaignBento',
  product_shelf_horizontal: 'product_shelf_horizontal',
  quick_action_row: 'quick_action_row',
  media_overlay_carousel: 'media_overlay_carousel',
  product_card_carousel: 'product_card_carousel',
  deal_card_carousel: 'product_card_carousel',
  info_list: 'info_list',
  icon_list: 'icon_list',
  chip_scroll: 'chip_scroll',
};

export const headerSectionTypeOptions = [
  { value: 'addressHeader', label: 'Address Header' },
  { value: 'searchBar', label: 'Search Bar' },
  { value: 'horizontalPills', label: 'Horizontal Pills' },
];

export const headerToolboxItems = [
  {
    key: 'addressHeader',
    label: 'Address Header Block',
    hint: 'Delivery time + location row',
    section: { id: 'address_header', type: 'addressHeader', blockType: 'addressHeader', enabled: true },
    scope: 'header',
  },
  {
    key: 'searchBar',
    label: 'Search Bar Block',
    hint: 'Search input row',
    section: {
      id: 'search_bar',
      type: 'searchBar',
      blockType: 'searchBar',
      placeholder: 'Search "yoga"',
      enabled: true,
    },
    scope: 'header',
  },
  {
    key: 'horizontalPills',
    label: 'Horizontal Pills Block',
    hint: 'Scrollable category pills',
    section: { id: 'horizontal_pills', type: 'horizontalPills', blockType: 'horizontalPills', enabled: true },
    scope: 'header',
  },
];

const BEAUTY_HERO_SAMPLE = {
  badgeText: 'Glow Edit',
  title: 'Radiant skin, effortless glam',
  subtitle: 'Curated skincare, makeup, and salon essentials',
  ctaText: 'Shop the edit',
  imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=80',
  deepLink: '',
  ctaLink: '',
};

const BEAUTY_QUICK_ACTIONS_SAMPLE = [
  {
    title: 'Skin consult',
    subtitle: 'Chat with experts',
    ctaText: 'Book now',
    iconName: 'chatbubbles-outline',
    accentColor: '#E9A0B2',
    deepLink: '',
  },
  {
    title: 'Virtual try-on',
    subtitle: 'Find your shade',
    ctaText: 'Try now',
    iconName: 'color-palette-outline',
    accentColor: '#D989A0',
    deepLink: '',
  },
  {
    title: 'Track order',
    subtitle: 'Live delivery status',
    ctaText: 'Track',
    iconName: 'locate-outline',
    accentColor: '#E9C3B3',
    deepLink: '',
  },
];

const ELECTRONICS_QUICK_ACTIONS_SAMPLE = [
  {
    title: 'Trade-in',
    subtitle: 'Instant device quote',
    ctaText: 'Check value',
    iconName: 'repeat-outline',
    deepLink: 'app://electronics/tradein',
  },
  {
    title: 'Book repair',
    subtitle: 'Doorstep service',
    ctaText: 'Schedule',
    iconName: 'construct-outline',
    deepLink: 'app://electronics/repair',
  },
  {
    title: 'Track order',
    subtitle: 'Live status updates',
    ctaText: 'Track',
    iconName: 'locate-outline',
    deepLink: 'app://electronics/track',
  },
];

const FASHION_QUICK_ACTIONS_SAMPLE = [
  {
    title: 'New Arrivals',
    subtitle: 'Fresh styles this week',
    ctaText: 'Explore',
    iconName: 'sparkles-outline',
    deepLink: '',
  },
  {
    title: 'Trending Now',
    subtitle: 'Top picks for you',
    ctaText: 'Shop',
    iconName: 'trending-up-outline',
    deepLink: '',
  },
  {
    title: 'Sale',
    subtitle: 'Up to 60% off',
    ctaText: 'View deals',
    iconName: 'pricetag-outline',
    deepLink: '',
  },
];

const FASHION_HERO_SAMPLE = {
  badgeText: 'Spring Edit',
  title: 'Fresh fashion drops for every buyer',
  subtitle: 'Trend-led fits, premium labels, and curated looks across wholesale and retail.',
  ctaText: 'Explore now',
  imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80',
  deepLink: 'app://category/fashion',
  ctaLink: 'app://category/fashion',
};

const FASHION_STYLE_SHOWCASE_SAMPLE = [
  {
    title: 'Street Layers',
    imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Office Edit',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Festive Glow',
    imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Weekend Denim',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const FASHION_TABBED_PRODUCT_SAMPLE = [
  {
    id: 'fashion-men-1',
    tab: 'Men',
    title: 'Oversized denim jacket',
    sellingPrice: '1899',
    currency: 'Rs ',
    imageUrl: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    id: 'fashion-men-2',
    tab: 'Men',
    title: 'Smart casual coord set',
    sellingPrice: '2290',
    currency: 'Rs ',
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    id: 'fashion-women-1',
    tab: 'Women',
    title: 'Satin drape dress',
    sellingPrice: '2499',
    currency: 'Rs ',
    imageUrl: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    id: 'fashion-women-2',
    tab: 'Women',
    title: 'Pastel blazer set',
    sellingPrice: '2799',
    currency: 'Rs ',
    imageUrl: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    id: 'fashion-girls-1',
    tab: 'Girls',
    title: 'Pleated day dress',
    sellingPrice: '1599',
    currency: 'Rs ',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    id: 'fashion-girls-2',
    tab: 'Girls',
    title: 'Statement party co-ord',
    sellingPrice: '1999',
    currency: 'Rs ',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const FASHION_BRAND_GRID_SAMPLE = [
  {
    id: 'fashion-brand-hero',
    kind: 'hero',
    title: 'Seasonal spotlight',
    imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
    deepLink: '',
  },
  {
    id: 'fashion-brand-1',
    kind: 'tile',
    title: 'Urban Lane',
    imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80',
    imageShellBg: '#FFF8F0',
    deepLink: '',
  },
  {
    id: 'fashion-brand-2',
    kind: 'tile',
    title: 'Thread House',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80',
    imageShellBg: '#FFF8F0',
    deepLink: '',
  },
  {
    id: 'fashion-brand-3',
    kind: 'tile',
    title: 'Muse Edit',
    imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=700&q=80',
    imageShellBg: '#FFF8F0',
    deepLink: '',
  },
  {
    id: 'fashion-brand-4',
    kind: 'tile',
    title: 'Denim District',
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=700&q=80',
    imageShellBg: '#FFF8F0',
    deepLink: '',
  },
  {
    id: 'fashion-brand-cta',
    kind: 'cta',
    title: 'Designer capsules',
    imageUrl: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1200&q=80',
    deepLink: '',
  },
];

const FASHION_NEW_ARRIVALS_SAMPLE = [
  {
    id: 'fashion-arrival-1',
    title: 'Tailored co-ord set',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
    priceLine: 'Rs 2,499',
    moqLine: 'MOQ 12',
    sellerLine: 'Mode House · Ahmedabad',
    deliveryLabel: 'Dispatch in 24 hrs',
    stockLabel: 'Ready stock',
    stockDot: '#22C55E',
    deepLink: '',
  },
  {
    id: 'fashion-arrival-2',
    title: 'Embroidered kurta set',
    imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80',
    priceLine: 'Rs 1,899',
    moqLine: 'MOQ 8',
    sellerLine: 'Aarya Apparel · Surat',
    deliveryLabel: 'Dispatch in 48 hrs',
    stockLabel: 'Fast moving',
    stockDot: '#F59E0B',
    deepLink: '',
  },
  {
    id: 'fashion-arrival-3',
    title: 'Textured resort shirt',
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    priceLine: 'Rs 1,590',
    moqLine: 'MOQ 10',
    sellerLine: 'Urban Rack · Mumbai',
    deliveryLabel: 'Dispatch in 24 hrs',
    stockLabel: 'In stock',
    stockDot: '#22C55E',
    deepLink: '',
  },
  {
    id: 'fashion-arrival-4',
    title: 'Soft tote collection',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    priceLine: 'Rs 1,299',
    moqLine: 'MOQ 20',
    sellerLine: 'Carry Craft · Delhi',
    deliveryLabel: 'Dispatch in 72 hrs',
    stockLabel: 'Fresh drop',
    stockDot: '#6366F1',
    deepLink: '',
  },
];

const FASHION_WHY_BUY_SAMPLE = [
  {
    title: 'Verified sellers',
    subtitle: 'Curated businesses with catalog quality checks.',
    iconName: 'shield-checkmark-outline',
    deepLink: '',
  },
  {
    title: 'Fast sampling',
    subtitle: 'Shortlist and confirm fits before large orders.',
    iconName: 'flash-outline',
    deepLink: '',
  },
  {
    title: 'Low MOQ access',
    subtitle: 'Test trendy styles without overcommitting inventory.',
    iconName: 'cube-outline',
    deepLink: '',
  },
  {
    title: 'Assisted sourcing',
    subtitle: 'Move from moodboard to seller shortlist faster.',
    iconName: 'sparkles-outline',
    deepLink: '',
  },
];

const FASHION_SHOPS_SAMPLE = [
  {
    title: 'Raj Fashion Studio',
    subtitle: 'C G Road, Ahmedabad',
    rating: '4.8',
    distance: '2.1 km',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
    contactNumber: '+917990011223',
    whatsappNumber: '+917990011223',
    deepLink: '',
  },
  {
    title: 'Asha Ethnic House',
    subtitle: 'Prahlad Nagar, Ahmedabad',
    rating: '4.7',
    distance: '3.4 km',
    imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
    contactNumber: '+917990011224',
    whatsappNumber: '+917990011224',
    deepLink: '',
  },
  {
    title: 'Urban Wardrobe Co.',
    subtitle: 'Satellite, Ahmedabad',
    rating: '4.9',
    distance: '4.2 km',
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
    contactNumber: '+917990011225',
    whatsappNumber: '+917990011225',
    deepLink: '',
  },
];

const ELECTRONICS_HERO_SAMPLE = {
  badgeText: 'Electronics Week',
  title: 'Upgrade your tech stack',
  subtitle: 'Phones, laptops, and smart gear with fast delivery',
  ctaText: 'Shop now',
  imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
  deepLink: 'app://category/electronics',
  ctaLink: 'app://category/electronics',
};

const ELECTRONICS_DEAL_SAMPLE = [
  {
    title: 'Neo X Pro 5G',
    subtitle: '12GB RAM, 256GB',
    price: 'Rs 32,999',
    badgeText: '18% off',
    imageUrl: 'https://images.unsplash.com/photo-1512499617640-c2f999feff7b?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'AeroBook 14',
    subtitle: 'Core i7, 16GB',
    price: 'Rs 68,990',
    badgeText: '12% off',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Pulse Studio',
    subtitle: 'Noise canceling',
    price: 'Rs 7,499',
    badgeText: '25% off',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Vision 55 4K',
    subtitle: 'HDR, Smart TV',
    price: 'Rs 41,999',
    badgeText: '20% off',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const ELECTRONICS_MEDIA_OVERLAY_SAMPLE = [
  {
    title: 'Smart Home',
    subtitle: 'Lighting and security',
    imageUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Gaming Zone',
    subtitle: 'Consoles and gear',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Audio Lab',
    subtitle: 'Speakers and soundbars',
    imageUrl: 'https://images.unsplash.com/photo-1512446816042-444d641267d4?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Creator Desk',
    subtitle: 'Monitors and cameras',
    imageUrl: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const GROCERY_HERO_SAMPLE = {
  badgeText: 'Top Deals',
  title: 'Fresh groceries, faster delivery',
  subtitle: 'Fruits, staples, snacks and daily essentials in one place',
  ctaText: 'Shop now',
  imageUrl:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Best_organic_produce_Toronto.jpg/960px-Best_organic_produce_Toronto.jpg',
  deepLink: '',
  ctaLink: '',
};

const GROCERY_QUICK_INFO_SAMPLE = [
  { text: 'Fast delivery', iconName: 'paper-plane-outline', deepLink: '' },
  { text: 'Best prices', iconName: 'pricetag-outline', deepLink: '' },
  { text: 'Fresh picks', iconName: 'leaf-outline', deepLink: '' },
  { text: 'Daily essentials', iconName: 'bag-handle-outline', deepLink: '' },
];

const GROCERY_SPLIT_PROMOS_SAMPLE = [
  {
    title: 'Top Deals',
    subtitle: 'Fresh | Organic | Daily',
    ctaText: 'Shop now',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Greengrocer_in_a_market.jpg/640px-Greengrocer_in_a_market.jpg',
    deepLink: '',
  },
  {
    title: 'Snack Time',
    subtitle: 'Up to 30% OFF',
    badgeText: 'Snack Time',
    ctaText: 'Shop now',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Potato-Chips.jpg/500px-Potato-Chips.jpg',
    deepLink: '',
  },
];

const GROCERY_FRESH_SAMPLE = [
  {
    title: 'Strawberries',
    subtitle: '250 g box',
    businessName: 'FreshMart Grocery',
    price: 'Rs 145',
    badgeText: 'Fresh',
    rating: '4.7',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/PerfectStrawberry.jpg/500px-PerfectStrawberry.jpg',
    deepLink: '',
  },
  {
    title: 'Avocado Hass',
    subtitle: '2 pcs pack',
    businessName: 'Green Basket',
    price: 'Rs 89',
    badgeText: 'New',
    rating: '4.6',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Avocado_with_cross_section.jpg/500px-Avocado_with_cross_section.jpg',
    deepLink: '',
  },
  {
    title: 'Farm Eggs',
    subtitle: '12 pcs pack',
    businessName: 'Daily Essentials',
    price: 'Rs 109',
    badgeText: 'Popular',
    rating: '4.8',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Chicken_eggs_1.jpg/500px-Chicken_eggs_1.jpg',
    deepLink: '',
  },
  {
    title: 'Cherry Tomato',
    subtitle: '500 g box',
    businessName: 'Veggie Hub',
    price: 'Rs 69',
    badgeText: 'Fresh',
    rating: '4.5',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/500px-Tomato_je.jpg',
    deepLink: '',
  },
];

const GROCERY_PANTRY_SAMPLE = [
  {
    title: 'Breakfast Combo',
    subtitle: 'Bread, butter, jam',
    businessName: 'Daily Basket',
    price: 'Rs 249',
    oldPrice: 'Rs 299',
    saveLabel: 'Save 17%',
    eta: '25-35 min',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/500px-Korb_mit_Br%C3%B6tchen.JPG',
    deepLink: '',
  },
  {
    title: 'Weekly Staples',
    subtitle: 'Atta, rice, dal',
    businessName: 'Smart Grocers',
    price: 'Rs 799',
    oldPrice: 'Rs 899',
    saveLabel: 'Save 11%',
    eta: '40-55 min',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Wheat_flour.jpg/500px-Wheat_flour.jpg',
    deepLink: '',
  },
  {
    title: 'Snack Box',
    subtitle: 'Chips, cookies, drinks',
    businessName: 'Snacc Stop',
    price: 'Rs 299',
    oldPrice: 'Rs 359',
    saveLabel: 'Save 16%',
    eta: '20-30 min',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Potato-Chips.jpg/500px-Potato-Chips.jpg',
    deepLink: '',
  },
];

const GROCERY_FREQUENT_SAMPLE = [
  {
    title: 'Greek Yogurt',
    subtitle: '400 g cup',
    businessName: 'FreshMart Grocery',
    price: 'Rs 79',
    ctaText: 'ADD',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Yogurt_in_a_bowl.jpg/500px-Yogurt_in_a_bowl.jpg',
    deepLink: '',
  },
  {
    title: 'Aashirvaad Atta',
    subtitle: '10 kg pack',
    businessName: 'Daily Basket',
    price: 'Rs 499',
    ctaText: 'ADD',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Wheat_flour.jpg/500px-Wheat_flour.jpg',
    deepLink: '',
  },
  {
    title: 'Amul Milk 1L',
    subtitle: 'Fresh & chilled',
    businessName: 'Green Basket',
    price: 'Rs 56',
    ctaText: 'ADD',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Glass_of_Milk_%2833657535532%29.jpg/500px-Glass_of_Milk_%2833657535532%29.jpg',
    deepLink: '',
  },
];

const GROCERY_SHOPS_SAMPLE = [
  {
    title: 'FreshMart Grocery',
    subtitle: 'Veggies | Dairy | Snacks',
    rating: '4.8',
    distance: '20-30 min',
    ctaText: 'Shop now',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Westside_Market_in_Manhattan%2C_NYC_IMG_5615.JPG/960px-Westside_Market_in_Manhattan%2C_NYC_IMG_5615.JPG',
    deepLink: '',
  },
  {
    title: 'Daily Basket',
    subtitle: 'Staples | Household',
    rating: '4.6',
    distance: '30-45 min',
    ctaText: 'Shop now',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Brockenhurst_Convenience_Store_-_geograph.org.uk_-_4978448.jpg/330px-Brockenhurst_Convenience_Store_-_geograph.org.uk_-_4978448.jpg',
    deepLink: '',
  },
  {
    title: 'GreenLeaf Organic',
    subtitle: 'Organic | Fresh picks',
    rating: '4.7',
    distance: '35-50 min',
    ctaText: 'Shop now',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Best_organic_produce_Toronto.jpg/500px-Best_organic_produce_Toronto.jpg',
    deepLink: '',
  },
];

const ELECTRONICS_LAUNCH_SAMPLE = [
  {
    title: 'Aurora Tab 11',
    subtitle: 'OLED, 8GB RAM',
    price: 'From Rs 24,990',
    iconName: 'flash-outline',
    deepLink: '',
  },
  {
    title: 'Orbit Watch 3',
    subtitle: 'Health and GPS',
    price: 'From Rs 9,499',
    iconName: 'flash-outline',
    deepLink: '',
  },
  {
    title: 'Nimbus Camera S',
    subtitle: '4K, dual lens',
    price: 'From Rs 18,250',
    iconName: 'flash-outline',
    deepLink: '',
  },
];

const ELECTRONICS_SUPPORT_SAMPLE = [
  {
    title: 'Warranty plans',
    subtitle: 'Extend coverage',
    iconName: 'shield-checkmark-outline',
    deepLink: '',
  },
  {
    title: 'Expert help',
    subtitle: 'Chat with technicians',
    iconName: 'chatbubble-ellipses-outline',
    deepLink: '',
  },
  {
    title: 'Easy returns',
    subtitle: 'Pickups within 48 hours',
    iconName: 'cube-outline',
    deepLink: '',
  },
  {
    title: 'Installation',
    subtitle: 'TV and appliance setup',
    iconName: 'construct-outline',
    deepLink: '',
  },
];

const BEAUTY_TRENDING_SAMPLE = [
  {
    title: 'Glass Skin',
    subtitle: 'Hydration heroes',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Berry Lips',
    subtitle: 'Bold and glossy',
    imageUrl: 'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Night Repair',
    subtitle: 'Overnight glow',
    imageUrl: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const BEAUTY_PRODUCT_SAMPLE = [
  {
    title: 'Radiance Serum',
    subtitle: 'Vitamin C 15%',
    price: 'Rs 1,499',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Velvet Lip Tint',
    subtitle: 'Long wear',
    price: 'Rs 799',
    imageUrl: 'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Overnight Mask',
    subtitle: 'Hydration boost',
    price: 'Rs 1,099',
    imageUrl: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Pro Brush Set',
    subtitle: '12 pieces',
    price: 'Rs 1,299',
    imageUrl: 'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const BEAUTY_ROUTINE_SAMPLE = [
  {
    title: 'Cleanse',
    subtitle: 'Gentle gel cleanser',
    iconName: 'water-outline',
    deepLink: '',
  },
  {
    title: 'Tone',
    subtitle: 'Balance and prep',
    iconName: 'leaf-outline',
    deepLink: '',
  },
  {
    title: 'Treat',
    subtitle: 'Targeted serums',
    iconName: 'sparkles-outline',
    deepLink: '',
  },
  {
    title: 'Moisturize',
    subtitle: 'Glow lock',
    iconName: 'sunny-outline',
    deepLink: '',
  },
];

const BEAUTY_TIPS_SAMPLE = [
  { text: 'SPF daily', deepLink: '' },
  { text: 'Hydrate inside out', deepLink: '' },
  { text: 'Gentle exfoliation', deepLink: '' },
  { text: 'Sleep glow', deepLink: '' },
  { text: 'Clean tools', deepLink: '' },
];

const BEAUTY_SALON_SAMPLE = [
  {
    title: 'Blush Beauty Studio',
    subtitle: 'C G Road, Ahmedabad',
    rating: '4.8',
    distance: '2.4 km',
    imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Luxe Hair Lab',
    subtitle: 'Prahlad Nagar',
    rating: '4.7',
    distance: '3.1 km',
    imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const DECOR_HERO_SAMPLE = {
  badgeText: 'Seasonal Edit',
  title: 'Terracotta Calm',
  subtitle: 'Warm beige, artisan textures, soft lighting',
  ctaText: 'Explore collection',
  imageUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1400&q=80',
  ctaLink: '',
};

const DECOR_QUICK_ACTIONS_SAMPLE = [
  {
    title: 'Styling help',
    subtitle: 'Free 15 min consult',
    iconName: 'chatbubble-ellipses-outline',
    deepLink: '',
  },
  {
    title: 'Material kit',
    subtitle: 'Curated swatches',
    iconName: 'color-palette-outline',
    deepLink: '',
  },
  {
    title: 'Room planner',
    subtitle: 'Scale in AR',
    iconName: 'cube-outline',
    deepLink: '',
  },
];

const DECOR_ROOM_SAMPLE = [
  {
    title: 'Living',
    imageUrl: 'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?auto=format&fit=crop&w=300&h=300&q=80',
    deepLink: '',
  },
  {
    title: 'Bedroom',
    imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=300&h=300&q=80',
    deepLink: '',
  },
  {
    title: 'Kitchen',
    imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=300&h=300&q=80',
    deepLink: '',
  },
  {
    title: 'Outdoor',
    imageUrl: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=300&h=300&q=80',
    deepLink: '',
  },
];

const DECOR_TRENDING_CATEGORIES_SAMPLE = [
  {
    title: 'Lighting',
    subtitle: 'Warm glow',
    imageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=480&h=360&q=80',
    deepLink: '',
  },
  {
    title: 'Wall Art',
    subtitle: 'Gallery sets',
    imageUrl: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=480&h=360&q=80',
    deepLink: '',
  },
  {
    title: 'Rugs',
    subtitle: 'Handwoven',
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=480&h=360&q=80',
    deepLink: '',
  },
  {
    title: 'Tableware',
    subtitle: 'Stoneware',
    imageUrl: 'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=480&h=360&q=80',
    deepLink: '',
  },
];

const DECOR_COLLECTIONS_SAMPLE = [
  {
    badgeText: 'New',
    title: 'Artisan Pottery',
    subtitle: 'Earthy ceramics, hand glazed',
    imageUrl: 'https://images.unsplash.com/photo-1475855581690-80accde3ae2b?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    badgeText: 'Bestseller',
    title: 'Linen Textures',
    subtitle: 'Soft throws and neutral layers',
    imageUrl: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const DECOR_BESTSELLERS_SAMPLE = [
  {
    title: 'Ceramic Table Lamp',
    priceLine: 'Rs 2,499',
    rating: '4.9',
    imageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=480&h=480&q=80',
    deepLink: '',
  },
  {
    title: 'Terracotta Vase',
    priceLine: 'Rs 1,250',
    rating: '4.8',
    imageUrl: 'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=480&h=480&q=80',
    deepLink: '',
  },
  {
    title: 'Woven Throw',
    priceLine: 'Rs 1,899',
    rating: '4.7',
    imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=480&h=480&q=80',
    deepLink: '',
  },
  {
    title: 'Ceramic Planter',
    priceLine: 'Rs 999',
    rating: '4.6',
    imageUrl: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=480&h=480&q=80',
    deepLink: '',
  },
];

const AGRICULTURE_HERO_SAMPLE = {
  badgeText: 'Seasonal Focus',
  title: 'Kharif prep, made simple',
  subtitle: 'Seeds, irrigation, soil care, and mandi updates in one feed',
  ctaText: 'Plan crop cycle',
  imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
  ctaLink: '',
};

const AGRICULTURE_CATEGORY_SAMPLE = [
  {
    title: 'Grains',
    iconName: 'leaf-outline',
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Vegetables',
    iconName: 'nutrition-outline',
    imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Fruits',
    iconName: 'nutrition-outline',
    imageUrl: 'https://images.unsplash.com/photo-1485637701894-09ad422f6de6?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Spices',
    iconName: 'flame-outline',
    imageUrl: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
];

const AGRICULTURE_WEATHER_SAMPLE = [
  {
    kind: 'current',
    location: 'Ghatlodiya, Gujarat',
    temp: '28C',
    condition: 'Partly cloudy',
    humidity: '62%',
    wind: '12 km/h',
  },
  { kind: 'forecast', day: 'Mon', temp: '29C', icon: 'partly-sunny-outline' },
  { kind: 'forecast', day: 'Tue', temp: '31C', icon: 'sunny-outline' },
  { kind: 'forecast', day: 'Wed', temp: '27C', icon: 'cloudy-outline' },
  { kind: 'forecast', day: 'Thu', temp: '30C', icon: 'sunny-outline' },
];

const AGRICULTURE_SEASONAL_PICKS_SAMPLE = [
  {
    badgeText: 'Seasonal',
    title: 'Kharif Seed Kit',
    subtitle: 'Hybrid rice and pulses',
    imageUrl: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    badgeText: 'Water smart',
    title: 'Drip Irrigation',
    subtitle: 'Save up to 30% water',
    imageUrl: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    badgeText: 'Soil care',
    title: 'Soil Booster',
    subtitle: 'Organic compost blend',
    imageUrl: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const AGRICULTURE_MANDI_SAMPLE = [
  { name: 'Wheat', market: 'Unjha', price: 'Rs 2,345 / qtl', change: '+1.8%', direction: 'up' },
  { name: 'Soybean', market: 'Indore', price: 'Rs 4,220 / qtl', change: '-0.6%', direction: 'down' },
  { name: 'Cotton', market: 'Rajkot', price: 'Rs 6,180 / qtl', change: '+0.9%', direction: 'up' },
  { name: 'Onion', market: 'Pune', price: 'Rs 1,560 / qtl', change: '+0.3%', direction: 'up' },
];

const AGRICULTURE_TOOLS_SAMPLE = [
  {
    title: 'Mini Tractor',
    subtitle: '28 HP compact',
    priceLine: 'Rs 2.8L',
    rating: '4.8',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Battery Sprayer',
    subtitle: '16L capacity',
    priceLine: 'Rs 4,299',
    rating: '4.7',
    imageUrl: 'https://images.unsplash.com/photo-1475335771922-27ecbdb9c820?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Power Tiller',
    subtitle: 'Field ready',
    priceLine: 'Rs 64,999',
    rating: '4.6',
    imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const AGRICULTURE_INPUTS_SAMPLE = [
  {
    title: 'Urea 45kg',
    subtitle: 'Nitrogen boost',
    badgeText: 'Top selling',
    priceLine: 'Rs 349',
    rating: '4.8',
    imageUrl: 'https://images.unsplash.com/photo-1444395026247-0f8c2a1b7e18?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'DAP 50kg',
    subtitle: 'Root growth support',
    badgeText: 'Balanced',
    priceLine: 'Rs 1,420',
    rating: '4.7',
    imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Organic Manure',
    subtitle: 'Soil health mix',
    badgeText: 'Eco',
    priceLine: 'Rs 650',
    rating: '4.6',
    imageUrl: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const AGRICULTURE_SUPPLIERS_SAMPLE = [
  {
    title: 'GreenFarm Supplies',
    subtitle: 'Ahmedabad',
    rating: '4.8',
    distance: '2.8 km',
    imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'AgroPrime Co-op',
    subtitle: 'Mehsana',
    rating: '4.7',
    distance: '5.2 km',
    imageUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'FreshMandi Network',
    subtitle: 'Surat',
    rating: '4.6',
    distance: '6.9 km',
    imageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const KIDS_HERO_SAMPLE = {
  badgeText: 'Kids Fest',
  title: 'Bright play, safe picks',
  subtitle: 'Toys, books, and essentials for every age',
  ctaText: 'Shop kids',
  imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1400&q=80',
  ctaLink: '',
};

const KIDS_QUICK_ACTIONS_SAMPLE = [
  {
    title: 'Gift finder',
    subtitle: 'Age-based ideas',
    iconName: 'gift-outline',
    ctaText: 'Explore',
    deepLink: '',
  },
  {
    title: 'Wishlist',
    subtitle: 'Save favorites',
    iconName: 'heart-outline',
    ctaText: 'View list',
    deepLink: '',
  },
  {
    title: 'Track order',
    subtitle: 'Live delivery',
    iconName: 'locate-outline',
    ctaText: 'Track',
    deepLink: '',
  },
];

const KIDS_CATEGORY_SAMPLE = [
  {
    title: '0-2 yrs',
    imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: '3-5 yrs',
    imageUrl: 'https://images.unsplash.com/photo-1504151932400-72d4384f04b3?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: '6-8 yrs',
    imageUrl: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: '9-12 yrs',
    imageUrl: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
];

const KIDS_TRENDING_SAMPLE = [
  {
    title: 'Sky Builder Blocks',
    subtitle: 'STEM 120 pcs',
    priceLine: 'Rs 1,299',
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Racer Track Set',
    subtitle: 'Glow loop tracks',
    priceLine: 'Rs 1,650',
    imageUrl: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Mini Kitchen Play',
    subtitle: 'Chef starter kit',
    priceLine: 'Rs 2,450',
    imageUrl: 'https://images.unsplash.com/photo-1601758123927-1961cfcbe4f1?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Space Rover',
    subtitle: 'Remote control',
    priceLine: 'Rs 1,999',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const KIDS_LEARNING_SAMPLE = [
  {
    title: 'Science Lab Kit',
    subtitle: '25 experiments',
    imageUrl: 'https://images.unsplash.com/photo-1535909339361-9b2ef0bca90f?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Coding Starter',
    subtitle: 'Build and program',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Art Studio Box',
    subtitle: 'Paint and craft',
    imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const KIDS_BRANDS_SAMPLE = [
  { title: 'LEGO', subtitle: 'Building blocks', imageUrl: 'https://logo.clearbit.com/lego.com?size=128', deepLink: '' },
  { title: 'Disney', subtitle: 'Stories and magic', imageUrl: 'https://logo.clearbit.com/disney.com?size=128', deepLink: '' },
  { title: 'Fisher-Price', subtitle: 'Baby essentials', imageUrl: 'https://logo.clearbit.com/fisher-price.com?size=128', deepLink: '' },
  { title: 'Hot Wheels', subtitle: 'Speed toys', imageUrl: 'https://logo.clearbit.com/hotwheels.com?size=128', deepLink: '' },
  { title: 'Hasbro', subtitle: 'Games and play', imageUrl: 'https://logo.clearbit.com/hasbro.com?size=128', deepLink: '' },
  { title: 'Crayola', subtitle: 'Art supplies', imageUrl: 'https://logo.clearbit.com/crayola.com?size=128', deepLink: '' },
];

const KIDS_OUTFIT_SAMPLE = [
  {
    title: 'Sunny Day Set',
    subtitle: 'Cotton essentials',
    priceLine: 'Rs 899',
    imageUrl: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Playground Hoodie',
    subtitle: 'Soft fleece',
    priceLine: 'Rs 1,099',
    imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Rainy Day Gear',
    subtitle: 'Waterproof set',
    priceLine: 'Rs 1,499',
    imageUrl: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const KIDS_PARENT_TIPS_SAMPLE = [
  { title: 'Screen time planner', subtitle: 'Healthy daily routines', iconName: 'time-outline', deepLink: '' },
  { title: 'Nutrition checklist', subtitle: 'Balanced snack ideas', iconName: 'nutrition-outline', deepLink: '' },
  { title: 'Safety essentials', subtitle: 'Home and outdoor tips', iconName: 'shield-checkmark-outline', deepLink: '' },
  { title: 'Activity ideas', subtitle: 'Weekend plans and crafts', iconName: 'sunny-outline', deepLink: '' },
];

const SPORTS_HERO_SAMPLE = {
  badgeText: 'Game Day',
  title: 'Train smart, play harder',
  subtitle: 'Gear, plans, and arenas for every athlete',
  ctaText: 'Join challenges',
  imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80',
  ctaLink: '',
};

const SPORTS_QUICK_ACTIONS_SAMPLE = [
  {
    title: 'Book turf',
    subtitle: 'Instant slots',
    iconName: 'calendar-outline',
    ctaText: 'Reserve',
    deepLink: '',
  },
  {
    title: 'Find coach',
    subtitle: 'Verified trainers',
    iconName: 'person-outline',
    ctaText: 'Browse',
    deepLink: '',
  },
  {
    title: 'Track order',
    subtitle: 'Gear delivery',
    iconName: 'locate-outline',
    ctaText: 'Track',
    deepLink: '',
  },
];

const SPORTS_CATEGORY_SAMPLE = [
  {
    title: 'Football',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Cricket',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Running',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Gym',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
];

const SPORTS_FEATURED_GEAR_SAMPLE = [
  {
    title: 'Sprint Pro Shoes',
    subtitle: 'Lightweight runners',
    priceLine: 'Rs 3,499',
    rating: '4.8',
    imageUrl: 'https://images.unsplash.com/photo-1528701800489-20be3c2ea1a2?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Strength Dumbbells',
    subtitle: 'Adjustable set',
    priceLine: 'Rs 4,999',
    rating: '4.7',
    imageUrl: 'https://images.unsplash.com/photo-1517964603305-11c0f6f66012?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Match Football',
    subtitle: 'Pro grip finish',
    priceLine: 'Rs 1,199',
    rating: '4.6',
    imageUrl: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const SPORTS_LIVE_MATCHES_SAMPLE = [
  { league: 'City League', home: 'Rovers', away: 'Dynamos', time: '6:30 PM', status: 'Live', score: '2 - 1' },
  { league: 'Premier Cup', home: 'Titans', away: 'Falcons', time: '8:00 PM', status: 'Upcoming', score: '0 - 0' },
  { league: 'Weekend T20', home: 'Strikers', away: 'Warriors', time: 'Tomorrow', status: 'Scheduled', score: '-' },
];

const SPORTS_TRAINING_SAMPLE = [
  {
    title: 'Strength Builder',
    subtitle: '4 weeks | 5 workouts',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: '10K Run Plan',
    subtitle: '6 weeks | cardio',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Mobility Flow',
    subtitle: 'Daily | 20 mins',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const SPORTS_ARENAS_SAMPLE = [
  {
    title: 'Skyline Arena',
    subtitle: 'Navrangpura',
    rating: '4.7',
    distance: '2.1 km',
    imageUrl: 'https://images.unsplash.com/photo-1504309092620-4d0ec726efa4?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Pulse Sports Hub',
    subtitle: 'Vastrapur',
    rating: '4.6',
    distance: '3.4 km',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const SPORTS_RECOVERY_SAMPLE = [
  { title: 'Foam roller', subtitle: 'Mobility recovery', iconName: 'swap-vertical-outline', deepLink: '' },
  { title: 'Protein shake', subtitle: 'Post-workout', iconName: 'nutrition-outline', deepLink: '' },
  { title: 'Sleep tracker', subtitle: 'Recovery scores', iconName: 'moon-outline', deepLink: '' },
  { title: 'Stretch band', subtitle: 'Flexibility kit', iconName: 'bandage-outline', deepLink: '' },
];

const FITNESS_HERO_SAMPLE = {
  badgeText: 'Athlete Mode',
  title: 'Build strength and stamina',
  subtitle: 'Hybrid programs, smart nutrition, and tracking',
  ctaText: 'Start program',
  imageUrl: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1400&q=80',
  ctaLink: '',
};

const FITNESS_CATEGORY_SAMPLE = [
  {
    title: 'Equipment',
    iconName: 'barbell-outline',
    imageUrl: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
  {
    title: 'Classes',
    iconName: 'bicycle-outline',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
  {
    title: 'Nutrition',
    iconName: 'nutrition-outline',
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
  {
    title: 'Recovery',
    iconName: 'medkit-outline',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
];

const FITNESS_PROGRESS_STATS_SAMPLE = [
  { label: 'Workout streak', value: '14 days', iconName: 'flame-outline', meta: '+3 this week' },
  { label: 'Calories', value: '2,450', iconName: 'flash-outline', meta: 'Avg / day' },
  { label: 'Strength PR', value: '+22%', iconName: 'barbell-outline', meta: 'Last 30 days' },
  { label: 'Sleep', value: '7.2 hrs', iconName: 'moon-outline', meta: 'Recovery score' },
];

const FITNESS_WORKOUTS_SAMPLE = [
  {
    title: 'Power Strength',
    subtitle: 'Upper body focus | Intermediate',
    badgeText: '45 min',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'HIIT Burn',
    subtitle: 'Full body cardio | Advanced',
    badgeText: '28 min',
    imageUrl: 'https://images.unsplash.com/photo-1554344728-77cf90d9ed26?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Mobility Flow',
    subtitle: 'Flexibility reset | All levels',
    badgeText: '25 min',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const FITNESS_CLASS_SCHEDULE_SAMPLE = [
  { title: 'Spin Core', time: '6:30 AM', coach: 'Coach Riya', level: 'High intensity', iconName: 'bicycle-outline', spots: '4 spots left' },
  { title: 'Strength Lab', time: '8:00 AM', coach: 'Coach Aman', level: 'Strength focus', iconName: 'barbell-outline', spots: 'Waitlist' },
  { title: 'Mobility Yoga', time: '12:15 PM', coach: 'Coach Sana', level: 'Recovery', iconName: 'walk-outline', spots: '8 spots left' },
];

const FITNESS_TRAINERS_SAMPLE = [
  {
    title: 'Neha Kapoor',
    subtitle: 'Strength + mobility',
    priceLine: 'Coach',
    rating: '4.9',
    imageUrl: 'https://images.unsplash.com/photo-1554284126-aa88f22d8b72?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
  {
    title: 'Kabir Singh',
    subtitle: 'HIIT + endurance',
    priceLine: 'Coach',
    rating: '4.8',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
  {
    title: 'Maya Desai',
    subtitle: 'Yoga + recovery',
    priceLine: 'Coach',
    rating: '4.9',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
];

const FITNESS_MEMBERSHIPS_SAMPLE = [
  {
    name: 'Starter',
    price: 'Rs 999',
    tagline: 'Gym access 5 days/week',
    perks: ['4 classes/month', 'Nutrition guide', 'Progress tracker'],
  },
  {
    name: 'Pro',
    price: 'Rs 1,799',
    tagline: 'Unlimited classes + sauna',
    perks: ['Unlimited classes', 'Recovery lounge', 'Trainer check-ins'],
    highlight: true,
  },
  {
    name: 'Elite',
    price: 'Rs 2,599',
    tagline: '1:1 coaching + premium',
    perks: ['Personal coach', 'Custom meal plan', 'VIP recovery'],
  },
];

const FITNESS_NUTRITION_SAMPLE = [
  {
    title: 'Lean Cut',
    subtitle: 'High protein, low carb',
    priceLine: '1,900 kcal',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Lean Bulk',
    subtitle: 'Performance carbs',
    priceLine: '2,500 kcal',
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Plant Powered',
    subtitle: 'Vegan strength',
    priceLine: '2,100 kcal',
    imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const SERVICES_HERO_SAMPLE = {
  badgeText: 'Verified Experts',
  title: 'Professional services, made simple',
  subtitle: 'Advocates, CAs, and government services in one place',
  ctaText: 'Post a request',
  imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80',
  ctaLink: '',
};

const SERVICES_CATEGORY_SAMPLE = [
  {
    title: 'Advocate',
    iconName: 'briefcase-outline',
    imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80',
    deepLink: '',
  },
  {
    title: 'Chartered CA',
    iconName: 'calculator-outline',
    imageUrl: 'https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=600&q=80',
    deepLink: '',
  },
  {
    title: 'Govt Services',
    iconName: 'business-outline',
    imageUrl: 'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=600&q=80',
    deepLink: '',
  },
  {
    title: 'Compliance',
    iconName: 'shield-checkmark-outline',
    imageUrl: 'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=600&q=80',
    deepLink: '',
  },
];

const SERVICES_FEATURED_PROFESSIONALS_SAMPLE = [
  {
    title: 'Priya Mehta',
    subtitle: 'Advocate - Corporate',
    priceLine: 'From Rs 1,200',
    rating: '4.9',
    imageUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
  {
    title: 'Aarav Shah',
    subtitle: 'CA - GST and Audit',
    priceLine: 'From Rs 900',
    rating: '4.8',
    imageUrl: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
  {
    title: 'Neel Patel',
    subtitle: 'Accountant - Bookkeeping',
    priceLine: 'From Rs 650',
    rating: '4.7',
    imageUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=700&q=80',
    deepLink: '',
  },
];

const SERVICES_BOOKING_SLOTS_SAMPLE = [
  { name: 'Advocate Priya', service: 'Contract review', time: '10:30 AM', date: 'Tomorrow', status: 'Available' },
  { name: 'CA Aarav', service: 'GST filing', time: '1:15 PM', date: 'Thu', status: 'Filling fast' },
  { name: 'Accountant Neel', service: 'Monthly books', time: '4:00 PM', date: 'Fri', status: 'Waitlist' },
];

const SERVICES_GOV_SERVICES_SAMPLE = [
  {
    title: 'Passport',
    subtitle: 'New or renewal',
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'PAN / Aadhaar',
    subtitle: 'Apply or update',
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'GST Registration',
    subtitle: 'Business setup',
    imageUrl: 'https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const SERVICES_GOV_OFFICES_SAMPLE = [
  { title: 'GST Seva Kendra', subtitle: 'Ashram Road, Ahmedabad | Mon-Fri 10 AM - 5 PM', iconName: 'business-outline', deepLink: '' },
  { title: 'District Collector Office', subtitle: 'Ellis Bridge, Ahmedabad | Mon-Sat 9 AM - 6 PM', iconName: 'business-outline', deepLink: '' },
  { title: 'Passport Seva Kendra', subtitle: 'Bopal, Ahmedabad | Mon-Fri 9 AM - 4 PM', iconName: 'business-outline', deepLink: '' },
];

const SERVICES_ADVOCATE_SPOTLIGHT_SAMPLE = {
  badgeText: 'Advocate spotlight',
  title: 'Ananya Rao',
  subtitle: 'Legal drafting and disputes | 12 yrs experience',
  ctaText: 'Book consultation',
  imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=80',
  ctaLink: '',
};

const SERVICES_COMPLIANCE_SAMPLE = [
  { title: 'GST filing', subtitle: 'Due in 7 days', iconName: 'checkmark-circle-outline', deepLink: '' },
  { title: 'TDS return', subtitle: 'Due in 12 days', iconName: 'checkmark-circle-outline', deepLink: '' },
  { title: 'ROC annual filing', subtitle: 'Due in 25 days', iconName: 'checkmark-circle-outline', deepLink: '' },
  { title: 'Labour compliance', subtitle: 'Renewal pending', iconName: 'checkmark-circle-outline', deepLink: '' },
];

const MEDICAL_HERO_SAMPLE = {
  badgeText: 'Trusted Care',
  title: 'Doctors, medicines and lab tests in one place',
  subtitle: 'Consult, order and book care with a clean, verified experience',
  ctaText: 'Explore care',
  imageUrl: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1400&q=80',
  ctaLink: '',
};

const MEDICAL_CATEGORY_GRID_SAMPLE = [
  {
    title: 'Medicines',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Hospitals',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Doctors',
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Lab Tests',
    imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Skin & Care',
    imageUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Emergency',
    imageUrl: 'https://images.unsplash.com/photo-1581595219315-a187dd40c322?auto=format&fit=crop&w=600&q=80',
  },
];

const MEDICAL_NEARBY_HOSPITALS_SAMPLE = [
  { title: 'CityCare Multispeciality', subtitle: 'Cardio, Ortho, ICU', distance: '2.1 km', tags: ['24x7', 'Emergency'] },
  { title: 'Suburban Hospital', subtitle: 'Neuro, Pediatrics, Trauma', distance: '3.4 km', tags: ['24x7'] },
  { title: 'Medical Towers Center', subtitle: 'ENT, Ortho, Diagnostics', distance: '4.6 km', tags: ['Emergency'] },
];

const MEDICAL_TOP_DOCTORS_SAMPLE = [
  { title: 'Dr. Aisha Patel', subtitle: 'Cardiologist', experience: '9 yrs', fee: 'Rs 499', availability: 'Available today' },
  { title: 'Dr. Sana Khan', subtitle: 'Gynecologist', experience: '12 yrs', fee: 'Rs 649', availability: 'Next: 1 hr' },
  { title: 'Dr. Rahul Mehta', subtitle: 'General Physician', experience: '11 yrs', fee: 'Rs 399', availability: 'Available today' },
];

const MEDICAL_TRUSTED_MEDICINES_SAMPLE = [
  {
    title: 'Paracetamol 650',
    subtitle: 'MediCure | Delivery in 30 mins',
    priceLine: 'Rs 49',
    badgeText: 'OTC',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Cough Syrup',
    subtitle: 'ReliefPlus | Delivery in 45 mins',
    priceLine: 'Rs 99',
    badgeText: 'OTC',
    imageUrl: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Azithro 500',
    subtitle: 'ZenCare | Delivery in 60 mins',
    priceLine: 'Rs 159',
    badgeText: 'Rx required',
    imageUrl: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const MEDICAL_SKIN_CARE_SAMPLE = [
  {
    title: 'Acne care',
    subtitle: 'Dermat approved',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Sensitive skin',
    subtitle: 'Daily repair',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Glow routine',
    subtitle: 'Face wash + serum',
    imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const MEDICAL_LAB_TESTS_SAMPLE = [
  {
    title: 'Complete Blood Count',
    subtitle: 'Reports in 12 hrs | Home sample',
    priceLine: 'Rs 499',
    badgeText: '20% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Thyroid Profile',
    subtitle: 'Reports in 24 hrs | Home sample',
    priceLine: 'Rs 699',
    badgeText: '15% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'HbA1c Test',
    subtitle: 'Reports in 24 hrs | Home sample',
    priceLine: 'Rs 599',
    badgeText: '10% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const MEDICAL_HEALTH_PACKAGES_SAMPLE = [
  {
    title: 'Full Body Checkup',
    subtitle: '70 tests included',
    priceLine: 'Rs 1,499',
    badgeText: 'Save 25%',
    imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Diabetes Package',
    subtitle: 'Sugar + lipid profile',
    priceLine: 'Rs 999',
    badgeText: 'Save 20%',
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Heart Health',
    subtitle: 'ECG + lipid + BP',
    priceLine: 'Rs 1,299',
    badgeText: 'Save 15%',
    imageUrl: 'https://images.unsplash.com/photo-1516549655669-df6c0cdb6355?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const MEDICAL_EMERGENCY_SAMPLE = [
  { title: 'Ambulance', subtitle: 'Avg 10-15 mins', iconName: 'car-outline' },
  { title: '24x7 Pharmacy', subtitle: 'Nearby open stores', iconName: 'storefront-outline' },
  { title: 'Emergency Doctor', subtitle: 'Video in 5 mins', iconName: 'call-outline' },
  { title: 'ICU Enquiry', subtitle: 'Live bed status', iconName: 'bed-outline' },
];

const MEDICAL_TRUST_SAMPLE = [
  { title: 'Verified hospitals', iconName: 'shield-checkmark-outline' },
  { title: 'Licensed pharmacies', iconName: 'medkit-outline' },
  { title: 'Registered doctors', iconName: 'person-circle-outline' },
  { title: 'Secure payments', iconName: 'lock-closed-outline' },
];

const MEDICAL_HEALTH_TIPS_SAMPLE = [
  {
    title: 'Skin care tips',
    subtitle: 'Daily routine that works',
    badgeText: 'Guide',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Seasonal illness',
    subtitle: 'Stay protected this week',
    badgeText: 'Read',
    imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'Medicine usage',
    subtitle: 'Safe dosage guidance',
    badgeText: 'Tips',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const MEDICAL_REMINDER_SAMPLE = [
  { title: 'Medicine reminders', subtitle: 'Set daily alerts', iconName: 'alarm-outline' },
  { title: 'Refill alerts', subtitle: 'Never run out', iconName: 'repeat-outline' },
  { title: 'Monthly subscriptions', subtitle: 'Auto deliveries', iconName: 'calendar-outline' },
];

const MEDICAL_OFFERS_SAMPLE = [
  {
    title: 'Flat discount on tests',
    subtitle: 'Save up to 25% today',
    tag: 'Limited time',
    imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Medicine cashback',
    subtitle: 'Get 10% back on orders',
    tag: 'Cashback',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Free consultation',
    subtitle: 'Video consult on select plans',
    tag: 'Doctor care',
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80',
  },
];

const MEDICAL_FOOTER_LINKS_SAMPLE = [
  { label: 'Prescription upload' },
  { label: 'Insurance partners' },
  { label: 'Order tracking' },
  { label: 'Refund policy' },
  { label: 'Health records' },
  { label: 'Emergency numbers' },
];

const JEWELLERY_HERO_SAMPLE = {
  badgeText: 'Rose Gold Edit',
  title: 'Celebrate every sparkle',
  subtitle: 'Handcrafted jewels for gifts, weddings, and milestones',
  ctaText: 'Explore collection',
  imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=80',
  deepLink: '',
};

const JEWELLERY_QUICK_ACTIONS_SAMPLE = [
  {
    title: 'Book appointment',
    subtitle: 'In-store styling',
    iconName: 'calendar-outline',
    ctaText: 'Schedule',
    deepLink: '',
  },
  {
    title: 'Try at home',
    subtitle: 'Curated kits',
    iconName: 'home-outline',
    ctaText: 'Request',
    deepLink: '',
  },
  {
    title: 'Gold rate',
    subtitle: 'Live market',
    iconName: 'stats-chart-outline',
    ctaText: 'View',
    deepLink: '',
  },
];

const JEWELLERY_CATEGORY_SAMPLE = [
  {
    title: 'Rings',
    iconName: 'diamond-outline',
    imageUrl: 'https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Necklaces',
    iconName: 'sparkles-outline',
    imageUrl: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Earrings',
    iconName: 'heart-outline',
    imageUrl: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Bangles',
    iconName: 'ellipse-outline',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
];

const JEWELLERY_COLLECTIONS_SAMPLE = [
  {
    title: 'Bridal heirlooms',
    subtitle: 'Set of 5 pieces',
    imageUrl: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Everyday gold',
    subtitle: 'Lightweight picks',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Gemstone glow',
    subtitle: 'Emerald and ruby',
    imageUrl: 'https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const JEWELLERY_NEW_ARRIVALS_SAMPLE = [
  {
    title: 'Solitaire Halo Ring',
    subtitle: '18K rose gold',
    priceLine: 'Rs 34,990',
    rating: '4.9',
    imageUrl: 'https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Luna Drop Earrings',
    subtitle: 'Pearl finish',
    priceLine: 'Rs 8,499',
    rating: '4.8',
    imageUrl: 'https://images.unsplash.com/photo-1512310604669-443f26c35f52?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Nova Tennis Bracelet',
    subtitle: 'White gold',
    priceLine: 'Rs 22,500',
    rating: '4.8',
    imageUrl: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const JEWELLERY_GOLD_RATES_SAMPLE = [
  { label: '24K Gold', price: 'Rs 6,525/g', trend: '+0.4%' },
  { label: '22K Gold', price: 'Rs 5,980/g', trend: '+0.3%' },
  { label: 'Platinum', price: 'Rs 3,240/g', trend: '+0.1%' },
];

const JEWELLERY_TRUST_SAMPLE = [
  { title: 'BIS Hallmark', subtitle: 'Certified purity', iconName: 'shield-checkmark-outline', deepLink: '' },
  { title: 'IGI certified', subtitle: 'Diamond grading', iconName: 'ribbon-outline', deepLink: '' },
  { title: 'Secure delivery', subtitle: 'Insured shipments', iconName: 'lock-closed-outline', deepLink: '' },
  { title: 'Easy returns', subtitle: '7-day window', iconName: 'refresh-outline', deepLink: '' },
];

const TRAVEL_HERO_SAMPLE = {
  badgeText: 'Ocean Escape',
  title: 'Sail into summer',
  subtitle: 'Curated coastal stays, flights, and local guides',
  ctaText: 'Plan a trip',
  imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
  deepLink: '',
};

const TRAVEL_CATEGORY_SAMPLE = [
  {
    title: 'Flights',
    iconName: 'airplane-outline',
    imageUrl: 'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?auto=format&fit=crop&w=600&q=80',
    deepLink: '',
  },
  {
    title: 'Stays',
    iconName: 'home-outline',
    imageUrl: 'https://images.unsplash.com/photo-1501117716987-c8e1ecb2100f?auto=format&fit=crop&w=600&q=80',
    deepLink: '',
  },
  {
    title: 'Packages',
    iconName: 'briefcase-outline',
    imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80',
    deepLink: '',
  },
  {
    title: 'Experiences',
    iconName: 'map-outline',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
    deepLink: '',
  },
];

const TRAVEL_DESTINATIONS_SAMPLE = [
  {
    title: 'Goa',
    subtitle: '3N from Rs 8,999',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Bali',
    subtitle: '5N from Rs 29,900',
    imageUrl: 'https://images.unsplash.com/photo-1505739773434-c02c1a7d26ed?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Maldives',
    subtitle: '4N from Rs 54,500',
    imageUrl: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const TRAVEL_FLIGHT_DEALS_SAMPLE = [
  {
    route: 'Mumbai to Goa',
    date: 'Tue, 18 Jun',
    price: 'Rs 3,999',
    airline: 'Indigo',
    type: 'Non-stop',
    deepLink: '',
  },
  {
    route: 'Delhi to Bengaluru',
    date: 'Fri, 21 Jun',
    price: 'Rs 4,650',
    airline: 'Vistara',
    type: 'Non-stop',
    deepLink: '',
  },
  {
    route: 'Ahmedabad to Jaipur',
    date: 'Sat, 29 Jun',
    price: 'Rs 3,250',
    airline: 'Air India',
    type: '1 stop',
    deepLink: '',
  },
];

const TRAVEL_STAYS_SAMPLE = [
  {
    title: 'Sunset Bay Resort',
    subtitle: 'Goa',
    price: 'Rs 3,800 / night',
    rating: '4.7',
    imageUrl: 'https://images.unsplash.com/photo-1501117716987-c8e1ecb2100f?auto=format&fit=crop&w=800&q=80',
    badgeText: 'Popular',
    deepLink: '',
  },
  {
    title: 'Coastline Suites',
    subtitle: 'Kochi',
    price: 'Rs 2,950 / night',
    rating: '4.6',
    imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    badgeText: 'Weekend',
    deepLink: '',
  },
  {
    title: 'Bluewave Villas',
    subtitle: 'Bali',
    price: 'Rs 6,500 / night',
    rating: '4.9',
    imageUrl: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=800&q=80',
    badgeText: 'Luxury',
    deepLink: '',
  },
];

const TRAVEL_ITINERARIES_SAMPLE = [
  {
    title: 'Coastal Drive',
    subtitle: '4 days | Beaches, seafood trail, sunsets',
    iconName: 'map-outline',
    deepLink: '',
  },
  {
    title: 'Island Hopper',
    subtitle: '5 days | Snorkeling, stays, island tours',
    iconName: 'boat-outline',
    deepLink: '',
  },
  {
    title: 'Heritage Streets',
    subtitle: '3 days | Markets, cafes, cultural spots',
    iconName: 'business-outline',
    deepLink: '',
  },
];

const TRAVEL_TIPS_SAMPLE = [
  { text: 'Smart packing', iconName: 'briefcase-outline', deepLink: '' },
  { text: 'Budget hacks', iconName: 'cash-outline', deepLink: '' },
  { text: 'Local food', iconName: 'restaurant-outline', deepLink: '' },
  { text: 'Safety tips', iconName: 'shield-checkmark-outline', deepLink: '' },
];

const TRAVEL_BOOKINGS_SAMPLE = [
  {
    title: 'Goa Weekend Escape',
    meta: 'Hotel + flight',
    date: 'Jun 21 - Jun 24',
    status: 'Confirmed',
    deepLink: '',
  },
  {
    title: 'Bengaluru Work Trip',
    meta: 'Flight only',
    date: 'Jul 05 - Jul 07',
    status: 'Pending',
    deepLink: '',
  },
];

const MANUFACTURING_HERO_SAMPLE = {
  badgeText: 'Materials',
  title: 'Manufacturing Essentials',
  subtitle: 'Raw materials, equipment, tools, and verified industrial partners',
  ctaText: 'Explore',
  imageUrl: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1400&q=80',
  deepLink: '',
};

const MANUFACTURING_QUICK_ACTIONS_SAMPLE = [
  {
    title: 'Raise RFQ',
    subtitle: 'Quote in 24-48h',
    ctaText: 'Start RFQ',
    iconName: 'document-text-outline',
    deepLink: '',
  },
  {
    title: 'Find supplier',
    subtitle: 'Verified industrial partners',
    ctaText: 'Browse',
    iconName: 'search-outline',
    deepLink: '',
  },
  {
    title: 'Track order',
    subtitle: 'Live shipment status',
    ctaText: 'Track',
    iconName: 'navigate-outline',
    deepLink: '',
  },
];

const MANUFACTURING_CATEGORY_SAMPLE = [
  {
    title: 'Raw Materials',
    iconName: 'cube-outline',
    imageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Machinery',
    iconName: 'cog-outline',
    imageUrl: 'https://images.unsplash.com/photo-1581091012184-7a9d5c3b2d6a?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Packaging',
    iconName: 'archive-outline',
    imageUrl: 'https://images.unsplash.com/photo-1567016549637-3f7b14448666?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Chemicals',
    iconName: 'flask-outline',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'OEM Parts',
    iconName: 'hardware-chip-outline',
    imageUrl: 'https://images.unsplash.com/photo-1507477338202-487281e6c27e?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
  {
    title: 'Safety',
    iconName: 'shield-checkmark-outline',
    imageUrl: 'https://images.unsplash.com/photo-1581091215367-59c66f2b5b1b?auto=format&fit=crop&w=400&q=80',
    deepLink: '',
  },
];

const MANUFACTURING_SUPPLIERS_SAMPLE = [
  {
    title: 'ForgeWorks Industrial',
    subtitle: 'Pune, IN',
    badgeText: 'ISO 9001',
    businessType: 'CNC and castings',
    moq: 'MOQ 50',
    dispatch: 'Dispatch 24h',
    rating: '4.8',
    distance: '2.4 km',
    imageUrl: 'https://images.unsplash.com/photo-1581091012184-7a9d5c3b2d6a?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'MetraSteel Solutions',
    subtitle: 'Ahmedabad, IN',
    badgeText: 'MSME',
    businessType: 'Steel coils and sheets',
    moq: 'MOQ 20',
    dispatch: 'Dispatch 48h',
    rating: '4.7',
    distance: '4.1 km',
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
  {
    title: 'PackLine Pro',
    subtitle: 'Mumbai, IN',
    badgeText: 'Verified',
    businessType: 'Industrial packaging',
    moq: 'MOQ 100',
    dispatch: 'Dispatch 24h',
    rating: '4.6',
    distance: '6.8 km',
    imageUrl: 'https://images.unsplash.com/photo-1567016549637-3f7b14448666?auto=format&fit=crop&w=900&q=80',
    deepLink: '',
  },
];

const MANUFACTURING_STATS_SAMPLE = [
  { label: 'Active RFQs', value: '48', meta: 'Avg response 14h', tone: 'accent', iconName: 'stats-chart-outline' },
  { label: 'Verified suppliers', value: '1.2k', meta: 'ISO + MSME', tone: 'cool', iconName: 'shield-checkmark-outline' },
  { label: 'On-time delivery', value: '96%', meta: 'Last 30 days', tone: 'success', iconName: 'checkmark-done-outline' },
  { label: 'Avg lead time', value: '5.2d', meta: 'Down 12%', tone: 'accent', iconName: 'speedometer-outline' },
];

const MANUFACTURING_LIVE_PRICES_SAMPLE = [
  { label: 'Steel', price: '102.4/MT', change: '+1.8%', direction: 'up', deepLink: '' },
  { label: 'Aluminum', price: '2.1/kg', change: '-0.6%', direction: 'down', deepLink: '' },
  { label: 'Copper', price: '8.9/kg', change: '+0.9%', direction: 'up', deepLink: '' },
  { label: 'Resin', price: '1.3/kg', change: '+0.4%', direction: 'up', deepLink: '' },
];

const MANUFACTURING_RECENT_ORDERS_SAMPLE = [
  { title: 'CNC Machined Gears', supplier: 'ForgeWorks Industrial', eta: 'ETA 2 days', status: 'In Transit', deepLink: '' },
  { title: 'Packaging Pallets', supplier: 'PackLine Pro', eta: 'ETA 5 days', status: 'Processing', deepLink: '' },
  { title: 'Stainless Steel Sheets', supplier: 'MetraSteel Solutions', eta: 'Delivered yesterday', status: 'Delivered', deepLink: '' },
];

const MANUFACTURING_COMPLIANCE_SAMPLE = [
  { title: 'ISO 9001', subtitle: 'Quality systems', iconName: 'shield-checkmark-outline', deepLink: '' },
  { title: 'RoHS', subtitle: 'Material compliance', iconName: 'leaf-outline', deepLink: '' },
  { title: 'MSME Verified', subtitle: 'Vendor validation', iconName: 'business-outline', deepLink: '' },
  { title: 'Audit Ready', subtitle: 'Traceable lots', iconName: 'document-text-outline', deepLink: '' },
];

const buildManufacturingDefaultSections = (industryId) => [
  {
    id: 'manufacturing_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'manufacturing',
    enabled: true,
    items: [{ ...MANUFACTURING_HERO_SAMPLE }],
  },
  {
    id: 'manufacturing_quick_actions',
    type: 'horizontalList',
    blockType: 'quick_action_row',
    title: 'Quick actions',
    actionText: 'Manage',
    quickActionPreset: 'manufacturing',
    enabled: true,
    items: MANUFACTURING_QUICK_ACTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'manufacturing_stats_fixed',
    type: 'fixed',
    blockType: 'manufacturing_stats_fixed',
    title: 'Manufacturing stats',
    actionText: 'View dashboard',
    enabled: true,
    items: MANUFACTURING_STATS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'manufacturing_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Categories',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'manufacturing',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: MANUFACTURING_CATEGORY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'manufacturing_suppliers',
    type: 'horizontalList',
    blockType: 'shop_card_carousel',
    title: 'Featured suppliers',
    actionText: 'Explore',
    stylePreset: 'manufacturing',
    enabled: true,
    dataSource: {
      sourceType: 'MANUAL',
    },
    items: MANUFACTURING_SUPPLIERS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'manufacturing_rfq_banner',
    type: 'banner',
    blockType: 'promo_banner',
    stylePreset: 'manufacturing',
    title: 'Need vendor quotes?',
    text: 'Share specs and receive verified supplier responses in 24-48 hours.',
    actionText: 'Start RFQ',
    enabled: true,
    items: [],
  },
  {
    id: 'manufacturing_live_prices_fixed',
    type: 'fixed',
    blockType: 'manufacturing_live_prices_fixed',
    title: 'Live industry prices',
    actionText: 'Refresh',
    enabled: true,
    items: MANUFACTURING_LIVE_PRICES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'manufacturing_recent_orders_fixed',
    type: 'fixed',
    blockType: 'manufacturing_recent_orders_fixed',
    title: 'Recent orders',
    actionText: 'View all',
    enabled: true,
    items: MANUFACTURING_RECENT_ORDERS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'manufacturing_compliance',
    type: 'list',
    blockType: 'info_list',
    title: 'Compliance and quality',
    actionText: 'View reports',
    stylePreset: 'manufacturing',
    enabled: true,
    items: MANUFACTURING_COMPLIANCE_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildDecorDefaultSections = () => [
  {
    id: 'decor_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'decor',
    enabled: true,
    items: [{ ...DECOR_HERO_SAMPLE }],
  },
  {
    id: 'decor_quick_actions',
    type: 'horizontalList',
    blockType: 'quick_action_row',
    title: 'Quick actions',
    actionText: 'See all',
    quickActionPreset: 'decor',
    enabled: true,
    items: DECOR_QUICK_ACTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'decor_shop_by_room',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop by room',
    actionText: 'Browse',
    showcaseVariant: 'card',
    stylePreset: 'decor',
    enabled: true,
    items: DECOR_ROOM_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'decor_trending_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Trending categories',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'decor',
    enabled: true,
    items: DECOR_TRENDING_CATEGORIES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'decor_curated_collections',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Curated collections',
    actionText: 'View all',
    stylePreset: 'decor',
    cardVariant: 'stacked',
    enabled: true,
    items: DECOR_COLLECTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'decor_bestsellers',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Bestsellers',
    actionText: 'View all',
    stylePreset: 'decor',
    enabled: true,
    items: DECOR_BESTSELLERS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'decor_design_brief',
    type: 'banner',
    blockType: 'promo_banner',
    stylePreset: 'decor',
    title: 'Need a full room refresh?',
    text: 'Get a personalized mood board with matching decor.',
    actionText: 'Start a design brief',
    enabled: true,
    items: [],
  },
];

const buildAgricultureDefaultSections = (industryId) => [
  {
    id: 'agriculture_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'agriculture',
    enabled: true,
    items: [{ ...AGRICULTURE_HERO_SAMPLE }],
  },
  {
    id: 'agriculture_weather_fixed',
    type: 'fixed',
    blockType: 'agriculture_weather_fixed',
    title: 'Weather & forecast',
    actionText: '7 day view',
    enabled: true,
    items: AGRICULTURE_WEATHER_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'agriculture_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop crop categories',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'agriculture',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: AGRICULTURE_CATEGORY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'agriculture_seasonal_picks',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Seasonal picks',
    actionText: 'Explore',
    stylePreset: 'agriculture',
    enabled: true,
    items: AGRICULTURE_SEASONAL_PICKS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'agriculture_mandi_prices_fixed',
    type: 'fixed',
    blockType: 'agriculture_mandi_prices_fixed',
    title: 'Live mandi prices',
    actionText: 'Refresh',
    enabled: true,
    items: AGRICULTURE_MANDI_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'agriculture_tools',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Tools and equipment',
    actionText: 'View all',
    stylePreset: 'agriculture',
    enabled: true,
    items: AGRICULTURE_TOOLS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'agriculture_inputs',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Fertilizers and inputs',
    actionText: 'View all',
    stylePreset: 'agriculture',
    enabled: true,
    items: AGRICULTURE_INPUTS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'agriculture_suppliers',
    type: 'horizontalList',
    blockType: 'shop_card_carousel',
    title: 'Verified suppliers',
    actionText: 'View all',
    stylePreset: 'agriculture',
    actionMode: 'CALL_WHATSAPP',
    enabled: true,
    items: AGRICULTURE_SUPPLIERS_SAMPLE.map((item) => ({ ...item })),
  },
];

const FOOD_HERO_SAMPLE = {
  badgeText: 'Sponsored',
  title: 'Top-rated food spots and dishes near you',
  subtitle: 'Hot picks, cafe offers, and city favourites in one place.',
  ctaText: 'Explore now',
  imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80',
  deepLink: '',
};

const FOOD_QUICK_ACTIONS_SAMPLE = [
  { title: 'Near me', subtitle: 'Closest picks', ctaText: 'Explore', iconName: 'location-outline', deepLink: '' },
  { title: 'Open now', subtitle: 'Ready to serve', ctaText: 'Browse', iconName: 'time-outline', deepLink: '' },
  { title: 'Cafe vibe', subtitle: 'Coffee & brunch', ctaText: 'See cafes', iconName: 'cafe-outline', deepLink: '' },
  { title: 'Deals', subtitle: 'Live offers', ctaText: 'View deals', iconName: 'pricetag-outline', deepLink: '' },
];

const FOOD_VENUE_TYPES_SAMPLE = [
  { title: 'Restaurants', imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', iconName: 'restaurant-outline', deepLink: '' },
  { title: 'Cafes', imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80', iconName: 'cafe-outline', deepLink: '' },
  { title: 'Street Food', imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80', iconName: 'storefront-outline', deepLink: '' },
  { title: 'Cloud Kitchen', imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80', iconName: 'bag-handle-outline', deepLink: '' },
  { title: 'Bakery', imageUrl: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=800&q=80', iconName: 'nutrition-outline', deepLink: '' },
  { title: 'Desserts', imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', iconName: 'ice-cream-outline', deepLink: '' },
];

const FOOD_VIBE_SAMPLE = [
  { title: 'Budget friendly', imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80', iconName: 'wallet-outline', deepLink: '' },
  { title: 'Hangout spots', imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80', iconName: 'people-outline', deepLink: '' },
  { title: 'Date night', imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80', iconName: 'heart-outline', deepLink: '' },
  { title: 'Family dining', imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80', iconName: 'home-outline', deepLink: '' },
  { title: 'Late-night eats', imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80', iconName: 'moon-outline', deepLink: '' },
];

const FOOD_POPULAR_DISHES_SAMPLE = [
  {
    title: 'Truffle fries platter',
    subtitle: 'Cafe special',
    priceLine: 'Rs 249',
    mrpLine: 'Rs 329',
    rating: '4.7',
    sellerLine: 'Brew & Beans • Navrangpura',
    deliveryLabel: '20-25 min',
    badgeText: 'Popular',
    imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Butter cheese dosa',
    subtitle: 'Street favourite',
    priceLine: 'Rs 179',
    mrpLine: 'Rs 229',
    rating: '4.6',
    sellerLine: 'Ramesh Dosa • Law Garden',
    deliveryLabel: '15-20 min',
    badgeText: 'Bestseller',
    imageUrl: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Cold brew combo',
    subtitle: 'Cafe combo',
    priceLine: 'Rs 299',
    mrpLine: 'Rs 369',
    rating: '4.8',
    sellerLine: 'Secret Garden • Satellite',
    deliveryLabel: '25-30 min',
    badgeText: 'Limited',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const FOOD_SPECIALS_SAMPLE = [
  {
    title: 'Buy 1 Get 1 Pizza Slice',
    subtitle: 'Tonight only',
    businessName: 'Night Oven',
    price: 'Rs 199',
    oldPrice: 'Rs 299',
    badgeText: '50% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Weekend brunch set',
    subtitle: 'Flat combo price',
    businessName: 'Morning Table',
    price: 'Rs 349',
    oldPrice: 'Rs 459',
    badgeText: 'Save 110',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Dessert box offer',
    subtitle: 'Chef picks',
    businessName: 'Sugar Room',
    price: 'Rs 279',
    oldPrice: 'Rs 369',
    badgeText: 'Sweet deal',
    imageUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const FOOD_VENUES_NEARBY_SAMPLE = [
  {
    title: 'Brew & Beans Cafe',
    subtitle: 'Cafe • Navrangpura',
    rating: '4.6',
    distance: '1.2 km',
    verified: true,
    badgeText: 'Top Rated',
    businessType: 'Cafe',
    status: 'Open',
    phoneNumber: '+919876543210',
    whatsappNumber: '+919876543210',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Royal Gujarati Thali',
    subtitle: 'Restaurant • CG Road',
    rating: '4.5',
    distance: '2.3 km',
    verified: true,
    badgeText: 'Family favourite',
    businessType: 'Restaurant',
    status: 'Open',
    phoneNumber: '+919876543214',
    whatsappNumber: '+919876543214',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Sky Lounge & Bar',
    subtitle: 'Rooftop • SG Highway',
    rating: '4.5',
    distance: '4.2 km',
    verified: true,
    badgeText: 'Rooftop',
    businessType: 'Lounge',
    status: 'Open',
    phoneNumber: '+919876543219',
    whatsappNumber: '+919876543219',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const FOOD_STREET_LEGENDS_SAMPLE = [
  {
    title: 'Mahadev Sandwich',
    subtitle: 'Manek Chowk',
    rating: '4.9',
    distance: '3.5 km',
    verified: true,
    badgeText: 'Legendary',
    businessType: 'Street Food',
    status: 'Open',
    phoneNumber: '+919876543215',
    whatsappNumber: '+919876543215',
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Vipul Bhai Sandwich',
    subtitle: 'Law Garden',
    rating: '4.7',
    distance: '2.1 km',
    verified: true,
    badgeText: 'Late night',
    businessType: 'Street Food',
    status: 'Open',
    phoneNumber: '+919876543216',
    whatsappNumber: '+919876543216',
    imageUrl: 'https://images.unsplash.com/photo-1530554764233-e79e16c91d08?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
  {
    title: 'Kailash Khaman House',
    subtitle: 'Paldi',
    rating: '4.8',
    distance: '1.8 km',
    verified: true,
    badgeText: 'Iconic',
    businessType: 'Snacks',
    status: 'Open',
    phoneNumber: '+919876543217',
    whatsappNumber: '+919876543217',
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
    deepLink: '',
  },
];

const FOOD_AREA_GUIDE_SAMPLE = [
  { title: 'Manek Chowk', subtitle: 'Night food bazaar with iconic sandwiches and kulfi', badgeText: '120+ spots', imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80' },
  { title: 'Law Garden', subtitle: 'Street snacks, dosa stalls and evening crowd favourites', badgeText: '80+ spots', imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80' },
  { title: 'SG Highway', subtitle: 'Premium cafes, rooftop dining and late-night venues', badgeText: '60+ spots', imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80' },
];

const FOOD_CITY_DICTIONARY_SAMPLE = [
  { title: 'Butter cheese dosa', subtitle: 'Law Garden • Best after 7 PM', priceLine: 'Rs 120 - 220', imageUrl: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=800&q=80' },
  { title: 'Chocolate sandwich', subtitle: 'Manek Chowk • Night classic', priceLine: 'Rs 80 - 160', imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80' },
  { title: 'Loaded cold coffee', subtitle: 'Navrangpura • Cafe favourite', priceLine: 'Rs 140 - 240', imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80' },
];

const FOOD_PROMISES_SAMPLE = [
  { text: 'Verified places', iconName: 'shield-checkmark-outline' },
  { text: 'Live deals daily', iconName: 'pricetag-outline' },
  { text: 'Call & WhatsApp support', iconName: 'call-outline' },
  { text: 'Popular local picks', iconName: 'sparkles-outline' },
];

const buildFoodDefaultSections = () => [
  {
    id: 'food_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'food',
    enabled: true,
    items: [{ ...FOOD_HERO_SAMPLE }],
  },
  {
    id: 'food_quick_actions',
    type: 'horizontalList',
    blockType: 'quick_action_row',
    title: 'Quick actions',
    actionText: 'Explore',
    quickActionPreset: 'food',
    enabled: true,
    items: FOOD_QUICK_ACTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_venue_types',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Browse by venue type',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'food',
    enabled: true,
    items: FOOD_VENUE_TYPES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_vibes',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Browse by vibe',
    actionText: 'See all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'food',
    enabled: true,
    items: FOOD_VIBE_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_explore_experience_fixed',
    type: 'fixed',
    blockType: 'food_explore_experience_fixed',
    title: 'Explore by Experience',
    enabled: true,
    items: FOOD_VENUES_NEARBY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_popular_dishes',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Popular dishes',
    actionText: 'View all',
    stylePreset: 'food',
    enabled: true,
    items: FOOD_POPULAR_DISHES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_todays_specials',
    type: 'horizontalList',
    blockType: 'product_card_carousel',
    title: "Today's Specials",
    actionText: 'See all',
    stylePreset: 'food',
    enabled: true,
    items: FOOD_SPECIALS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_places_near_you',
    type: 'horizontalList',
    blockType: 'shop_card_carousel',
    title: 'Food Places Around You',
    actionText: 'View all',
    actionMode: 'CALL_WHATSAPP',
    stylePreset: 'food',
    enabled: true,
    items: FOOD_VENUES_NEARBY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_street_legends',
    type: 'horizontalList',
    blockType: 'shop_card_carousel',
    title: 'Street Food Legends',
    actionText: 'View all',
    actionMode: 'CALL_WHATSAPP',
    stylePreset: 'food',
    enabled: true,
    items: FOOD_STREET_LEGENDS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_area_guide_fixed',
    type: 'fixed',
    blockType: 'food_area_guide_fixed',
    title: 'Area Food Guide',
    enabled: true,
    items: FOOD_AREA_GUIDE_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_city_dictionary_fixed',
    type: 'fixed',
    blockType: 'food_city_dictionary_fixed',
    title: 'Famous Foods of the City',
    enabled: true,
    items: FOOD_CITY_DICTIONARY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'food_promises',
    type: 'horizontalList',
    blockType: 'chip_scroll',
    title: 'Food promises',
    actionText: 'Know more',
    stylePreset: 'food',
    enabled: true,
    items: FOOD_PROMISES_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildKidsDefaultSections = () => [
  {
    id: 'kids_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'kids',
    enabled: true,
    items: [{ ...KIDS_HERO_SAMPLE }],
  },
  {
    id: 'kids_quick_actions',
    type: 'horizontalList',
    blockType: 'quick_action_row',
    title: 'Quick actions',
    actionText: 'View all',
    quickActionPreset: 'kids',
    enabled: true,
    items: KIDS_QUICK_ACTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'kids_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop categories',
    actionText: 'Browse',
    showcaseVariant: 'circle_icon',
    stylePreset: 'kids',
    enabled: true,
    items: KIDS_CATEGORY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'kids_trending_toys',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Trending toys',
    actionText: 'View all',
    stylePreset: 'kids',
    enabled: true,
    items: KIDS_TRENDING_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'kids_learning',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Learning and creativity',
    actionText: 'Explore',
    stylePreset: 'kids',
    enabled: true,
    items: KIDS_LEARNING_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'kids_brands',
    type: 'horizontalList',
    blockType: 'brand_logo_grid',
    title: 'Top brands',
    stylePreset: 'kids',
    enabled: true,
    items: KIDS_BRANDS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'kids_outfit_picks',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Outfit picks',
    actionText: 'View all',
    stylePreset: 'kids',
    enabled: true,
    items: KIDS_OUTFIT_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'kids_parent_corner',
    type: 'list',
    blockType: 'info_list',
    title: 'Parent corner',
    actionText: 'See all',
    stylePreset: 'kids',
    enabled: true,
    items: KIDS_PARENT_TIPS_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildSportsDefaultSections = (industryId) => [
  {
    id: 'sports_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'sports',
    enabled: true,
    items: [{ ...SPORTS_HERO_SAMPLE }],
  },
  {
    id: 'sports_quick_actions',
    type: 'horizontalList',
    blockType: 'quick_action_row',
    title: 'Quick actions',
    actionText: 'View all',
    quickActionPreset: 'sports',
    enabled: true,
    items: SPORTS_QUICK_ACTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'sports_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop by sport',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'sports',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: SPORTS_CATEGORY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'sports_featured_gear',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Featured gear',
    actionText: 'View all',
    stylePreset: 'sports',
    enabled: true,
    items: SPORTS_FEATURED_GEAR_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'sports_live_matches_fixed',
    type: 'fixed',
    blockType: 'sports_live_matches_fixed',
    title: 'Live matches',
    actionText: 'View all',
    enabled: true,
    items: SPORTS_LIVE_MATCHES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'sports_training_plans',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Training plans',
    actionText: 'View all',
    stylePreset: 'sports',
    enabled: true,
    items: SPORTS_TRAINING_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'sports_nearby_arenas',
    type: 'horizontalList',
    blockType: 'shop_card_carousel',
    title: 'Nearby arenas',
    actionText: 'View all',
    stylePreset: 'sports',
    enabled: true,
    dataSource: {
      sourceType: 'MANUAL',
    },
    items: SPORTS_ARENAS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'sports_recovery_essentials',
    type: 'list',
    blockType: 'info_list',
    title: 'Recovery essentials',
    actionText: 'View all',
    stylePreset: 'sports',
    enabled: true,
    items: SPORTS_RECOVERY_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildTravelDefaultSections = (industryId) => [
  {
    id: 'travel_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'travel',
    enabled: true,
    items: [{ ...TRAVEL_HERO_SAMPLE }],
  },
  {
    id: 'travel_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Travel categories',
    actionText: 'View all',
    showcaseVariant: 'card',
    stylePreset: 'travel',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: TRAVEL_CATEGORY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'travel_top_destinations',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Top destinations',
    actionText: 'View all',
    stylePreset: 'travel',
    enabled: true,
    items: TRAVEL_DESTINATIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'travel_flight_deals_fixed',
    type: 'fixed',
    blockType: 'travel_flight_deals_fixed',
    title: 'Flight deals',
    actionText: 'See all',
    enabled: true,
    items: TRAVEL_FLIGHT_DEALS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'travel_hotel_stays',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Hotel stays',
    actionText: 'Explore',
    stylePreset: 'travel',
    enabled: true,
    items: TRAVEL_STAYS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'travel_itineraries',
    type: 'list',
    blockType: 'info_list',
    title: 'Itineraries',
    actionText: 'Plan',
    stylePreset: 'travel',
    enabled: true,
    items: TRAVEL_ITINERARIES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'travel_tips',
    type: 'horizontalList',
    blockType: 'chip_scroll',
    title: 'Travel tips',
    actionText: 'View all',
    stylePreset: 'travel',
    enabled: true,
    items: TRAVEL_TIPS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'travel_bookings_fixed',
    type: 'fixed',
    blockType: 'travel_bookings_fixed',
    title: 'Your bookings',
    actionText: 'Manage',
    enabled: true,
    items: TRAVEL_BOOKINGS_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildFitnessDefaultSections = () => [
  {
    id: 'fitness_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'fitness',
    enabled: true,
    items: [{ ...FITNESS_HERO_SAMPLE }],
  },
  {
    id: 'fitness_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop categories',
    actionText: 'View all',
    showcaseVariant: 'card',
    stylePreset: 'fitness',
    enabled: true,
    items: FITNESS_CATEGORY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fitness_progress_stats_fixed',
    type: 'fixed',
    blockType: 'fitness_progress_stats_fixed',
    title: 'Progress stats',
    actionText: 'View insights',
    enabled: true,
    items: FITNESS_PROGRESS_STATS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fitness_workouts',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Workouts',
    actionText: 'See all',
    stylePreset: 'fitness',
    enabled: true,
    items: FITNESS_WORKOUTS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fitness_class_schedule_fixed',
    type: 'fixed',
    blockType: 'fitness_class_schedule_fixed',
    title: 'Class schedule',
    actionText: 'Full schedule',
    enabled: true,
    items: FITNESS_CLASS_SCHEDULE_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fitness_top_trainers',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Top trainers',
    actionText: 'Meet all',
    stylePreset: 'fitness',
    enabled: true,
    items: FITNESS_TRAINERS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fitness_memberships_fixed',
    type: 'fixed',
    blockType: 'fitness_memberships_fixed',
    title: 'Memberships',
    actionText: 'Compare',
    enabled: true,
    items: FITNESS_MEMBERSHIPS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fitness_nutrition',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Nutrition plans',
    actionText: 'View plans',
    stylePreset: 'fitness',
    enabled: true,
    items: FITNESS_NUTRITION_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildServicesDefaultSections = (industryId) => [
  {
    id: 'services_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'services',
    enabled: true,
    items: [{ ...SERVICES_HERO_SAMPLE }],
  },
  {
    id: 'services_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Service categories',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'services',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: SERVICES_CATEGORY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'services_featured_professionals',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Featured professionals',
    actionText: 'View all',
    stylePreset: 'services',
    enabled: true,
    items: SERVICES_FEATURED_PROFESSIONALS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'services_booking_slots_fixed',
    type: 'fixed',
    blockType: 'services_booking_slots_fixed',
    title: 'Booking slots',
    actionText: 'Schedule',
    enabled: true,
    items: SERVICES_BOOKING_SLOTS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'services_government_services',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Government services',
    actionText: 'Explore',
    stylePreset: 'services',
    enabled: true,
    items: SERVICES_GOV_SERVICES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'services_government_offices',
    type: 'list',
    blockType: 'info_list',
    title: 'Government offices',
    actionText: 'View all',
    stylePreset: 'services',
    enabled: true,
    items: SERVICES_GOV_OFFICES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'services_advocate_spotlight',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'services',
    title: 'Advocate spotlight',
    enabled: true,
    items: [{ ...SERVICES_ADVOCATE_SPOTLIGHT_SAMPLE }],
  },
  {
    id: 'services_compliance',
    type: 'list',
    blockType: 'info_list',
    title: 'Compliance checklist',
    actionText: 'Manage',
    stylePreset: 'services',
    enabled: true,
    items: SERVICES_COMPLIANCE_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildMedicalDefaultSections = () => [
  {
    id: 'medical_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'medical',
    enabled: true,
    items: [{ ...MEDICAL_HERO_SAMPLE }],
  },
  {
    id: 'medical_category_grid_fixed',
    type: 'fixed',
    blockType: 'medical_category_grid_fixed',
    title: 'Shop medical categories',
    enabled: true,
    items: MEDICAL_CATEGORY_GRID_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_nearby_hospitals_fixed',
    type: 'fixed',
    blockType: 'medical_nearby_hospitals_fixed',
    title: 'Hospitals Near You',
    actionText: 'View all hospitals',
    enabled: true,
    items: MEDICAL_NEARBY_HOSPITALS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_top_doctors_fixed',
    type: 'fixed',
    blockType: 'medical_top_doctors_fixed',
    title: 'Consult Top Doctors',
    actionText: 'Book now',
    enabled: true,
    items: MEDICAL_TOP_DOCTORS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_trusted_medicines',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Trusted Medicines',
    actionText: 'View all',
    stylePreset: 'medical',
    enabled: true,
    items: MEDICAL_TRUSTED_MEDICINES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_skin_care',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Skin & Face Care',
    actionText: 'Explore skin care',
    stylePreset: 'medical',
    cardVariant: 'compact',
    enabled: true,
    items: MEDICAL_SKIN_CARE_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_lab_tests',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Book Lab Tests',
    actionText: 'Book test',
    stylePreset: 'medical',
    enabled: true,
    items: MEDICAL_LAB_TESTS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_health_packages',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'Health Checkup Packages',
    actionText: 'View packages',
    stylePreset: 'medical',
    enabled: true,
    items: MEDICAL_HEALTH_PACKAGES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_emergency_fixed',
    type: 'fixed',
    blockType: 'medical_emergency_fixed',
    title: 'Emergency Services',
    actionText: 'Call now',
    enabled: true,
    items: MEDICAL_EMERGENCY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_trust_strip_fixed',
    type: 'fixed',
    blockType: 'medical_trust_strip_fixed',
    title: 'Why Trust Us',
    enabled: true,
    items: MEDICAL_TRUST_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_health_tips',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Health Tips',
    actionText: 'Read more',
    stylePreset: 'medical',
    enabled: true,
    items: MEDICAL_HEALTH_TIPS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_reminder_fixed',
    type: 'fixed',
    blockType: 'medical_reminder_fixed',
    title: 'Never Miss Your Medicines',
    actionText: 'Set reminder',
    enabled: true,
    items: MEDICAL_REMINDER_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_offers_fixed',
    type: 'fixed',
    blockType: 'medical_offers_fixed',
    title: 'Offers for You',
    enabled: true,
    items: MEDICAL_OFFERS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'medical_footer_links_fixed',
    type: 'fixed',
    blockType: 'medical_footer_links_fixed',
    title: 'Quick Links',
    enabled: true,
    items: MEDICAL_FOOTER_LINKS_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildJewelleryDefaultSections = (industryId) => [
  {
    id: 'jewellery_hero',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'jewellery',
    enabled: true,
    items: [{ ...JEWELLERY_HERO_SAMPLE }],
  },
  {
    id: 'jewellery_quick_actions',
    type: 'horizontalList',
    blockType: 'quick_action_row',
    title: 'Quick actions',
    actionText: 'Manage',
    quickActionPreset: 'jewellery',
    enabled: true,
    items: JEWELLERY_QUICK_ACTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'jewellery_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop categories',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'jewellery',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: JEWELLERY_CATEGORY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'jewellery_collections',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Trending collections',
    actionText: 'Explore',
    stylePreset: 'jewellery',
    enabled: true,
    items: JEWELLERY_COLLECTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'jewellery_new_arrivals',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'New arrivals',
    actionText: 'View all',
    stylePreset: 'jewellery',
    enabled: true,
    items: JEWELLERY_NEW_ARRIVALS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'jewellery_gold_rates_fixed',
    type: 'fixed',
    blockType: 'jewellery_gold_rates_fixed',
    title: 'Gold rates today',
    actionText: 'Refresh',
    enabled: true,
    items: JEWELLERY_GOLD_RATES_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'jewellery_trust',
    type: 'list',
    blockType: 'info_list',
    title: 'Certified and secure',
    actionText: 'Learn more',
    stylePreset: 'jewellery',
    enabled: true,
    items: JEWELLERY_TRUST_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildBeautyDefaultSections = (industryId) => [
  {
    id: 'beauty_spotlight',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'beauty',
    enabled: true,
    items: [{ ...BEAUTY_HERO_SAMPLE }],
  },
  {
    id: 'beauty_quick_actions',
    type: 'horizontalList',
    blockType: 'quick_action_row',
    title: 'Quick actions',
    actionText: 'View all',
    quickActionPreset: 'beauty',
    enabled: true,
    items: BEAUTY_QUICK_ACTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'beauty_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop categories',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: [],
  },
  {
    id: 'beauty_trending',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Trending looks',
    actionText: 'Explore',
    stylePreset: 'beauty',
    enabled: true,
    items: BEAUTY_TRENDING_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'beauty_offer',
    type: 'banner',
    blockType: 'promo_banner',
    stylePreset: 'beauty',
    title: 'Beauty Friday',
    text: 'Up to 40% off skincare sets and bundles',
    actionText: 'Shop offers',
    sectionBgColor: '#E9C3B3',
    enabled: true,
  },
  {
    id: 'beauty_best_sellers',
    type: 'horizontalList',
    blockType: 'product_card_carousel',
    title: 'Best sellers',
    actionText: 'View all',
    stylePreset: 'beauty',
    enabled: true,
    items: BEAUTY_PRODUCT_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'beauty_routine',
    type: 'list',
    blockType: 'info_list',
    title: 'Build your routine',
    actionText: 'See all',
    stylePreset: 'beauty_routine',
    enabled: true,
    items: BEAUTY_ROUTINE_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'beauty_tips',
    type: 'horizontalList',
    blockType: 'chip_scroll',
    title: 'Beauty tips',
    actionText: 'Read',
    stylePreset: 'beauty',
    enabled: true,
    items: BEAUTY_TIPS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'beauty_salons',
    type: 'horizontalList',
    blockType: 'beauty_salon_carousel',
    title: 'Nearby salons',
    actionText: 'View all',
    enabled: true,
    items: BEAUTY_SALON_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildElectronicsDefaultSections = (industryId) => [
  {
    id: 'electronics_spotlight',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'electronics',
    enabled: true,
    items: [{ ...ELECTRONICS_HERO_SAMPLE }],
  },
  {
    id: 'electronics_quick_actions',
    type: 'horizontalList',
    blockType: 'quick_action_row',
    title: 'Quick actions',
    actionText: 'Manage',
    quickActionPreset: 'electronics',
    enabled: true,
    items: ELECTRONICS_QUICK_ACTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'electronics_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop categories',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'electronics',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: [],
  },
  {
    id: 'electronics_hot_deals',
    type: 'horizontalList',
    blockType: 'product_card_carousel',
    title: 'Hot deals',
    actionText: 'View all',
    stylePreset: 'electronics',
    enabled: true,
    items: ELECTRONICS_DEAL_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'electronics_brand_stores',
    type: 'horizontalList',
    blockType: 'media_overlay_carousel',
    title: 'Brand stores',
    actionText: 'Explore',
    stylePreset: 'electronics',
    enabled: true,
    items: ELECTRONICS_MEDIA_OVERLAY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'electronics_new_launches',
    type: 'list',
    blockType: 'info_list',
    title: 'New launches',
    actionText: 'See all',
    stylePreset: 'launch_rows',
    enabled: true,
    items: ELECTRONICS_LAUNCH_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'electronics_support',
    type: 'list',
    blockType: 'info_list',
    title: 'Service and support',
    actionText: 'Help desk',
    stylePreset: 'support_rows',
    enabled: true,
    items: ELECTRONICS_SUPPORT_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildGroceryDefaultSections = (industryId) => [
  {
    id: 'grocery_spotlight',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'grocery',
    enabled: true,
    items: [{ ...GROCERY_HERO_SAMPLE }],
  },
  {
    id: 'grocery_quick_info',
    type: 'horizontalList',
    blockType: 'chip_scroll',
    title: 'Why shop grocery',
    actionText: 'Explore',
    stylePreset: 'grocery',
    enabled: true,
    items: GROCERY_QUICK_INFO_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'grocery_secondary_offer',
    type: 'split_promo_row',
    blockType: 'split_promo_row',
    stylePreset: 'grocery',
    enabled: true,
    items: GROCERY_SPLIT_PROMOS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'grocery_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop by category',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'grocery',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: [],
  },
  {
    id: 'grocery_fresh_arrivals',
    type: 'horizontalList',
    blockType: 'product_card_carousel',
    title: 'Fresh arrivals',
    actionText: 'View all',
    stylePreset: 'grocery',
    cardVariant: 'grocery_fresh',
    enabled: true,
    items: GROCERY_FRESH_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'grocery_pantry_essentials',
    type: 'horizontalList',
    blockType: 'product_card_carousel',
    title: 'Pantry essentials',
    actionText: 'Stock up',
    stylePreset: 'grocery',
    cardVariant: 'grocery_pantry',
    enabled: true,
    items: GROCERY_PANTRY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'grocery_frequently_bought',
    type: 'horizontalList',
    blockType: 'product_card_carousel',
    title: 'Frequently bought',
    actionText: 'View all',
    stylePreset: 'grocery',
    cardVariant: 'grocery_compact',
    enabled: true,
    items: GROCERY_FREQUENT_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'grocery_shops_near_you',
    type: 'horizontalList',
    blockType: 'beauty_salon_carousel',
    title: 'Shops near you',
    actionText: 'View all',
    stylePreset: 'grocery',
    enabled: true,
    items: GROCERY_SHOPS_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildFashionDefaultSections = (industryId) => [
  {
    id: 'fashion_spotlight',
    type: 'banner',
    blockType: 'promo_hero_banner',
    stylePreset: 'fashion',
    enabled: true,
    items: [{ ...FASHION_HERO_SAMPLE }],
  },
  {
    id: 'fashion_quick_actions',
    type: 'horizontalList',
    blockType: 'quick_action_row',
    title: 'Offers',
    actionText: 'View all',
    quickActionPreset: 'fashion',
    enabled: true,
    items: FASHION_QUICK_ACTIONS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fashion_categories',
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: 'Shop categories',
    actionText: 'View all',
    showcaseVariant: 'circle_icon',
    stylePreset: 'fashion',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    items: [],
  },
  {
    id: 'fashion_style_edit',
    type: 'horizontalList',
    blockType: 'category_showcase',
    title: 'Shop by style',
    actionText: 'Explore',
    showcaseVariant: 'card',
    stylePreset: 'fashion',
    enabled: true,
    items: FASHION_STYLE_SHOWCASE_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fashion_trending',
    type: 'horizontalList',
    blockType: 'tabbed_product_shelf',
    title: 'Trending this week',
    stylePreset: 'fashion',
    enabled: true,
    items: FASHION_TABBED_PRODUCT_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fashion_new_arrivals',
    type: 'horizontalList',
    blockType: 'product_shelf_horizontal',
    title: 'New arrivals',
    actionText: 'View all',
    stylePreset: 'fashion',
    enabled: true,
    items: FASHION_NEW_ARRIVALS_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fashion_brand_stores',
    type: 'horizontalList',
    blockType: 'brand_logo_grid',
    title: 'Top brands near you',
    stylePreset: 'fashion',
    enabled: true,
    items: FASHION_BRAND_GRID_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fashion_why_buy',
    type: 'list',
    blockType: 'info_list',
    title: 'Why buy from us',
    actionText: 'See all',
    stylePreset: 'fashion',
    enabled: true,
    items: FASHION_WHY_BUY_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'fashion_shops_near_you',
    type: 'horizontalList',
    blockType: 'beauty_salon_carousel',
    title: 'Shops near you',
    actionText: 'View all',
    actionMode: 'CALL_WHATSAPP',
    stylePreset: 'fashion',
    enabled: true,
    items: FASHION_SHOPS_SAMPLE.map((item) => ({ ...item })),
  },
];

const buildAutomobileDefaultSections = (industryId) => {
  const scopedIndustryId = industryId ? String(industryId) : undefined;
  const automobileShelfItems = [
    {
      title: 'All-season radial tyre',
      price: '2,850',
      mrp: '3,240',
      rating: '4.8',
      tag: 'Workshop pick',
      moqLine: 'MOQ 4',
      summaryLine: 'Same-day dispatch | In stock | TorqueHub Ahmedabad',
      imageUrl: '',
      deepLink: '',
    },
    {
      title: 'Synthetic engine oil 5W-30',
      price: '1,199',
      mrp: '1,420',
      rating: '4.7',
      tag: 'Fast moving',
      moqLine: 'MOQ 12',
      summaryLine: 'Delivery in 2 hrs | In stock | Lubex Trade',
      imageUrl: '',
      deepLink: '',
    },
    {
      title: 'LED headlight upgrade kit',
      price: '2,099',
      mrp: '2,499',
      rating: '4.6',
      tag: 'Retail favourite',
      moqLine: 'MOQ 2',
      summaryLine: 'Ready to ship | In stock | Lumina Parts',
      imageUrl: '',
      deepLink: '',
    },
  ];

  return [
    {
      id: 'automobile_b2b2c_fixed',
      type: 'fixed',
      blockType: 'automobile_b2b2c_fixed',
      title: 'B2B & B2C Marketplace',
      enabled: true,
    },
    {
      id: 'automobile_fitment_fixed',
      type: 'fixed',
      blockType: 'automobile_fitment_fixed',
      title: 'Shop by vehicle',
      enabled: true,
    },
    {
      id: 'automobile_categories',
      type: 'category_showcase',
      blockType: 'category_showcase',
      title: 'Shop by category',
      actionText: 'View all',
      showcaseVariant: 'circle',
      stylePreset: 'automobile',
      enabled: true,
      dataSource: {
        sourceType: 'CATEGORY_FEED',
        industryId: scopedIndustryId,
      },
      items: [],
    },
    {
      id: 'automobile_trending',
      type: 'horizontalList',
      blockType: 'tabbed_product_shelf',
      title: 'Trending this week',
      actionText: 'View all',
      stylePreset: 'automobile',
      enabled: true,
      items: [],
      dataSource: {
        sourceType: 'PRODUCT_FEED',
        feedMode: 'TRENDING',
        industryId: scopedIndustryId,
        tabField: 'mainCategoryName',
        limit: 8,
      },
    },
    {
      id: 'automobile_sellers_near_you',
      type: 'horizontalList',
      blockType: 'shop_card_carousel',
      title: 'Sellers near you',
      actionText: 'View all',
      actionMode: 'CALL_WHATSAPP',
      stylePreset: 'automobile',
      enabled: true,
      items: [],
      dataSource: {
        sourceType: 'SHOP_FEED',
        industryId: scopedIndustryId,
        limit: 8,
      },
    },
    {
      id: 'automobile_recommended',
      type: 'horizontalList',
      blockType: 'product_shelf_horizontal',
      title: 'Recommended for workshops',
      actionText: 'View all',
      stylePreset: 'automobile',
      enabled: true,
      items: automobileShelfItems.map((item) => ({ ...item })),
    },
    {
      id: 'automobile_top_brands',
      type: 'horizontalList',
      blockType: 'brand_logo_grid',
      title: 'Top brands',
      stylePreset: 'automobile',
      enabled: true,
      items: [
        { title: 'TorquePro', subtitle: 'Tyres & workshop kits', imageUrl: '', imageShellBg: '#F3F4F6', deepLink: '' },
        { title: 'RoadMate', subtitle: 'Lighting and touring gear', imageUrl: '', imageShellBg: '#FFF7ED', deepLink: '' },
        { title: 'VoltEdge', subtitle: 'Batteries and chargers', imageUrl: '', imageShellBg: '#ECFDF5', deepLink: '' },
      ],
    },
    {
      id: 'automobile_deals',
      type: 'horizontalList',
      blockType: 'product_card_carousel',
      title: 'Deals of the day',
      actionText: 'View all',
      stylePreset: 'automobile',
      enabled: true,
      items: [
        { title: 'Brake pad combo', subtitle: 'Bulk slab pricing', price: 'From 899', deepLink: '' },
        { title: 'Bike care essentials', subtitle: 'Retail counter pack', price: 'From 499', deepLink: '' },
        { title: 'Wiper + washer bundle', subtitle: 'Fast moving SKU', price: 'From 299', deepLink: '' },
      ],
    },
    {
      id: 'automobile_promises',
      type: 'horizontalList',
      blockType: 'chip_scroll',
      title: 'Why buy automobile',
      actionText: 'Explore',
      stylePreset: 'automobile',
      enabled: true,
      items: [
        { text: 'Same-day dispatch' },
        { text: 'GST invoice' },
        { text: 'Bulk quote support' },
        { text: 'Fitment guidance' },
      ],
    },
    {
      id: 'automobile_services',
      type: 'horizontalList',
      blockType: 'shop_card_carousel',
      title: 'Services near you',
      actionText: 'View all',
      actionMode: 'CALL_WHATSAPP',
      cardVariant: 'compact',
      stylePreset: 'automobile',
      enabled: true,
      items: [
        { title: 'Tyre fitment', subtitle: 'SG Highway', rating: '4.8', distance: '2.3 km', imageUrl: '', deepLink: '' },
        { title: 'Battery service', subtitle: 'Prahlad Nagar', rating: '4.6', distance: '3.1 km', imageUrl: '', deepLink: '' },
        { title: 'Detailing studio', subtitle: 'Satellite', rating: '4.7', distance: '4.4 km', imageUrl: '', deepLink: '' },
      ],
    },
    {
      id: 'automobile_bulk_deals',
      type: 'banner',
      blockType: 'promo_banner',
      title: 'Bulk workshop deals',
      text: 'Tyres, oils and fast-moving SKUs with trade-first pricing.',
      actionText: 'Request quote',
      stylePreset: 'automobile',
      sectionBgColor: '#0F172A',
      enabled: true,
      items: [
        { text: 'Bulk pricing from 25 units' },
        { text: 'Dedicated account manager' },
        { text: 'Fast dispatch across city hubs' },
      ],
    },
    {
      id: 'automobile_recently_viewed',
      type: 'horizontalList',
      blockType: 'product_shelf_horizontal',
      title: 'Recently viewed',
      actionText: 'View all',
      stylePreset: 'automobile',
      enabled: true,
      items: automobileShelfItems.map((item) => ({ ...item })),
    },
  ];
};

export const screenToolboxItems = [
  // ── Banners & Heroes ────────────────────────────────────────────────────
  {
    key: 'heroBanner',
    label: 'Hero Banner',
    hint: 'Full-width image banner with tap destination',
    section: {
      id: 'hero_banner',
      type: 'banner',
      blockType: 'heroBanner',
      title: '',
      imageUrl: '',
      aspectRatio: '2:1',
      deepLink: '',
    },
  },
  {
    key: 'heroCarousel',
    label: 'Hero Carousel',
    hint: 'Swipeable full-width campaign slides',
    section: {
      id: 'hero_carousel',
      type: 'carousel',
      blockType: 'hero_carousel',
      title: 'Spotlight deals',
      items: [
        { title: 'Hero 1', imageUrl: '', deepLink: '' },
        { title: 'Hero 2', imageUrl: '', deepLink: '' },
      ],
    },
  },
  {
    key: 'promoHeroBanner',
    label: 'Promo Hero Banner',
    hint: 'Image with overlay title, subtitle, badge and CTA button',
    section: {
      id: 'promo_hero_banner',
      type: 'banner',
      blockType: 'promo_hero_banner',
      stylePreset: 'electronics',
      items: [{ ...ELECTRONICS_HERO_SAMPLE }],
    },
  },
  {
    key: 'promoBanner',
    label: 'Promo Text Banner',
    hint: 'Coloured banner with title, body text and CTA — no image needed',
    section: {
      id: 'promo_banner',
      type: 'banner',
      blockType: 'promo_banner',
      title: 'Sale is live',
      text: 'Up to 40% off on selected items',
      actionText: 'Shop offers',
      actionLink: '',
      stylePreset: '',
      sectionBgColor: '#fce7f3',
    },
  },
  {
    key: 'automobileMarketplaceFixed',
    label: 'Automobile B2B/B2C',
    hint: 'Hardcoded automobile marketplace section placeholder for CMS ordering',
    section: {
      id: 'automobile_b2b2c_fixed',
      type: 'fixed',
      blockType: 'automobile_b2b2c_fixed',
      title: 'B2B & B2C Marketplace',
      enabled: true,
    },
  },
  {
    key: 'automobileFitmentFixed',
    label: 'Automobile Fitment',
    hint: 'Hardcoded vehicle fitment placeholder for CMS ordering',
    section: {
      id: 'automobile_fitment_fixed',
      type: 'fixed',
      blockType: 'automobile_fitment_fixed',
      title: 'Shop by vehicle',
      enabled: true,
    },
  },
  {
    key: 'agricultureWeatherFixed',
    label: 'Agriculture Weather',
    hint: 'Hardcoded agriculture weather placeholder for CMS ordering',
    section: {
      id: 'agriculture_weather_fixed',
      type: 'fixed',
      blockType: 'agriculture_weather_fixed',
      title: 'Weather & forecast',
      actionText: '7 day view',
      enabled: true,
      items: AGRICULTURE_WEATHER_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'agricultureMandiPricesFixed',
    label: 'Agriculture Mandi Prices',
    hint: 'Hardcoded mandi prices placeholder for CMS ordering',
    section: {
      id: 'agriculture_mandi_prices_fixed',
      type: 'fixed',
      blockType: 'agriculture_mandi_prices_fixed',
      title: 'Live mandi prices',
      actionText: 'Refresh',
      enabled: true,
      items: AGRICULTURE_MANDI_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'sportsLiveMatchesFixed',
    label: 'Sports Live Matches',
    hint: 'Hardcoded sports live matches placeholder for CMS ordering',
    section: {
      id: 'sports_live_matches_fixed',
      type: 'fixed',
      blockType: 'sports_live_matches_fixed',
      title: 'Live matches',
      actionText: 'View all',
      enabled: true,
      items: SPORTS_LIVE_MATCHES_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'travelFlightDealsFixed',
    label: 'Travel Flight Deals',
    hint: 'Hardcoded travel flight deals placeholder for CMS ordering',
    section: {
      id: 'travel_flight_deals_fixed',
      type: 'fixed',
      blockType: 'travel_flight_deals_fixed',
      title: 'Flight deals',
      actionText: 'See all',
      enabled: true,
      items: TRAVEL_FLIGHT_DEALS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'travelBookingsFixed',
    label: 'Travel Bookings',
    hint: 'Hardcoded travel bookings placeholder for CMS ordering',
    section: {
      id: 'travel_bookings_fixed',
      type: 'fixed',
      blockType: 'travel_bookings_fixed',
      title: 'Your bookings',
      actionText: 'Manage',
      enabled: true,
      items: TRAVEL_BOOKINGS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'foodExploreExperienceFixed',
    label: 'Food Explore by Experience',
    hint: 'Hardcoded explore by experience placeholder for CMS ordering',
    section: {
      id: 'food_explore_experience_fixed',
      type: 'fixed',
      blockType: 'food_explore_experience_fixed',
      title: 'Explore by Experience',
      actionText: 'View all',
      enabled: true,
      items: FOOD_VENUES_NEARBY_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'foodAreaGuideFixed',
    label: 'Food Area Guide',
    hint: 'Hardcoded area food guide placeholder for CMS ordering',
    section: {
      id: 'food_area_guide_fixed',
      type: 'fixed',
      blockType: 'food_area_guide_fixed',
      title: 'Area Food Guide',
      actionText: 'See all',
      enabled: true,
      items: FOOD_AREA_GUIDE_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'foodCityDictionaryFixed',
    label: 'Food City Dictionary',
    hint: 'Hardcoded famous foods placeholder for CMS ordering',
    section: {
      id: 'food_city_dictionary_fixed',
      type: 'fixed',
      blockType: 'food_city_dictionary_fixed',
      title: 'Famous Foods of the City',
      actionText: 'Explore',
      enabled: true,
      items: FOOD_CITY_DICTIONARY_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'manufacturingStatsFixed',
    label: 'Manufacturing Stats',
    hint: 'Hardcoded manufacturing stats placeholder for CMS ordering',
    section: {
      id: 'manufacturing_stats_fixed',
      type: 'fixed',
      blockType: 'manufacturing_stats_fixed',
      title: 'Manufacturing stats',
      actionText: 'View dashboard',
      enabled: true,
      items: MANUFACTURING_STATS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'manufacturingLivePricesFixed',
    label: 'Manufacturing Live Prices',
    hint: 'Hardcoded manufacturing live prices placeholder for CMS ordering',
    section: {
      id: 'manufacturing_live_prices_fixed',
      type: 'fixed',
      blockType: 'manufacturing_live_prices_fixed',
      title: 'Live industry prices',
      actionText: 'Refresh',
      enabled: true,
      items: MANUFACTURING_LIVE_PRICES_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'manufacturingRecentOrdersFixed',
    label: 'Manufacturing Recent Orders',
    hint: 'Hardcoded manufacturing recent orders placeholder for CMS ordering',
    section: {
      id: 'manufacturing_recent_orders_fixed',
      type: 'fixed',
      blockType: 'manufacturing_recent_orders_fixed',
      title: 'Recent orders',
      actionText: 'View all',
      enabled: true,
      items: MANUFACTURING_RECENT_ORDERS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'medicalCategoryGridFixed',
    label: 'Medical Category Grid',
    hint: 'Hardcoded medical category grid placeholder for CMS ordering',
    section: {
      id: 'medical_category_grid_fixed',
      type: 'fixed',
      blockType: 'medical_category_grid_fixed',
      title: 'Shop medical categories',
      enabled: true,
      items: MEDICAL_CATEGORY_GRID_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'medicalNearbyHospitalsFixed',
    label: 'Medical Nearby Hospitals',
    hint: 'Hardcoded hospitals near you placeholder for CMS ordering',
    section: {
      id: 'medical_nearby_hospitals_fixed',
      type: 'fixed',
      blockType: 'medical_nearby_hospitals_fixed',
      title: 'Hospitals Near You',
      actionText: 'View all hospitals',
      enabled: true,
      items: MEDICAL_NEARBY_HOSPITALS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'medicalTopDoctorsFixed',
    label: 'Medical Top Doctors',
    hint: 'Hardcoded top doctors placeholder for CMS ordering',
    section: {
      id: 'medical_top_doctors_fixed',
      type: 'fixed',
      blockType: 'medical_top_doctors_fixed',
      title: 'Consult Top Doctors',
      actionText: 'Book now',
      enabled: true,
      items: MEDICAL_TOP_DOCTORS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'medicalEmergencyFixed',
    label: 'Medical Emergency',
    hint: 'Hardcoded emergency services placeholder for CMS ordering',
    section: {
      id: 'medical_emergency_fixed',
      type: 'fixed',
      blockType: 'medical_emergency_fixed',
      title: 'Emergency Services',
      actionText: 'Call now',
      enabled: true,
      items: MEDICAL_EMERGENCY_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'medicalTrustStripFixed',
    label: 'Medical Trust Strip',
    hint: 'Hardcoded medical trust strip placeholder for CMS ordering',
    section: {
      id: 'medical_trust_strip_fixed',
      type: 'fixed',
      blockType: 'medical_trust_strip_fixed',
      title: 'Why Trust Us',
      enabled: true,
      items: MEDICAL_TRUST_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'medicalReminderFixed',
    label: 'Medical Reminder',
    hint: 'Hardcoded medical reminder placeholder for CMS ordering',
    section: {
      id: 'medical_reminder_fixed',
      type: 'fixed',
      blockType: 'medical_reminder_fixed',
      title: 'Never Miss Your Medicines',
      actionText: 'Set reminder',
      enabled: true,
      items: MEDICAL_REMINDER_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'medicalOffersFixed',
    label: 'Medical Offers',
    hint: 'Hardcoded medical offers placeholder for CMS ordering',
    section: {
      id: 'medical_offers_fixed',
      type: 'fixed',
      blockType: 'medical_offers_fixed',
      title: 'Offers for You',
      enabled: true,
      items: MEDICAL_OFFERS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'medicalFooterLinksFixed',
    label: 'Medical Footer Links',
    hint: 'Hardcoded medical quick links placeholder for CMS ordering',
    section: {
      id: 'medical_footer_links_fixed',
      type: 'fixed',
      blockType: 'medical_footer_links_fixed',
      title: 'Quick Links',
      enabled: true,
      items: MEDICAL_FOOTER_LINKS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'fitnessProgressStatsFixed',
    label: 'Fitness Progress Stats',
    hint: 'Hardcoded fitness progress stats placeholder for CMS ordering',
    section: {
      id: 'fitness_progress_stats_fixed',
      type: 'fixed',
      blockType: 'fitness_progress_stats_fixed',
      title: 'Progress stats',
      actionText: 'View insights',
      enabled: true,
      items: FITNESS_PROGRESS_STATS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'fitnessClassScheduleFixed',
    label: 'Fitness Class Schedule',
    hint: 'Hardcoded fitness class schedule placeholder for CMS ordering',
    section: {
      id: 'fitness_class_schedule_fixed',
      type: 'fixed',
      blockType: 'fitness_class_schedule_fixed',
      title: 'Class schedule',
      actionText: 'Full schedule',
      enabled: true,
      items: FITNESS_CLASS_SCHEDULE_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'fitnessMembershipsFixed',
    label: 'Fitness Memberships',
    hint: 'Hardcoded fitness memberships placeholder for CMS ordering',
    section: {
      id: 'fitness_memberships_fixed',
      type: 'fixed',
      blockType: 'fitness_memberships_fixed',
      title: 'Memberships',
      actionText: 'Compare',
      enabled: true,
      items: FITNESS_MEMBERSHIPS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'servicesBookingSlotsFixed',
    label: 'Services Booking Slots',
    hint: 'Hardcoded services booking slots placeholder for CMS ordering',
    section: {
      id: 'services_booking_slots_fixed',
      type: 'fixed',
      blockType: 'services_booking_slots_fixed',
      title: 'Booking slots',
      actionText: 'Schedule',
      enabled: true,
      items: SERVICES_BOOKING_SLOTS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'jewelleryGoldRatesFixed',
    label: 'Jewellery Gold Rates',
    hint: 'Hardcoded jewellery gold rates placeholder for CMS ordering',
    section: {
      id: 'jewellery_gold_rates_fixed',
      type: 'fixed',
      blockType: 'jewellery_gold_rates_fixed',
      title: 'Gold rates today',
      actionText: 'Refresh',
      enabled: true,
      items: JEWELLERY_GOLD_RATES_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'splitPromoRow',
    label: 'Split Promo Row',
    hint: 'Two side-by-side promo cards in one row',
    section: {
      id: 'split_promo_row',
      type: 'split_promo_row',
      blockType: 'split_promo_row',
      stylePreset: 'grocery',
      items: GROCERY_SPLIT_PROMOS_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'campaignBento',
    label: 'Campaign Bento',
    hint: 'Header image + hero banner + 4 quick-link tiles',
    section: {
      id: 'campaign_bento',
      type: 'campaignBento',
      blockType: 'campaignBento',
      title: 'Skin-safe herbal gulal',
      sectionBgColor: '',
      stylePreset: '',
      headerImage: '',
      hero: { imageUrl: '', deepLink: '', label: '' },
      tiles: Array.from({ length: 4 }, () => ({ imageUrl: '', deepLink: '', label: '' })),
    },
  },

  // ── Product Blocks ───────────────────────────────────────────────────────
  {
    key: 'productCardCarousel',
    label: 'Product Cards',
    hint: 'Horizontal scrollable product cards — supports live feed or manual items',
    section: {
      id: 'product_card_carousel',
      type: 'horizontalList',
      blockType: 'product_card_carousel',
      title: 'Hot deals',
      actionText: 'View all',
      stylePreset: 'electronics',
      items: ELECTRONICS_DEAL_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'tabbedProductShelf',
    label: 'Tabbed Product Shelf',
    hint: 'Product cards grouped into tabs (e.g. Men / Women / Kids) — supports live feed',
    section: {
      id: 'tabbed_product_shelf',
      blockType: 'tabbed_product_shelf',
      title: 'Trending This Week',
      enabled: true,
      items: [],
      dataSource: { sourceType: 'MANUAL' },
    },
  },
  {
    key: 'productShelf',
    label: 'Product Shelf',
    hint: 'Horizontal product list showing price and Add-to-cart button',
    section: {
      id: 'product_shelf_horizontal',
      type: 'horizontalList',
      blockType: 'product_shelf_horizontal',
      title: 'Lowest prices ever',
      itemsPath: '$.products',
      dataSourceRef: 'home_top_selling_products',
    },
  },
  {
    key: 'productGrid',
    label: 'Product Grid',
    hint: '3-column live product grid — pulls from a feed endpoint',
    section: {
      id: 'multi_item_grid',
      type: 'grid',
      blockType: 'multiItemGrid',
      title: 'Frequently bought',
      productFeedMode: 'FREQUENTLY_BOUGHT',
      dataSourceRef: 'home_frequently_bought_products',
      itemsPath: '$.products',
      columns: 3,
      productLimit: 9,
    },
  },
  {
    key: 'featuredCards',
    label: 'Featured Cards',
    hint: 'Horizontal cards with badge and subtitle — great for festive highlights',
    section: {
      id: 'featured_cards',
      type: 'horizontalList',
      blockType: 'horizontal_scroll_list',
      title: 'Featured this week',
      items: [
        { title: '', subtitle: 'For you', badgeText: 'Newly launched', imageUrl: '', deepLink: '' },
        { title: 'Gujiya', badgeText: 'Festive finds', imageUrl: '', deepLink: '' },
        { title: 'Thandai', badgeText: 'Festive finds', imageUrl: '', deepLink: '' },
      ],
    },
  },

  // ── Category & Brand ─────────────────────────────────────────────────────
  {
    key: 'categoryIconGrid',
    label: 'Category Icon Grid',
    hint: '4-column category icons — auto-fetched from industry',
    section: {
      id: 'category_icon_grid',
      type: 'grid',
      blockType: 'category_icon_grid',
      title: '',
      dataSource: {
        sourceType: 'CATEGORY_FEED',
        mode: 'MAIN_CATEGORY',
        limit: 8,
      },
      items: [],
    },
  },
  {
    key: 'categoryShowcase',
    label: 'Category Showcase',
    hint: 'Circular or square category bubbles — auto-fetched from industry',
    section: {
      id: 'category_showcase',
      type: 'category_showcase',
      blockType: 'category_showcase',
      title: '',
      actionText: 'View all',
      actionLink: '',
      showcaseVariant: 'circle',
      dataSource: { sourceType: 'CATEGORY_FEED', mode: 'MAIN_CATEGORY', limit: 8 },
      sduiItems: [],
    },
  },
  {
    key: 'categoryPreviewGrid',
    label: 'Category Preview Grid',
    hint: 'Large 2-column category cards with image preview',
    section: {
      id: 'category_preview_grid',
      type: 'grid',
      blockType: 'categoryPreviewGrid',
      title: 'Frequently bought',
      collectionIds: [],
      itemsPath: '$.categories',
      columns: 2,
    },
  },
  {
    key: 'columnGrid',
    label: 'Column Grid',
    hint: '3-column cards with dual images — supports category feed or manual items',
    section: {
      id: 'column_grid',
      type: 'grid',
      blockType: 'column_grid',
      title: 'Festive finds',
      sectionBgColor: '#f5f0dc',
      cardBgColor: '#9ad8f8',
      columnTopLineStyle: 'curve',
      dataSource: {
        sourceType: 'CATEGORY_FEED',
        mode: 'TOP_SELLING',
        limit: 8,
        rankingWindowDays: 30,
        sortBy: 'MANUAL_RANK',
        filters: { activeOnly: true, hasImageOnly: true },
      },
      mapping: {
        titleField: 'name',
        imageField: 'imageUrl',
        secondaryImageField: 'categoryImage',
        deepLinkTemplate: 'app://category/{id}',
      },
      items: [
        { title: 'T-shirts & Mobile Pouch', imageUrl: '', secondaryImageUrl: '', deepLink: '' },
        { title: 'Holika Dahan', imageUrl: '', secondaryImageUrl: '', deepLink: '' },
        { title: 'Gujiya Mould & Ingredients', imageUrl: '', secondaryImageUrl: '', deepLink: '' },
      ],
    },
  },
  {
    key: 'brandShowcase',
    label: 'Brand Showcase',
    hint: 'Automobile-style horizontal brand cards with optional live industry feed',
    section: {
      id: 'brand_showcase',
      type: 'horizontalList',
      blockType: 'brand_logo_grid',
      title: 'Top Brands',
      stylePreset: 'automobile',
      enabled: true,
      dataSource: {
        sourceType: 'BRAND_FEED',
        limit: 8,
      },
      items: [
        { title: 'Brand Name', subtitle: 'Industry brand', imageUrl: '', imageShellBg: '#F3F4F6', deepLink: '' },
        { title: 'Brand Name', subtitle: 'Industry brand', imageUrl: '', imageShellBg: '#FFF3E0', deepLink: '' },
        { title: 'Brand Name', subtitle: 'Industry brand', imageUrl: '', imageShellBg: '#E8F5E9', deepLink: '' },
      ],
    },
  },
  {
    key: 'brandLogoCarousel',
    label: 'Brand Logo Carousel',
    hint: 'Horizontal scrolling brand cards with logo + name + tagline (Automobile style)',
    section: {
      id: 'brand_logo_carousel',
      type: 'horizontalList',
      blockType: 'brand_logo_grid',
      title: 'Top Brands',
      stylePreset: 'automobile',
      enabled: true,
      items: [
        { title: 'Brand Name', subtitle: 'Tagline here', imageUrl: '', imageShellBg: '#F3F4F6', deepLink: '' },
        { title: 'Brand Name', subtitle: 'Tagline here', imageUrl: '', imageShellBg: '#FFF3E0', deepLink: '' },
        { title: 'Brand Name', subtitle: 'Tagline here', imageUrl: '', imageShellBg: '#E8F5E9', deepLink: '' },
      ],
    },
  },
  {
    key: 'mediaOverlayCarousel',
    label: 'Media Overlay Cards',
    hint: 'Horizontal image cards with title/subtitle text overlay',
    section: {
      id: 'media_overlay_carousel',
      type: 'horizontalList',
      blockType: 'media_overlay_carousel',
      title: 'Brand stores',
      actionText: 'Explore',
      stylePreset: 'electronics',
      items: ELECTRONICS_MEDIA_OVERLAY_SAMPLE.map((item) => ({ ...item })),
    },
  },

  // ── Business / Shops ─────────────────────────────────────────────────────
  {
    key: 'shopsNearYou',
    label: 'Shops Near You',
    hint: 'Detailed shop cards with chips and 3 action buttons — fetches live by location',
    section: {
      id: 'shop_card_carousel',
      blockType: 'shop_card_carousel',
      title: 'Shops Near You',
      enabled: true,
      dataSource: { sourceType: 'SHOP_FEED' },
    },
  },

  // ── Actions & Navigation ─────────────────────────────────────────────────
  {
    key: 'quickActions',
    label: 'Quick Actions',
    hint: 'Row of shortcut action cards (e.g. New Order, My Cart)',
    section: {
      id: 'quick_actions',
      type: 'horizontalList',
      blockType: 'quick_action_row',
      title: 'Quick actions',
      actionText: 'Manage',
      quickActionPreset: 'electronics',
      items: ELECTRONICS_QUICK_ACTIONS_SAMPLE,
    },
  },
  {
    key: 'fashionQuickActions',
    label: 'Quick Actions (Fashion)',
    hint: 'Quick action cards in warm brown fashion palette',
    section: {
      id: 'fashion_quick_actions',
      type: 'horizontalList',
      blockType: 'quick_action_row',
      title: 'Offers',
      actionText: 'View all',
      quickActionPreset: 'fashion',
      items: FASHION_QUICK_ACTIONS_SAMPLE,
    },
  },
  {
    key: 'chipScroll',
    label: 'Chip Scroll',
    hint: 'Horizontal scrolling pill tags — great for tips, filters or topic links',
    section: {
      id: 'chip_scroll',
      type: 'horizontalList',
      blockType: 'chip_scroll',
      title: 'Tips & ideas',
      actionText: 'Read',
      actionLink: '',
      sduiItems: [
        { text: 'SPF daily', deepLink: '' },
        { text: 'Hydrate inside out', deepLink: '' },
        { text: 'Gentle exfoliation', deepLink: '' },
      ],
    },
  },

  // ── Content & Layout ─────────────────────────────────────────────────────
  {
    key: 'infoList',
    label: 'Info List',
    hint: 'Stacked rows with icon, title, subtitle and optional price or value',
    section: {
      id: 'info_list',
      type: 'list',
      blockType: 'info_list',
      title: 'New launches',
      actionText: 'See all',
      stylePreset: 'launch_rows',
      items: ELECTRONICS_LAUNCH_SAMPLE.map((item) => ({ ...item })),
    },
  },
  {
    key: 'iconList',
    label: 'Icon List',
    hint: 'Vertical list rows with icon, title and subtitle',
    section: {
      id: 'icon_list',
      type: 'list',
      blockType: 'icon_list',
      title: 'Build your routine',
      actionText: 'See all',
      actionLink: '',
      sduiItems: [
        { iconUrl: '', title: 'Step 1', subtitle: 'Description', deepLink: '' },
        { iconUrl: '', title: 'Step 2', subtitle: 'Description', deepLink: '' },
      ],
    },
  },
  {
    key: 'sectionTitle',
    label: 'Section Title',
    hint: 'Standalone heading text between sections',
    section: { id: 'section_title', type: 'title', blockType: 'sectionTitle', text: 'Frequently bought' },
  },
];

export const toolboxItems = [...headerToolboxItems, ...screenToolboxItems];

export const blockLabels = {
  addressHeader: 'Address Header Block',
  searchBar: 'Search Bar Block',
  horizontalPills: 'Horizontal Pills Block',
  heroBanner: 'Image Hero Banner',
  hero_carousel: 'Hero Carousel Block',
  promo_hero_banner: 'Promo Hero Banner',
  split_promo_row: 'Split Promo Row',
  horizontal_scroll_list: 'Featured Cards Block',
  quick_action_row: 'Quick Action Row',
  column_grid: 'Festive Column Grid',
  category_icon_grid: 'Category Icon Grid',
  brand_logo_grid: 'Brand Showcase',
  media_overlay_carousel: 'Media Overlay Carousel',
  product_card_carousel: 'Product Card Carousel',
  deal_card_carousel: 'Product Card Carousel',
  info_list: 'Info List',
  promo_banner: 'Promo Banner',
  product_shelf_horizontal: 'Product Shelf Block',
  beauty_hero_banner: 'Beauty Hero Banner',
  beauty_quick_actions: 'Quick Action Row',
  beauty_trend_carousel: 'Beauty Trending Cards',
  beauty_offer_banner: 'Promo Banner',
  beauty_product_shelf: 'Product Card Carousel',
  beauty_routine_list: 'Beauty Routine List',
  beauty_tip_chips: 'Beauty Tip Chips',
  beauty_salon_carousel: 'Place Card Carousel',
  bestseller_shelf: 'Bestsellers Shelf Block',
  automobile_b2b2c_fixed: 'Automobile B2B/B2C Section',
  automobile_fitment_fixed: 'Automobile Fitment Section',
  medical_category_grid_fixed: 'Medical Category Grid Section',
  medical_nearby_hospitals_fixed: 'Medical Nearby Hospitals Section',
  medical_top_doctors_fixed: 'Medical Top Doctors Section',
  medical_emergency_fixed: 'Medical Emergency Services Section',
  medical_trust_strip_fixed: 'Medical Trust Strip Section',
  medical_reminder_fixed: 'Medical Reminder Section',
  medical_offers_fixed: 'Medical Offers Section',
  medical_footer_links_fixed: 'Medical Footer Links Section',
  agriculture_weather_fixed: 'Agriculture Weather Section',
  agriculture_mandi_prices_fixed: 'Agriculture Mandi Prices Section',
  food_explore_experience_fixed: 'Food Explore by Experience Section',
  food_area_guide_fixed: 'Food Area Guide Section',
  food_city_dictionary_fixed: 'Food City Dictionary Section',
  manufacturing_stats_fixed: 'Manufacturing Stats Section',
  manufacturing_live_prices_fixed: 'Manufacturing Live Prices Section',
  manufacturing_recent_orders_fixed: 'Manufacturing Recent Orders Section',
  sports_live_matches_fixed: 'Sports Live Matches Section',
  travel_flight_deals_fixed: 'Travel Flight Deals Section',
  travel_bookings_fixed: 'Travel Bookings Section',
  fitness_progress_stats_fixed: 'Fitness Progress Stats Section',
  fitness_class_schedule_fixed: 'Fitness Class Schedule Section',
  fitness_memberships_fixed: 'Fitness Memberships Section',
  services_booking_slots_fixed: 'Services Booking Slots Section',
  jewellery_gold_rates_fixed: 'Jewellery Gold Rates Section',
  sectionTitle: 'Section Title Block',
  multiItemGrid: 'Product Grid Block',
  categoryPreviewGrid: 'Category Preview Grid',
  campaignBento: 'Campaign Bento Block',
  icon_list: 'Icon List Block',
  chip_scroll: 'Chip Scroll Block',
  category_showcase: 'Category Showcase Block',
  tabbed_product_shelf: 'Tabbed Product Shelf',
  shops_near_you: 'Shops Near You',
  shop_card_carousel: 'Shop Card Carousel',
};

export const resolveBlockLabel = (blockType, fallback) =>
  blockLabels[blockType] || fallback || 'Block';

const LEGACY_BLOCK_TYPE_ALIASES = {
  beauty_quick_actions: 'quick_action_row',
  beauty_hero_banner: 'promo_hero_banner',
  splitpromorow: 'split_promo_row',
  beauty_trend_carousel: 'media_overlay_carousel',
  beauty_offer_banner: 'promo_banner',
  beauty_product_shelf: 'product_card_carousel',
  deal_card_carousel: 'product_card_carousel',
  beauty_routine_list: 'info_list',
  beauty_tip_chips: 'chip_scroll',
  bestseller_shelf: 'product_shelf_horizontal',
  shops_near_you: 'shop_card_carousel',
  shop_carousel: 'shop_card_carousel',
  shopsnearby: 'shop_card_carousel',
};

export const resolveLegacyBlockTypeAlias = (value) => {
  const key = String(value || '').trim();
  return LEGACY_BLOCK_TYPE_ALIASES[key] || key;
};

export const resolveLegacyStylePreset = (blockType, stylePreset) => {
  const current = String(stylePreset || '').trim();
  if (current) return current;
  switch (String(blockType || '').trim()) {
    case 'beauty_hero_banner':
      return 'beauty';
    case 'beauty_trend_carousel':
      return 'beauty';
    case 'beauty_offer_banner':
      return 'beauty';
    case 'beauty_product_shelf':
      return 'beauty';
    case 'deal_card_carousel':
      return 'electronics';
    case 'beauty_routine_list':
      return 'beauty_routine';
    case 'beauty_tip_chips':
      return 'beauty';
    default:
      return '';
  }
};

export const resolveLegacyCardVariant = (blockType, cardVariant) => {
  const current = String(cardVariant || '').trim();
  if (current) return current;
  switch (String(blockType || '').trim()) {
    case 'bestseller_shelf':
      return 'bestseller';
    default:
      return '';
  }
};

export const resolveBlockType = (section) => {
  if (!section) return '';
  const rawBlockType = String(section.blockType || '').trim();
  if (rawBlockType === 'heroBanner' && section.bannerVariant === 'text_card') return 'promo_banner';
  const resolvedBlockType = resolveLegacyBlockTypeAlias(rawBlockType);
  if (resolvedBlockType) return resolvedBlockType;
  if (section.type === 'banner' && section.bannerVariant === 'text_card') return 'promo_banner';
  if (section.type === 'hero_carousel') return 'hero_carousel';
  if (section.type === 'promo_hero_banner') return 'promo_hero_banner';
  if (section.type === 'split_promo_row') return 'split_promo_row';
  if (section.type === 'horizontal_scroll_list') return 'horizontal_scroll_list';
  if (section.type === 'quick_action_row') return 'quick_action_row';
  if (section.type === 'column_grid') return 'column_grid';
  if (section.type === 'category_icon_grid') return 'category_icon_grid';
  if (section.type === 'brand_logo_grid') return 'brand_logo_grid';
  if (section.type === 'media_overlay_carousel') return 'media_overlay_carousel';
  if (section.type === 'product_card_carousel') return 'product_card_carousel';
  if (section.type === 'deal_card_carousel') return 'product_card_carousel';
  if (section.type === 'info_list') return 'info_list';
  if (section.type === 'chip_scroll') return 'chip_scroll';
  if (section.type === 'category_showcase') return 'category_showcase';
  const resolvedType = resolveLegacyBlockTypeAlias(section.type);
  if (resolvedType && resolvedType !== section.type) return resolvedType;
  if (section.type === 'banner') return 'heroBanner';
  if (section.type === 'title') return 'sectionTitle';
  if (section.type === 'grid') return 'multiItemGrid';
  if (section.type === 'campaign' || section.type === 'campaignBento') return 'campaignBento';
  return section.type || '';
};

export const normalizeCollectionId = (value) => (value === undefined || value === null ? '' : String(value).trim());

export const normalizeMatchValue = (value) => (value === undefined || value === null ? '' : String(value).trim().toLowerCase());
export const resolveIndustryId = (industry) =>
  normalizeCollectionId(
    industry?.industryId ?? industry?.industry_id ?? industry?.id ?? industry?._id ?? industry?.slug ?? industry?.name
  );
export const resolveIndustryLabel = (industry) => industry?.name || industry?.label || industry?.title || 'Industry';
export const resolveMainCategoryId = (mainCategory) =>
  normalizeCollectionId(mainCategory?.id ?? mainCategory?.mainCategoryId ?? mainCategory?.main_category_id);
export const resolveMainCategoryIndustryId = (mainCategory) =>
  normalizeCollectionId(
    mainCategory?.industryId ??
      mainCategory?.industry_id ??
      mainCategory?.industry?.industryId ??
      mainCategory?.industry?.id ??
      mainCategory?.industry?.industry_id
  );
export const resolveMainCategoryName = (mainCategory) =>
  mainCategory?.name || mainCategory?.label || mainCategory?.title || 'Main category';
export const resolveCategoryId = (category) =>
  normalizeCollectionId(category?.id ?? category?.categoryId ?? category?._id ?? category?.code);
export const resolveCategoryMainCategoryId = (category) =>
  normalizeCollectionId(category?.mainCategoryId ?? category?.main_category_id ?? category?.mainCategory?.id);

export const sizePresets = {
  padding: [
    { key: 'sm', label: 'Small', value: 6 },
    { key: 'md', label: 'Medium', value: 10 },
    { key: 'lg', label: 'Large', value: 14 },
  ],
  radius: [
    { key: 'sm', label: 'Small', value: 12 },
    { key: 'md', label: 'Medium', value: 16 },
    { key: 'lg', label: 'Large', value: 20 },
  ],
  imageSize: [
    { key: 'sm', label: 'Small', value: 52 },
    { key: 'md', label: 'Medium', value: 60 },
    { key: 'lg', label: 'Large', value: 70 },
  ],
  imageGap: [
    { key: 'sm', label: 'Small', value: 4 },
    { key: 'md', label: 'Medium', value: 6 },
    { key: 'lg', label: 'Large', value: 8 },
  ],
};

export const categoryLayoutPresets = [
  {
    key: 'compact',
    label: 'Compact',
    values: {
      paddingY: 6,
      cardPadding: 6,
      cardRadius: 12,
      imageSize: 52,
      imageRadius: 12,
      imageGap: 4,
    },
  },
  {
    key: 'balanced',
    label: 'Balanced',
    values: {
      paddingY: 10,
      cardPadding: 10,
      cardRadius: 16,
      imageSize: 60,
      imageRadius: 16,
      imageGap: 6,
    },
  },
  {
    key: 'spacious',
    label: 'Spacious',
    values: {
      paddingY: 14,
      cardPadding: 14,
      cardRadius: 20,
      imageSize: 70,
      imageRadius: 20,
      imageGap: 8,
    },
  },
];

export const findPresetKey = (list, value) => {
  const num = typeof value === 'number' ? value : Number(value);
  const match = list.find((item) => item.value === num);
  return match ? match.key : '';
};

export const ensureBentoTiles = (tiles, count = 4) => {
  const normalized = Array.isArray(tiles)
    ? tiles.map((tile) => ({
        imageUrl: tile?.imageUrl || tile?.image || '',
        deepLink: tile?.deepLink || tile?.targetUrl || '',
        label: tile?.label || tile?.title || '',
      }))
    : [];
  while (normalized.length < count) {
    normalized.push({ imageUrl: '', deepLink: '', label: '' });
  }
  return normalized.slice(0, count);
};

export const phaseOneBlockTypes = new Set([
  'hero_carousel',
  'promo_hero_banner',
  'split_promo_row',
  'horizontal_scroll_list',
  'quick_action_row',
  'column_grid',
  'category_icon_grid',
  'brand_logo_grid',
  'media_overlay_carousel',
  'product_card_carousel',
  'deal_card_carousel',
  'info_list',
  'promo_banner',
  'product_shelf_horizontal',
  'icon_list',
  'chip_scroll',
  'category_showcase',
  'beauty_hero_banner',
  'beauty_trend_carousel',
  'beauty_offer_banner',
  'beauty_product_shelf',
  'beauty_routine_list',
  'beauty_tip_chips',
  'beauty_salon_carousel',
  'tabbed_product_shelf',
  'shop_card_carousel',
]);

export const getPhaseOneDefaultItem = (blockType, index = 0) => {
  const resolvedBlockType =
    blockType === 'beauty_quick_actions'
      ? 'quick_action_row'
      : blockType === 'beauty_offer_banner'
        ? 'promo_banner'
        : blockType === 'deal_card_carousel' || blockType === 'beauty_product_shelf'
          ? 'product_card_carousel'
        : blockType;
  if (resolvedBlockType === 'promo_banner') {
    return {};
  }
  if (resolvedBlockType === 'beauty_hero_banner') {
    return {
      title: '',
      subtitle: '',
      badgeText: '',
      ctaText: '',
      ctaLink: '',
      destinationType: '',
      destinationValue: '',
      imageUrl: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'promo_hero_banner') {
    return {
      title: '',
      subtitle: '',
      badgeText: '',
      ctaText: '',
      ctaLink: '',
      destinationType: '',
      destinationValue: '',
      imageUrl: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'quick_action_row') {
    return {
      title: '',
      subtitle: '',
      ctaText: '',
      iconName: '',
      iconUrl: '',
      accentColor: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'beauty_trend_carousel') {
    return {
      title: '',
      subtitle: '',
      imageUrl: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'media_overlay_carousel') {
    return {
      title: '',
      subtitle: '',
      imageUrl: '',
      destinationType: '',
      destinationValue: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'product_card_carousel') {
    return {
      title: '',
      subtitle: '',
      businessName: '',
      price: '',
      badgeText: '',
      rating: '',
      oldPrice: '',
      saveLabel: '',
      eta: '',
      ctaText: '',
      contactNumber: '',
      whatsappNumber: '',
      inquiryLink: '',
      imageUrl: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'split_promo_row') {
    return {
      title: '',
      subtitle: '',
      badgeText: '',
      ctaText: '',
      accentColor: '',
      imageUrl: '',
      destinationType: '',
      destinationValue: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'info_list') {
    return {
      title: '',
      subtitle: '',
      price: '',
      iconName: '',
      iconUrl: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'beauty_routine_list') {
    return {
      title: '',
      subtitle: '',
      iconName: '',
      iconUrl: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'beauty_tip_chips') {
    return { text: '', deepLink: '' };
  }
  if (resolvedBlockType === 'beauty_salon_carousel') {
    return {
      title: '',
      subtitle: '',
      rating: '',
      distance: '',
      ctaText: '',
      imageUrl: '',
      businessUserId: '',
      contactNumber: '',
      whatsappNumber: '',
      inquiryLink: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'brand_logo_grid') {
    const kinds = ['hero', 'tile', 'tile', 'tile', 'tile', 'cta'];
    return {
      id: '',
      kind: kinds[index] || 'tile',
      collectionId: '',
      title: '',
      subtitle: '',
      badgeText: '',
      imageUrl: '',
      secondaryImageUrl: '',
      deepLink: '',
      bgColor: '',
      frameColor: '',
      titleColor: '',
      badgeTextColor: '',
    };
  }
  if (resolvedBlockType === 'icon_list') {
    return { iconUrl: '', title: '', subtitle: '', deepLink: '' };
  }
  if (resolvedBlockType === 'chip_scroll') {
    return { text: '', deepLink: '' };
  }
  if (resolvedBlockType === 'tabbed_product_shelf') {
    return {
      title: '',
      tab: '',
      imageUrl: '',
      price: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'shop_card_carousel') {
    return {
      title: '',
      imageUrl: '',
      rating: '',
      distance: '',
      deepLink: '',
    };
  }
  if (resolvedBlockType === 'category_showcase') {
    return { title: '', imageUrl: '', iconUrl: '', deepLink: '' };
  }
  return {
    id: '',
    kind: '',
    collectionId: '',
    title: '',
    subtitle: '',
    badgeText: '',
    ctaText: '',
    ctaLink: '',
    overlayTitle: '',
    overlaySubtitle: '',
    imageUrl: '',
    secondaryImageUrl: '',
    deepLink: '',
    bgColor: '',
    frameColor: '',
    titleColor: '',
    badgeTextColor: '',
  };
};

export const normalizePhaseOneItems = (items, blockType) => {
  const list = Array.isArray(items) ? items : [];
  const resolvedBlockType =
    blockType === 'beauty_quick_actions'
      ? 'quick_action_row'
      : blockType === 'beauty_offer_banner'
        ? 'promo_banner'
        : blockType === 'deal_card_carousel' || blockType === 'beauty_product_shelf'
          ? 'product_card_carousel'
        : blockType;
  const normalized = list.map((item, index) => {
    const base = getPhaseOneDefaultItem(resolvedBlockType, index);
    if (resolvedBlockType === 'promo_banner') {
      return {};
    }
    if (resolvedBlockType === 'beauty_hero_banner') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        badgeText: item?.badgeText || '',
        ctaText: item?.ctaText || '',
        ctaLink: item?.ctaLink || '',
        destinationType: item?.destinationType ? String(item.destinationType) : '',
        destinationValue: item?.destinationValue ? String(item.destinationValue) : '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'promo_hero_banner') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        badgeText: item?.badgeText || item?.badge || '',
        ctaText: item?.ctaText || item?.ctaLabel || '',
        ctaLink: item?.ctaLink || '',
        destinationType: item?.destinationType ? String(item.destinationType) : '',
        destinationValue: item?.destinationValue ? String(item.destinationValue) : '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'quick_action_row') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        ctaText: item?.ctaText || '',
        iconName: item?.iconName || item?.icon || '',
        iconUrl: item?.iconUrl || '',
        accentColor: item?.accentColor || item?.accent || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'beauty_trend_carousel') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'media_overlay_carousel') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        destinationType: item?.destinationType ? String(item.destinationType) : '',
        destinationValue: item?.destinationValue ? String(item.destinationValue) : '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'product_card_carousel') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        businessName:
          item?.businessName || item?.storeName || item?.shopName || item?.sellerName || item?.companyName || '',
        price: item?.price || item?.sellingPrice || '',
        badgeText: item?.badgeText || item?.off || '',
        rating: item?.rating || '',
        oldPrice: item?.oldPrice || item?.mrp || '',
        saveLabel: item?.saveLabel || item?.save || '',
        eta: item?.eta || item?.deliveryEta || '',
        ctaText: item?.ctaText || item?.ctaLabel || '',
        contactNumber: item?.contactNumber || item?.phoneNumber || item?.mobileNumber || '',
        whatsappNumber: item?.whatsappNumber || item?.whatsapp || '',
        inquiryLink: item?.inquiryLink || item?.ctaLink || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'split_promo_row') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || item?.text || '',
        badgeText: item?.badgeText || item?.badge || '',
        ctaText: item?.ctaText || item?.ctaLabel || '',
        accentColor: item?.accentColor || item?.accent || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        destinationType: item?.destinationType ? String(item.destinationType) : '',
        destinationValue: item?.destinationValue ? String(item.destinationValue) : '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'info_list') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        price: item?.price || item?.sellingPrice || '',
        iconName: item?.iconName || item?.icon || '',
        iconUrl: item?.iconUrl || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'beauty_routine_list') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        iconName: item?.iconName || item?.icon || '',
        iconUrl: item?.iconUrl || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'beauty_tip_chips') {
      return {
        ...base,
        text: item?.text || item?.title || item?.label || '',
        deepLink: item?.deepLink || '',
      };
    }
    if (resolvedBlockType === 'beauty_salon_carousel') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || item?.area || '',
        rating: item?.rating || '',
        distance: item?.distance || '',
        ctaText: item?.ctaText || item?.ctaLabel || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        businessUserId:
          item?.businessUserId || item?.userId || item?.profileId || '',
        contactNumber:
          item?.contactNumber || item?.phoneNumber || item?.phone || item?.mobile || '',
        whatsappNumber:
          item?.whatsappNumber || item?.whatsappPhone || item?.whatsapp || '',
        inquiryLink: item?.inquiryLink || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'shop_card_carousel') {
      return {
        ...base,
        title: item?.title || item?.name || item?.businessName || item?.label || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.logo || item?.thumbnailImage || '',
        rating: item?.rating !== undefined && item?.rating !== null ? String(item.rating) : '',
        distance: item?.distance || item?.distanceLabel || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'tabbed_product_shelf') {
      return {
        ...base,
        title: item?.title || item?.name || item?.productName || item?.label || '',
        tab: item?.tab || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        price: item?.price !== undefined && item?.price !== null ? String(item.price) : '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (resolvedBlockType === 'icon_list') {
      return {
        ...base,
        iconUrl: item?.iconUrl || '',
        title: item?.title || '',
        subtitle: item?.subtitle || '',
        deepLink: item?.deepLink || '',
      };
    }
    if (resolvedBlockType === 'chip_scroll') {
      return {
        ...base,
        text: item?.text || item?.title || item?.label || '',
        iconName: item?.iconName || item?.icon || '',
        iconUrl: item?.iconUrl || '',
        deepLink: item?.deepLink || '',
      };
    }
    if (resolvedBlockType === 'category_showcase') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        iconUrl: item?.iconUrl || item?.mainCategoryIcon || '',
        deepLink: item?.deepLink || '',
      };
    }
    return {
      ...base,
      id: item?.id ? String(item.id) : '',
      kind: item?.kind ? String(item.kind) : base.kind,
      collectionId: item?.collectionId ? String(item.collectionId) : '',
      destinationType: item?.destinationType ? String(item.destinationType) : '',
      destinationValue: item?.destinationValue ? String(item.destinationValue) : '',
      title: item?.title || item?.name || item?.label || '',
      subtitle: item?.subtitle || '',
      badgeText: item?.badgeText || '',
      ctaText: item?.ctaText || '',
      ctaLink: item?.ctaLink || '',
      overlayTitle: item?.overlayTitle || '',
      overlaySubtitle: item?.overlaySubtitle || '',
      imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
      secondaryImageUrl: item?.secondaryImageUrl || '',
      deepLink: item?.deepLink || item?.targetUrl || '',
      bgColor: item?.bgColor || '',
      frameColor: item?.frameColor || '',
      titleColor: item?.titleColor || '',
      badgeTextColor: item?.badgeTextColor || '',
    };
  });
  return normalized.length > 0 ? normalized : [getPhaseOneDefaultItem(resolvedBlockType, 0)];
};

export const imageExtensionRegex = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;
export const imageLikeFieldRegex = /(image|thumbnail|poster|logo|icon|banner)/i;

export const getImageExtension = (url) => {
  if (!url || typeof url !== 'string') return '';
  const clean = url.split('#')[0].split('?')[0];
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
};

export const isLikelyImageUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!(trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/uploads/'))) {
    return false;
  }
  return imageExtensionRegex.test(trimmed) || trimmed.includes('/uploads/products/');
};

export const collectImageUrls = (node, bucket, visited = new WeakSet()) => {
  if (!node) return;
  if (typeof node === 'string') {
    if (isLikelyImageUrl(node)) bucket.add(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectImageUrls(item, bucket, visited));
    return;
  }
  if (typeof node !== 'object') return;
  if (visited.has(node)) return;
  visited.add(node);
  Object.entries(node).forEach(([key, value]) => {
    if (typeof value === 'string') {
      if (isLikelyImageUrl(value) && (imageLikeFieldRegex.test(key) || value.includes('/uploads/products/'))) {
        bucket.add(value);
      }
      return;
    }
    collectImageUrls(value, bucket, visited);
  });
};

export const isHexColor = (value) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '').trim());
export const resolveHexColor = (value, fallback) => (isHexColor(value) ? String(value).trim() : fallback);
export const normalizeColumnTopLineStyle = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'curve' || normalized === 'image') return 'curve';
  return 'flat';
};

export const COLUMN_GRID_BG_PALETTE = ['#f5f0dc', '#f9f3de', '#eef9ff', '#eaf7ff', '#f6f7ff', '#fff7ef'];
export const COLUMN_GRID_CARD_BG_PALETTE = ['#9ad8f8', '#b6e2ff', '#d5ecff', '#c3dbff', '#d8d4ff', '#ffd8f3'];
export const COLUMN_GRID_TOP_LINE_STYLES = [
  { value: 'flat', label: 'Flat line' },
  { value: 'curve', label: 'Curve line' },
];
export const CATEGORY_FEED_SORT_OPTIONS = [
  { value: 'MANUAL_RANK', label: 'Manual rank' },
  { value: 'NAME', label: 'Name' },
  { value: 'LATEST', label: 'Latest' },
];
export const CATEGORY_ICON_FEED_MODE_OPTIONS = [
  { value: 'MAIN_CATEGORY', label: 'Selected main category categories' },
];

export const PLACE_CARD_SOURCE_OPTIONS = [
  { value: 'MANUAL', label: 'Manual cards' },
  { value: 'BUSINESS_SELECTION', label: 'Selected businesses' },
];

export const PLACE_CARD_ACTION_MODE_OPTIONS = [
  { value: 'CALL_WHATSAPP', label: 'Call + WhatsApp' },
  { value: 'CALL_INQUIRY', label: 'Call + Inquiry' },
  { value: 'WHATSAPP_INQUIRY', label: 'WhatsApp + Inquiry' },
];

export const PRODUCT_CARD_ACTION_MODE_OPTIONS = [
  { value: 'AUTO', label: 'Auto by preset' },
  { value: 'ADD', label: 'Add button' },
  { value: 'VIEW', label: 'View button' },
  { value: 'WHATSAPP', label: 'WhatsApp button' },
  { value: 'CALL', label: 'Call button' },
  { value: 'INQUIRY', label: 'Inquiry button' },
  { value: 'NONE', label: 'Hide button' },
];

export const isMainCategoryDrivenCategoryBlock = (blockType) => {
  const normalized = String(blockType || '').trim();
  return normalized === 'category_icon_grid' || normalized === 'category_showcase';
};

export const resolveDefaultCategoryFeedMode = (blockType, value = '') => {
  if (isMainCategoryDrivenCategoryBlock(blockType)) return 'MAIN_CATEGORY';
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized) return normalized;
  return 'TOP_SELLING';
};
export const SOURCE_TYPE_OPTIONS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'BRAND_FEED', label: 'Brand feed' },
  { value: 'DATA_SOURCE', label: 'Data source feed' },
  { value: 'HYBRID', label: 'Hybrid (manual + feed)' },
  { value: 'CATEGORY_FEED', label: 'Category feed' },
];
export const BENTO_TILE_SOURCE_OPTIONS = [
  { value: 'MANUAL', label: 'Manual cards' },
  { value: 'CATEGORY_FEED', label: 'Category feed' },
  { value: 'COLLECTION_FEED', label: 'Collection feed' },
];
export const TABBED_SHELF_SOURCE_OPTIONS = [
  { value: 'MANUAL', label: 'Manual (CMS items)' },
  { value: 'PRODUCT_FEED', label: 'Product Feed (live data)' },
];
export const SHOP_BLOCK_SOURCE_OPTIONS = [
  { value: 'SHOP_FEED', label: 'Shop Feed (nearby shops, auto)' },
  { value: 'MANUAL', label: 'Manual (CMS items only)' },
];
export const PRODUCT_FEED_MODE_OPTIONS = [
  { value: 'BESTSELLER', label: 'Bestsellers' },
  { value: 'TRENDING', label: 'Trending' },
  { value: 'RECOMMENDED', label: 'Recommended' },
  { value: 'FREQUENTLY_BOUGHT', label: 'Frequently Bought' },
  { value: 'TOP_SELLING', label: 'Top Selling' },
  { value: 'MOST_RATED', label: 'Most Rated' },
  { value: 'LOWEST_PRICE', label: 'Lowest Price' },
  { value: 'TODAY_DEAL', label: "Today's Deals" },
];
export const TAB_FIELD_OPTIONS = [
  { value: 'mainCategoryName', label: 'Main Category Name' },
  { value: 'mainCategoryId', label: 'Main Category ID' },
  { value: 'tags', label: 'First Tag' },
  { value: 'tab', label: 'Manual tab label (CMS field)' },
];

export const STYLE_PRESET_OPTIONS = {
  campaignBento: [
    { value: '', label: 'Auto / page theme' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'fashion', label: 'Fashion' },
  ],
  promo_hero_banner: [
    { value: 'electronics', label: 'Electronics' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'food', label: 'Food' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'medical', label: 'Medical' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'automobile', label: 'Automobile' },
    { value: 'jewellery', label: 'Jewellery' },
    { value: 'decor', label: 'Decor' },
    { value: 'kids', label: 'Kids' },
    { value: 'sports', label: 'Sports' },
    { value: 'travel', label: 'Travel' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'services', label: 'Services' },
  ],
  split_promo_row: [
    { value: 'grocery', label: 'Grocery' },
  ],
  category_showcase: [
    { value: '', label: 'Default' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'food', label: 'Food' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'automobile', label: 'Automobile' },
    { value: 'jewellery', label: 'Jewellery' },
    { value: 'decor', label: 'Decor' },
    { value: 'kids', label: 'Kids' },
    { value: 'sports', label: 'Sports' },
    { value: 'travel', label: 'Travel' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'services', label: 'Services' },
  ],
  media_overlay_carousel: [
    { value: 'electronics', label: 'Electronics' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'medical', label: 'Medical' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'jewellery', label: 'Jewellery' },
    { value: 'decor', label: 'Decor' },
    { value: 'kids', label: 'Kids' },
    { value: 'sports', label: 'Sports' },
    { value: 'travel', label: 'Travel' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'services', label: 'Services' },
  ],
  product_card_carousel: [
    { value: 'electronics', label: 'Electronics' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'food', label: 'Food' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'automobile', label: 'Automobile (text-only deal cards)' },
  ],
  beauty_salon_carousel: [
    { value: 'beauty', label: 'Beauty' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'fashion', label: 'Fashion' },
  ],
  info_list: [
    { value: 'launch_rows', label: 'Launch rows' },
    { value: 'support_rows', label: 'Support rows' },
    { value: 'beauty_routine', label: 'Beauty routine' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'jewellery', label: 'Jewellery' },
    { value: 'kids', label: 'Kids' },
    { value: 'sports', label: 'Sports' },
    { value: 'travel', label: 'Travel' },
    { value: 'services', label: 'Services' },
  ],
  chip_scroll: [
    { value: '', label: 'Default' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'food', label: 'Food' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'automobile', label: 'Automobile' },
    { value: 'travel', label: 'Travel' },
  ],
  tabbed_product_shelf: [
    { value: '', label: 'Default' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'automobile', label: 'Automobile (icon cards + Retail/Wholesale tabs)' },
  ],
  shop_card_carousel: [
    { value: '', label: 'Default (full card)' },
    { value: 'beauty', label: 'Beauty (compact card)' },
    { value: 'grocery', label: 'Grocery (compact card)' },
    { value: 'food', label: 'Food (full card)' },
    { value: 'fashion', label: 'Fashion (full card)' },
    { value: 'agriculture', label: 'Agriculture (full card)' },
    { value: 'manufacturing', label: 'Manufacturing (full card)' },
    { value: 'electronics', label: 'Electronics (full card)' },
    { value: 'automobile', label: 'Automobile (full card)' },
    { value: 'sports', label: 'Sports (full card)' },
  ],
  category_icon_grid: [
    { value: '', label: 'Default' },
    { value: 'fashion', label: 'Fashion' },
  ],
  brand_logo_grid: [
    { value: '', label: 'Default (Blue grid)' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'automobile', label: 'Automobile (horizontal carousel)' },
    { value: 'kids', label: 'Kids' },
  ],
  product_shelf_horizontal: [
    { value: '', label: 'Default' },
    { value: 'food', label: 'Food' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'medical', label: 'Medical' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'automobile', label: 'Automobile' },
    { value: 'jewellery', label: 'Jewellery' },
    { value: 'decor', label: 'Decor' },
    { value: 'kids', label: 'Kids' },
    { value: 'sports', label: 'Sports' },
    { value: 'travel', label: 'Travel' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'services', label: 'Services' },
  ],
  promo_banner: [
    { value: '', label: 'Default' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'automobile', label: 'Automobile (dark gradient + bullets)' },
    { value: 'decor', label: 'Decor' },
  ],
};

export const PRODUCT_SHELF_VARIANT_OPTIONS = [
  { value: '', label: 'Auto / compact' },
  { value: 'compact', label: 'Compact cards' },
  { value: 'bestseller', label: 'Bestseller / wide cards' },
];

export const PRODUCT_CARD_VARIANT_OPTIONS = [
  { value: '', label: 'Default cards' },
  { value: 'grocery_fresh', label: 'Grocery fresh cards' },
  { value: 'grocery_pantry', label: 'Grocery pantry cards' },
  { value: 'grocery_compact', label: 'Grocery compact cards' },
];

export const MEDIA_OVERLAY_VARIANT_OPTIONS = [
  { value: '', label: 'Default carousel' },
  { value: 'stacked', label: 'Stacked cards' },
];

export const SHOWCASE_VARIANT_OPTIONS = [
  { value: 'circle', label: 'Circle' },
  { value: 'circle_icon', label: 'Circle + Icon badge' },
  { value: 'card', label: 'Card' },
];

export const MULTI_ITEM_GRID_FEED_OPTIONS = [
  { value: 'TOP_SELLING', label: 'Top selling', dataSourceRef: 'home_top_selling_products' },
  { value: 'MOST_RATED', label: 'Most rated', dataSourceRef: 'home_most_rated_products' },
  { value: 'RECOMMENDED', label: 'Recommended', dataSourceRef: 'home_recommended_products' },
  { value: 'FREQUENTLY_BOUGHT', label: 'Frequently bought', dataSourceRef: 'home_frequently_bought_products' },
  { value: 'LOWEST_PRICE', label: 'Lowest price', dataSourceRef: 'home_lowest_price_products' },
  { value: 'TRENDING', label: 'Trending', dataSourceRef: 'home_trending_products' },
  { value: 'BESTSELLER', label: 'Bestseller', dataSourceRef: 'home_bestseller_products' },
];

export const resolveMultiItemGridDataSourceRef = (mode) => {
  const normalizedMode = String(mode || '').trim().toUpperCase();
  const match = MULTI_ITEM_GRID_FEED_OPTIONS.find((option) => option.value === normalizedMode);
  return match?.dataSourceRef || MULTI_ITEM_GRID_FEED_OPTIONS[0].dataSourceRef;
};

export const resolveMultiItemGridFeedMode = (dataSourceRef, fallbackMode = 'FREQUENTLY_BOUGHT') => {
  const normalizedRef = String(dataSourceRef || '').trim();
  const match = MULTI_ITEM_GRID_FEED_OPTIONS.find((option) => option.dataSourceRef === normalizedRef);
  if (match?.value) return match.value;
  return String(fallbackMode || 'FREQUENTLY_BOUGHT').trim().toUpperCase();
};

export const DEEP_LINK_TEMPLATE_PRESETS = [
  { value: 'app://category/{id}', label: 'Category details (app://category/{id})' },
  { value: 'app://collection/{id}', label: 'Collection listing (app://collection/{id})' },
  { value: 'app://campaign/{slug}', label: 'Campaign (app://campaign/{slug})' },
];

export const COMMON_LINK_PRESETS = [
  { value: 'app://category/', label: 'Category (append category id)' },
  { value: 'app://collection/', label: 'Collection (append collection id)' },
  { value: 'app://campaign/', label: 'Campaign (append slug)' },
  { value: 'app://product/', label: 'Product (append product id)' },
  { value: 'app://brand/', label: 'Brand (append brand id or slug)' },
  { value: 'https://', label: 'External URL (https://...)' },
];

export const ITEM_DEEP_LINK_PRESETS = [
  ...COMMON_LINK_PRESETS,
];

export const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const buildCategoryFeedFingerprint = (form, blockTypeOverride) => {
  const blockType = String(blockTypeOverride || form?.blockType || form?.type || '').trim();
  const sourceType = String(form?.sourceType || 'MANUAL').trim().toUpperCase();
  if (!phaseOneBlockTypes.has(blockType) || sourceType !== 'CATEGORY_FEED') return '';
  return JSON.stringify({
    blockType,
    sourceType,
    sourceIndustryId: normalizeCollectionId(form?.sourceIndustryId),
    sourceFeedMode: resolveDefaultCategoryFeedMode(blockType, form?.sourceFeedMode),
    sourceMainCategoryId: normalizeCollectionId(form?.sourceMainCategoryId),
    sourceCategoryIds: Array.isArray(form?.sourceCategoryIds)
      ? form.sourceCategoryIds.map((value) => normalizeCollectionId(value)).filter(Boolean).sort()
      : [],
    sourceLimit: String(form?.sourceLimit || '').trim(),
    sourceSortBy: String(form?.sourceSortBy || '').trim().toUpperCase(),
    sourceActiveOnly: form?.sourceActiveOnly !== false,
    sourceHasImageOnly: form?.sourceHasImageOnly !== false,
    sourceRankingWindowDays: String(form?.sourceRankingWindowDays || '30').trim(),
    mappingTitleField: String(form?.mappingTitleField || '').trim(),
    mappingImageField: String(form?.mappingImageField || '').trim(),
    mappingSecondaryImageField: String(form?.mappingSecondaryImageField || '').trim(),
    mappingDeepLinkTemplate: String(form?.mappingDeepLinkTemplate || '').trim(),
  });
};

export const isValidDeepLinkValue = (value) => {
  const link = String(value || '').trim();
  if (!link) return true;
  return (
    link.startsWith('app://') ||
    link.startsWith('traddex://') ||
    link.startsWith('/') ||
    link.startsWith('http://') ||
    link.startsWith('https://')
  );
};

export const matchesLayoutPreset = (preset, form) => {
  if (!preset || !preset.values) return false;
  const toNumber = (value) =>
    value === undefined || value === null || value === '' ? null : Number(value);
  const values = preset.values;
  return (
    toNumber(form.paddingY) === values.paddingY &&
    toNumber(form.cardPadding) === values.cardPadding &&
    toNumber(form.cardRadius) === values.cardRadius &&
    toNumber(form.imageSize) === values.imageSize &&
    toNumber(form.imageRadius) === values.imageRadius &&
    toNumber(form.imageGap) === values.imageGap
  );
};

export const fallbackHeaderTabs = [
  { id: 'home', label: 'Home', route: '/home' },
  { id: 'electronics', label: 'Electronics', route: '/home/electronics' },
  { id: 'beauty', label: 'Beauty', route: '/home/beauty' },
  { id: 'grocery', label: 'Grocery', route: '/home/grocery' },
  { id: 'food', label: 'Food', route: '/home/food' },
  { id: 'fashion', label: 'Fashion', route: '/home/fashion' },
  { id: 'agriculture', label: 'Agriculture', route: '/home/agriculture' },
];

export const fallbackIndustryPresets = [
  {
    id: 'home_electronics',
    route: '/home/electronics',
    dataSourceRef: 'home.electronics',
    dataSourceUrl: '/api/home?category=electronics',
    label: 'Electronics',
  },
  {
    id: 'home_beauty',
    route: '/home/beauty',
    dataSourceRef: 'home.beauty',
    dataSourceUrl: '/api/home?category=beauty',
    label: 'Beauty',
  },
  {
    id: 'home_grocery',
    route: '/home/grocery',
    dataSourceRef: 'home.grocery',
    dataSourceUrl: '/api/home?category=grocery',
    label: 'Grocery',
  },
  {
    id: 'home_food',
    route: '/home/food',
    dataSourceRef: 'home.food',
    dataSourceUrl: '/api/home?category=food',
    label: 'Food',
    sections: buildFoodDefaultSections(),
  },
  {
    id: 'home_fashion',
    route: '/home/fashion',
    dataSourceRef: 'home.fashion',
    dataSourceUrl: '/api/home?category=fashion',
    label: 'Fashion',
  },
  {
    id: 'home_agriculture',
    route: '/home/agriculture',
    dataSourceRef: 'home.agriculture',
    dataSourceUrl: '/api/home?category=agriculture',
    label: 'Agriculture',
  },
  {
    id: 'home_health',
    route: '/home/health',
    dataSourceRef: 'home.health',
    dataSourceUrl: '/api/home?category=health',
    label: 'Health',
  },
];

export const homeFixedSections = [
  { id: 'stats_row', title: 'Sales Report' },
  { id: 'b2b_b2c', title: 'B2B & B2C' },
  { id: 'quick_action', title: 'Quick Action' },
  { id: 'business_of_month', title: 'Business of Month' },
  { id: 'trending_categories', title: 'Categories of Trending' },
  { id: 'bestsellers', title: 'Bestsellers' },
  { id: 'services_near_you', title: 'Services Near You' },
  { id: 'business_health', title: 'Your Business Health' },
];

export const buildHomeFixedSections = () =>
  homeFixedSections.map((section) => ({
    id: section.id,
    type: 'hardcoded',
    title: section.title,
    enabled: true,
  }));

export const normalizeSlug = (value) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const resolveIndustryRoute = (industry, slug) => {
  const path = industry?.path;
  if (path && typeof path === 'string') {
    return path.startsWith('/') ? path : `/${path}`;
  }
  return slug ? `/home/${slug}` : '/home';
};

export const buildIndustryDefaultSections = (slug, industryName, industryId) => [
  ...((slug === 'medical' || slug === 'health') ? buildMedicalDefaultSections(industryId) : []),
  ...((slug === 'jewellery' || slug === 'jewelry' || slug === 'jwellery') ? buildJewelleryDefaultSections(industryId) : []),
  ...(slug === 'decor' ? buildDecorDefaultSections(industryId) : []),
  ...(slug === 'agriculture' ? buildAgricultureDefaultSections(industryId) : []),
  ...(slug === 'food' ? buildFoodDefaultSections(industryId) : []),
  ...(slug === 'manufacturing' ? buildManufacturingDefaultSections(industryId) : []),
  ...(slug === 'kids' ? buildKidsDefaultSections(industryId) : []),
  ...(slug === 'sports' ? buildSportsDefaultSections(industryId) : []),
  ...(slug === 'travel' ? buildTravelDefaultSections(industryId) : []),
  ...(slug === 'fitness' ? buildFitnessDefaultSections(industryId) : []),
  ...(slug === 'services' ? buildServicesDefaultSections(industryId) : []),
  ...(slug === 'beauty' ? buildBeautyDefaultSections(industryId) : []),
  ...(slug === 'electronics' ? buildElectronicsDefaultSections(industryId) : []),
  ...(slug === 'grocery' ? buildGroceryDefaultSections(industryId) : []),
  ...(slug === 'fashion' ? buildFashionDefaultSections(industryId) : []),
  ...(slug === 'automobile' ? buildAutomobileDefaultSections(industryId) : []),
  ...(slug === 'decor'
    || slug === 'medical'
    || slug === 'health'
    || slug === 'jewellery'
    || slug === 'jewelry'
    || slug === 'jwellery'
    || slug === 'agriculture'
    || slug === 'food'
    || slug === 'kids'
    || slug === 'sports'
    || slug === 'travel'
    || slug === 'fitness'
    || slug === 'services'
    || slug === 'beauty'
    || slug === 'electronics'
    || slug === 'grocery'
    || slug === 'fashion'
    || slug === 'automobile'
    ? []
    : [
  {
    id: `${slug}_hero`,
    type: 'banner',
    blockType: 'hero_carousel',
    title: `${industryName} Highlights`,
    enabled: true,
    sduiItems: [],
  },
  {
    id: `${slug}_categories`,
    type: 'category_showcase',
    blockType: 'category_showcase',
    title: `${industryName} Categories`,
    actionText: 'View all',
    showcaseVariant: 'circle',
    enabled: true,
    dataSource: {
      sourceType: 'CATEGORY_FEED',
      industryId: industryId ? String(industryId) : undefined,
    },
    sduiItems: [],
  },
  {
    id: `${slug}_top_selling`,
    type: 'grid',
    blockType: 'product_shelf_horizontal',
    title: `Top Selling in ${industryName}`,
    enabled: true,
    dataSourceRef: `home.${slug}`,
    productFeedMode: 'FREQUENTLY_BOUGHT',
    productLimit: 9,
    sduiItems: [],
  },
  {
    id: `${slug}_recommended`,
    type: 'horizontalList',
    blockType: 'horizontal_scroll_list',
    title: `Recommended in ${industryName}`,
    enabled: true,
    dataSourceRef: `home.${slug}`,
    sduiItems: [],
  },
    ]),
];

export const buildIndustryPresets = (industries = []) => {
  const items = Array.isArray(industries) ? industries : [];
  const active = items.filter((item) => item?.active !== 0);
  active.sort((a, b) => (a?.ordering ?? 0) - (b?.ordering ?? 0));
  return active
    .map((industry) => {
      const name = industry?.name || 'Industry';
      const slug = normalizeSlug(industry?.slug || name);
      if (!slug) return null;
      const route = resolveIndustryRoute(industry, slug);
      return {
        id: `home_${slug}`,
        route,
        dataSourceRef: `home.${slug}`,
        dataSourceUrl: `/api/home?category=${slug}`,
        label: name,
        sections: buildIndustryDefaultSections(slug, name, resolveIndustryId(industry)),
      };
    })
    .filter(Boolean);
};

export const buildHeaderTabs = (industries = []) => {
  const industryTabs = buildIndustryPresets(industries).map((preset) => ({
    id: preset.id.replace(/^home_/, ''),
    label: preset.label,
    route: preset.route,
  }));
  if (!industryTabs.length) {
    return fallbackHeaderTabs;
  }
  const homeTab = { id: 'home', label: 'Home', route: '/home' };
  return [homeTab, ...industryTabs];
};

export const buildPagePresets = (industries = []) => {
  const industryPresets = buildIndustryPresets(industries);
  const pages = industryPresets.length ? industryPresets : fallbackIndustryPresets;
  return [
    {
      id: 'home_main',
      route: '/home',
      label: 'Home Page',
      sections: buildHomeFixedSections(),
    },
    ...pages,
  ];
};

export const quickSectionPresets = [
  {
    key: 'todays_deals',
    label: "Add Today's Deals",
    section: {
      id: 'todays_deals',
      type: 'horizontalList',
      blockType: 'horizontal_scroll_list',
      title: "Today's Deals",
      itemsPath: '$.todaysDeals',
      itemTemplateRef: 'actionCard',
      dataSourceRef: 'todaydealproducts',
    },
  },
  {
    key: 'quick_actions',
    label: 'Add Quick actions',
    section: {
      id: 'quick_actions',
      type: 'grid',
      title: 'Quick actions',
      itemsPath: '$.quickActions',
      itemTemplateRef: 'actionCard',
      columns: 2,
    },
  },
  {
    key: 'shop_categories',
    label: 'Add Shop categories',
    section: {
      id: 'shop_categories',
      type: 'horizontalList',
      title: 'Shop categories',
      itemsPath: '$.categories',
      itemTemplateRef: 'categoryTile',
    },
  },
];

export const buildDataSources = (pagePresets = []) => {
  const sources = {};
  pagePresets.forEach((page) => {
    if (!page?.dataSourceRef) return;
    if (!sources[page.dataSourceRef]) {
      sources[page.dataSourceRef] = {
        method: 'GET',
        url: page.dataSourceUrl || `/api/${page.dataSourceRef}`,
      };
    }
  });
  sources.todaydealproducts = { method: 'GET', url: '/api/user/todaydealproducts' };
  sources.home_top_selling_products = { method: 'GET', url: '/api/home/products/top-selling' };
  sources.home_most_rated_products = { method: 'GET', url: '/api/home/products/most-rated' };
  sources.home_recommended_products = { method: 'GET', url: '/api/home/products/recommended' };
  sources.home_frequently_bought_products = { method: 'GET', url: '/api/home/products/frequently-bought' };
  sources.home_lowest_price_products = { method: 'GET', url: '/api/home/products/lowest-price' };
  sources.home_trending_products = { method: 'GET', url: '/api/home/products/trending' };
  sources.home_bestseller_products = { method: 'GET', url: '/api/home/products/bestseller' };
  return sources;
};

export const resolveDefaultDataSourceByRef = (ref) => {
  if (!ref) return null;
  const builtIn = buildDataSources([]);
  if (builtIn[ref]) return builtIn[ref];
  return { method: 'GET', url: `/api/${ref}` };
};

export const buildDefaultConfig = (pagePresets, headerTabs) => ({
  version: '1.0.0',
  app: { locale: 'en-IN', currency: 'INR' },
  theme: {
    colors: {
      brand: { primary: '#5B6CFF', secondary: '#F5A623' },
      status: { success: '#16A34A', warning: '#F59E0B', error: '#EF4444', info: '#2563EB' },
      text: {
        primary: '#111827',
        secondary: '#6B7280',
        muted: '#9CA3AF',
        inverse: '#FFFFFF',
        link: '#5B6CFF',
      },
      bg: {
        page: '#F6F7FB',
        card: '#FFFFFF',
        chip: '#F3F4F6',
        divider: '#E5E7EB',
        glass: '#FFFFFFCC',
      },
    },
    fonts: {
      family: {
        regular: 'Inter-Regular',
        medium: 'Inter-Medium',
        semibold: 'Inter-SemiBold',
        bold: 'Inter-Bold',
      },
      sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, display: 28 },
      lineHeights: { xs: 14, sm: 16, md: 20, lg: 22, xl: 26, xxl: 30, display: 36 },
      weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    },
    textStyles: {
      display: { size: 'display', weight: 'bold', lineHeight: 'display', color: 'text.primary' },
      h1: { size: 'xxl', weight: 'bold', lineHeight: 'xxl', color: 'text.primary' },
      h2: { size: 'xl', weight: 'semibold', lineHeight: 'xl', color: 'text.primary' },
      title: { size: 'lg', weight: 'medium', lineHeight: 'lg', color: 'text.primary' },
      body: { size: 'md', weight: 'regular', lineHeight: 'md', color: 'text.secondary' },
      caption: { size: 'sm', weight: 'regular', lineHeight: 'sm', color: 'text.muted' },
      label: { size: 'xs', weight: 'medium', lineHeight: 'xs', color: 'text.secondary' },
      link: { size: 'md', weight: 'medium', lineHeight: 'md', color: 'text.link' },
    },
    radius: { sm: 10, md: 14, lg: 18, pill: 22 },
    spacing: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 },
  },
  rendering: {
    bindings: { valuePathSyntax: '$.', templateSyntax: '{{}}' },
    formatters: {
      currencyCompactINR: { type: 'currency', currency: 'INR', compact: true },
      percentDelta: { type: 'percentDelta', suffix: '%' },
    },
  },
  navigation: {
    topCategoryTabs: headerTabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      route: tab.route,
    })),
    bottomTabs: [
      { id: 'home', label: 'Home', icon: 'home', route: '/home/electronics' },
      { id: 'products', label: 'Products', icon: 'cart', route: '/products' },
      { id: 'inquiry', label: 'Inquiry', icon: 'mail', route: '/inquiry' },
      { id: 'dashboard', label: 'Dashboard', icon: 'grid', route: '/dashboard' },
    ],
  },
  layoutTemplates: {
    iconTextSideBySide: {
      type: 'row',
      alignment: 'center',
      spacing: 8,
      children: [
        { type: 'icon', namePath: '$.icon', size: 18, colorRef: 'text.primary' },
        { type: 'text', valuePath: '$.label', styleRef: 'body' },
      ],
    },
    iconTextVertical: {
      type: 'column',
      alignment: 'center',
      spacing: 4,
      children: [
        { type: 'icon', namePath: '$.icon', size: 22, colorRef: 'text.primary' },
        { type: 'text', valuePath: '$.label', styleRef: 'caption' },
      ],
    },
    actionCard: {
      type: 'card',
      bgColorRef: 'bg.card',
      radius: 'lg',
      padding: 'md',
      children: [
        { type: 'icon', namePath: '$.icon', size: 20, colorRef: 'brand.primary' },
        { type: 'spacer', size: 8 },
        { type: 'text', valuePath: '$.title', styleRef: 'title' },
        { type: 'text', valuePath: '$.subtitle', styleRef: 'caption' },
      ],
    },
    categoryTile: {
      type: 'column',
      alignment: 'center',
      spacing: 8,
      children: [
        { type: 'image', urlPath: '$.iconUrl', width: 46, height: 46, radius: 23, bgColorRef: 'bg.chip' },
        { type: 'text', valuePath: '$.name', styleRef: 'caption', maxLines: 1 },
      ],
    },
    bannerCard: {
      type: 'bannerCard',
      radius: 'lg',
      imageUrlPath: '$.imageUrl',
      overlay: [
        { type: 'chip', labelPath: '$.badgeText' },
        { type: 'text', valuePath: '$.title', styleRef: 'h1', colorRef: 'text.inverse' },
        { type: 'text', valuePath: '$.subtitle', styleRef: 'body', colorRef: 'text.inverse' },
      ],
    },
    quickActionCard: {
      type: 'card',
      bgColorRef: 'bg.card',
      radius: 'lg',
      padding: 'md',
      children: [
        { type: 'image', urlPath: '$.iconUrl', width: 40, height: 40, radius: 20, bgColorRef: 'bg.chip' },
        { type: 'spacer', size: 10 },
        { type: 'text', valuePath: '$.title', styleRef: 'title' },
        { type: 'text', valuePath: '$.subtitle', styleRef: 'caption' },
        { type: 'text', valuePath: '$.linkText', styleRef: 'link' },
      ],
    },
  },
  dataSources: buildDataSources(pagePresets),
  pages: pagePresets.map((page) => ({
    id: page.id,
    route: page.route,
    dataSourceRef: page.dataSourceRef,
    screen: {
      type: 'screen',
      bgColorRef: 'bg.page',
      sections: Array.isArray(page.sections) ? page.sections.map((section) => ({ ...section })) : [],
    },
  })),
});

export const defaultSectionForm = {
  id: '',
  type: 'banner',
  blockType: 'heroBanner',
  title: '',
  text: '',
  actionText: '',
  actionLink: '',
  bannerVariant: 'image',
  showcaseVariant: 'circle',
  imageUrl: '',
  aspectRatio: '',
  deepLink: '',
  destinationType: '',
  destinationValue: '',
  collectionIds: [],
  placement: '',
  placeholder: '',
  sectionBgColor: '',
  sectionBgImage: '',
  columnTopLineStyle: 'curve',
  cardBgColor: '',
  titleColor: '',
  badgeBgColor: '',
  badgeTextColor: '',
  imageShellBg: '',
  paddingY: '',
  cardPadding: '',
  cardRadius: '',
  imageSize: '',
  imageRadius: '',
  imageGap: '',
  quickActionPreset: 'electronics',
  stylePreset: '',
  cardVariant: '',
  bentoHeaderImage: '',
  bentoHeroImage: '',
  bentoHeroLink: '',
  bentoHeroLabel: '',
  bentoHeroBadge: '',
  bentoTilesSourceType: 'MANUAL',
  bentoTilesIndustryId: '',
  bentoTilesMainCategoryId: '',
  bentoTileCollectionRefs: [],
  bentoTilesLimit: '4',
  bentoTiles: Array.from({ length: 4 }, () => ({ imageUrl: '', deepLink: '', label: '' })),
  sduiItems: [],
  enabled: true,
  itemsPath: '',
  itemTemplateRef: '',
  dataSourceRef: '',
  columns: '',
  height: '',
  videoUrl: '',
  posterUrl: '',
  scheduleStart: '',
  scheduleEnd: '',
  targetUserTypes: '',
  targetRoles: '',
  targetIndustries: '',
  targetSubscriptionStatuses: '',
  sourceType: 'MANUAL',
  sourceBusinessUserIds: [],
  sourceIndustryId: '',
  sourceFeedMode: 'TOP_SELLING',
  productFeedMode: 'FREQUENTLY_BOUGHT',
  productLimit: '9',
  sourceMainCategoryId: '',
  sourceCategoryIds: [],
  sourceLimit: '8',
  sourceRankingWindowDays: '30',
  sourceSortBy: 'MANUAL_RANK',
  sourceLevel: 'CATEGORY',
  sourceActiveOnly: true,
  sourceHasImageOnly: true,
  sourceInStockOnly: false,
  placeCardActionMode: 'CALL_WHATSAPP',
  productCardActionMode: 'AUTO',
  mappingTitleField: 'name',
  mappingImageField: 'imageUrl',
  mappingSecondaryImageField: '',
  mappingDeepLinkTemplate: 'app://category/{id}',
  blockDataSourceType: 'MANUAL',
  blockFeedMode: 'BESTSELLER',
  blockTabField: 'mainCategoryName',
  blockLimit: '10',
};

export const defaultHeaderForm = {
  backgroundImage: '',
  overlayGradient: '',
  backgroundColor: '',
  searchBg: '',
  searchText: '',
  iconColor: '',
  locationColor: '',
  profileBg: '',
  profileIconColor: '',
  categoryColor: '',
  minHeight: '',
  paddingTop: '',
  paddingBottom: '',
};

export const defaultHeaderSectionForm = {
  id: '',
  type: 'addressHeader',
  blockType: 'addressHeader',
  title: '',
  text: '',
  placeholder: '',
  enabled: true,
  industryIds: [],
  itemsPath: '',
  itemTemplateRef: '',
  dataSourceRef: '',
  columns: '',
  height: '',
  videoUrl: '',
  posterUrl: '',
  scheduleStart: '',
  scheduleEnd: '',
  targetUserTypes: '',
  targetRoles: '',
  targetIndustries: '',
  targetSubscriptionStatuses: '',
};

export const getPageKey = (page, index) => page?.id || page?.route || `page_${index + 1}`;
export const getPageLabel = (page, index, presets) => {
  const preset = (presets || []).find((item) => item.id === page?.id);
  return preset?.label || page?.id || page?.route || `Page ${index + 1}`;
};
