import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Banner } from '../components';
import {
  getAppConfigDraft,
  getPublishedAppConfig,
  getAppConfigPresets,
  listAppConfigVersions,
  listCategories,
  listIndustries,
  createIndustry,
  publishAppConfig,
  rollbackAppConfig,
  saveAppConfigDraft,
  uploadBannerImages,
  validateAppConfig,
} from '../services/adminApi';

const emptyMessage = { type: 'info', text: '' };

const parseJson = (value) => {
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

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-');
const parseCsvList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const formatCsvList = (value) => (Array.isArray(value) ? value.filter(Boolean).join(', ') : '');
const parseAspectRatioValue = (value) => {
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
const toLocalInputValue = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};
const fromLocalInputValue = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
};
const isHardcodedSection = (section) => section?.type === 'hardcoded';
const isHomeMainPage = (page) => page?.id === 'home_main' || page?.route === '/home';

const screenSectionTypeOptions = [
  { value: 'carousel', label: 'Carousel' },
  { value: 'horizontalList', label: 'Horizontal list' },
  { value: 'grid', label: 'Grid' },
  { value: 'categoryPreviewGrid', label: 'Category preview grid' },
  { value: 'campaignBento', label: 'Campaign bento' },
  { value: 'list', label: 'List' },
  { value: 'banner', label: 'Banner' },
  { value: 'card', label: 'Card' },
  { value: 'twoColumn', label: 'Two column' },
  { value: 'spacer', label: 'Spacer' },
  { value: 'title', label: 'Title' },
  { value: 'video', label: 'Video' },
];

const headerSectionTypeOptions = [
  { value: 'addressHeader', label: 'Address Header' },
  { value: 'searchBar', label: 'Search Bar' },
  { value: 'horizontalPills', label: 'Horizontal Pills' },
];

