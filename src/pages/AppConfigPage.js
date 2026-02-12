import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner } from '../components';
import {
  getAppConfigDraft,
  getPublishedAppConfig,
  listAppConfigVersions,
  listIndustries,
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
const isHardcodedSection = (section) => section?.type === 'hardcoded';
const isHomeMainPage = (page) => page?.id === 'home_main' || page?.route === '/home';

const sectionTypeOptions = [
  { value: 'carousel', label: 'Carousel' },
  { value: 'grid', label: 'Grid' },
  { value: 'horizontalList', label: 'Horizontal list' },
  { value: 'list', label: 'List' },
  { value: 'banner', label: 'Banner' },
  { value: 'card', label: 'Card' },
  { value: 'twoColumn', label: 'Two column' },
];

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
  type: 'grid',
  title: '',
  itemsPath: '',
  itemTemplateRef: '',
  dataSourceRef: '',
  columns: '',
};

const defaultHeaderForm = {
  backgroundImage: '',
  overlayGradient: '',
};

const defaultHeaderSectionForm = {
  id: '',
  type: 'carousel',
  title: '',
  itemsPath: '',
  itemTemplateRef: '',
  dataSourceRef: '',
  columns: '',
};

const getPageKey = (page, index) => page?.id || page?.route || `page_${index + 1}`;
const getPageLabel = (page, index, presets) => {
  const preset = (presets || []).find((item) => item.id === page?.id);
  return preset?.label || page?.id || page?.route || `Page ${index + 1}`;
};

