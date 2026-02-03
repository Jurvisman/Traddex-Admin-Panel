import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner } from '../components';
import {
  getAppConfigDraft,
  listAppConfigVersions,
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

const sectionTypeOptions = [
  { value: 'carousel', label: 'Carousel' },
  { value: 'grid', label: 'Grid' },
  { value: 'horizontalList', label: 'Horizontal list' },
  { value: 'list', label: 'List' },
  { value: 'banner', label: 'Banner' },
  { value: 'card', label: 'Card' },
  { value: 'twoColumn', label: 'Two column' },
];

const headerTabs = [
  { id: 'home', label: 'Home', route: '/home/electronics' },
  { id: 'electronics', label: 'Electronics', route: '/home/electronics' },
  { id: 'beauty', label: 'Beauty', route: '/home/beauty' },
  { id: 'grocery', label: 'Grocery', route: '/home/grocery' },
  { id: 'fashion', label: 'Fashion', route: '/home/fashion' },
  { id: 'agriculture', label: 'Agriculture', route: '/home/agriculture' },
];

const pagePresets = [
  {
    id: 'home_electronics',
    route: '/home/electronics',
    dataSourceRef: 'home.electronics',
    dataSourceUrl: '/api/home?category=electronics',
    label: 'Home / Electronics',
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

const defaultConfig = {
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
  dataSources: {
    'home.electronics': { method: 'GET', url: '/api/home?category=electronics' },
    'home.fashion': { method: 'GET', url: '/api/home?category=fashion' },
    'home.beauty': { method: 'GET', url: '/api/home?category=beauty' },
    'home.grocery': { method: 'GET', url: '/api/home?category=grocery' },
    'home.agriculture': { method: 'GET', url: '/api/home?category=agriculture' },
    todaydealproducts: { method: 'GET', url: '/api/user/todaydealproducts' },
  },
  pages: pagePresets.map((page) => ({
    id: page.id,
    route: page.route,
    dataSourceRef: page.dataSourceRef,
    screen: { type: 'screen', bgColorRef: 'bg.page', sections: [] },
  })),
};

const defaultSectionForm = {
  id: '',
  type: 'grid',
  title: '',
  itemsPath: '',
  itemTemplateRef: '',
  columns: '',
};

const getPageKey = (page, index) => page?.id || page?.route || `page_${index + 1}`;
const getPageLabel = (page, index) => {
  const preset = pagePresets.find((item) => item.id === page?.id);
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
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [versions, setVersions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPageKey, setSelectedPageKey] = useState('');
  const [newPageId, setNewPageId] = useState('');
  const [newPageRoute, setNewPageRoute] = useState('');
  const [newPageSource, setNewPageSource] = useState('');
  const [sectionForm, setSectionForm] = useState(defaultSectionForm);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  const [pagePresetKey, setPagePresetKey] = useState(pagePresets[0]?.id || '');
  const bannerInputRef = useRef(null);

  const selectedMeta = useMemo(
    () => versions.find((item) => item.id === selectedId) || null,
    [versions, selectedId]
  );

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

  useEffect(() => {
    if (!pages.length) {
      if (selectedPageKey) setSelectedPageKey('');
      return;
    }
    const exists = pages.some((page, index) => getPageKey(page, index) === selectedPageKey);
    if (!selectedPageKey || !exists) {
      setSelectedPageKey(getPageKey(pages[0], 0));
    }
  }, [pages, selectedPageKey]);

  const loadDraft = async () => {
    setIsLoading(true);
    setMessage(emptyMessage);
    try {
      const response = await getAppConfigDraft(token);
      const payload = response?.data;
      if (payload?.config) {
        setDraftText(JSON.stringify(payload.config, null, 2));
        setVersion(payload?.meta?.version || '');
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

  useEffect(() => {
    loadDraft();
    loadVersions();
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
    await Promise.all([loadDraft(), loadVersions()]);
  };

  const handleCreateBaseConfig = () => {
    const payload = JSON.parse(JSON.stringify(defaultConfig));
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
      screen: { type: 'screen', bgColorRef: 'bg.page', sections: [] },
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
          screen: { type: 'screen', bgColorRef: 'bg.page', sections: [] },
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
    const columns = form.columns !== '' ? Number(form.columns) : null;
    if (columns && !Number.isNaN(columns)) {
      next.columns = columns;
    } else {
      delete next.columns;
    }
    return next;
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
    sections.splice(index, 1);
    updateConfigFromBuilder(next, 'Section removed. Remember to save draft.');
    resetSectionForm();
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">App Config</h2>
          <p className="panel-subtitle">Edit, validate, and publish the dynamic UI config.</p>
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
      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Section Builder</h3>
            <div className="inline-row">
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
          <div className="panel-split">
            <span className="chip subtle">
              {selectedPage ? `Page ${getPageLabel(selectedPage, selectedPageIndex)}` : 'No page selected'}
            </span>
            <button
              type="button"
              className="ghost-btn small"
              onClick={() => setShowCustomPageFields((prev) => !prev)}
            >
              {showCustomPageFields ? 'Hide custom page' : 'Custom page'}
            </button>
          </div>
          {!configSnapshot ? (
            <p className="field-help">Click "Create Base Config" to start, or show Advanced JSON to paste.</p>
          ) : (
            <>
              <div className="field-grid">
                <label className="field">
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
                          {getPageLabel(page, index)}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <div className="field">
                  <span>Quick add sections</span>
                  <div className="inline-row">
                    <button type="button" className="ghost-btn small" onClick={handleBannerClick} disabled={isUploadingBanner}>
                      {isUploadingBanner ? 'Uploading...' : 'Add Ad Banner'}
                    </button>
                    <button type="button" className="ghost-btn small" onClick={() => handleAddQuickSection('todays_deals')}>
                      Add Today&apos;s Deals
                    </button>
                    <button type="button" className="ghost-btn small" onClick={() => handleAddQuickSection('quick_actions')}>
                      Add Quick Actions
                    </button>
                    <button type="button" className="ghost-btn small" onClick={() => handleAddQuickSection('shop_categories')}>
                      Add Categories
                    </button>
                  </div>
                </div>
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleBannerFiles}
              />

              {showCustomPageFields ? (
                <div className="field-grid">
                  <label className="field">
                    <span>Preset pages</span>
                    <select value={pagePresetKey} onChange={(event) => setPagePresetKey(event.target.value)}>
                      {pagePresets.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="field">
                    <span>Page actions</span>
                    <div className="inline-row">
                      <button type="button" className="ghost-btn small" onClick={handleAddPresetPage} disabled={isLoading}>
                        Add Preset Page
                      </button>
                    </div>
                  </div>
                  <label className="field">
                    <span>New page id</span>
                    <input
                      type="text"
                      value={newPageId}
                      onChange={(event) => setNewPageId(event.target.value)}
                      placeholder="home_custom"
                    />
                  </label>
                  <label className="field">
                    <span>New page route</span>
                    <input
                      type="text"
                      value={newPageRoute}
                      onChange={(event) => setNewPageRoute(event.target.value)}
                      placeholder="/home/custom"
                    />
                  </label>
                  <label className="field">
                    <span>Data source ref (optional)</span>
                    <input
                      type="text"
                      value={newPageSource}
                      onChange={(event) => setNewPageSource(event.target.value)}
                      placeholder="home.custom"
                    />
                  </label>
                  <div className="field">
                    <span>Custom page action</span>
                    <div className="inline-row">
                      <button type="button" className="ghost-btn small" onClick={handleAddPage} disabled={isLoading}>
                        Add Page
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="panel-split">
                <h3 className="panel-subheading">Sections</h3>
                <span className="chip subtle">{selectedSections.length} sections</span>
              </div>
              <div className="table-shell">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Enabled</th>
                      <th className="table-actions">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSections.length === 0 ? (
                      <tr>
                        <td colSpan="5">No sections yet.</td>
                      </tr>
                    ) : (
                      selectedSections.map((section, index) => (
                        <tr
                          key={`${section?.id || 'section'}-${index}`}
                          className="table-row-clickable"
                          onClick={() => handleSelectSection(index)}
                        >
                          <td>{section?.id || '-'}</td>
                          <td>{section?.type || '-'}</td>
                          <td>{section?.title || '-'}</td>
                          <td>{section?.enabled === false ? 'No' : 'Yes'}</td>
                          <td className="table-actions">
                            <div className="inline-row">
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
                                  handleToggleSection(index);
                                }}
                              >
                                {section?.enabled === false ? 'Enable' : 'Disable'}
                              </button>
                              <button
                                type="button"
                                className="ghost-btn small"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteSection(index);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="panel-split">
                <h3 className="panel-subheading">Section details (advanced)</h3>
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => setShowSectionDetails((prev) => !prev)}
                >
                  {showSectionDetails ? 'Hide details' : 'Show details'}
                </button>
              </div>
              {showSectionDetails || editingSectionIndex !== null ? (
                <form className="field-grid" onSubmit={handleSectionSubmit}>
                  <label className="field">
                    <span>Section id</span>
                    <input
                      type="text"
                      value={sectionForm.id}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, id: event.target.value }))}
                      placeholder="quick_actions"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Type</span>
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
                  <label className="field">
                    <span>Title (optional)</span>
                    <input
                      type="text"
                      value={sectionForm.title}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Quick actions"
                    />
                  </label>
                  <label className="field">
                    <span>Items path</span>
                    <input
                      type="text"
                      value={sectionForm.itemsPath}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, itemsPath: event.target.value }))}
                      placeholder="$.quickActions"
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
                    <span>Columns (grid only)</span>
                    <input
                      type="number"
                      min="1"
                      value={sectionForm.columns}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, columns: event.target.value }))}
                      placeholder="2"
                    />
                  </label>
                  <div className="field">
                    <span>Section actions</span>
                    <div className="inline-row">
                      <button type="submit" className="primary-btn compact" disabled={isLoading}>
                        {editingSectionIndex !== null ? 'Update Section' : 'Add Section'}
                      </button>
                      {editingSectionIndex !== null ? (
                        <button type="button" className="ghost-btn small" onClick={resetSectionForm} disabled={isLoading}>
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                </form>
              ) : (
                <p className="field-help">Select a section row to edit details, or enable advanced fields.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppConfigPage;