const headerToolboxItems = [
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

const screenToolboxItems = [
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
    key: 'sectionTitle',
    label: 'Section Title Block',
    hint: 'Standalone heading',
    section: { id: 'section_title', type: 'title', blockType: 'sectionTitle', text: 'Frequently bought' },
  },
  {
    key: 'multiItemGrid',
    label: 'Multi Item Grid Block',
    hint: 'Grid of collections',
    section: {
      id: 'multi_item_grid',
      type: 'grid',
      blockType: 'multiItemGrid',
      title: 'Frequently bought',
      collectionIds: [],
      columns: 2,
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
];

const toolboxItems = [...headerToolboxItems, ...screenToolboxItems];

const blockLabels = {
  addressHeader: 'Address Header Block',
  searchBar: 'Search Bar Block',
  horizontalPills: 'Horizontal Pills Block',
  heroBanner: 'Hero Banner Block',
  sectionTitle: 'Section Title Block',
  multiItemGrid: 'Multi Item Grid Block',
  categoryPreviewGrid: 'Category Preview Grid',
  campaignBento: 'Campaign Bento Block',
};

const resolveBlockLabel = (blockType, fallback) =>
  blockLabels[blockType] || fallback || 'Block';

const resolveBlockType = (section) => {
  if (!section) return '';
  if (section.blockType) return section.blockType;
  if (section.type === 'banner') return 'heroBanner';
  if (section.type === 'title') return 'sectionTitle';
  if (section.type === 'grid') return 'multiItemGrid';
  if (section.type === 'campaign' || section.type === 'campaignBento') return 'campaignBento';
  return section.type || '';
};

const normalizeCollectionId = (value) => (value === undefined || value === null ? '' : String(value).trim());

const normalizeMatchValue = (value) => (value === undefined || value === null ? '' : String(value).trim().toLowerCase());
const resolveIndustryId = (industry) =>
  normalizeCollectionId(
    industry?.id ?? industry?._id ?? industry?.slug ?? industry?.industryId ?? industry?.industry_id ?? industry?.name
  );
const resolveIndustryLabel = (industry) => industry?.name || industry?.label || industry?.title || 'Industry';

const sizePresets = {
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

const categoryLayoutPresets = [
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

const findPresetKey = (list, value) => {
  const num = typeof value === 'number' ? value : Number(value);
  const match = list.find((item) => item.value === num);
  return match ? match.key : '';
};

const ensureBentoTiles = (tiles, count = 4) => {
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

const matchesLayoutPreset = (preset, form) => {
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

const fallbackHeaderTabs = [
  { id: 'home', label: 'Home', route: '/home' },
  { id: 'electronics', label: 'Electronics', route: '/home/electronics' },
  { id: 'beauty', label: 'Beauty', route: '/home/beauty' },
  { id: 'grocery', label: 'Grocery', route: '/home/grocery' },
  { id: 'fashion', label: 'Fashion', route: '/home/fashion' },
  { id: 'agriculture', label: 'Agriculture', route: '/home/agriculture' },
];

const fallbackIndustryPresets = [
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

const homeFixedSections = [
  { id: 'stats_row', title: 'Sales Report' },
  { id: 'b2b_b2c', title: 'B2B & B2C' },
  { id: 'quick_action', title: 'Quick Action' },
  { id: 'business_of_month', title: 'Business of Month' },
  { id: 'trending_categories', title: 'Categories of Trending' },
  { id: 'bestsellers', title: 'Bestsellers' },
  { id: 'services_near_you', title: 'Services Near You' },
  { id: 'business_health', title: 'Your Business Health' },
];

const buildHomeFixedSections = () =>
  homeFixedSections.map((section) => ({
    id: section.id,
    type: 'hardcoded',
    title: section.title,
    enabled: true,
  }));

const normalizeSlug = (value) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const resolveIndustryRoute = (industry, slug) => {
  const path = industry?.path;
  if (path && typeof path === 'string') {
    return path.startsWith('/') ? path : `/${path}`;
  }
  return slug ? `/home/${slug}` : '/home';
};

const buildIndustryPresets = (industries = []) => {
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
      };
    })
    .filter(Boolean);
};

const buildHeaderTabs = (industries = []) => {
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

const buildPagePresets = (industries = []) => {
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

const quickSectionPresets = [
  {
    key: 'todays_deals',
    label: "Add Today's Deals",
    section: {
      id: 'todays_deals',
      type: 'horizontalList',
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

const buildDataSources = (pagePresets = []) => {
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
  return sources;
};

const buildDefaultConfig = (pagePresets, headerTabs) => ({
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

const defaultSectionForm = {
  id: '',
  type: 'banner',
  blockType: 'heroBanner',
  title: '',
  text: '',
  imageUrl: '',
  aspectRatio: '',
  deepLink: '',
  collectionIds: [],
  placement: '',
  placeholder: '',
  sectionBgColor: '',
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
};

const defaultHeaderForm = {
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

const defaultHeaderSectionForm = {
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

const getPageKey = (page, index) => page?.id || page?.route || `page_${index + 1}`;
const getPageLabel = (page, index, presets) => {
  const preset = (presets || []).find((item) => item.id === page?.id);
  return preset?.label || page?.id || page?.route || `Page ${index + 1}`;
};

const SortableSectionRow = ({ id, className, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className={`${className} ${isDragging ? 'is-dragging' : ''}`}>
      <div className="section-grip" {...attributes} {...listeners} />
      {children}
    </div>
  );
};

const getPreviewItems = (section, fallbackCount = 4) => {
  if (Array.isArray(section?.items) && section.items.length > 0) {
    return section.items;
  }
  return Array.from({ length: fallbackCount }).map((_, index) => ({
    _placeholder: true,
    title: `Item ${index + 1}`,
  }));
};

const getPreviewImage = (item) =>
  item?.imageUrl || item?.imageUri || item?.thumbnailImage || item?.galleryImages?.[0]?.url || '';

const getPreviewTitle = (item) => item?.title || item?.name || item?.label || 'Item';

const ToolboxItem = ({ item, onAdd }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `toolbox:${item.key}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`toolbox-item ${isDragging ? 'is-dragging' : ''}`}
    >
      <div className="toolbox-grip" {...attributes} {...listeners} />
      <div className="toolbox-body">
        <div className="toolbox-title">{item.label}</div>
        <div className="toolbox-hint">{item.hint}</div>
      </div>
      <button
        type="button"
        className="ghost-btn small"
        onClick={() => onAdd(item)}
      >
        Add
      </button>
    </div>
  );
};

const DropZone = ({ id, isOver, children, className, style, onClick }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isOver ? 'is-over' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

const SortablePreviewItem = ({ id, className, onClick, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? 'is-dragging' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        if (onClick) {
          onClick(event);
        }
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

function AppConfigPage({ token }) {
  const [draftText, setDraftText] = useState('');
  const [version, setVersion] = useState('');
  const [message, setMessage] = useState(emptyMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [showCustomPageFields, setShowCustomPageFields] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingHeaderImage, setIsUploadingHeaderImage] = useState(false);
  const [isUploadingHeroBanner, setIsUploadingHeroBanner] = useState(false);
  const [isUploadingBentoImage, setIsUploadingBentoImage] = useState(false);
  const [bentoUploadTarget, setBentoUploadTarget] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPageKey, setSelectedPageKey] = useState('');
  const [industries, setIndustries] = useState([]);
  const [newPageId, setNewPageId] = useState('');
  const [newPageRoute, setNewPageRoute] = useState('');
  const [newPageSource, setNewPageSource] = useState('');
  const [sectionForm, setSectionForm] = useState(defaultSectionForm);
  const [headerForm, setHeaderForm] = useState(defaultHeaderForm);
  const [headerPresets, setHeaderPresets] = useState({ colors: [], images: [] });
  const [headerSectionForm, setHeaderSectionForm] = useState(defaultHeaderSectionForm);
  const [newIndustryName, setNewIndustryName] = useState('');
  const [isCreatingIndustry, setIsCreatingIndustry] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  const [editingHeaderSectionIndex, setEditingHeaderSectionIndex] = useState(null);
  const [pagePresetKey, setPagePresetKey] = useState('');
  const [collections, setCollections] = useState([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const bannerInputRef = useRef(null);
  const headerInputRef = useRef(null);
  const heroBannerInputRef = useRef(null);
  const bentoInputRef = useRef(null);
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [showHeaderAdvancedFields, setShowHeaderAdvancedFields] = useState(false);

  const pagePresets = useMemo(() => buildPagePresets(industries), [industries]);
  const headerTabs = useMemo(() => buildHeaderTabs(industries), [industries]);

  const selectedMeta = useMemo(
    () => versions.find((item) => item.id === selectedId) || null,
    [versions, selectedId]
  );
  const latestUpdated = versions?.[0]?.updated_on || versions?.[0]?.published_on || null;

  const configSnapshot = useMemo(() => {
    const parsed = parseJson(draftText);
    return parsed.error ? null : parsed.data;
  }, [draftText]);

  const pages = useMemo(() => (Array.isArray(configSnapshot?.pages) ? configSnapshot.pages : []), [configSnapshot]);

  const selectedPageIndex = useMemo(() => {
    if (!selectedPageKey) return -1;
    return pages.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
  }, [pages, selectedPageKey]);

  const selectedPage = selectedPageIndex >= 0 ? pages[selectedPageIndex] : null;

  const selectedSections = useMemo(() => {
    const sections = selectedPage?.screen?.sections;
    return Array.isArray(sections) ? sections : [];
  }, [selectedPage]);
  const selectedHeaderSections = useMemo(() => {
    const sections = selectedPage?.header?.blocks;
    return Array.isArray(sections) ? sections : [];
  }, [selectedPage]);
  const buildDragId = (section, index, prefix) => {
    const base = section?.id || `${prefix}-section-${index}`;
    return `${prefix}-${base}`;
  };
  const headerDragIds = useMemo(
    () => selectedHeaderSections.map((section, index) => buildDragId(section, index, 'header')),
    [selectedHeaderSections]
  );
  const activeSection = editingSectionIndex !== null ? selectedSections[editingSectionIndex] : null;
  const activeHeaderSection =
    editingHeaderSectionIndex !== null ? selectedHeaderSections[editingHeaderSectionIndex] : null;
  const isEditingFixed = isHardcodedSection(activeSection);

  const pageCount = pages.length;
  const sectionCount = selectedSections.length;
  const versionCount = versions.length;
  const industryCount = industries.length;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const headerDrop = useDroppable({ id: 'drop-header' });
  const screenDrop = useDroppable({ id: 'drop-screen' });

  useEffect(() => {
    if (!pages.length) {
      if (selectedPageKey) setSelectedPageKey('');
      return;
    }
    const exists = pages.some((page, index) => getPageKey(page, index) === selectedPageKey);
    if (!selectedPageKey || !exists) {
      const homeIndex = pages.findIndex((page) => page?.id === 'home_main' || page?.route === '/home');
      const nextIndex = homeIndex >= 0 ? homeIndex : 0;
      setSelectedPageKey(getPageKey(pages[nextIndex], nextIndex));
    }
  }, [pages, selectedPageKey]);

  useEffect(() => {
    if (!selectedPage || !selectedPage.header) {
      setHeaderForm({ ...defaultHeaderForm });
      return;
    }
    const header = selectedPage.header || {};
    const joinList = (value) => {
      if (Array.isArray(value)) return value.join(', ');
      if (typeof value === 'string') return value;
      return '';
    };
    setHeaderForm({
      backgroundImage: typeof header.backgroundImage === 'string' ? header.backgroundImage : '',
      overlayGradient: joinList(header.overlayGradient),
      backgroundColor: typeof header.backgroundColor === 'string' ? header.backgroundColor : '',
      searchBg: typeof header.searchBg === 'string' ? header.searchBg : '',
      searchText: typeof header.searchText === 'string' ? header.searchText : '',
      iconColor: typeof header.iconColor === 'string' ? header.iconColor : '',
      locationColor: typeof header.locationColor === 'string' ? header.locationColor : '',
      profileBg: typeof header.profileBg === 'string' ? header.profileBg : '',
      profileIconColor: typeof header.profileIconColor === 'string' ? header.profileIconColor : '',
      categoryColor: typeof header.categoryColor === 'string' ? header.categoryColor : '',
      minHeight:
        typeof header.minHeight === 'number' && Number.isFinite(header.minHeight)
          ? String(header.minHeight)
          : '',
      paddingTop:
        typeof header.paddingTop === 'number' && Number.isFinite(header.paddingTop)
          ? String(header.paddingTop)
          : '',
      paddingBottom:
        typeof header.paddingBottom === 'number' && Number.isFinite(header.paddingBottom)
          ? String(header.paddingBottom)
          : '',
    });
  }, [selectedPage]);

  useEffect(() => {
    if (!pagePresets.length) return;
    if (!pagePresetKey) {
      setPagePresetKey(pagePresets[0]?.id || '');
    }
  }, [pagePresets, pagePresetKey]);

  const loadDraft = async () => {
    setIsLoading(true);
    setMessage(emptyMessage);
    try {
      const response = await getAppConfigDraft(token);
      const payload = response?.data;
      if (payload?.config) {
        setDraftText(JSON.stringify(payload.config, null, 2));
        setVersion(payload?.meta?.version || '');
        return;
      }
      const published = await getPublishedAppConfig();
      const publishedPayload = published?.data;
      if (publishedPayload?.config) {
        setDraftText(JSON.stringify(publishedPayload.config, null, 2));
        setVersion(publishedPayload?.meta?.version || '');
        setMessage({ type: 'info', text: 'Loaded published config (no draft found).' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load draft config.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const response = await listAppConfigVersions(token);
      setVersions(response?.data || []);
    } catch (error) {
      setVersions([]);
    }
  };

  const loadIndustries = async () => {
    try {
      const response = await listIndustries(token);
      const items = response?.data;
      const sorted = Array.isArray(items)
        ? [...items].sort((a, b) => (a?.ordering ?? 0) - (b?.ordering ?? 0))
        : [];
      setIndustries(sorted);
    } catch (error) {
      setIndustries([]);
    }
  };

  const loadCollections = async () => {
    setIsLoadingCollections(true);
    try {
      const response = await listCategories(token);
      const items = response?.data || response;
      setCollections(Array.isArray(items) ? items : []);
    } catch (error) {
      setCollections([]);
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const handleCreateIndustry = async () => {
    const trimmed = newIndustryName.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Enter an industry name first.' });
      return;
    }
    setIsCreatingIndustry(true);
    setMessage(emptyMessage);
    try {
      const response = await createIndustry(token, { name: trimmed, active: 1 });
      const created = response?.data || null;
      const updated = Array.isArray(industries) ? [...industries] : [];
      if (created) {
        updated.push(created);
      }
      setIndustries(updated);
      setNewIndustryName('');
      const createdId = resolveIndustryId(created);
      if (createdId) {
        setHeaderSectionForm((prev) => {
          const current = Array.isArray(prev.industryIds) ? prev.industryIds : [];
          if (current.includes(createdId)) return prev;
          return { ...prev, industryIds: [...current, createdId] };
        });
      }
      ensureHeaderPages(buildPagePresets(updated), buildHeaderTabs(updated));
      setMessage({ type: 'success', text: 'Industry added and pages synced. Remember to save draft.' });
      await loadIndustries();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to add industry.' });
    } finally {
      setIsCreatingIndustry(false);
    }
  };


  const loadHeaderPresets = async () => {
    try {
      const response = await getAppConfigPresets(token);
      const payload = response?.data || {};
      const colors = Array.isArray(payload?.colors) ? payload.colors : [];
      const images = Array.isArray(payload?.images) ? payload.images : [];
      setHeaderPresets({ colors, images });
    } catch (error) {
      setHeaderPresets({ colors: [], images: [] });
    }
  };

  useEffect(() => {
    loadDraft();
    loadVersions();
    loadIndustries();
    loadCollections();
    loadHeaderPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValidate = async () => {
    const parsed = parseJson(draftText);
    if (parsed.error) {
      setMessage({ type: 'error', text: parsed.error });
      return;
    }
    setIsLoading(true);
    setMessage(emptyMessage);
    try {
      await validateAppConfig(token, { config: parsed.data, version: version || undefined });
      setMessage({ type: 'success', text: 'Config validation passed.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Validation failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = async () => {
    const parsed = parseJson(draftText);
    if (parsed.error) {
      setMessage({ type: 'error', text: parsed.error });
      return;
    }
    setIsLoading(true);
    setMessage(emptyMessage);
    try {
      const response = await saveAppConfigDraft(token, { config: parsed.data, version: version || undefined });
      const payload = response?.data;
      if (payload?.meta?.version) {
        setVersion(payload.meta.version);
      }
      setMessage({ type: 'success', text: 'Draft saved.' });
      await loadVersions();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save draft.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    await saveDraft();
  };

  const handlePublish = async () => {
    setIsLoading(true);
    setMessage(emptyMessage);
    try {
      await publishAppConfig(token);
      setMessage({ type: 'success', text: 'Draft published.' });
      await loadVersions();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Publish failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async (id) => {
    if (!id) return;
    setIsLoading(true);
    setMessage(emptyMessage);
    try {
      await rollbackAppConfig(token, { id });
      setMessage({ type: 'success', text: 'Rollback completed.' });
      await loadVersions();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Rollback failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadDraft(), loadVersions(), loadIndustries(), loadCollections()]);
  };

  const handleCreateBaseConfig = () => {
    const payload = JSON.parse(JSON.stringify(buildDefaultConfig(pagePresets, headerTabs)));
    setDraftText(JSON.stringify(payload, null, 2));
    setVersion(payload.version || '1.0.0');
    setSelectedPageKey(getPageKey(payload.pages[0], 0));
    setMessage({ type: 'success', text: 'Base config created. You can now use the builder.' });
  };

  const handleAddPresetPage = () => {
    const config = getConfigForBuilder();
    if (!config) return;
    const preset = pagePresets.find((page) => page.id === pagePresetKey);
    if (!preset) {
      setMessage({ type: 'error', text: 'Select a preset page first.' });
      return;
    }
    const next = cloneConfig(config);
    ensureHeaderTabs(next);
    const pagesList = ensurePagesArray(next);
    const duplicate = pagesList.some((page) => page?.id === preset.id || page?.route === preset.route);
    if (duplicate) {
      setMessage({ type: 'error', text: 'Preset page already exists.' });
      return;
    }
    pagesList.push({
      id: preset.id,
      route: preset.route,
      dataSourceRef: preset.dataSourceRef,
      screen: {
        type: 'screen',
        bgColorRef: 'bg.page',
        sections: Array.isArray(preset.sections) ? preset.sections.map((section) => ({ ...section })) : [],
      },
    });
    if (!next.dataSources || typeof next.dataSources !== 'object') {
      next.dataSources = {};
    }
    if (preset.dataSourceRef && !next.dataSources[preset.dataSourceRef]) {
      next.dataSources[preset.dataSourceRef] = {
        method: 'GET',
        url: preset.dataSourceUrl || `/api/${preset.dataSourceRef}`,
      };
    }
    updateConfigFromBuilder(next, 'Preset page added. Remember to save draft.');
    setSelectedPageKey(preset.id);
  };

  const getConfigForBuilder = () => {
    const parsed = parseJson(draftText);
    if (parsed.error) {
      setMessage({ type: 'error', text: parsed.error });
      return null;
    }
    return parsed.data;
  };

  const cloneConfig = (config) => JSON.parse(JSON.stringify(config));

  const updateConfigFromBuilder = (config, text) => {
    setDraftText(JSON.stringify(config, null, 2));
    if (text) {
      setMessage({ type: 'success', text });
    }
  };

  const resetSectionForm = () => {
    setSectionForm({ ...defaultSectionForm });
    setEditingSectionIndex(null);
    setShowAdvancedFields(false);
  };

  const resetHeaderSectionForm = () => {
    setHeaderSectionForm({ ...defaultHeaderSectionForm });
    setEditingHeaderSectionIndex(null);
    setShowHeaderAdvancedFields(false);
  };

  const openAddSection = () => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding sections.' });
      return;
    }
    resetSectionForm();
    setShowCustomPageFields(false);
    setActivePanel('screen');
  };

  const openAddHeaderSection = () => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding header blocks.' });
      return;
    }
    resetHeaderSectionForm();
    setShowCustomPageFields(false);
    setActivePanel('header');
  };

  const openEditSection = (index) => {
    handleSelectSection(index);
    setShowAdvancedFields(false);
    setShowCustomPageFields(false);
    setActivePanel('screen');
  };

  const openEditHeaderSection = (index) => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before editing header blocks.' });
      return;
    }
    setEditingHeaderSectionIndex(index);
    const section = selectedHeaderSections[index];
    setHeaderSectionForm(buildSectionFormFromConfig(section, 'addressHeader'));
    setShowHeaderAdvancedFields(false);
    setShowCustomPageFields(false);
    setActivePanel('header');
  };

  const openHeaderSettings = () => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before editing header settings.' });
      return;
    }
    setActivePanel(null);
    setShowCustomPageFields(true);
  };

  const updateBentoTile = (index, field, value) => {
    setSectionForm((prev) => {
      const nextTiles = ensureBentoTiles(prev.bentoTiles);
      nextTiles[index] = { ...nextTiles[index], [field]: value };
      return { ...prev, bentoTiles: nextTiles };
    });
  };

  const closeEditor = () => {
    setActivePanel(null);
    resetSectionForm();
  };

  const closeHeaderEditor = () => {
    setActivePanel(null);
    resetHeaderSectionForm();
  };

  const ensureHeaderTabs = (config, tabsOverride) => {
    if (!config.navigation || typeof config.navigation !== 'object') {
      config.navigation = { topCategoryTabs: [], bottomTabs: [] };
    }
    if (!Array.isArray(config.navigation.topCategoryTabs)) {
      config.navigation.topCategoryTabs = [];
    }
    const resolvedTabs = Array.isArray(tabsOverride) ? tabsOverride : headerTabs;
    resolvedTabs.forEach((tab) => {
      const exists = config.navigation.topCategoryTabs.some((item) => item?.id === tab.id);
      if (!exists) {
        config.navigation.topCategoryTabs.push({ id: tab.id, label: tab.label, route: tab.route });
      }
    });
  };

  const ensureHeaderPages = (presetsOverride, tabsOverride) => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    const resolvedPresets = Array.isArray(presetsOverride) ? presetsOverride : pagePresets;
    const resolvedTabs = Array.isArray(tabsOverride) ? tabsOverride : headerTabs;
    ensureHeaderTabs(next, resolvedTabs);
    const pagesList = ensurePagesArray(next);
    resolvedPresets.forEach((preset) => {
      const exists = pagesList.some((page) => page?.id === preset.id || page?.route === preset.route);
      if (!exists) {
        pagesList.push({
          id: preset.id,
          route: preset.route,
          dataSourceRef: preset.dataSourceRef,
          screen: {
            type: 'screen',
            bgColorRef: 'bg.page',
            sections: Array.isArray(preset.sections) ? preset.sections.map((section) => ({ ...section })) : [],
          },
        });
      }
      if (preset.dataSourceRef && !next.dataSources[preset.dataSourceRef]) {
        next.dataSources[preset.dataSourceRef] = {
          method: 'GET',
          url: preset.dataSourceUrl || `/api/${preset.dataSourceRef}`,
        };
      }
    });
    if (!next.dataSources || typeof next.dataSources !== 'object') {
      next.dataSources = {};
    }
    if (!next.dataSources.todaydealproducts) {
      next.dataSources.todaydealproducts = { method: 'GET', url: '/api/user/todaydealproducts' };
    }
    updateConfigFromBuilder(next, 'Header pages ensured. Remember to save draft.');
  };

  const buildUniqueSectionId = (baseId, sections) => {
    if (!sections.some((section) => section?.id === baseId)) return baseId;
    let index = 2;
    while (sections.some((section) => section?.id === `${baseId}_${index}`)) {
      index += 1;
    }
    return `${baseId}_${index}`;
  };

  const addSectionFromPreset = (preset, overrides, target = 'screen', insertIndex = null) => {
    const config = getConfigForBuilder();
    if (!config) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding sections.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
    if (pageIndex < 0) {
      setMessage({ type: 'error', text: 'Selected page not found in config.' });
      return;
    }
    const sections = target === 'header'
      ? ensureHeaderBlocks(pagesList[pageIndex])
      : ensureScreenSections(pagesList[pageIndex]);
    const base = { ...preset.section, ...(overrides || {}) };
    if (Array.isArray(base.collectionIds)) {
      base.collectionIds = [...base.collectionIds];
    }
    if (Array.isArray(base.items)) {
      base.items = base.items.map((item) => ({ ...item }));
    }
    if (target === 'header') {
      const alreadyExists = sections.some((section) => section?.type === base.type);
      if (alreadyExists) {
        setMessage({ type: 'error', text: 'This header block already exists.' });
        return;
      }
    }
    base.id = buildUniqueSectionId(base.id, sections);
    if (insertIndex !== null && insertIndex >= 0 && insertIndex <= sections.length) {
      sections.splice(insertIndex, 0, base);
    } else {
      sections.push(base);
    }
    if (!next.dataSources || typeof next.dataSources !== 'object') {
      next.dataSources = {};
    }
    if (base.dataSourceRef && !next.dataSources[base.dataSourceRef]) {
      next.dataSources[base.dataSourceRef] = { method: 'GET', url: `/api/${base.dataSourceRef}` };
    }
    updateConfigFromBuilder(next, 'Section added. Remember to save draft.');
    const resolvedIndex = insertIndex !== null && insertIndex >= 0 ? insertIndex : sections.length - 1;
    return { index: resolvedIndex, section: base, target };
  };

  const applySectionPreset = (presetKey) => {
    const preset = quickSectionPresets.find((item) => item.key === presetKey);
    if (!preset) return;
    setSectionForm((prev) => ({
      ...prev,
      id: preset.section.id || '',
      type: preset.section.type || prev.type,
      title: preset.section.title || '',
      itemsPath: preset.section.itemsPath || '',
      itemTemplateRef: preset.section.itemTemplateRef || '',
      dataSourceRef: preset.section.dataSourceRef || '',
      columns: preset.section.columns ? String(preset.section.columns) : '',
    }));
  };

  const handleAddQuickSection = (presetKey) => {
    const preset = quickSectionPresets.find((item) => item.key === presetKey);
    if (!preset) {
      setMessage({ type: 'error', text: 'Preset not found.' });
      return;
    }
    addSectionFromPreset(preset);
  };

  const handleBannerClick = () => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding banners.' });
      return;
    }
    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
      bannerInputRef.current.click();
    }
  };

  const handleBannerFiles = async (event) => {
    const files = event?.target?.files;
    if (!files || files.length === 0) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding banners.' });
      return;
    }
    setIsUploadingBanner(true);
    setMessage(emptyMessage);
    try {
      const limited = Array.from(files).slice(0, 3);
      const response = await uploadBannerImages(token, limited);
      const urls = response?.data?.urls || [];
      if (!urls.length) {
        throw new Error('Upload failed. No URLs returned.');
      }
      const items = urls.map((url) => ({ imageUrl: url }));
      addSectionFromPreset(
        { section: { id: 'ad_banner', type: 'carousel', title: 'Advertisement', itemTemplateRef: 'bannerCard' } },
        { items },
        'screen'
      );
      setMessage({ type: 'success', text: 'Banner section added.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload banner images.' });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleHeaderImageClick = () => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before uploading header image.' });
      return;
    }
    if (headerInputRef.current) {
      headerInputRef.current.value = '';
      headerInputRef.current.click();
    }
  };

  const handleHeaderImageFiles = async (event) => {
    const files = event?.target?.files;
    if (!files || files.length === 0) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before uploading header image.' });
      return;
    }
    setIsUploadingHeaderImage(true);
    setMessage(emptyMessage);
    try {
      const limited = Array.from(files).slice(0, 1);
      const response = await uploadBannerImages(token, limited);
      const urls = response?.data?.urls || [];
      if (!urls.length) {
        throw new Error('Upload failed. No URLs returned.');
      }
      setHeaderForm((prev) => ({ ...prev, backgroundImage: urls[0] }));
      setMessage({ type: 'success', text: 'Header image uploaded. Click "Apply Header" to save.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload header image.' });
    } finally {
      setIsUploadingHeaderImage(false);
    }
  };

  const handleHeroBannerClick = () => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding hero banners.' });
      return;
    }
    if (heroBannerInputRef.current) {
      heroBannerInputRef.current.value = '';
      heroBannerInputRef.current.click();
    }
  };

  const handleHeroBannerFiles = async (event) => {
    const files = event?.target?.files;
    if (!files || files.length === 0) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding hero banners.' });
      return;
    }
    setIsUploadingHeroBanner(true);
    setMessage(emptyMessage);
    try {
      const limited = Array.from(files).slice(0, 3);
      const response = await uploadBannerImages(token, limited);
      const urls = response?.data?.urls || [];
      if (!urls.length) {
        throw new Error('Upload failed. No URLs returned.');
      }
      const items = urls.map((url) => ({ imageUrl: url }));
      addSectionFromPreset(
        { section: { id: 'hero_banner', type: 'carousel', title: 'Hero Banner' } },
        { items },
        'header'
      );
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload hero banner.' });
    } finally {
      setIsUploadingHeroBanner(false);
    }
  };

  const handleBentoImageClick = (target) => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before uploading images.' });
      return;
    }
    setBentoUploadTarget(target);
    if (bentoInputRef.current) {
      bentoInputRef.current.value = '';
      bentoInputRef.current.click();
    }
  };

  const handleBentoImageFiles = async (event) => {
    const files = event?.target?.files;
    if (!files || files.length === 0) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before uploading images.' });
      return;
    }
    if (!bentoUploadTarget) return;
    setIsUploadingBentoImage(true);
    setMessage(emptyMessage);
    try {
      const limited = Array.from(files).slice(0, 1);
      const response = await uploadBannerImages(token, limited);
      const urls = response?.data?.urls || [];
      if (!urls.length) {
        throw new Error('Upload failed. No URLs returned.');
      }
      const url = urls[0];
      if (bentoUploadTarget.kind === 'header') {
        setSectionForm((prev) => ({ ...prev, bentoHeaderImage: url }));
      } else if (bentoUploadTarget.kind === 'hero') {
        setSectionForm((prev) => ({ ...prev, bentoHeroImage: url }));
      } else if (bentoUploadTarget.kind === 'tile') {
        updateBentoTile(bentoUploadTarget.index, 'imageUrl', url);
      }
      setMessage({ type: 'success', text: 'Image uploaded.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload image.' });
    } finally {
      setIsUploadingBentoImage(false);
      setBentoUploadTarget(null);
    }
  };

  const ensurePagesArray = (config) => {
    if (!Array.isArray(config.pages)) {
      config.pages = [];
    }
    return config.pages;
  };

  const ensureScreenSections = (page) => {
    if (!page.screen || typeof page.screen !== 'object') {
      page.screen = { type: 'screen', sections: [] };
    }
    if (!Array.isArray(page.screen.sections)) {
      page.screen.sections = [];
    }
    return page.screen.sections;
  };

  const ensureHeaderBlocks = (page) => {
    if (!page.header || typeof page.header !== 'object') {
      page.header = {};
    }
    if (!Array.isArray(page.header.blocks)) {
      page.header.blocks = [];
    }
    return page.header.blocks;
  };

  const buildSectionFromForm = (base, form) => {
    const next = { ...(base || {}) };
    const setOrDelete = (key, value) => {
      if (value === undefined || value === null || String(value).trim() === '') {
        delete next[key];
        return;
      }
      next[key] = value;
    };
    setOrDelete('id', form.id?.trim());
    setOrDelete('type', form.type?.trim());
    setOrDelete('blockType', form.blockType?.trim());
    setOrDelete('title', form.title?.trim());
    setOrDelete('text', form.text?.trim());
    setOrDelete('imageUrl', form.imageUrl?.trim());
    setOrDelete('aspectRatio', form.aspectRatio?.trim());
    setOrDelete('deepLink', form.deepLink?.trim());
    setOrDelete('placeholder', form.placeholder?.trim());
    setOrDelete('sectionBgColor', form.sectionBgColor?.trim());
    setOrDelete('cardBgColor', form.cardBgColor?.trim());
    setOrDelete('titleColor', form.titleColor?.trim());
    setOrDelete('badgeBgColor', form.badgeBgColor?.trim());
    setOrDelete('badgeTextColor', form.badgeTextColor?.trim());
    setOrDelete('imageShellBg', form.imageShellBg?.trim());
    const paddingY = form.paddingY !== '' ? Number(form.paddingY) : null;
    if (paddingY && !Number.isNaN(paddingY)) {
      next.paddingY = paddingY;
    } else {
      delete next.paddingY;
    }
    const cardPadding = form.cardPadding !== '' ? Number(form.cardPadding) : null;
    if (cardPadding && !Number.isNaN(cardPadding)) {
      next.cardPadding = cardPadding;
    } else {
      delete next.cardPadding;
    }
    const cardRadius = form.cardRadius !== '' ? Number(form.cardRadius) : null;
    if (cardRadius && !Number.isNaN(cardRadius)) {
      next.cardRadius = cardRadius;
    } else {
      delete next.cardRadius;
    }
    const imageSize = form.imageSize !== '' ? Number(form.imageSize) : null;
    if (imageSize && !Number.isNaN(imageSize)) {
      next.imageSize = imageSize;
    } else {
      delete next.imageSize;
    }
    const imageRadius = form.imageRadius !== '' ? Number(form.imageRadius) : null;
    if (imageRadius && !Number.isNaN(imageRadius)) {
      next.imageRadius = imageRadius;
    } else {
      delete next.imageRadius;
    }
    const imageGap = form.imageGap !== '' ? Number(form.imageGap) : null;
    if (imageGap && !Number.isNaN(imageGap)) {
      next.imageGap = imageGap;
    } else {
      delete next.imageGap;
    }
    const headerImage = form.bentoHeaderImage?.trim();
    if (headerImage) {
      next.headerImage = headerImage;
    } else {
      delete next.headerImage;
    }
    const heroImage = form.bentoHeroImage?.trim();
    const heroLink = form.bentoHeroLink?.trim();
    const heroLabel = form.bentoHeroLabel?.trim();
    const heroBadge = form.bentoHeroBadge?.trim();
    if (heroImage || heroLink || heroLabel || heroBadge) {
      next.hero = {
        ...(heroImage ? { imageUrl: heroImage } : {}),
        ...(heroLink ? { deepLink: heroLink } : {}),
        ...(heroLabel ? { label: heroLabel } : {}),
        ...(heroBadge ? { badgeText: heroBadge } : {}),
      };
    } else {
      delete next.hero;
    }
    const tiles = Array.isArray(form.bentoTiles) ? form.bentoTiles : [];
    const normalizedTiles = tiles
      .map((tile) => ({
        imageUrl: tile?.imageUrl ? String(tile.imageUrl).trim() : '',
        deepLink: tile?.deepLink ? String(tile.deepLink).trim() : '',
        label: tile?.label ? String(tile.label).trim() : '',
      }))
      .filter((tile) => tile.imageUrl || tile.deepLink || tile.label);
    if (normalizedTiles.length > 0) {
      next.tiles = normalizedTiles;
    } else {
      delete next.tiles;
    }
    setOrDelete('itemsPath', form.itemsPath?.trim());
    setOrDelete('itemTemplateRef', form.itemTemplateRef?.trim());
    setOrDelete('dataSourceRef', form.dataSourceRef?.trim());
    const columns = form.columns !== '' ? Number(form.columns) : null;
    if (columns && !Number.isNaN(columns)) {
      next.columns = columns;
    } else {
      delete next.columns;
    }
    const height = form.height !== '' ? Number(form.height) : null;
    if (height && !Number.isNaN(height)) {
      next.height = height;
    } else {
      delete next.height;
    }
    setOrDelete('videoUrl', form.videoUrl?.trim());
    setOrDelete('posterUrl', form.posterUrl?.trim());
    setOrDelete('placement', form.placement?.trim());
    const collectionIds = Array.isArray(form.collectionIds)
      ? form.collectionIds.map((value) => normalizeCollectionId(value)).filter(Boolean)
      : [];
    if (collectionIds.length > 0) {
      next.collectionIds = collectionIds;
    } else {
      delete next.collectionIds;
    }
    const industryIds = Array.isArray(form.industryIds)
      ? form.industryIds.map((value) => normalizeCollectionId(value)).filter(Boolean)
      : [];
    if (industryIds.length > 0) {
      next.industryIds = industryIds;
    } else {
      delete next.industryIds;
    }
    if (form.enabled === false) {
      next.enabled = false;
    } else {
      delete next.enabled;
    }
    const scheduleStart = fromLocalInputValue(form.scheduleStart);
    const scheduleEnd = fromLocalInputValue(form.scheduleEnd);
    if (scheduleStart || scheduleEnd) {
      next.schedule = {
        ...(scheduleStart ? { startAt: scheduleStart } : {}),
        ...(scheduleEnd ? { endAt: scheduleEnd } : {}),
      };
    } else {
      delete next.schedule;
    }
    const targeting = {
      userTypes: parseCsvList(form.targetUserTypes),
      roles: parseCsvList(form.targetRoles),
      industries: parseCsvList(form.targetIndustries),
      subscriptionStatuses: parseCsvList(form.targetSubscriptionStatuses),
    };
    const hasTargeting = Object.values(targeting).some((list) => Array.isArray(list) && list.length > 0);
    if (hasTargeting) {
      next.targeting = targeting;
    } else {
      delete next.targeting;
    }
    return next;
  };

  const parseGradientList = (value) => {
    if (!value || typeof value !== 'string') return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item)).filter(Boolean);
        }
      } catch (error) {
        // fall back to comma parsing
      }
    }
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const handleHeaderSubmit = (event) => {
    event.preventDefault();
    const config = getConfigForBuilder();
    if (!config) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before editing header settings.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
    if (pageIndex < 0) {
      setMessage({ type: 'error', text: 'Selected page not found in config.' });
      return;
    }
    const currentHeader = pagesList[pageIndex]?.header && typeof pagesList[pageIndex].header === 'object'
      ? pagesList[pageIndex].header
      : {};
    const nextHeader = { ...currentHeader };

    const backgroundImage = headerForm.backgroundImage?.trim();
    if (backgroundImage) {
      nextHeader.backgroundImage = backgroundImage;
    } else {
      delete nextHeader.backgroundImage;
    }

    const backgroundColor = headerForm.backgroundColor?.trim();
    if (backgroundColor) {
      nextHeader.backgroundColor = backgroundColor;
    } else {
      delete nextHeader.backgroundColor;
    }

    const searchBg = headerForm.searchBg?.trim();
    if (searchBg) {
      nextHeader.searchBg = searchBg;
    } else {
      delete nextHeader.searchBg;
    }
    const searchText = headerForm.searchText?.trim();
    if (searchText) {
      nextHeader.searchText = searchText;
    } else {
      delete nextHeader.searchText;
    }
    const iconColor = headerForm.iconColor?.trim();
    if (iconColor) {
      nextHeader.iconColor = iconColor;
    } else {
      delete nextHeader.iconColor;
    }
    const locationColor = headerForm.locationColor?.trim();
    if (locationColor) {
      nextHeader.locationColor = locationColor;
    } else {
      delete nextHeader.locationColor;
    }
    const profileBg = headerForm.profileBg?.trim();
    if (profileBg) {
      nextHeader.profileBg = profileBg;
    } else {
      delete nextHeader.profileBg;
    }
    const profileIconColor = headerForm.profileIconColor?.trim();
    if (profileIconColor) {
      nextHeader.profileIconColor = profileIconColor;
    } else {
      delete nextHeader.profileIconColor;
    }
    const categoryColor = headerForm.categoryColor?.trim();
    if (categoryColor) {
      nextHeader.categoryColor = categoryColor;
    } else {
      delete nextHeader.categoryColor;
    }

    const overlayGradient = parseGradientList(headerForm.overlayGradient);
    if (overlayGradient.length > 0) {
      nextHeader.overlayGradient = overlayGradient;
    } else {
      delete nextHeader.overlayGradient;
    }

    const parseNumberField = (value) => {
      if (value === undefined || value === null) return null;
      const trimmed = String(value).trim();
      if (!trimmed) return null;
      const num = Number(trimmed);
      if (Number.isNaN(num)) return null;
      return num;
    };
    const minHeight = parseNumberField(headerForm.minHeight);
    if (minHeight !== null) {
      nextHeader.minHeight = minHeight;
    } else {
      delete nextHeader.minHeight;
    }
    const paddingTop = parseNumberField(headerForm.paddingTop);
    if (paddingTop !== null) {
      nextHeader.paddingTop = paddingTop;
    } else {
      delete nextHeader.paddingTop;
    }
    const paddingBottom = parseNumberField(headerForm.paddingBottom);
    if (paddingBottom !== null) {
      nextHeader.paddingBottom = paddingBottom;
    } else {
      delete nextHeader.paddingBottom;
    }

    if (Object.keys(nextHeader).length > 0) {
      pagesList[pageIndex].header = nextHeader;
    } else {
      delete pagesList[pageIndex].header;
    }
    updateConfigFromBuilder(next, 'Header settings updated. Remember to save draft.');
  };

  const handleClearHeader = () => {
    const config = getConfigForBuilder();
    if (!config) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before editing header settings.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
    if (pageIndex < 0) {
      setMessage({ type: 'error', text: 'Selected page not found in config.' });
      return;
    }
    const currentHeader = pagesList[pageIndex]?.header && typeof pagesList[pageIndex].header === 'object'
      ? pagesList[pageIndex].header
      : {};
    delete currentHeader.backgroundImage;
    delete currentHeader.overlayGradient;
    delete currentHeader.backgroundColor;
    delete currentHeader.searchBg;
    delete currentHeader.searchText;
    delete currentHeader.iconColor;
    delete currentHeader.locationColor;
    delete currentHeader.profileBg;
    delete currentHeader.profileIconColor;
    delete currentHeader.categoryColor;
    delete currentHeader.minHeight;
    delete currentHeader.paddingTop;
    delete currentHeader.paddingBottom;
    if (Object.keys(currentHeader).length > 0) {
      pagesList[pageIndex].header = currentHeader;
    } else {
      delete pagesList[pageIndex].header;
    }
    setHeaderForm({ ...defaultHeaderForm });
    updateConfigFromBuilder(next, 'Header settings cleared. Remember to save draft.');
  };

  const handleAddPage = () => {
    const config = getConfigForBuilder();
    if (!config) return;
    const id = newPageId.trim();
    const route = newPageRoute.trim();
    if (!id || !route) {
      setMessage({ type: 'error', text: 'Page id and route are required.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const duplicate = pagesList.some((page) => page?.id === id || page?.route === route);
    if (duplicate) {
      setMessage({ type: 'error', text: 'Page id or route already exists.' });
      return;
    }
    const page = {
      id,
      route,
      dataSourceRef: newPageSource.trim() || undefined,
      screen: { type: 'screen', bgColorRef: 'bg.page', sections: [] },
    };
    if (!page.dataSourceRef) {
      delete page.dataSourceRef;
    }
    pagesList.push(page);
    updateConfigFromBuilder(next, 'Page added. Remember to save draft.');
    setNewPageId('');
    setNewPageRoute('');
    setNewPageSource('');
    setSelectedPageKey(getPageKey(page, pagesList.length - 1));
  };

  const handleSectionSubmit = (event) => {
    event.preventDefault();
    if (editingSectionIndex !== null) {
      handleUpdateSection();
    } else {
      handleAddSection();
    }
  };

  const handleHeaderSectionSubmit = (event) => {
    event.preventDefault();
    if (editingHeaderSectionIndex !== null) {
      handleUpdateHeaderSection();
    } else {
      handleAddHeaderSection();
    }
  };

  const handleAddSection = () => {
    const config = getConfigForBuilder();
    if (!config) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding sections.' });
      return;
    }
    const id = sectionForm.id.trim();
    const type = sectionForm.type.trim();
    if (!id || !type) {
      setMessage({ type: 'error', text: 'Section id and type are required.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
    if (pageIndex < 0) {
      setMessage({ type: 'error', text: 'Selected page not found in config.' });
      return;
    }
    const sections = ensureScreenSections(pagesList[pageIndex]);
    if (sections.some((section) => section?.id === id)) {
      setMessage({ type: 'error', text: 'Section id already exists on this page.' });
      return;
    }
    const newSection = buildSectionFromForm(null, sectionForm);
    sections.push(newSection);
    updateConfigFromBuilder(next, 'Section added. Remember to save draft.');
    resetSectionForm();
    setShowEditor(false);
  };

  const handleAddHeaderSection = () => {
    const config = getConfigForBuilder();
    if (!config) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding header blocks.' });
      return;
    }
    const id = headerSectionForm.id.trim();
    const type = headerSectionForm.type.trim();
    if (!id || !type) {
      setMessage({ type: 'error', text: 'Header block id and type are required.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
    if (pageIndex < 0) {
      setMessage({ type: 'error', text: 'Selected page not found in config.' });
      return;
    }
    const sections = ensureHeaderBlocks(pagesList[pageIndex]);
    if (sections.some((section) => section?.id === id)) {
      setMessage({ type: 'error', text: 'Header block id already exists on this page.' });
      return;
    }
    const newSection = buildSectionFromForm(null, headerSectionForm);
    sections.push(newSection);
    updateConfigFromBuilder(next, 'Header block added. Remember to save draft.');
    resetHeaderSectionForm();
    setShowHeaderEditor(false);
  };

  const handleUpdateSection = () => {
    const config = getConfigForBuilder();
    if (!config) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before editing sections.' });
      return;
    }
    if (editingSectionIndex === null) {
      setMessage({ type: 'error', text: 'Select a section to edit.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
    if (pageIndex < 0) {
      setMessage({ type: 'error', text: 'Selected page not found in config.' });
      return;
    }
    const sections = ensureScreenSections(pagesList[pageIndex]);
    const current = sections[editingSectionIndex];
    if (!current) {
      setMessage({ type: 'error', text: 'Section no longer exists.' });
      return;
    }
    const updated = buildSectionFromForm(current, sectionForm);
    const updatedId = updated?.id;
    if (!updatedId || !updated?.type) {
      setMessage({ type: 'error', text: 'Section id and type are required.' });
      return;
    }
    const duplicate = sections.some((section, idx) => idx !== editingSectionIndex && section?.id === updatedId);
    if (duplicate) {
      setMessage({ type: 'error', text: 'Section id already exists on this page.' });
      return;
    }
    sections[editingSectionIndex] = updated;
    updateConfigFromBuilder(next, 'Section updated. Remember to save draft.');
    resetSectionForm();
    setShowEditor(false);
  };

  const handleUpdateHeaderSection = () => {
    const config = getConfigForBuilder();
    if (!config) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before editing header blocks.' });
      return;
    }
    if (editingHeaderSectionIndex === null) {
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
    if (pageIndex < 0) {
      setMessage({ type: 'error', text: 'Selected page not found in config.' });
      return;
    }
    const sections = ensureHeaderBlocks(pagesList[pageIndex]);
    const section = sections[editingHeaderSectionIndex];
    if (!section) return;
    const updated = buildSectionFromForm(section, headerSectionForm);
    if (!updated.id) {
      setMessage({ type: 'error', text: 'Header block id is required.' });
      return;
    }
    if (updated.id !== section.id && sections.some((item) => item?.id === updated.id)) {
      setMessage({ type: 'error', text: 'Header block id already exists on this page.' });
      return;
    }
    sections[editingHeaderSectionIndex] = updated;
    updateConfigFromBuilder(next, 'Header block updated. Remember to save draft.');
    resetHeaderSectionForm();
    setShowHeaderEditor(false);
  };

  const buildSectionFormFromConfig = (section, fallbackType) => {
    const items = Array.isArray(section?.items) ? section.items : [];
    const firstItem = items[0] || {};
    const hero = section?.hero && typeof section.hero === 'object' ? section.hero : {};
    const tiles = ensureBentoTiles(section?.tiles);
    const resolvedType = section?.type === 'campaign' ? 'campaignBento' : section?.type || fallbackType;
    return {
      id: section?.id || '',
      type: resolvedType,
      blockType: resolveBlockType(section),
      title: section?.title || '',
      text: section?.text || '',
      imageUrl: section?.imageUrl || firstItem?.imageUrl || '',
      aspectRatio: section?.aspectRatio || '',
      deepLink: section?.deepLink || firstItem?.deepLink || firstItem?.targetUrl || '',
      sectionBgColor: section?.sectionBgColor || '',
      cardBgColor: section?.cardBgColor || '',
      titleColor: section?.titleColor || '',
      badgeBgColor: section?.badgeBgColor || '',
      badgeTextColor: section?.badgeTextColor || '',
      imageShellBg: section?.imageShellBg || '',
      paddingY: section?.paddingY !== undefined && section?.paddingY !== null ? String(section.paddingY) : '',
      cardPadding: section?.cardPadding !== undefined && section?.cardPadding !== null ? String(section.cardPadding) : '',
      cardRadius: section?.cardRadius !== undefined && section?.cardRadius !== null ? String(section.cardRadius) : '',
      imageSize: section?.imageSize !== undefined && section?.imageSize !== null ? String(section.imageSize) : '',
      imageRadius: section?.imageRadius !== undefined && section?.imageRadius !== null ? String(section.imageRadius) : '',
      imageGap: section?.imageGap !== undefined && section?.imageGap !== null ? String(section.imageGap) : '',
      bentoHeaderImage: section?.headerImage || '',
      bentoHeroImage: hero?.imageUrl || hero?.image || '',
      bentoHeroLink: hero?.deepLink || hero?.targetUrl || '',
      bentoHeroLabel: hero?.label || hero?.title || '',
      bentoHeroBadge: hero?.badge || hero?.badgeText || hero?.priceTag || '',
      bentoTiles: tiles,
      collectionIds: Array.isArray(section?.collectionIds)
        ? section.collectionIds.map((value) => normalizeCollectionId(value)).filter(Boolean)
        : [],
      industryIds: Array.isArray(section?.industryIds)
        ? section.industryIds.map((value) => normalizeCollectionId(value)).filter(Boolean)
        : [],
      placement: section?.placement || '',
      placeholder: section?.placeholder || '',
      enabled: section?.enabled !== false,
      itemsPath: section?.itemsPath || '',
      itemTemplateRef: section?.itemTemplateRef || '',
      dataSourceRef: section?.dataSourceRef || '',
      columns: section?.columns !== undefined && section?.columns !== null ? String(section.columns) : '',
      height: section?.height !== undefined && section?.height !== null ? String(section.height) : '',
      videoUrl: section?.videoUrl || '',
      posterUrl: section?.posterUrl || '',
      scheduleStart: toLocalInputValue(section?.schedule?.startAt),
      scheduleEnd: toLocalInputValue(section?.schedule?.endAt),
      targetUserTypes: formatCsvList(section?.targeting?.userTypes),
      targetRoles: formatCsvList(section?.targeting?.roles),
      targetIndustries: formatCsvList(section?.targeting?.industries),
      targetSubscriptionStatuses: formatCsvList(section?.targeting?.subscriptionStatuses),
    };
  };

  const handleSelectSection = (index) => {
    const section = selectedSections[index];
    if (!section) return;
    setEditingSectionIndex(index);
    setSectionForm(buildSectionFormFromConfig(section, 'banner'));
  };

  const handleMoveSection = (index, direction) => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, idx) => getPageKey(page, idx) === selectedPageKey);
    if (pageIndex < 0) return;
    const sections = ensureScreenSections(pagesList[pageIndex]);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;
    updateConfigFromBuilder(next, 'Section order updated. Remember to save draft.');
  };

  const handleSectionDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, idx) => getPageKey(page, idx) === selectedPageKey);
    if (pageIndex < 0) return;
    const sections = ensureScreenSections(pagesList[pageIndex]);
    const entries = sections
      .map((section, index) => ({ section, index }))
      .filter((entry) => entry.section?.placement !== 'header');
    const ids = entries.map((entry) => buildDragId(entry.section, entry.index, 'section'));
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const movedEntries = arrayMove(entries, oldIndex, newIndex);
    const updatedSections = [...sections];
    entries.forEach((entry, idx) => {
      updatedSections[entry.index] = movedEntries[idx].section;
    });
    pagesList[pageIndex].screen.sections = updatedSections;
    updateConfigFromBuilder(next, 'Section order updated. Remember to save draft.');
  };

  const handleToggleSection = (index) => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, idx) => getPageKey(page, idx) === selectedPageKey);
    if (pageIndex < 0) return;
    const sections = ensureScreenSections(pagesList[pageIndex]);
    const section = sections[index];
    if (!section) return;
    const enabled = section.enabled !== false;
    section.enabled = !enabled;
    updateConfigFromBuilder(next, 'Section visibility updated. Remember to save draft.');
  };

  const handleDeleteSection = (index) => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, idx) => getPageKey(page, idx) === selectedPageKey);
    if (pageIndex < 0) return;
    const sections = ensureScreenSections(pagesList[pageIndex]);
    const section = sections[index];
    if (isHardcodedSection(section)) {
      setMessage({ type: 'error', text: 'Fixed sections cannot be deleted.' });
      return;
    }
    sections.splice(index, 1);
    updateConfigFromBuilder(next, 'Section removed. Remember to save draft.');
    resetSectionForm();
  };

  const handleMoveHeaderSection = (index, direction) => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, idx) => getPageKey(page, idx) === selectedPageKey);
    if (pageIndex < 0) return;
    const sections = ensureHeaderBlocks(pagesList[pageIndex]);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;
    updateConfigFromBuilder(next, 'Header block order updated. Remember to save draft.');
  };

  const handleHeaderDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, idx) => getPageKey(page, idx) === selectedPageKey);
    if (pageIndex < 0) return;
    const sections = ensureHeaderBlocks(pagesList[pageIndex]);
    const ids = sections.map((section, index) => buildDragId(section, index, 'header'));
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    pagesList[pageIndex].header.blocks = arrayMove(sections, oldIndex, newIndex);
    updateConfigFromBuilder(next, 'Header block order updated. Remember to save draft.');
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('toolbox:')) {
      const key = activeId.replace('toolbox:', '');
      const item = toolboxItems.find((entry) => entry.key === key);
      if (!item) return;
      const overHeader = overId === 'drop-header' || overId.startsWith('header-');
      const overScreen = overId === 'drop-screen' || overId.startsWith('section-');
      if (!overHeader && !overScreen) {
        setMessage({ type: 'error', text: 'Drop blocks inside the preview to add.' });
        return;
      }
      const target = item.scope === 'header' ? 'header' : overHeader ? 'header' : 'screen';
      if (item.scope === 'header' && !overHeader) {
        setMessage({ type: 'error', text: 'Drop this block inside the header preview.' });
        return;
      }
      const insertIndex =
        target === 'header'
          ? headerDragIds.indexOf(overId)
          : (() => {
              const entry = bodySectionEntries.find(
                (item) => buildDragId(item.section, item.index, 'section') === overId
              );
              return entry ? entry.index : null;
            })();
      const result = addSectionFromPreset(
        { section: item.section },
        null,
        target,
        insertIndex >= 0 ? insertIndex : null
      );
      if (result?.target === 'header') {
        setEditingHeaderSectionIndex(result.index);
        setHeaderSectionForm(buildSectionFormFromConfig(result.section, 'addressHeader'));
        setActivePanel('header');
      } else if (result?.target === 'screen') {
        setEditingSectionIndex(result.index);
        setSectionForm(buildSectionFormFromConfig(result.section, 'banner'));
        setActivePanel('screen');
      }
      return;
    }

    if (activeId.startsWith('header-') && overId.startsWith('header-')) {
      handleHeaderDragEnd(event);
      return;
    }

    if (activeId.startsWith('section-') && overId.startsWith('section-')) {
      handleSectionDragEnd(event);
    }
  };

  const handleToolboxAdd = (item, targetOverride) => {
    const target = item.scope === 'header' ? 'header' : targetOverride || 'screen';
    const result = addSectionFromPreset({ section: item.section }, null, target);
    if (result?.target === 'header') {
      setEditingHeaderSectionIndex(result.index);
      setHeaderSectionForm(buildSectionFormFromConfig(result.section, 'addressHeader'));
      setActivePanel('header');
    } else if (result?.target === 'screen') {
      setEditingSectionIndex(result.index);
      setSectionForm(buildSectionFormFromConfig(result.section, 'banner'));
      setActivePanel('screen');
    }
  };

  const handleDeleteHeaderSection = (index) => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, idx) => getPageKey(page, idx) === selectedPageKey);
    if (pageIndex < 0) return;
    const sections = ensureHeaderBlocks(pagesList[pageIndex]);
    sections.splice(index, 1);
    updateConfigFromBuilder(next, 'Header block removed. Remember to save draft.');
    resetHeaderSectionForm();
  };

  const previewHeaderStyle = useMemo(() => {
    const header = selectedPage?.header || {};
    const overlay = Array.isArray(header?.overlayGradient) ? header.overlayGradient : null;
    const backgroundImage = header?.backgroundImage;
    const backgroundColor = header?.backgroundColor;
    const minHeight = Number.isFinite(header?.minHeight) ? header.minHeight : null;
    const paddingTop = Number.isFinite(header?.paddingTop) ? header.paddingTop : null;
    const paddingBottom = Number.isFinite(header?.paddingBottom) ? header.paddingBottom : null;
    if (backgroundImage && overlay && overlay.length >= 2) {
      return {
        backgroundImage: `linear-gradient(${overlay.join(',')}), url(${backgroundImage})`,
        backgroundColor: backgroundColor || undefined,
        minHeight: minHeight || undefined,
        paddingTop: paddingTop || undefined,
        paddingBottom: paddingBottom || undefined,
      };
    }
    if (backgroundImage) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: backgroundColor || undefined,
        minHeight: minHeight || undefined,
        paddingTop: paddingTop || undefined,
        paddingBottom: paddingBottom || undefined,
      };
    }
    if (overlay && overlay.length >= 2) {
      return {
        backgroundImage: `linear-gradient(${overlay.join(',')})`,
        backgroundColor: backgroundColor || undefined,
        minHeight: minHeight || undefined,
        paddingTop: paddingTop || undefined,
        paddingBottom: paddingBottom || undefined,
      };
    }
    return {
      backgroundColor: backgroundColor || undefined,
      minHeight: minHeight || undefined,
      paddingTop: paddingTop || undefined,
      paddingBottom: paddingBottom || undefined,
    };
  }, [selectedPage]);

  const renderHeaderBlock = (block) => {
    const blockType = resolveBlockType(block);
    const placeholder = block?.placeholder || 'Search "yoga"';
    if (blockType === 'addressHeader') {
      return (
        <div className="preview-address-row">
          <div>
            <div className="preview-address-time">8 minutes</div>
            <div className="preview-address-label">HOME - C-901</div>
          </div>
          <div className="preview-address-icons">
            <span className="preview-icon-chip">Rs</span>
            <span className="preview-icon-chip">User</span>
          </div>
        </div>
      );
    }
    if (blockType === 'searchBar') {
      return (
        <div className="preview-search">
          <span className="preview-search-icon">Search</span>
          <span>{placeholder}</span>
        </div>
      );
    }
    if (blockType === 'horizontalPills') {
      const allIndustries = Array.isArray(industries)
        ? industries
            .map((industry) => {
              const id = resolveIndustryId(industry);
              const label = resolveIndustryLabel(industry);
              if (!id && !label) return null;
              return { id: id || label, label };
            })
            .filter(Boolean)
        : [];
      const allowed = Array.isArray(block?.industryIds) && block.industryIds.length > 0
        ? new Set(block.industryIds.map(normalizeMatchValue).filter(Boolean))
        : null;
      let pillItems = allIndustries;
      if (allowed) {
        pillItems = allIndustries.filter((item) =>
          allowed.has(normalizeMatchValue(item.id)) || allowed.has(normalizeMatchValue(item.label))
        );
      }
      if (!pillItems.length) {
        pillItems = allIndustries;
      }
      const labels = pillItems.length ? pillItems.map((item) => item.label) : ['All', 'Electronics', 'Beauty', 'Grocery'];
      return (
        <div className="preview-pills">
          {labels.map((label) => (
            <span key={label} className="preview-pill">
              {label}
            </span>
          ))}
        </div>
      );
    }
    return <div className="preview-header-fallback">{resolveBlockLabel(blockType, 'Header Block')}</div>;
  };

  const renderPreviewSection = (section, index) => {
    if (!section) return null;
    const type = section?.type || 'section';
    const blockType = resolveBlockType(section);
    const title = section?.title;
    const hidden = section?.enabled === false;
    const collectionIds = Array.isArray(section?.collectionIds)
      ? section.collectionIds.map((value) => normalizeCollectionId(value)).filter(Boolean)
      : [];
    const fallbackCount =
      type === 'banner'
        ? 1
        : type === 'list'
          ? 3
          : type === 'grid' || type === 'twoColumn' || type === 'heroGrid'
            ? 4
            : 3;
    let items = getPreviewItems(section, fallbackCount);
    if ((blockType === 'multiItemGrid' || blockType === 'categoryPreviewGrid') && collectionIds.length > 0) {
      items = collectionIds.map((value) => ({ title: value || 'Collection' }));
    }
    const renderCard = (item, itemIndex) => {
      const image = getPreviewImage(item);
      const label = getPreviewTitle(item);
      return (
        <div key={`preview-${index}-${itemIndex}`} className="preview-card">
          {image ? <img src={image} alt="" /> : <div className="preview-image-placeholder" />}
          <div className="preview-card-title">{label}</div>
        </div>
      );
    };

    if (blockType === 'heroBanner' || type === 'banner') {
      const item = items[0] || {};
      const image = section?.imageUrl || getPreviewImage(item);
      const aspectRatio = parseAspectRatioValue(section?.aspectRatio);
      const bannerStyle = aspectRatio ? { aspectRatio } : null;
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          {title ? <div className="preview-title">{title}</div> : null}
          <div className="preview-banner" style={bannerStyle || undefined}>
            {image ? <img src={image} alt="" /> : <div className="preview-banner-placeholder" />}
          </div>
        </div>
      );
    }

    if (type === 'spacer') {
      const height = Number(section?.height) || 16;
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          <div className="preview-spacer" style={{ height }} />
        </div>
      );
    }

    if (blockType === 'sectionTitle' || type === 'title') {
      const text = section?.text || title || 'Section Title';
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          <div className="preview-title-text">{text}</div>
        </div>
      );
    }

    if (type === 'video') {
      const poster = section?.posterUrl || getPreviewImage(items[0]);
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          {title ? <div className="preview-title">{title}</div> : null}
          <div className="preview-video">
            {poster ? <img src={poster} alt="" /> : <div className="preview-video-placeholder" />}
            <span className="preview-play">Play</span>
          </div>
        </div>
      );
    }

    if (type === 'list') {
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          {title ? <div className="preview-title">{title}</div> : null}
          <div className="preview-list">
            {items.map((item, itemIndex) => {
              const image = getPreviewImage(item);
              const label = getPreviewTitle(item);
              return (
                <div key={`preview-list-${index}-${itemIndex}`} className="preview-list-item">
                  {image ? <img src={image} alt="" /> : <div className="preview-image-placeholder" />}
                  <div className="preview-list-title">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (blockType === 'categoryPreviewGrid') {
      const columns = section?.columns || 2;
      const cardBg = section?.cardBgColor;
      const titleColor = section?.titleColor;
      const badgeBg = section?.badgeBgColor;
      const badgeText = section?.badgeTextColor;
      const imageShellBg = section?.imageShellBg;
      const sectionBg = section?.sectionBgColor;
      const paddingY = section?.paddingY;
      const cardRadius = section?.cardRadius;
      const cardPadding = section?.cardPadding;
      const imageSize = section?.imageSize;
      const imageRadius = section?.imageRadius;
      const imageGap = section?.imageGap;
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          {title ? <div className="preview-title">{title}</div> : null}
          <div
            className="preview-category-grid"
            style={{
              '--cols': columns,
              backgroundColor: sectionBg || undefined,
              paddingTop: paddingY ?? undefined,
              paddingBottom: paddingY ?? undefined,
            }}
          >
            {items.map((item, itemIndex) => {
              const label = getPreviewTitle(item);
              return (
                <div
                  key={`preview-category-${index}-${itemIndex}`}
                  className="preview-category-card"
                  style={{
                    backgroundColor: cardBg || undefined,
                    borderRadius: cardRadius || undefined,
                    padding: cardPadding || undefined,
                  }}
                >
                  <div
                    className="preview-category-images"
                    style={{ backgroundColor: imageShellBg || undefined, gap: imageGap || undefined }}
                  >
                    <div
                      className="preview-category-image"
                      style={{ borderRadius: imageRadius || undefined, height: imageSize ?? undefined }}
                    />
                    <div
                      className="preview-category-image"
                      style={{ borderRadius: imageRadius || undefined, height: imageSize ?? undefined }}
                    />
                  </div>
                  <div
                    className="preview-category-more"
                    style={{ backgroundColor: badgeBg || undefined, color: badgeText || undefined }}
                  >
                    +3 more
                  </div>
                  <div className="preview-category-title" style={{ color: titleColor || undefined }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (blockType === 'campaignBento') {
      const background = section?.sectionBgColor;
      const headerImage = section?.headerImage || getPreviewImage(items[0]);
      const hero = section?.hero && typeof section.hero === 'object' ? section.hero : {};
      const heroImage = hero?.imageUrl || getPreviewImage(items[1]);
      const heroBadge = hero?.badgeText || hero?.badge || hero?.priceTag || '';
      const heroLabel = hero?.label || hero?.title || '';
      const tiles = ensureBentoTiles(section?.tiles);
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          {title ? <div className="preview-title">{title}</div> : null}
          <div className="preview-bento" style={{ backgroundColor: background || undefined }}>
            <div className="preview-bento-header">
              {headerImage ? <img src={headerImage} alt="" draggable={false} /> : <div className="preview-bento-placeholder" />}
            </div>
            <div className="preview-bento-grid">
              <div className="preview-bento-hero">
                {heroImage ? <img src={heroImage} alt="" draggable={false} /> : <div className="preview-bento-placeholder" />}
                {heroBadge ? <span className="preview-bento-badge">{heroBadge}</span> : null}
                {heroLabel ? <span className="preview-bento-hero-label">{heroLabel}</span> : null}
              </div>
              <div className="preview-bento-tiles">
                {tiles.map((tile, tileIndex) => (
                  <div key={`preview-bento-${index}-${tileIndex}`} className="preview-bento-tile">
                    {tile.imageUrl ? <img src={tile.imageUrl} alt="" draggable={false} /> : <div className="preview-bento-placeholder" />}
                    <span className="preview-bento-label">
                      {tile.label || `Tile ${tileIndex + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (blockType === 'multiItemGrid' || type === 'grid' || type === 'twoColumn' || type === 'heroGrid') {
      const columns = type === 'twoColumn' ? 2 : section?.columns || (type === 'heroGrid' ? 3 : 2);
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          {title ? <div className="preview-title">{title}</div> : null}
          <div className="preview-grid" style={{ '--cols': columns }}>
            {items.map((item, itemIndex) => renderCard(item, itemIndex))}
          </div>
        </div>
      );
    }

    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? <div className="preview-title">{title}</div> : null}
        <div className="preview-row">{items.map((item, itemIndex) => renderCard(item, itemIndex))}</div>
      </div>
    );
  };

  const screenBlockType = sectionForm.blockType || sectionForm.type;
  const headerBlockType = headerSectionForm.blockType || headerSectionForm.type;
  const isHeroBanner = screenBlockType === 'heroBanner' || sectionForm.type === 'banner';
  const isCategoryPreviewGrid = screenBlockType === 'categoryPreviewGrid';
  const isCampaignBento = screenBlockType === 'campaignBento';
  const isMultiItemGrid =
    screenBlockType === 'multiItemGrid' ||
    isCategoryPreviewGrid ||
    sectionForm.type === 'grid';
  const isSectionTitleBlock = screenBlockType === 'sectionTitle' || sectionForm.type === 'title';
  const isScreenSpacer = sectionForm.type === 'spacer';
  const isScreenVideo = sectionForm.type === 'video';
  const isHeaderSearch = headerBlockType === 'searchBar';
  const isHeaderPills = headerBlockType === 'horizontalPills';
  const isGenericHeaderBlock = !isHeaderSearch && !isHeaderPills;
  const screenBlockLabel = resolveBlockLabel(screenBlockType, sectionForm.type || 'Block');
  const headerBlockLabel = resolveBlockLabel(headerBlockType, headerSectionForm.type || 'Block');

  const headerAttachedEntries = useMemo(
    () =>
      selectedSections
        .map((section, index) => ({ section, index }))
        .filter((entry) => entry.section?.placement === 'header'),
    [selectedSections]
  );

  const bodySectionEntries = useMemo(
    () =>
      selectedSections
        .map((section, index) => ({ section, index }))
        .filter((entry) => entry.section?.placement !== 'header'),
    [selectedSections]
  );

  const bodyDragIds = useMemo(
    () => bodySectionEntries.map((entry) => buildDragId(entry.section, entry.index, 'section')),
    [bodySectionEntries]
  );

  return (
    <div className="app-config-page">
      <div className="panel-head app-config-head">
        <div>
          <h2 className="panel-title">Manage Dynamic Home Page</h2>
          <p className="panel-subtitle">Control the visibility and order of sections on the user home page.</p>
        </div>
        <div className="inline-row">
          <button
            type="button"
            className="ghost-btn small"
            onClick={() => setShowAdvancedJson((prev) => !prev)}
          >
            {showAdvancedJson ? 'Hide JSON' : 'Advanced JSON'}
          </button>
          <button type="button" className="ghost-btn" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      <Banner message={message} />
      <div className="stat-grid">
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Pages</p>
          <p className="stat-value">{pageCount}</p>
          <p className="stat-sub">Configured routes</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#A855F7' }}>
          <p className="stat-label">Sections</p>
          <p className="stat-value">{sectionCount}</p>
          <p className="stat-sub">On selected page</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
          <p className="stat-label">Versions</p>
          <p className="stat-value">{versionCount}</p>
          <p className="stat-sub">Saved snapshots</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#16A34A' }}>
          <p className="stat-label">Industries</p>
          <p className="stat-value">{industryCount}</p>
          <p className="stat-sub">Available presets</p>
        </div>
      </div>
      <div className="app-config-card">
        <div className="config-toolbar">
          <div className="page-block">
            <label className="page-field">
              <span>Page</span>
              <select
                value={selectedPageKey}
                onChange={(event) => {
                  setSelectedPageKey(event.target.value);
                  resetSectionForm();
                  resetHeaderSectionForm();
                  setShowCustomPageFields(false);
                  setActivePanel(null);
                }}
              >
                <option value="">Select page</option>
                {pages.map((page, index) => {
                  const key = getPageKey(page, index);
                  return (
                    <option key={key} value={key}>
                      {getPageLabel(page, index, pagePresets)}
                    </option>
                  );
                })}
              </select>
            </label>
            <span className="update-chip">
              {latestUpdated ? `Last updated ${formatDate(latestUpdated)}` : 'No updates yet'}
            </span>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="ghost-btn small" onClick={handleCreateBaseConfig} disabled={isLoading}>
              Create Base Config
            </button>
            <button type="button" className="ghost-btn small" onClick={ensureHeaderPages} disabled={isLoading}>
              Ensure Header Pages
            </button>
            <button type="button" className="primary-btn compact" onClick={saveDraft} disabled={isLoading}>
              Save Draft
            </button>
            <button type="button" className="primary-btn compact" onClick={handlePublish} disabled={isLoading}>
              Publish
            </button>
          </div>
        </div>

        {!configSnapshot ? (
          <div className="empty-state">
            <p>Click "Create Base Config" to start, or enable Advanced JSON to paste a config.</p>
            <button type="button" className="primary-btn compact" onClick={handleCreateBaseConfig} disabled={isLoading}>
              Create Base Config
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="app-config-body">
              <div className="app-config-builder">
                <div className="toolbox-card">
                  <div className="panel-split">
                    <h3 className="panel-subheading">Toolbox</h3>
                    <span className="chip subtle">Drag blocks</span>
                  </div>
                  <div className="toolbox-list">
                    <div className="toolbox-group">
                      <div className="toolbox-group-title">Header Blocks</div>
                      {headerToolboxItems.map((item) => (
                        <ToolboxItem key={item.key} item={item} onAdd={handleToolboxAdd} />
                      ))}
                    </div>
                    <div className="toolbox-group">
                      <div className="toolbox-group-title">Body Blocks</div>
                      {screenToolboxItems.map((item) => (
                        <ToolboxItem key={item.key} item={item} onAdd={handleToolboxAdd} />
                      ))}
                    </div>
                  </div>
                  <p className="toolbox-note">Drag blocks into the preview to add.</p>
                </div>
              </div>
              <div className="app-config-preview">
              <div className="preview-shell">
                <div className="preview-phone">
                  <div className="preview-screen">
                    <DropZone
                      id="drop-header"
                      isOver={headerDrop.isOver}
                      className="preview-header"
                      style={previewHeaderStyle}
                      onClick={openHeaderSettings}
                    >
                      <div className="preview-header-title">
                        {selectedPage?.route || selectedPage?.id || 'Home'}
                      </div>
                      <SortableContext items={headerDragIds} strategy={verticalListSortingStrategy}>
                        {selectedHeaderSections.length ? (
                          <div className="preview-header-stack">
                            {selectedHeaderSections.map((section, index) => {
                              const isActive = activePanel === 'header' && editingHeaderSectionIndex === index;
                              const isHidden = section?.enabled === false;
                              return (
                                <SortablePreviewItem
                                  key={headerDragIds[index]}
                                  id={headerDragIds[index]}
                                  className={`preview-header-block ${isActive ? 'is-active' : ''} ${
                                    isHidden ? 'is-hidden' : ''
                                  }`}
                                  onClick={() => openEditHeaderSection(index)}
                                >
                                  {renderHeaderBlock(section)}
                                </SortablePreviewItem>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="preview-header-empty">Drop header blocks here</div>
                        )}
                      </SortableContext>
                      {headerAttachedEntries.length ? (
                        <div className="preview-header-attached">
                          {headerAttachedEntries.map((entry) => {
                            const isActive = activePanel === 'screen' && editingSectionIndex === entry.index;
                            return (
                              <div
                                key={`header-attached-${entry.index}`}
                                className={`preview-attached-item ${isActive ? 'is-active' : ''}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditSection(entry.index);
                                }}
                              >
                                {renderPreviewSection(entry.section, entry.index)}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </DropZone>
                    <DropZone id="drop-screen" isOver={screenDrop.isOver} className="preview-content">
                      <SortableContext items={bodyDragIds} strategy={verticalListSortingStrategy}>
                        {bodySectionEntries.length ? (
                          bodySectionEntries.map((entry, idx) => {
                            const isActive = activePanel === 'screen' && editingSectionIndex === entry.index;
                            const dragId = buildDragId(entry.section, entry.index, 'section');
                            return (
                              <SortablePreviewItem
                                key={dragId}
                                id={dragId}
                                className={`preview-sortable ${isActive ? 'is-active' : ''}`}
                                onClick={() => openEditSection(entry.index)}
                              >
                                {renderPreviewSection(entry.section, entry.index)}
                              </SortablePreviewItem>
                            );
                          })
                        ) : (
                          <div className="preview-empty">Drop blocks here.</div>
                        )}
                      </SortableContext>
                    </DropZone>
                  </div>
                </div>
                <p className="preview-note">Live preview is approximate and uses placeholder data.</p>
              </div>
            </div>
            <div className="app-config-properties">
              <div className="properties-card">
                <div className="panel-split">
                  <div>
                    <h3 className="panel-subheading">Block Properties</h3>
                    <p className="field-help">Select a block to edit its settings.</p>
                  </div>
                  <div className="inline-row">
                    {activePanel ? (
                      <span className="chip subtle">{activePanel === 'header' ? 'Header' : 'Body'}</span>
                    ) : null}
                    <button type="button" className="ghost-btn small" onClick={openHeaderSettings}>
                      Header settings
                    </button>
                  </div>
                </div>
                {activePanel === 'screen' ? (
                  <form className="field-grid" onSubmit={handleSectionSubmit}>
                    <label className="field field-span">
                      <span>Block type</span>
                      <input type="text" value={isEditingFixed ? 'Fixed' : screenBlockLabel} disabled />
                    </label>
                    <label className="field">
                      <span>Block id</span>
                      <input
                        type="text"
                        value={sectionForm.id}
                        onChange={(event) => setSectionForm((prev) => ({ ...prev, id: event.target.value }))}
                        placeholder="hero_banner"
                        disabled={isEditingFixed}
                        required={!isEditingFixed}
                      />
                    </label>
                    <div className="field">
                      <span>Visibility</span>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={sectionForm.enabled !== false}
                          onChange={(event) =>
                            setSectionForm((prev) => ({ ...prev, enabled: event.target.checked }))
                          }
                        />
                        Visible
                      </label>
                      {!isEditingFixed ? (
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={sectionForm.placement === 'header'}
                            onChange={(event) =>
                              setSectionForm((prev) => ({
                                ...prev,
                                placement: event.target.checked ? 'header' : '',
                              }))
                            }
                          />
                          Attach to header background
                        </label>
                      ) : null}
                    </div>
                    {(isHeroBanner || isMultiItemGrid || isCampaignBento) ? (
                      <label className="field field-span">
                        <span>{isHeroBanner ? 'Banner title (optional)' : 'Section title'}</span>
                        <input
                          type="text"
                          value={sectionForm.title}
                          onChange={(event) => setSectionForm((prev) => ({ ...prev, title: event.target.value }))}
                          placeholder={isHeroBanner ? 'Hero banner title' : 'Frequently bought'}
                        />
                      </label>
                    ) : null}
                    {isSectionTitleBlock ? (
                      <label className="field field-span">
                        <span>Title text</span>
                        <input
                          type="text"
                          value={sectionForm.text}
                          onChange={(event) => setSectionForm((prev) => ({ ...prev, text: event.target.value }))}
                          placeholder="Section Title"
                        />
                      </label>
                    ) : null}
                    {isHeroBanner ? (
                      <>
                        <label className="field field-span">
                          <span>Image URL</span>
                          <input
                            type="text"
                            value={sectionForm.imageUrl}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                            placeholder="https://cdn.example.com/hero.jpg"
                          />
                        </label>
                        <label className="field">
                          <span>Aspect ratio</span>
                          <input
                            type="text"
                            value={sectionForm.aspectRatio}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, aspectRatio: event.target.value }))}
                            placeholder="2:1"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Target URL (deep link)</span>
                          <input
                            type="text"
                            value={sectionForm.deepLink}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, deepLink: event.target.value }))}
                            placeholder="app://brand/minimalist"
                          />
                        </label>
                        <label className="field">
                          <span>Schedule start (local)</span>
                          <input
                            type="datetime-local"
                            value={sectionForm.scheduleStart}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, scheduleStart: event.target.value }))}
                          />
                        </label>
                        <label className="field">
                          <span>Schedule end (local)</span>
                          <input
                            type="datetime-local"
                            value={sectionForm.scheduleEnd}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, scheduleEnd: event.target.value }))}
                          />
                        </label>
                      </>
                    ) : null}
                    {isMultiItemGrid ? (
                      <>
                        <label className="field field-span">
                          <span>Select collections</span>
                          {isLoadingCollections ? (
                            <p className="field-help">Loading collections...</p>
                          ) : collections.length ? (
                            <div className="checkbox-grid">
                              {collections.map((collection) => {
                                const rawId =
                                  collection?.id ?? collection?.categoryId ?? collection?._id ?? collection?.code;
                                const id = normalizeCollectionId(rawId);
                                if (!id) return null;
                                const label =
                                  collection?.name ||
                                  collection?.label ||
                                  collection?.title ||
                                  `Collection ${id}`;
                                const isChecked = Array.isArray(sectionForm.collectionIds)
                                  ? sectionForm.collectionIds.includes(id)
                                  : false;
                                return (
                                  <label key={id} className="checkbox-row">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setSectionForm((prev) => {
                                          const current = Array.isArray(prev.collectionIds) ? prev.collectionIds : [];
                                          const next = new Set(current);
                                          if (next.has(id)) {
                                            next.delete(id);
                                          } else {
                                            next.add(id);
                                          }
                                          return { ...prev, collectionIds: Array.from(next) };
                                        })
                                      }
                                    />
                                    {label} <span className="muted">({id})</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="field-help">No collections found yet.</p>
                          )}
                        </label>
                        <label className="field field-span">
                          <span>Collection IDs (comma separated)</span>
                          <input
                            type="text"
                            value={(sectionForm.collectionIds || []).join(', ')}
                            onChange={(event) =>
                              setSectionForm((prev) => ({
                                ...prev,
                                collectionIds: parseCsvList(event.target.value),
                              }))
                            }
                            placeholder="Veg_Fruits, Dairy, Chocolates"
                          />
                        </label>
                        {isCategoryPreviewGrid ? (
                          <>
                            <label className="field field-span">
                              <span>Quick layout</span>
                              <div className="option-row">
                                {categoryLayoutPresets.map((preset) => (
                                  <button
                                    key={`layout-${preset.key}`}
                                    type="button"
                                    className={`option-chip ${
                                      matchesLayoutPreset(preset, sectionForm) ? 'is-active' : ''
                                    }`}
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        paddingY: String(preset.values.paddingY),
                                        cardPadding: String(preset.values.cardPadding),
                                        cardRadius: String(preset.values.cardRadius),
                                        imageSize: String(preset.values.imageSize),
                                        imageRadius: String(preset.values.imageRadius),
                                        imageGap: String(preset.values.imageGap),
                                      }))
                                    }
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                              <p className="field-help">
                                Picks a ready-made layout (padding, radius, image size, gap).
                              </p>
                            </label>
                            <label className="field field-span">
                              <span>Section spacing</span>
                              <div className="option-row">
                                {sizePresets.padding.map((preset) => (
                                  <button
                                    key={`padding-${preset.key}`}
                                    type="button"
                                    className={`option-chip ${
                                      findPresetKey(sizePresets.padding, sectionForm.paddingY) === preset.key
                                        ? 'is-active'
                                        : ''
                                    }`}
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        paddingY: String(preset.value),
                                      }))
                                    }
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </label>
                            <label className="field field-span">
                              <span>Card shape</span>
                              <div className="option-row">
                                {sizePresets.radius.map((preset) => (
                                  <button
                                    key={`radius-${preset.key}`}
                                    type="button"
                                    className={`option-chip ${
                                      findPresetKey(sizePresets.radius, sectionForm.cardRadius) === preset.key
                                        ? 'is-active'
                                        : ''
                                    }`}
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        cardRadius: String(preset.value),
                                      }))
                                    }
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </label>
                            <label className="field field-span">
                              <span>Card padding</span>
                              <div className="option-row">
                                {sizePresets.padding.map((preset) => (
                                  <button
                                    key={`cardpad-${preset.key}`}
                                    type="button"
                                    className={`option-chip ${
                                      findPresetKey(sizePresets.padding, sectionForm.cardPadding) === preset.key
                                        ? 'is-active'
                                        : ''
                                    }`}
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        cardPadding: String(preset.value),
                                      }))
                                    }
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </label>
                            <label className="field field-span">
                              <span>Image size</span>
                              <div className="option-row">
                                {sizePresets.imageSize.map((preset) => (
                                  <button
                                    key={`imagesize-${preset.key}`}
                                    type="button"
                                    className={`option-chip ${
                                      findPresetKey(sizePresets.imageSize, sectionForm.imageSize) === preset.key
                                        ? 'is-active'
                                        : ''
                                    }`}
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        imageSize: String(preset.value),
                                      }))
                                    }
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </label>
                            <label className="field field-span">
                              <span>Image corner</span>
                              <div className="option-row">
                                {sizePresets.radius.map((preset) => (
                                  <button
                                    key={`imageradius-${preset.key}`}
                                    type="button"
                                    className={`option-chip ${
                                      findPresetKey(sizePresets.radius, sectionForm.imageRadius) === preset.key
                                        ? 'is-active'
                                        : ''
                                    }`}
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        imageRadius: String(preset.value),
                                      }))
                                    }
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </label>
                            <label className="field field-span">
                              <span>Image gap</span>
                              <div className="option-row">
                                {sizePresets.imageGap.map((preset) => (
                                  <button
                                    key={`imagegap-${preset.key}`}
                                    type="button"
                                    className={`option-chip ${
                                      findPresetKey(sizePresets.imageGap, sectionForm.imageGap) === preset.key
                                        ? 'is-active'
                                        : ''
                                    }`}
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        imageGap: String(preset.value),
                                      }))
                                    }
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </label>
                            <label className="field">
                              <span>Section background</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.sectionBgColor}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))
                                  }
                                  placeholder="#eaf4f6"
                                />
                                <input
                                  type="color"
                                  className="color-input"
                                  value={
                                    sectionForm.sectionBgColor && sectionForm.sectionBgColor.startsWith('#')
                                      ? sectionForm.sectionBgColor
                                      : '#eaf4f6'
                                  }
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))
                                  }
                                />
                              </div>
                            </label>
                            <label className="field">
                              <span>Card background</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.cardBgColor}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, cardBgColor: event.target.value }))
                                  }
                                  placeholder="#eaf4f6"
                                />
                                <input
                                  type="color"
                                  className="color-input"
                                  value={
                                    sectionForm.cardBgColor && sectionForm.cardBgColor.startsWith('#')
                                      ? sectionForm.cardBgColor
                                      : '#eaf4f6'
                                  }
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, cardBgColor: event.target.value }))
                                  }
                                />
                              </div>
                            </label>
                            <label className="field">
                              <span>Title color</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.titleColor}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, titleColor: event.target.value }))
                                  }
                                  placeholder="#1f2a2e"
                                />
                                <input
                                  type="color"
                                  className="color-input"
                                  value={
                                    sectionForm.titleColor && sectionForm.titleColor.startsWith('#')
                                      ? sectionForm.titleColor
                                      : '#1f2a2e'
                                  }
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, titleColor: event.target.value }))
                                  }
                                />
                              </div>
                            </label>
                            <label className="field">
                              <span>Badge background</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.badgeBgColor}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, badgeBgColor: event.target.value }))
                                  }
                                  placeholder="#ffffff"
                                />
                                <input
                                  type="color"
                                  className="color-input"
                                  value={
                                    sectionForm.badgeBgColor && sectionForm.badgeBgColor.startsWith('#')
                                      ? sectionForm.badgeBgColor
                                      : '#ffffff'
                                  }
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, badgeBgColor: event.target.value }))
                                  }
                                />
                              </div>
                            </label>
                            <label className="field">
                              <span>Badge text color</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.badgeTextColor}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, badgeTextColor: event.target.value }))
                                  }
                                  placeholder="#2a7f84"
                                />
                                <input
                                  type="color"
                                  className="color-input"
                                  value={
                                    sectionForm.badgeTextColor && sectionForm.badgeTextColor.startsWith('#')
                                      ? sectionForm.badgeTextColor
                                      : '#2a7f84'
                                  }
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, badgeTextColor: event.target.value }))
                                  }
                                />
                              </div>
                            </label>
                            <label className="field">
                              <span>Image shell background</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.imageShellBg}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, imageShellBg: event.target.value }))
                                  }
                                  placeholder="#ffffff"
                                />
                                <input
                                  type="color"
                                  className="color-input"
                                  value={
                                    sectionForm.imageShellBg && sectionForm.imageShellBg.startsWith('#')
                                      ? sectionForm.imageShellBg
                                      : '#ffffff'
                                  }
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, imageShellBg: event.target.value }))
                                  }
                                />
                              </div>
                            </label>
                          </>
                        ) : null}
                      </>
                    ) : null}
                    {isCampaignBento ? (
                      <>
                        <label className="field">
                          <span>Background color</span>
                          <div className="inline-row">
                            <input
                              type="text"
                              value={sectionForm.sectionBgColor}
                              onChange={(event) =>
                                setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))
                              }
                              placeholder="#A8E0FF"
                            />
                            <input
                              type="color"
                              className="color-input"
                              value={
                                sectionForm.sectionBgColor && sectionForm.sectionBgColor.startsWith('#')
                                  ? sectionForm.sectionBgColor
                                  : '#A8E0FF'
                              }
                              onChange={(event) =>
                                setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))
                              }
                            />
                          </div>
                        </label>
                        <label className="field field-span">
                          <span>Header banner image URL</span>
                          <div className="inline-row">
                            <input
                              type="text"
                              value={sectionForm.bentoHeaderImage}
                              onChange={(event) =>
                                setSectionForm((prev) => ({ ...prev, bentoHeaderImage: event.target.value }))
                              }
                              placeholder="https://cdn.example.com/campaign-header.jpg"
                            />
                            <button
                              type="button"
                              className="ghost-btn small"
                              onClick={() => handleBentoImageClick({ kind: 'header' })}
                              disabled={isUploadingBentoImage}
                            >
                              {isUploadingBentoImage ? 'Uploading...' : 'Upload'}
                            </button>
                          </div>
                        </label>
                        <label className="field field-span">
                          <span>Main tile image URL</span>
                          <div className="inline-row">
                            <input
                              type="text"
                              value={sectionForm.bentoHeroImage}
                              onChange={(event) =>
                                setSectionForm((prev) => ({ ...prev, bentoHeroImage: event.target.value }))
                              }
                              placeholder="https://cdn.example.com/hero-tile.jpg"
                            />
                            <button
                              type="button"
                              className="ghost-btn small"
                              onClick={() => handleBentoImageClick({ kind: 'hero' })}
                              disabled={isUploadingBentoImage}
                            >
                              {isUploadingBentoImage ? 'Uploading...' : 'Upload'}
                            </button>
                          </div>
                        </label>
                        <label className="field field-span">
                          <span>Main tile deep link</span>
                          <input
                            type="text"
                            value={sectionForm.bentoHeroLink}
                            onChange={(event) =>
                              setSectionForm((prev) => ({ ...prev, bentoHeroLink: event.target.value }))
                            }
                            placeholder="app://campaign/gulal"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Main tile label (optional)</span>
                          <input
                            type="text"
                            value={sectionForm.bentoHeroLabel}
                            onChange={(event) =>
                              setSectionForm((prev) => ({ ...prev, bentoHeroLabel: event.target.value }))
                            }
                            placeholder="Gulal"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Main tile badge (optional)</span>
                          <input
                            type="text"
                            value={sectionForm.bentoHeroBadge}
                            onChange={(event) =>
                              setSectionForm((prev) => ({ ...prev, bentoHeroBadge: event.target.value }))
                            }
                            placeholder="₹59"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Sub tiles</span>
                          <div className="bento-tile-grid">
                            {ensureBentoTiles(sectionForm.bentoTiles).map((tile, idx) => (
                              <div key={`bento-tile-${idx}`} className="bento-tile-row">
                                <div className="bento-tile-title">Tile {idx + 1}</div>
                                <div className="inline-row">
                                  <input
                                    type="text"
                                    value={tile.imageUrl}
                                    onChange={(event) => updateBentoTile(idx, 'imageUrl', event.target.value)}
                                    placeholder="Image URL"
                                  />
                                  <button
                                    type="button"
                                    className="ghost-btn small"
                                    onClick={() => handleBentoImageClick({ kind: 'tile', index: idx })}
                                    disabled={isUploadingBentoImage}
                                  >
                                    {isUploadingBentoImage ? 'Uploading...' : 'Upload'}
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={tile.deepLink}
                                  onChange={(event) => updateBentoTile(idx, 'deepLink', event.target.value)}
                                  placeholder="Deep link"
                                />
                                <input
                                  type="text"
                                  value={tile.label}
                                  onChange={(event) => updateBentoTile(idx, 'label', event.target.value)}
                                  placeholder="Label (optional)"
                                />
                              </div>
                            ))}
                          </div>
                        </label>
                      </>
                    ) : null}
                    {isScreenSpacer ? (
                      <label className="field">
                        <span>Spacer height</span>
                        <input
                          type="number"
                          min="4"
                          value={sectionForm.height}
                          onChange={(event) => setSectionForm((prev) => ({ ...prev, height: event.target.value }))}
                          placeholder="16"
                        />
                      </label>
                    ) : null}
                    {isScreenVideo ? (
                      <>
                        <label className="field field-span">
                          <span>Video URL</span>
                          <input
                            type="text"
                            value={sectionForm.videoUrl}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, videoUrl: event.target.value }))}
                            placeholder="https://cdn.example.com/video.mp4"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Poster image URL</span>
                          <input
                            type="text"
                            value={sectionForm.posterUrl}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, posterUrl: event.target.value }))}
                            placeholder="https://cdn.example.com/poster.jpg"
                          />
                        </label>
                      </>
                    ) : null}
                    {!isEditingFixed ? (
                      <div className="field field-span">
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => setShowAdvancedFields((prev) => !prev)}
                        >
                          {showAdvancedFields ? 'Hide advanced fields' : 'Show advanced fields'}
                        </button>
                      </div>
                    ) : null}
                    {showAdvancedFields && !isEditingFixed ? (
                      <>
                        <label className="field">
                          <span>Items path</span>
                          <input
                            type="text"
                            value={sectionForm.itemsPath}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, itemsPath: event.target.value }))}
                            placeholder="$.items"
                          />
                        </label>
                        <label className="field">
                          <span>Item template ref</span>
                          <input
                            type="text"
                            value={sectionForm.itemTemplateRef}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, itemTemplateRef: event.target.value }))}
                            placeholder="actionCard"
                          />
                        </label>
                        <label className="field">
                          <span>Data source ref</span>
                          <input
                            type="text"
                            value={sectionForm.dataSourceRef}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, dataSourceRef: event.target.value }))}
                            placeholder="todaydealproducts"
                          />
                        </label>
                        <label className="field">
                          <span>Columns (grid only)</span>
                          <input
                            type="number"
                            min="1"
                            value={sectionForm.columns}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, columns: event.target.value }))}
                            placeholder="2"
                          />
                        </label>
                        {!isHeroBanner ? (
                          <>
                            <label className="field">
                              <span>Schedule start (local)</span>
                              <input
                                type="datetime-local"
                                value={sectionForm.scheduleStart}
                                onChange={(event) =>
                                  setSectionForm((prev) => ({ ...prev, scheduleStart: event.target.value }))
                                }
                              />
                            </label>
                            <label className="field">
                              <span>Schedule end (local)</span>
                              <input
                                type="datetime-local"
                                value={sectionForm.scheduleEnd}
                                onChange={(event) =>
                                  setSectionForm((prev) => ({ ...prev, scheduleEnd: event.target.value }))
                                }
                              />
                            </label>
                          </>
                        ) : null}
                        <label className="field field-span">
                          <span>Target user types (comma separated)</span>
                          <input
                            type="text"
                            value={sectionForm.targetUserTypes}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, targetUserTypes: event.target.value }))}
                            placeholder="USER, BUSINESS"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Target roles (comma separated)</span>
                          <input
                            type="text"
                            value={sectionForm.targetRoles}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, targetRoles: event.target.value }))}
                            placeholder="Admin, Seller"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Target industries (comma separated)</span>
                          <input
                            type="text"
                            value={sectionForm.targetIndustries}
                            onChange={(event) =>
                              setSectionForm((prev) => ({ ...prev, targetIndustries: event.target.value }))
                            }
                            placeholder="Grocery, Electronics"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Target subscription statuses (comma separated)</span>
                          <input
                            type="text"
                            value={sectionForm.targetSubscriptionStatuses}
                            onChange={(event) =>
                              setSectionForm((prev) => ({ ...prev, targetSubscriptionStatuses: event.target.value }))
                            }
                            placeholder="ACTIVE, TRIAL"
                          />
                        </label>
                      </>
                    ) : null}
                    <div className="field field-span modal-actions">
                      <button type="button" className="ghost-btn" onClick={closeEditor}>
                        Close
                      </button>
                      {editingSectionIndex !== null ? (
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => handleDeleteSection(editingSectionIndex)}
                          disabled={isEditingFixed}
                        >
                          Remove
                        </button>
                      ) : null}
                      <button type="submit" className="primary-btn compact" disabled={isLoading}>
                        {editingSectionIndex !== null ? 'Save' : 'Add Block'}
                      </button>
                    </div>
                  </form>
                ) : activePanel === 'header' ? (
                  <form className="field-grid" onSubmit={handleHeaderSectionSubmit}>
                    <label className="field field-span">
                      <span>Block type</span>
                      <input type="text" value={headerBlockLabel} disabled />
                    </label>
                    <label className="field">
                      <span>Block id</span>
                      <input
                        type="text"
                        value={headerSectionForm.id}
                        onChange={(event) => setHeaderSectionForm((prev) => ({ ...prev, id: event.target.value }))}
                        placeholder="address_header"
                        required
                      />
                    </label>
                    <div className="field">
                      <span>Visibility</span>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={headerSectionForm.enabled !== false}
                          onChange={(event) =>
                            setHeaderSectionForm((prev) => ({ ...prev, enabled: event.target.checked }))
                          }
                        />
                        Visible
                      </label>
                    </div>
                    {isHeaderSearch ? (
                      <label className="field field-span">
                        <span>Search placeholder</span>
                        <input
                          type="text"
                          value={headerSectionForm.placeholder}
                          onChange={(event) =>
                            setHeaderSectionForm((prev) => ({ ...prev, placeholder: event.target.value }))
                          }
                          placeholder='Search "yoga"'
                        />
                      </label>
                    ) : null}
                    {isHeaderPills ? (
                      <>
                        <label className="field field-span">
                          <span>Select industries</span>
                          {industries.length ? (
                            <div className="checkbox-grid">
                              {industries.map((industry) => {
                                const id = normalizeCollectionId(industry?.id ?? industry?._id ?? industry?.slug ?? industry?.industryId ?? industry?.industry_id ?? industry?.name);
                                if (!id) return null;
                                const label = industry?.name || industry?.label || industry?.title || `Industry ${id}`;
                                const isChecked = Array.isArray(headerSectionForm.industryIds)
                                  ? headerSectionForm.industryIds.includes(id)
                                  : false;
                                return (
                                  <label key={id} className="checkbox-row">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setHeaderSectionForm((prev) => {
                                          const current = Array.isArray(prev.industryIds) ? prev.industryIds : [];
                                          const next = new Set(current);
                                          if (next.has(id)) {
                                            next.delete(id);
                                          } else {
                                            next.add(id);
                                          }
                                          return { ...prev, industryIds: Array.from(next) };
                                        })
                                      }
                                    />
                                    {label} <span className="muted">({id})</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="field-help">No industries found yet.</p>
                          )}
                        </label>
                        <label className="field field-span">
                          <span>Industry IDs (comma separated)</span>
                          <input
                            type="text"
                            value={(headerSectionForm.industryIds || []).join(', ')}
                            onChange={(event) =>
                              setHeaderSectionForm((prev) => ({
                                ...prev,
                                industryIds: parseCsvList(event.target.value),
                              }))
                            }
                            placeholder="grocery, electronics"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Add new industry pill</span>
                          <div className="inline-row">
                            <input
                              type="text"
                              value={newIndustryName}
                              onChange={(event) => setNewIndustryName(event.target.value)}
                              placeholder="e.g., Electronics"
                            />
                            <button
                              type="button"
                              className="ghost-btn small"
                              onClick={handleCreateIndustry}
                              disabled={isCreatingIndustry}
                            >
                              {isCreatingIndustry ? 'Adding...' : 'Add'}
                            </button>
                          </div>
                          <p className="field-help">Creates a new industry and syncs a page for it.</p>
                        </label>
                      </>
                    ) : null}
                    {isGenericHeaderBlock ? (
                      <label className="field field-span">
                        <span>Block type (advanced)</span>
                        <select
                          value={headerSectionForm.type}
                          onChange={(event) =>
                            setHeaderSectionForm((prev) => ({
                              ...prev,
                              type: event.target.value,
                              blockType: event.target.value,
                            }))
                          }
                        >
                          {headerSectionTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <div className="field field-span modal-actions">
                      <button type="button" className="ghost-btn" onClick={closeHeaderEditor}>
                        Close
                      </button>
                      {editingHeaderSectionIndex !== null ? (
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => handleDeleteHeaderSection(editingHeaderSectionIndex)}
                        >
                          Remove
                        </button>
                      ) : null}
                      <button type="submit" className="primary-btn compact">
                        {editingHeaderSectionIndex !== null ? 'Save' : 'Add Header Block'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="properties-empty">Select a block in the preview.</div>
                )}
              </div>
              {showCustomPageFields ? (
                <div className="properties-card">
                  <div className="panel-split">
                    <div>
                      <h3 className="panel-subheading">Page Settings</h3>
                      <p className="field-help">Header background image and overlay gradient.</p>
                    </div>
                    <button
                      type="button"
                      className="ghost-btn small"
                      onClick={() => setShowCustomPageFields(false)}
                    >
                      Hide
                    </button>
                  </div>
                  {selectedPage ? (
                    <form className="field-grid" onSubmit={handleHeaderSubmit}>
                      <label className="field field-span">
                        <span>Header background image URL</span>
                        <div className="inline-row">
                          <input
                            type="text"
                            value={headerForm.backgroundImage}
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, backgroundImage: event.target.value }))
                            }
                            placeholder="https://cdn.example.com/banners/beauty-hero.jpg"
                          />
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={handleHeaderImageClick}
                            disabled={isUploadingHeaderImage}
                          >
                            {isUploadingHeaderImage ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
                        {headerPresets.images?.length ? (
                          <div className="preset-grid">
                            {headerPresets.images.map((preset) => {
                              const isSelected = headerForm.backgroundImage === preset.url;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  className={`preset-image ${isSelected ? 'is-selected' : ''}`}
                                  onClick={() =>
                                    setHeaderForm((prev) => ({ ...prev, backgroundImage: preset.url }))
                                  }
                                >
                                  <img src={preset.url} alt={preset.label || 'Header preset'} />
                                  <span>{preset.label || 'Preset'}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </label>
                      <label className="field">
                        <span>Header background color</span>
                        <div className="inline-row">
                          <input
                            type="text"
                            value={headerForm.backgroundColor}
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, backgroundColor: event.target.value }))
                            }
                            placeholder="#6E46FF"
                          />
                          <input
                            type="color"
                            className="color-input"
                            value={
                              headerForm.backgroundColor && headerForm.backgroundColor.startsWith('#')
                                ? headerForm.backgroundColor
                                : '#6E46FF'
                            }
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, backgroundColor: event.target.value }))
                            }
                          />
                        </div>
                        {headerPresets.colors?.length ? (
                          <div className="preset-row">
                            {headerPresets.colors.map((preset) => {
                              const isSelected =
                                (headerForm.backgroundColor || '').toLowerCase() ===
                                (preset.value || '').toLowerCase();
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  className={`preset-swatch ${isSelected ? 'is-selected' : ''}`}
                                  style={{ background: preset.value }}
                                  title={preset.label}
                                  onClick={() =>
                                    setHeaderForm((prev) => ({ ...prev, backgroundColor: preset.value }))
                                  }
                                />
                              );
                            })}
                          </div>
                        ) : null}
                      </label>
                      <label className="field">
                        <span>Search bar background</span>
                        <div className="inline-row">
                          <input
                            type="text"
                            value={headerForm.searchBg}
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, searchBg: event.target.value }))
                            }
                            placeholder="#7F5DFF"
                          />
                          <input
                            type="color"
                            className="color-input"
                            value={
                              headerForm.searchBg && headerForm.searchBg.startsWith('#')
                                ? headerForm.searchBg
                                : '#7F5DFF'
                            }
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, searchBg: event.target.value }))
                            }
                          />
                        </div>
                      </label>
                      <label className="field">
                        <span>Search text color</span>
                        <div className="inline-row">
                          <input
                            type="text"
                            value={headerForm.searchText}
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, searchText: event.target.value }))
                            }
                            placeholder="#FFFFFF"
                          />
                          <input
                            type="color"
                            className="color-input"
                            value={
                              headerForm.searchText && headerForm.searchText.startsWith('#')
                                ? headerForm.searchText
                                : '#FFFFFF'
                            }
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, searchText: event.target.value }))
                            }
                          />
                        </div>
                      </label>
                      <label className="field">
                        <span>Header icon color</span>
                        <div className="inline-row">
                          <input
                            type="text"
                            value={headerForm.iconColor}
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, iconColor: event.target.value }))
                            }
                            placeholder="#FFFFFF"
                          />
                          <input
                            type="color"
                            className="color-input"
                            value={
                              headerForm.iconColor && headerForm.iconColor.startsWith('#')
                                ? headerForm.iconColor
                                : '#FFFFFF'
                            }
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, iconColor: event.target.value }))
                            }
                          />
                        </div>
                      </label>
                      <label className="field">
                        <span>Location text color</span>
                        <div className="inline-row">
                          <input
                            type="text"
                            value={headerForm.locationColor}
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, locationColor: event.target.value }))
                            }
                            placeholder="#FFFFFF"
                          />
                          <input
                            type="color"
                            className="color-input"
                            value={
                              headerForm.locationColor && headerForm.locationColor.startsWith('#')
                                ? headerForm.locationColor
                                : '#FFFFFF'
                            }
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, locationColor: event.target.value }))
                            }
                          />
                        </div>
                      </label>
                      <label className="field">
                        <span>Profile bubble background</span>
                        <div className="inline-row">
                          <input
                            type="text"
                            value={headerForm.profileBg}
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, profileBg: event.target.value }))
                            }
                            placeholder="#FFFFFF"
                          />
                          <input
                            type="color"
                            className="color-input"
                            value={
                              headerForm.profileBg && headerForm.profileBg.startsWith('#')
                                ? headerForm.profileBg
                                : '#FFFFFF'
                            }
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, profileBg: event.target.value }))
                            }
                          />
                        </div>
                      </label>
                      <label className="field">
                        <span>Profile icon color</span>
                        <div className="inline-row">
                          <input
                            type="text"
                            value={headerForm.profileIconColor}
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, profileIconColor: event.target.value }))
                            }
                            placeholder="#1A1A1A"
                          />
                          <input
                            type="color"
                            className="color-input"
                            value={
                              headerForm.profileIconColor && headerForm.profileIconColor.startsWith('#')
                                ? headerForm.profileIconColor
                                : '#1A1A1A'
                            }
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, profileIconColor: event.target.value }))
                            }
                          />
                        </div>
                      </label>
                      <label className="field">
                        <span>Category label color</span>
                        <div className="inline-row">
                          <input
                            type="text"
                            value={headerForm.categoryColor}
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, categoryColor: event.target.value }))
                            }
                            placeholder="#1A1A1A"
                          />
                          <input
                            type="color"
                            className="color-input"
                            value={
                              headerForm.categoryColor && headerForm.categoryColor.startsWith('#')
                                ? headerForm.categoryColor
                                : '#1A1A1A'
                            }
                            onChange={(event) =>
                              setHeaderForm((prev) => ({ ...prev, categoryColor: event.target.value }))
                            }
                          />
                        </div>
                      </label>
                      <label className="field">
                        <span>Header min height</span>
                        <input
                          type="number"
                          min="0"
                          value={headerForm.minHeight}
                          onChange={(event) =>
                            setHeaderForm((prev) => ({ ...prev, minHeight: event.target.value }))
                          }
                          placeholder="150"
                        />
                      </label>
                      <label className="field">
                        <span>Padding top</span>
                        <input
                          type="number"
                          min="0"
                          value={headerForm.paddingTop}
                          onChange={(event) =>
                            setHeaderForm((prev) => ({ ...prev, paddingTop: event.target.value }))
                          }
                          placeholder="16"
                        />
                      </label>
                      <label className="field">
                        <span>Padding bottom</span>
                        <input
                          type="number"
                          min="0"
                          value={headerForm.paddingBottom}
                          onChange={(event) =>
                            setHeaderForm((prev) => ({ ...prev, paddingBottom: event.target.value }))
                          }
                          placeholder="8"
                        />
                      </label>
                      <label className="field field-span">
                        <span>Overlay gradient (comma separated)</span>
                        <input
                          type="text"
                          value={headerForm.overlayGradient}
                          onChange={(event) =>
                            setHeaderForm((prev) => ({ ...prev, overlayGradient: event.target.value }))
                          }
                          placeholder="rgba(255,255,255,0.05), rgba(255,255,255,0.55)"
                        />
                      </label>
                      <div className="field field-span">
                        <div className="inline-row">
                          <button type="submit" className="primary-btn compact">
                            Apply Header
                          </button>
                          <button type="button" className="ghost-btn small" onClick={handleClearHeader}>
                            Clear
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <p className="field-help">Select a page to edit header settings.</p>
                  )}
                </div>
              ) : null}
            </div>
            </div>
          </DndContext>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleBannerFiles}
        />
        <input
          ref={headerInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleHeaderImageFiles}
        />
        <input
          ref={heroBannerInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleHeroBannerFiles}
        />
        <input
          ref={bentoInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleBentoImageFiles}
        />
      </div>
      {showAdvancedJson ? (
        <div className="panel-grid">
          <div className="panel card">
            <div className="panel-split">
              <h3 className="panel-subheading">Draft JSON</h3>
              <span className="chip subtle">{version ? `Version ${version}` : 'No version'}</span>
            </div>
            <form className="field-grid" onSubmit={handleSave}>
              <label className="field field-span">
                <span>Config JSON</span>
                <textarea
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  placeholder='{"version":"1.0.0", "theme": { ... }, "pages": []}'
                />
              </label>
              <label className="field">
                <span>Version label (optional)</span>
                <input
                  type="text"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder="1.0.0"
                />
              </label>
              <div className="field">
                <span>Actions</span>
                <div className="inline-row">
                  <button type="button" className="ghost-btn small" onClick={handleValidate} disabled={isLoading}>
                    Validate
                  </button>
                  <button type="submit" className="primary-btn compact" disabled={isLoading}>
                    Save Draft
                  </button>
                  <button type="button" className="primary-btn compact" onClick={handlePublish} disabled={isLoading}>
                    Publish
                  </button>
                </div>
              </div>
              <div className="field field-span">
                <span>Selected version</span>
                <p className="field-help">
                  {selectedMeta
                    ? `#${selectedMeta.id} (${selectedMeta.status}) - updated ${formatDate(
                        selectedMeta.updated_on
                      )}`
                    : 'Select a version from the list to rollback.'}
                </p>
              </div>
            </form>
          </div>

          <div className="panel card">
            <div className="panel-split">
              <h3 className="panel-subheading">Versions</h3>
              <button type="button" className="ghost-btn small" onClick={loadVersions} disabled={isLoading}>
                Refresh
              </button>
            </div>
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Updated</th>
                    <th>Published</th>
                    <th className="table-actions">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.length === 0 ? (
                    <tr>
                      <td colSpan="6">No versions found.</td>
                    </tr>
                  ) : (
                    versions.map((item) => (
                      <tr
                        key={item.id}
                        className="table-row-clickable"
                        onClick={() => setSelectedId(item.id)}
                      >
                        <td>{item.id}</td>
                        <td>
                          <span className="chip subtle">{item.status || 'UNKNOWN'}</span>
                        </td>
                        <td>{item.version || '-'}</td>
                        <td>{formatDate(item.updated_on)}</td>
                        <td>{formatDate(item.published_on)}</td>
                        <td className="table-actions">
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRollback(item.id);
                            }}
                            disabled={isLoading}
                          >
                            Rollback
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
      {showEditor ? (
        <div className="modal-backdrop" onClick={closeEditor}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 className="panel-subheading">{editingSectionIndex !== null ? 'Edit Section' : 'Add Section'}</h3>
                {isEditingFixed ? (
                  <p className="field-help">Fixed sections can only be reordered or hidden.</p>
                ) : null}
              </div>
              <button type="button" className="ghost-btn small" onClick={closeEditor}>
                x
              </button>
            </div>
            <form className="field-grid modal-grid" onSubmit={handleSectionSubmit}>
              <label className="field field-span">
                <span>Section title</span>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={(event) => setSectionForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Section title"
                />
              </label>
              <label className="field">
                <span>Section id</span>
                <input
                  type="text"
                  value={sectionForm.id}
                  onChange={(event) => setSectionForm((prev) => ({ ...prev, id: event.target.value }))}
                  placeholder="todays_deals"
                  disabled={isEditingFixed}
                  required={!isEditingFixed}
                />
              </label>
              {isEditingFixed ? (
                <label className="field">
                  <span>Section type</span>
                  <input type="text" value="Fixed" disabled />
                </label>
              ) : (
                <label className="field">
                  <span>Section type</span>
                  <select
                    value={sectionForm.type}
                    onChange={(event) => setSectionForm((prev) => ({ ...prev, type: event.target.value }))}
                  >
                    {screenSectionTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!isEditingFixed ? (
                <div className="field field-span">
                  <span>Templates</span>
                  <div className="inline-row">
                    <button type="button" className="ghost-btn small" onClick={() => applySectionPreset('todays_deals')}>
                      Today's Deals
                    </button>
                    <button type="button" className="ghost-btn small" onClick={() => applySectionPreset('quick_actions')}>
                      Quick Actions
                    </button>
                    <button type="button" className="ghost-btn small" onClick={() => applySectionPreset('shop_categories')}>
                      Categories
                    </button>
                  </div>
                </div>
              ) : null}
              {!isEditingFixed ? (
                <div className="field field-span">
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={() => setShowAdvancedFields((prev) => !prev)}
                  >
                    {showAdvancedFields ? 'Hide advanced fields' : 'Show advanced fields'}
                  </button>
                </div>
              ) : null}
              {showAdvancedFields && !isEditingFixed ? (
                <>
                  <label className="field">
                    <span>Items path</span>
                    <input
                      type="text"
                      value={sectionForm.itemsPath}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, itemsPath: event.target.value }))}
                      placeholder="$.items"
                    />
                  </label>
                  <label className="field">
                    <span>Item template ref</span>
                    <input
                      type="text"
                      value={sectionForm.itemTemplateRef}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, itemTemplateRef: event.target.value }))}
                      placeholder="actionCard"
                    />
                  </label>
                  <label className="field">
                    <span>Data source ref</span>
                    <input
                      type="text"
                      value={sectionForm.dataSourceRef}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, dataSourceRef: event.target.value }))}
                      placeholder="todaydealproducts"
                    />
                  </label>
                  <label className="field">
                    <span>Columns (grid only)</span>
                    <input
                      type="number"
                      min="1"
                      value={sectionForm.columns}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, columns: event.target.value }))}
                      placeholder="2"
                    />
                  </label>
                  <label className="field">
                    <span>Schedule start (local)</span>
                    <input
                      type="datetime-local"
                      value={sectionForm.scheduleStart}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, scheduleStart: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Schedule end (local)</span>
                    <input
                      type="datetime-local"
                      value={sectionForm.scheduleEnd}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, scheduleEnd: event.target.value }))}
                    />
                  </label>
                  <label className="field field-span">
                    <span>Target user types (comma separated)</span>
                    <input
                      type="text"
                      value={sectionForm.targetUserTypes}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, targetUserTypes: event.target.value }))}
                      placeholder="USER, BUSINESS"
                    />
                  </label>
                  <label className="field field-span">
                    <span>Target roles (comma separated)</span>
                    <input
                      type="text"
                      value={sectionForm.targetRoles}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, targetRoles: event.target.value }))}
                      placeholder="Admin, Seller"
                    />
                  </label>
                  <label className="field field-span">
                    <span>Target industries (comma separated)</span>
                    <input
                      type="text"
                      value={sectionForm.targetIndustries}
                      onChange={(event) =>
                        setSectionForm((prev) => ({ ...prev, targetIndustries: event.target.value }))
                      }
                      placeholder="Grocery, Electronics"
                    />
                  </label>
                  <label className="field field-span">
                    <span>Target subscription statuses (comma separated)</span>
                    <input
                      type="text"
                      value={sectionForm.targetSubscriptionStatuses}
                      onChange={(event) =>
                        setSectionForm((prev) => ({ ...prev, targetSubscriptionStatuses: event.target.value }))
                      }
                      placeholder="ACTIVE, TRIAL"
                    />
                  </label>
                </>
              ) : null}
              <div className="field field-span modal-actions">
                <button type="button" className="ghost-btn" onClick={closeEditor}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn compact" disabled={isLoading}>
                  {editingSectionIndex !== null ? 'Save' : 'Add Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showHeaderEditor ? (
        <div className="modal-backdrop" onClick={closeHeaderEditor}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 className="panel-subheading">
                  {editingHeaderSectionIndex !== null ? 'Edit Header Block' : 'Add Header Block'}
                </h3>
              </div>
              <button type="button" className="ghost-btn small" onClick={closeHeaderEditor}>
                x
              </button>
            </div>
            <form className="field-grid modal-grid" onSubmit={handleHeaderSectionSubmit}>
              <label className="field field-span">
                <span>Section title</span>
                <input
                  type="text"
                  value={headerSectionForm.title}
                  onChange={(event) => setHeaderSectionForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Header block title"
                />
              </label>
              <label className="field">
                <span>Section id</span>
                <input
                  type="text"
                  value={headerSectionForm.id}
                  onChange={(event) => setHeaderSectionForm((prev) => ({ ...prev, id: event.target.value }))}
                  placeholder="hero_banner"
                  required
                />
              </label>
              <label className="field">
                <span>Section type</span>
                <select
                  value={headerSectionForm.type}
                  onChange={(event) => setHeaderSectionForm((prev) => ({ ...prev, type: event.target.value }))}
                >
                  {headerSectionTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field field-span">
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => setShowHeaderAdvancedFields((prev) => !prev)}
                >
                  {showHeaderAdvancedFields ? 'Hide advanced fields' : 'Show advanced fields'}
                </button>
              </div>
              {showHeaderAdvancedFields ? (
                <>
                  <label className="field">
                    <span>Items path</span>
                    <input
                      type="text"
                      value={headerSectionForm.itemsPath}
                      onChange={(event) => setHeaderSectionForm((prev) => ({ ...prev, itemsPath: event.target.value }))}
                      placeholder="$.items"
                    />
                  </label>
                  <label className="field">
                    <span>Item template ref</span>
                    <input
                      type="text"
                      value={headerSectionForm.itemTemplateRef}
                      onChange={(event) =>
                        setHeaderSectionForm((prev) => ({ ...prev, itemTemplateRef: event.target.value }))
                      }
                      placeholder="bannerCard"
                    />
                  </label>
                  <label className="field">
                    <span>Data source ref</span>
                    <input
                      type="text"
                      value={headerSectionForm.dataSourceRef}
                      onChange={(event) =>
                        setHeaderSectionForm((prev) => ({ ...prev, dataSourceRef: event.target.value }))
                      }
                      placeholder="home.beauty"
                    />
                  </label>
                  <label className="field">
                    <span>Columns</span>
                    <input
                      type="number"
                      value={headerSectionForm.columns}
                      onChange={(event) => setHeaderSectionForm((prev) => ({ ...prev, columns: event.target.value }))}
                      placeholder="4"
                    />
                  </label>
                  <label className="field">
                    <span>Schedule start (local)</span>
                    <input
                      type="datetime-local"
                      value={headerSectionForm.scheduleStart}
                      onChange={(event) =>
                        setHeaderSectionForm((prev) => ({ ...prev, scheduleStart: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Schedule end (local)</span>
                    <input
                      type="datetime-local"
                      value={headerSectionForm.scheduleEnd}
                      onChange={(event) =>
                        setHeaderSectionForm((prev) => ({ ...prev, scheduleEnd: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field field-span">
                    <span>Target user types (comma separated)</span>
                    <input
                      type="text"
                      value={headerSectionForm.targetUserTypes}
                      onChange={(event) =>
                        setHeaderSectionForm((prev) => ({ ...prev, targetUserTypes: event.target.value }))
                      }
                      placeholder="USER, BUSINESS"
                    />
                  </label>
                  <label className="field field-span">
                    <span>Target roles (comma separated)</span>
                    <input
                      type="text"
                      value={headerSectionForm.targetRoles}
                      onChange={(event) => setHeaderSectionForm((prev) => ({ ...prev, targetRoles: event.target.value }))}
                      placeholder="Admin, Seller"
                    />
                  </label>
                  <label className="field field-span">
                    <span>Target industries (comma separated)</span>
                    <input
                      type="text"
                      value={headerSectionForm.targetIndustries}
                      onChange={(event) =>
                        setHeaderSectionForm((prev) => ({ ...prev, targetIndustries: event.target.value }))
                      }
                      placeholder="Grocery, Electronics"
                    />
                  </label>
                  <label className="field field-span">
                    <span>Target subscription statuses (comma separated)</span>
                    <input
                      type="text"
                      value={headerSectionForm.targetSubscriptionStatuses}
                      onChange={(event) =>
                        setHeaderSectionForm((prev) => ({
                          ...prev,
                          targetSubscriptionStatuses: event.target.value,
                        }))
                      }
                      placeholder="ACTIVE, TRIAL"
                    />
                  </label>
                </>
              ) : null}
              <div className="field field-span">
                <div className="inline-row">
                  <button type="submit" className="primary-btn compact">
                  {editingHeaderSectionIndex !== null ? 'Update Header Block' : 'Add Header Block'}
                  </button>
                  <button type="button" className="ghost-btn small" onClick={closeHeaderEditor}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AppConfigPage;