function AppConfigPage({ token }) {
  const [draftText, setDraftText] = useState('');
  const [version, setVersion] = useState('');
  const [message, setMessage] = useState(emptyMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [showCustomPageFields, setShowCustomPageFields] = useState(false);
  const [showSectionDetails, setShowSectionDetails] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingHeaderImage, setIsUploadingHeaderImage] = useState(false);
  const [isUploadingHeroBanner, setIsUploadingHeroBanner] = useState(false);
  const [versions, setVersions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPageKey, setSelectedPageKey] = useState('');
  const [industries, setIndustries] = useState([]);
  const [newPageId, setNewPageId] = useState('');
  const [newPageRoute, setNewPageRoute] = useState('');
  const [newPageSource, setNewPageSource] = useState('');
  const [sectionForm, setSectionForm] = useState(defaultSectionForm);
  const [headerForm, setHeaderForm] = useState(defaultHeaderForm);
  const [headerSectionForm, setHeaderSectionForm] = useState(defaultHeaderSectionForm);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  const [editingHeaderSectionIndex, setEditingHeaderSectionIndex] = useState(null);
  const [pagePresetKey, setPagePresetKey] = useState('');
  const bannerInputRef = useRef(null);
  const headerInputRef = useRef(null);
  const heroBannerInputRef = useRef(null);
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
    const sections = selectedPage?.header?.sections;
    return Array.isArray(sections) ? sections : [];
  }, [selectedPage]);
  const activeSection = editingSectionIndex !== null ? selectedSections[editingSectionIndex] : null;
  const activeHeaderSection =
    editingHeaderSectionIndex !== null ? selectedHeaderSections[editingHeaderSectionIndex] : null;
  const isEditingFixed = isHardcodedSection(activeSection);

  const pageCount = pages.length;
  const sectionCount = selectedSections.length;
  const versionCount = versions.length;
  const industryCount = industries.length;

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
      setIndustries(Array.isArray(items) ? items : []);
    } catch (error) {
      setIndustries([]);
    }
  };

  useEffect(() => {
    loadDraft();
    loadVersions();
    loadIndustries();
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
    await Promise.all([loadDraft(), loadVersions(), loadIndustries()]);
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
    setShowEditor(true);
  };

  const openAddHeaderSection = () => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before adding hero sections.' });
      return;
    }
    resetHeaderSectionForm();
    setShowHeaderEditor(true);
  };

  const openEditSection = (index) => {
    handleSelectSection(index);
    setShowAdvancedFields(false);
    setShowEditor(true);
  };

  const openEditHeaderSection = (index) => {
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'Select a page before editing hero sections.' });
      return;
    }
    setEditingHeaderSectionIndex(index);
    const section = selectedHeaderSections[index];
    setHeaderSectionForm({
      id: section?.id || '',
      type: section?.type || 'carousel',
      title: section?.title || '',
      itemsPath: section?.itemsPath || '',
      itemTemplateRef: section?.itemTemplateRef || '',
      dataSourceRef: section?.dataSourceRef || '',
      columns: section?.columns ? String(section.columns) : '',
    });
    setShowHeaderAdvancedFields(false);
    setShowHeaderEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    resetSectionForm();
  };

  const closeHeaderEditor = () => {
    setShowHeaderEditor(false);
    resetHeaderSectionForm();
  };

  const ensureHeaderTabs = (config) => {
    if (!config.navigation || typeof config.navigation !== 'object') {
      config.navigation = { topCategoryTabs: [], bottomTabs: [] };
    }
    if (!Array.isArray(config.navigation.topCategoryTabs)) {
      config.navigation.topCategoryTabs = [];
    }
    headerTabs.forEach((tab) => {
      const exists = config.navigation.topCategoryTabs.some((item) => item?.id === tab.id);
      if (!exists) {
        config.navigation.topCategoryTabs.push({ id: tab.id, label: tab.label, route: tab.route });
      }
    });
  };

  const ensureHeaderPages = () => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    ensureHeaderTabs(next);
    const pagesList = ensurePagesArray(next);
    pagePresets.forEach((preset) => {
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

  const addSectionFromPreset = (preset, overrides) => {
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
    const sections = ensureScreenSections(pagesList[pageIndex]);
    const base = { ...preset.section, ...(overrides || {}) };
    base.id = buildUniqueSectionId(base.id, sections);
    sections.push(base);
    if (!next.dataSources || typeof next.dataSources !== 'object') {
      next.dataSources = {};
    }
    if (base.dataSourceRef && !next.dataSources[base.dataSourceRef]) {
      next.dataSources[base.dataSourceRef] = { method: 'GET', url: `/api/${base.dataSourceRef}` };
    }
    updateConfigFromBuilder(next, 'Section added. Remember to save draft.');
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
        { items }
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
      const config = getConfigForBuilder();
      if (!config) return;
      const next = cloneConfig(config);
      const pagesList = ensurePagesArray(next);
      const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
      if (pageIndex < 0) {
        setMessage({ type: 'error', text: 'Selected page not found in config.' });
        return;
      }
      const sections = ensureHeaderSections(pagesList[pageIndex]);
      const baseId = 'hero_banner';
      const uniqueId = buildUniqueSectionId(baseId, sections);
      sections.push({
        id: uniqueId,
        type: 'carousel',
        title: 'Hero Banner',
        items,
      });
      updateConfigFromBuilder(next, 'Hero banner section added. Remember to save draft.');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload hero banner.' });
    } finally {
      setIsUploadingHeroBanner(false);
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

  const ensureHeaderSections = (page) => {
    if (!page.header || typeof page.header !== 'object') {
      page.header = {};
    }
    if (!Array.isArray(page.header.sections)) {
      page.header.sections = [];
    }
    return page.header.sections;
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
    setOrDelete('title', form.title?.trim());
    setOrDelete('itemsPath', form.itemsPath?.trim());
    setOrDelete('itemTemplateRef', form.itemTemplateRef?.trim());
    setOrDelete('dataSourceRef', form.dataSourceRef?.trim());
    const columns = form.columns !== '' ? Number(form.columns) : null;
    if (columns && !Number.isNaN(columns)) {
      next.columns = columns;
    } else {
      delete next.columns;
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

    const overlayGradient = parseGradientList(headerForm.overlayGradient);
    if (overlayGradient.length > 0) {
      nextHeader.overlayGradient = overlayGradient;
    } else {
      delete nextHeader.overlayGradient;
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
      setMessage({ type: 'error', text: 'Select a page before adding hero sections.' });
      return;
    }
    const id = headerSectionForm.id.trim();
    const type = headerSectionForm.type.trim();
    if (!id || !type) {
      setMessage({ type: 'error', text: 'Hero section id and type are required.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
    if (pageIndex < 0) {
      setMessage({ type: 'error', text: 'Selected page not found in config.' });
      return;
    }
    const sections = ensureHeaderSections(pagesList[pageIndex]);
    if (sections.some((section) => section?.id === id)) {
      setMessage({ type: 'error', text: 'Hero section id already exists on this page.' });
      return;
    }
    const newSection = buildSectionFromForm(null, headerSectionForm);
    sections.push(newSection);
    updateConfigFromBuilder(next, 'Hero section added. Remember to save draft.');
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
      setMessage({ type: 'error', text: 'Select a page before editing hero sections.' });
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
    const sections = ensureHeaderSections(pagesList[pageIndex]);
    const section = sections[editingHeaderSectionIndex];
    if (!section) return;
    const updated = buildSectionFromForm(section, headerSectionForm);
    if (!updated.id) {
      setMessage({ type: 'error', text: 'Hero section id is required.' });
      return;
    }
    if (updated.id !== section.id && sections.some((item) => item?.id === updated.id)) {
      setMessage({ type: 'error', text: 'Hero section id already exists on this page.' });
      return;
    }
    sections[editingHeaderSectionIndex] = updated;
    updateConfigFromBuilder(next, 'Hero section updated. Remember to save draft.');
    resetHeaderSectionForm();
    setShowHeaderEditor(false);
  };

  const handleSelectSection = (index) => {
    const section = selectedSections[index];
    if (!section) return;
    setEditingSectionIndex(index);
    setSectionForm({
      id: section.id || '',
      type: section.type || 'grid',
      title: section.title || '',
      itemsPath: section.itemsPath || '',
      itemTemplateRef: section.itemTemplateRef || '',
      dataSourceRef: section.dataSourceRef || '',
      columns: section.columns !== undefined && section.columns !== null ? String(section.columns) : '',
    });
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
    const sections = ensureHeaderSections(pagesList[pageIndex]);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;
    updateConfigFromBuilder(next, 'Hero section order updated. Remember to save draft.');
  };

  const handleDeleteHeaderSection = (index) => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, idx) => getPageKey(page, idx) === selectedPageKey);
    if (pageIndex < 0) return;
    const sections = ensureHeaderSections(pagesList[pageIndex]);
    sections.splice(index, 1);
    updateConfigFromBuilder(next, 'Hero section removed. Remember to save draft.');
    resetHeaderSectionForm();
  };

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
          <>
            <div className="app-config-header">
              <div className="panel-split">
                <div>
                  <h3 className="panel-subheading">Header Settings</h3>
                  <p className="field-help">Set a background image + overlay gradient for the selected page header.</p>
                </div>
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => setShowCustomPageFields((prev) => !prev)}
                >
                  {showCustomPageFields ? 'Hide' : 'Edit'}
                </button>
              </div>
              {showCustomPageFields ? (
                selectedPage ? (
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
                )
              ) : null}
            </div>
            <div className="section-list">
              <div className="section-row section-row--header">
                <div className="section-main">
                  <div className="section-title">Hero Sections</div>
                  <div className="section-sub">Content that appears inside the header image area.</div>
                </div>
                <div className="section-actions">
                  <button type="button" className="ghost-btn small" onClick={handleHeroBannerClick} disabled={isUploadingHeroBanner}>
                    {isUploadingHeroBanner ? 'Uploading...' : 'Add Hero Banner'}
                  </button>
                  <button type="button" className="ghost-btn small" onClick={openAddHeaderSection}>
                    + Add Hero Section
                  </button>
                </div>
              </div>
              {selectedHeaderSections.length === 0 ? (
                <div className="section-empty">No hero sections yet.</div>
              ) : (
                selectedHeaderSections.map((section, index) => {
                  const title = section?.title || section?.id || 'Hero Section';
                  const typeLabel = section?.type || 'Section';
                  return (
                    <div
                      key={`${section?.id || 'hero'}-${index}`}
                      className="section-row"
                    >
                      <div className="section-grip" />
                      <div className="section-main" onClick={() => openEditHeaderSection(index)}>
                        <div className="section-title">{title}</div>
                        <div className="section-sub">{section?.id || ''}</div>
                      </div>
                      <span className="section-pill">{typeLabel}</span>
                      <div className="section-actions">
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMoveHeaderSection(index, -1);
                          }}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMoveHeaderSection(index, 1);
                          }}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditHeaderSection(index);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteHeaderSection(index);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {selectedSections.length === 0 ? (
                <div className="section-empty">No sections yet.</div>
              ) : (
                selectedSections.map((section, index) => {
                  const isFixed = isHardcodedSection(section);
                  const title = section?.title || section?.id || 'Section';
                  const typeLabel = isFixed ? 'Fixed' : section?.type || 'Section';
                  const visible = section?.enabled !== false;
                  return (
                    <div
                      key={`${section?.id || 'section'}-${index}`}
                      className={`section-row ${visible ? '' : 'is-hidden'}`}
                    >
                      <div className="section-grip" />
                      <div className="section-main" onClick={() => openEditSection(index)}>
                        <div className="section-title">{title}</div>
                        <div className="section-sub">{section?.id || ''}</div>
                      </div>
                      <span className={`section-pill ${isFixed ? 'pill-fixed' : ''}`}>{typeLabel}</span>
                      <label className="toggle" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={() => handleToggleSection(index)}
                        />
                        <span className="toggle-track">
                          <span className="toggle-thumb" />
                        </span>
                        <span className="toggle-text">{visible ? 'Visible' : 'Hidden'}</span>
                      </label>
                      <div className="section-actions">
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMoveSection(index, -1);
                          }}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMoveSection(index, 1);
                          }}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditSection(index);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteSection(index);
                          }}
                          disabled={isFixed}
                        >
                          {isFixed ? 'Fixed' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="section-footer">
              <button type="button" className="add-section-btn" onClick={openAddSection}>
                + Add Section
              </button>
              <div className="quick-add-row">
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={handleBannerClick}
                  disabled={isUploadingBanner}
                >
                  {isUploadingBanner ? 'Uploading...' : 'Add Ad Banner'}
                </button>
                <button type="button" className="ghost-btn small" onClick={() => handleAddQuickSection('todays_deals')}>
                  Add Today's Deals
                </button>
                <button type="button" className="ghost-btn small" onClick={() => handleAddQuickSection('quick_actions')}>
                  Add Quick Actions
                </button>
                <button type="button" className="ghost-btn small" onClick={() => handleAddQuickSection('shop_categories')}>
                  Add Categories
                </button>
              </div>
            </div>
          </>
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
                    {sectionTypeOptions.map((opt) => (
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
                  {editingHeaderSectionIndex !== null ? 'Edit Hero Section' : 'Add Hero Section'}
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
                  placeholder="Hero section title"
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
                  {sectionTypeOptions.map((opt) => (
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
                </>
              ) : null}
              <div className="field field-span">
                <div className="inline-row">
                  <button type="submit" className="primary-btn compact">
                    {editingHeaderSectionIndex !== null ? 'Update Hero Section' : 'Add Hero Section'}
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

