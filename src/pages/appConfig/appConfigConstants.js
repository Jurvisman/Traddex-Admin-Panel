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
  { value: 'horizontalList', label: 'Horizontal list' },
  { value: 'horizontal_scroll_list', label: 'Horizontal featured list (SDUI)' },
  { value: 'grid', label: 'Grid' },
  { value: 'column_grid', label: 'Column grid (SDUI)' },
  { value: 'category_icon_grid', label: 'Category icon grid (SDUI)' },
  { value: 'brand_logo_grid', label: 'Brand logo grid (SDUI)' },
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
];

export const defaultBlockTypeBySectionType = {
  banner: 'heroBanner',
  title: 'sectionTitle',
  grid: 'multiItemGrid',
  categoryPreviewGrid: 'categoryPreviewGrid',
  campaignBento: 'campaignBento',
  campaign: 'campaignBento',
  product_shelf_horizontal: 'product_shelf_horizontal',
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

const buildBeautyDefaultSections = (industryId) => [
  {
    id: 'beauty_spotlight',
    type: 'banner',
    blockType: 'beauty_hero_banner',
    enabled: true,
    items: [{ ...BEAUTY_HERO_SAMPLE }],
  },
  {
    id: 'beauty_quick_actions',
    type: 'horizontalList',
    blockType: 'beauty_quick_actions',
    title: 'Quick actions',
    actionText: 'View all',
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
    blockType: 'beauty_trend_carousel',
    title: 'Trending looks',
    actionText: 'Explore',
    enabled: true,
    items: BEAUTY_TRENDING_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'beauty_offer',
    type: 'banner',
    blockType: 'beauty_offer_banner',
    title: 'Beauty Friday',
    text: 'Up to 40% off skincare sets and bundles',
    actionText: 'Shop offers',
    sectionBgColor: '#E9C3B3',
    enabled: true,
  },
  {
    id: 'beauty_best_sellers',
    type: 'horizontalList',
    blockType: 'beauty_product_shelf',
    title: 'Best sellers',
    actionText: 'View all',
    enabled: true,
    items: BEAUTY_PRODUCT_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'beauty_routine',
    type: 'list',
    blockType: 'beauty_routine_list',
    title: 'Build your routine',
    actionText: 'See all',
    enabled: true,
    items: BEAUTY_ROUTINE_SAMPLE.map((item) => ({ ...item })),
  },
  {
    id: 'beauty_tips',
    type: 'horizontalList',
    blockType: 'beauty_tip_chips',
    title: 'Beauty tips',
    actionText: 'Read',
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

export const screenToolboxItems = [
  {
    key: 'heroBanner',
    label: 'Hero Banner Block',
    hint: 'Large image banner',
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
    key: 'phaseOneHeroCarousel',
    label: 'Hero Carousel Block',
    hint: 'Full-width campaign banners',
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
    key: 'phaseOneHorizontalScrollList',
    label: 'Featured Cards Block',
    hint: 'Festive cards with badge + subtitle',
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
  {
    key: 'phaseOneProductShelfHorizontal',
    label: 'Product Shelf Block',
    hint: 'Horizontal product list with price + ADD',
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
    key: 'phaseOneColumnGrid',
    label: 'Festive Column Grid',
    hint: '3-column cards with dual images',
    section: {
      id: 'festive_column_grid',
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
        filters: {
          activeOnly: true,
          hasImageOnly: true,
        },
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
    key: 'phaseOneCategoryIconGrid',
    label: 'Category Icon Grid',
    hint: '4-column category blocks',
    section: {
      id: 'category_icon_grid',
      type: 'grid',
      blockType: 'category_icon_grid',
      title: 'Grocery & Kitchen',
      items: [
        { title: 'Vegetables & Fruits', imageUrl: '', deepLink: '' },
        { title: 'Atta, Rice & Dal', imageUrl: '', deepLink: '' },
        { title: 'Oil, Ghee & Masala', imageUrl: '', deepLink: '' },
        { title: 'Dairy, Bread & Eggs', imageUrl: '', deepLink: '' },
      ],
    },
  },
  {
    key: 'phaseOneBrandLogoGrid',
    label: 'Brand Layout Block',
    hint: 'Hero + 4 tiles + CTA strip',
    section: {
      id: 'brand_layout_grid',
      type: 'grid',
      blockType: 'brand_logo_grid',
      title: '',
      items: [
        { kind: 'hero', title: 'Hero', imageUrl: '', deepLink: '' },
        { kind: 'tile', title: 'Beverage Corner', imageUrl: '', deepLink: '' },
        { kind: 'tile', title: 'Snacks & Munchies', imageUrl: '', deepLink: '' },
        { kind: 'tile', title: 'Toofani Party Zone', imageUrl: '', deepLink: '' },
        { kind: 'tile', title: 'Sweet Delights', imageUrl: '', deepLink: '' },
        { kind: 'cta', title: 'CTA', imageUrl: '', deepLink: '' },
      ],
    },
  },
  {
    key: 'sectionTitle',
    label: 'Section Title Block',
    hint: 'Standalone heading',
    section: { id: 'section_title', type: 'title', blockType: 'sectionTitle', text: 'Frequently bought' },
  },
  {
    key: 'multiItemGrid',
    label: 'Multi Item Grid Block',
    hint: 'Product feed grid',
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
    key: 'categoryPreviewGrid',
    label: 'Category Preview Grid',
    hint: 'Blinkit-style category cards',
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
    key: 'campaignBento',
    label: 'Campaign Bento Block',
    hint: 'Hero + 4 tiles layout',
    section: {
      id: 'campaign_bento',
      type: 'campaignBento',
      blockType: 'campaignBento',
      title: 'Skin-safe herbal gulal',
      sectionBgColor: '#e7f6ff',
      headerImage: '',
      hero: { imageUrl: '', deepLink: '', label: '' },
      tiles: Array.from({ length: 4 }, () => ({ imageUrl: '', deepLink: '', label: '' })),
    },
  },
  {
    key: 'iconList',
    label: 'Icon List Block',
    hint: 'Vertical list with icon + title + subtitle',
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
    key: 'chipScroll',
    label: 'Chip Scroll Block',
    hint: 'Horizontal scrolling text pills',
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
  {
    key: 'promoBanner',
    label: 'Promo Banner Block',
    hint: 'Text card with CTA button',
    section: {
      id: 'promo_banner',
      type: 'banner',
      blockType: 'heroBanner',
      title: 'Sale is live',
      text: 'Up to 40% off on selected items',
      bannerVariant: 'text_card',
      sectionBgColor: '#fce7f3',
      deepLink: '',
    },
  },
  {
    key: 'beautyHeroBanner',
    label: 'Beauty Hero Banner',
    hint: 'Beauty spotlight image card with overlay CTA',
    section: {
      id: 'beauty_spotlight',
      type: 'banner',
      blockType: 'beauty_hero_banner',
      items: [BEAUTY_HERO_SAMPLE],
    },
  },
  {
    key: 'beautyQuickActions',
    label: 'Beauty Quick Actions',
    hint: 'Horizontal beauty action cards',
    section: {
      id: 'beauty_quick_actions',
      type: 'horizontalList',
      blockType: 'beauty_quick_actions',
      title: 'Quick actions',
      actionText: 'View all',
      items: BEAUTY_QUICK_ACTIONS_SAMPLE,
    },
  },
  {
    key: 'beautyTrendCarousel',
    label: 'Beauty Trending Cards',
    hint: 'Image cards for trending looks',
    section: {
      id: 'beauty_trending',
      type: 'horizontalList',
      blockType: 'beauty_trend_carousel',
      title: 'Trending looks',
      actionText: 'Explore',
      items: BEAUTY_TRENDING_SAMPLE,
    },
  },
  {
    key: 'beautyOfferBanner',
    label: 'Beauty Offer Banner',
    hint: 'Gradient promo banner with CTA',
    section: {
      id: 'beauty_offer',
      type: 'banner',
      blockType: 'beauty_offer_banner',
      title: 'Beauty Friday',
      text: 'Up to 40% off skincare sets and bundles',
      actionText: 'Shop offers',
      actionLink: '',
      sectionBgColor: '#E9C3B3',
    },
  },
  {
    key: 'beautyProductShelf',
    label: 'Beauty Product Shelf',
    hint: 'Horizontal beauty product cards',
    section: {
      id: 'beauty_best_sellers',
      type: 'horizontalList',
      blockType: 'beauty_product_shelf',
      title: 'Best sellers',
      actionText: 'View all',
      items: BEAUTY_PRODUCT_SAMPLE,
    },
  },
  {
    key: 'beautyRoutineList',
    label: 'Beauty Routine List',
    hint: 'Vertical routine steps list',
    section: {
      id: 'beauty_routine',
      type: 'list',
      blockType: 'beauty_routine_list',
      title: 'Build your routine',
      actionText: 'See all',
      items: BEAUTY_ROUTINE_SAMPLE,
    },
  },
  {
    key: 'beautyTipChips',
    label: 'Beauty Tip Chips',
    hint: 'Horizontal beauty tips pills',
    section: {
      id: 'beauty_tips',
      type: 'horizontalList',
      blockType: 'beauty_tip_chips',
      title: 'Beauty tips',
      actionText: 'Read',
      items: BEAUTY_TIPS_SAMPLE,
    },
  },
  {
    key: 'beautySalonCarousel',
    label: 'Beauty Salon Carousel',
    hint: 'Horizontal nearby salon cards',
    section: {
      id: 'beauty_salons',
      type: 'horizontalList',
      blockType: 'beauty_salon_carousel',
      title: 'Nearby salons',
      actionText: 'View all',
      items: BEAUTY_SALON_SAMPLE,
    },
  },
  {
    key: 'categoryShowcase',
    label: 'Category Showcase',
    hint: 'Auto-fetch categories by industry',
    section: {
      id: 'category_showcase',
      type: 'category_showcase',
      blockType: 'category_showcase',
      title: 'Shop categories',
      actionText: 'View all',
      actionLink: '',
      showcaseVariant: 'circle',
      dataSource: { sourceType: 'CATEGORY_FEED' },
      sduiItems: [],
    },
  },
];

export const toolboxItems = [...headerToolboxItems, ...screenToolboxItems];

export const blockLabels = {
  addressHeader: 'Address Header Block',
  searchBar: 'Search Bar Block',
  horizontalPills: 'Horizontal Pills Block',
  heroBanner: 'Hero Banner Block',
  hero_carousel: 'Hero Carousel Block',
  horizontal_scroll_list: 'Featured Cards Block',
  column_grid: 'Festive Column Grid',
  category_icon_grid: 'Category Icon Grid',
  brand_logo_grid: 'Brand Layout Block',
  product_shelf_horizontal: 'Product Shelf Block',
  beauty_hero_banner: 'Beauty Hero Banner',
  beauty_quick_actions: 'Beauty Quick Actions',
  beauty_trend_carousel: 'Beauty Trending Cards',
  beauty_offer_banner: 'Beauty Offer Banner',
  beauty_product_shelf: 'Beauty Product Shelf',
  beauty_routine_list: 'Beauty Routine List',
  beauty_tip_chips: 'Beauty Tip Chips',
  beauty_salon_carousel: 'Beauty Salon Carousel',
  bestseller_shelf: 'Bestsellers Shelf Block',
  sectionTitle: 'Section Title Block',
  multiItemGrid: 'Multi Item Grid Block',
  categoryPreviewGrid: 'Category Preview Grid',
  campaignBento: 'Campaign Bento Block',
  icon_list: 'Icon List Block',
  chip_scroll: 'Chip Scroll Block',
  category_showcase: 'Category Showcase Block',
};

export const resolveBlockLabel = (blockType, fallback) =>
  blockLabels[blockType] || fallback || 'Block';

export const resolveBlockType = (section) => {
  if (!section) return '';
  if (section.blockType) return section.blockType;
  if (section.type === 'hero_carousel') return 'hero_carousel';
  if (section.type === 'horizontal_scroll_list') return 'horizontal_scroll_list';
  if (section.type === 'column_grid') return 'column_grid';
  if (section.type === 'category_icon_grid') return 'category_icon_grid';
  if (section.type === 'brand_logo_grid') return 'brand_logo_grid';
  if (section.type === 'category_showcase') return 'category_showcase';
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
    industry?.id ?? industry?._id ?? industry?.slug ?? industry?.industryId ?? industry?.industry_id ?? industry?.name
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
  'horizontal_scroll_list',
  'column_grid',
  'category_icon_grid',
  'brand_logo_grid',
  'product_shelf_horizontal',
  'icon_list',
  'chip_scroll',
  'category_showcase',
  'beauty_hero_banner',
  'beauty_quick_actions',
  'beauty_trend_carousel',
  'beauty_offer_banner',
  'beauty_product_shelf',
  'beauty_routine_list',
  'beauty_tip_chips',
  'beauty_salon_carousel',
]);

export const getPhaseOneDefaultItem = (blockType, index = 0) => {
  if (blockType === 'beauty_offer_banner') {
    return {};
  }
  if (blockType === 'beauty_hero_banner') {
    return {
      title: '',
      subtitle: '',
      badgeText: '',
      ctaText: '',
      ctaLink: '',
      imageUrl: '',
      deepLink: '',
    };
  }
  if (blockType === 'beauty_quick_actions') {
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
  if (blockType === 'beauty_trend_carousel') {
    return {
      title: '',
      subtitle: '',
      imageUrl: '',
      deepLink: '',
    };
  }
  if (blockType === 'beauty_product_shelf') {
    return {
      title: '',
      subtitle: '',
      price: '',
      imageUrl: '',
      deepLink: '',
    };
  }
  if (blockType === 'beauty_routine_list') {
    return {
      title: '',
      subtitle: '',
      iconName: '',
      iconUrl: '',
      deepLink: '',
    };
  }
  if (blockType === 'beauty_tip_chips') {
    return { text: '', deepLink: '' };
  }
  if (blockType === 'beauty_salon_carousel') {
    return {
      title: '',
      subtitle: '',
      rating: '',
      distance: '',
      imageUrl: '',
      deepLink: '',
    };
  }
  if (blockType === 'brand_logo_grid') {
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
  if (blockType === 'icon_list') {
    return { iconUrl: '', title: '', subtitle: '', deepLink: '' };
  }
  if (blockType === 'chip_scroll') {
    return { text: '', deepLink: '' };
  }
  if (blockType === 'category_showcase') {
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
  const normalized = list.map((item, index) => {
    const base = getPhaseOneDefaultItem(blockType, index);
    if (blockType === 'beauty_offer_banner') {
      return {};
    }
    if (blockType === 'beauty_hero_banner') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        badgeText: item?.badgeText || '',
        ctaText: item?.ctaText || '',
        ctaLink: item?.ctaLink || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (blockType === 'beauty_quick_actions') {
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
    if (blockType === 'beauty_trend_carousel') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (blockType === 'beauty_product_shelf') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        price: item?.price || item?.sellingPrice || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (blockType === 'beauty_routine_list') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || '',
        iconName: item?.iconName || item?.icon || '',
        iconUrl: item?.iconUrl || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (blockType === 'beauty_tip_chips') {
      return {
        ...base,
        text: item?.text || item?.title || item?.label || '',
        deepLink: item?.deepLink || '',
      };
    }
    if (blockType === 'beauty_salon_carousel') {
      return {
        ...base,
        title: item?.title || item?.name || item?.label || '',
        subtitle: item?.subtitle || item?.area || '',
        rating: item?.rating || '',
        distance: item?.distance || '',
        imageUrl: item?.imageUrl || item?.imageUri || item?.thumbnailImage || '',
        deepLink: item?.deepLink || item?.targetUrl || '',
      };
    }
    if (blockType === 'icon_list') {
      return {
        ...base,
        iconUrl: item?.iconUrl || '',
        title: item?.title || '',
        subtitle: item?.subtitle || '',
        deepLink: item?.deepLink || '',
      };
    }
    if (blockType === 'chip_scroll') {
      return {
        ...base,
        text: item?.text || item?.title || item?.label || '',
        deepLink: item?.deepLink || '',
      };
    }
    if (blockType === 'category_showcase') {
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
  return normalized.length > 0 ? normalized : [getPhaseOneDefaultItem(blockType, 0)];
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
  { value: 'TOP_SELLING', label: 'Top selling categories' },
  { value: 'MAIN_CATEGORY', label: 'Selected main category categories' },
];
export const SOURCE_TYPE_OPTIONS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'CATEGORY_FEED', label: 'Category feed' },
];

export const SHOWCASE_VARIANT_OPTIONS = [
  { value: 'circle', label: 'Circle' },
  { value: 'circle_icon', label: 'Circle + Icon badge' },
  { value: 'card', label: 'Card' },
];

export const MULTI_ITEM_GRID_FEED_OPTIONS = [
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
  if (normalizedRef === 'home_top_selling_products') return 'BESTSELLER';
  if (normalizedRef === 'home_recommended_products') return 'FREQUENTLY_BOUGHT';
  if (normalizedRef === 'home_most_rated_products') return 'TRENDING';
  return String(fallbackMode || 'FREQUENTLY_BOUGHT').trim().toUpperCase();
};

export const DEEP_LINK_TEMPLATE_PRESETS = [
  { value: 'app://category/{id}', label: 'Category details (app://category/{id})' },
  { value: 'app://collection/{id}', label: 'Collection listing (app://collection/{id})' },
  { value: 'app://campaign/{slug}', label: 'Campaign (app://campaign/{slug})' },
];

export const ITEM_DEEP_LINK_PRESETS = [
  { value: 'app://category/', label: 'Category (append category id)' },
  { value: 'app://collection/', label: 'Collection (append collection id)' },
  { value: 'app://campaign/', label: 'Campaign (append slug)' },
  { value: 'app://product/', label: 'Product (append product id)' },
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
    sourceFeedMode: String(form?.sourceFeedMode || 'TOP_SELLING').trim().toUpperCase(),
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
  ...(slug === 'beauty' ? buildBeautyDefaultSections(industryId) : []),
  ...(slug === 'beauty'
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
  bentoHeaderImage: '',
  bentoHeroImage: '',
  bentoHeroLink: '',
  bentoHeroLabel: '',
  bentoHeroBadge: '',
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
  mappingTitleField: 'name',
  mappingImageField: 'imageUrl',
  mappingSecondaryImageField: '',
  mappingDeepLinkTemplate: 'app://category/{id}',
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
