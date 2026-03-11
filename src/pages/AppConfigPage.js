import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Banner, ConfirmDialog } from '../components';
import {
  getAppConfigDraft,
  getPublishedAppConfig,
  getAppConfigPresets,
  getHomeCategoryPreview,
  listAppConfigVersions,
  listCategories,
  listIndustries,
  listMainCategories,
  createIndustry,
  publishAppConfig,
  rollbackAppConfig,
  saveAppConfigDraft,
  uploadBannerImages,
  validateAppConfig,
} from '../services/adminApi';

import {
  emptyMessage,
  parseJson,
  formatDate,
  parseCsvList,
  formatCsvList,
  toLocalInputValue,
  fromLocalInputValue,
  isHardcodedSection,
  isHomeMainPage,
  screenSectionTypeOptions,
  defaultBlockTypeBySectionType,
  headerSectionTypeOptions,
  headerToolboxItems,
  screenToolboxItems,
  toolboxItems,
  blockLabels,
  resolveBlockLabel,
  resolveBlockType,
  normalizeCollectionId,
  normalizeMatchValue,
  resolveIndustryId,
  resolveIndustryLabel,
  resolveMainCategoryId,
  resolveMainCategoryIndustryId,
  resolveMainCategoryName,
  resolveCategoryId,
  resolveCategoryMainCategoryId,
  sizePresets,
  categoryLayoutPresets,
  findPresetKey,
  ensureBentoTiles,
  phaseOneBlockTypes,
  getPhaseOneDefaultItem,
  normalizePhaseOneItems,
  imageExtensionRegex,
  imageLikeFieldRegex,
  getImageExtension,
  isLikelyImageUrl,
  collectImageUrls,
  isHexColor,
  resolveHexColor,
  normalizeColumnTopLineStyle,
  COLUMN_GRID_BG_PALETTE,
  COLUMN_GRID_CARD_BG_PALETTE,
  COLUMN_GRID_TOP_LINE_STYLES,
  CATEGORY_FEED_SORT_OPTIONS,
  CATEGORY_ICON_FEED_MODE_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  SHOWCASE_VARIANT_OPTIONS,
  MULTI_ITEM_GRID_FEED_OPTIONS,
  resolveMultiItemGridDataSourceRef,
  resolveMultiItemGridFeedMode,
  DEEP_LINK_TEMPLATE_PRESETS,
  ITEM_DEEP_LINK_PRESETS,
  toNumberOrNull,
  buildCategoryFeedFingerprint,
  isValidDeepLinkValue,
  matchesLayoutPreset,
  fallbackHeaderTabs,
  fallbackIndustryPresets,
  homeFixedSections,
  buildHomeFixedSections,
  normalizeSlug,
  resolveIndustryRoute,
  buildIndustryPresets,
  buildHeaderTabs,
  buildPagePresets,
  quickSectionPresets,
  buildDataSources,
  resolveDefaultDataSourceByRef,
  buildDefaultConfig,
  defaultSectionForm,
  defaultHeaderForm,
  defaultHeaderSectionForm,
  getPageKey,
  getPageLabel,
} from './appConfig/appConfigConstants';
import {
  SortableSectionRow,
  ToolboxItem,
  DropZone,
  SortablePreviewItem,
  getPreviewItems,
  getPreviewImage,
  getPreviewSecondaryImage,
  getPreviewTitle,
  HeaderBlockPreview,
  PreviewSection,
} from './appConfig/AppConfigDndComponents';
import {
  buildUniqueSectionId,
  ensurePagesArray,
  ensureScreenSections,
  ensureHeaderBlocks,
  buildSectionFromForm,
  parseGradientList,
  buildSectionFormFromConfig,
} from './appConfig/appConfigBuilders';

function AppConfigPage({ token }) {
  const [draftText, setDraftText] = useState('');
  const [version, setVersion] = useState('');
  const [message, setMessage] = useState(emptyMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [showCustomPageFields, setShowCustomPageFields] = useState(false);
  const [showManagePages, setShowManagePages] = useState(false);
  const [clonePageId, setClonePageId] = useState('');
  const [clonePageRoute, setClonePageRoute] = useState('');
  const [showManageTabs, setShowManageTabs] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingHeaderImage, setIsUploadingHeaderImage] = useState(false);
  const [isUploadingHeroBanner, setIsUploadingHeroBanner] = useState(false);
  const [isUploadingBentoImage, setIsUploadingBentoImage] = useState(false);
  const [bentoUploadTarget, setBentoUploadTarget] = useState(null);
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState([]);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);
  const [mediaSearchText, setMediaSearchText] = useState('');
  const [phaseOneImageWarnings, setPhaseOneImageWarnings] = useState({});
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
  const [mainCategories, setMainCategories] = useState([]);
  const [sourceCategories, setSourceCategories] = useState([]);
  const [isLoadingSourceCategories, setIsLoadingSourceCategories] = useState(false);
  const [isResolvingSource, setIsResolvingSource] = useState(false);
  const [lastAppliedSourceFingerprint, setLastAppliedSourceFingerprint] = useState('');
  const [sourceAutoRefresh, setSourceAutoRefresh] = useState(true);
  const [showAdvancedSourceSettings, setShowAdvancedSourceSettings] = useState(false);
  const bannerInputRef = useRef(null);
  const headerInputRef = useRef(null);
  const heroBannerInputRef = useRef(null);
  const bentoInputRef = useRef(null);
  const lastSavedDraftRef = useRef('');
  const versionDropdownRef = useRef(null);
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
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

  const pageIndustry = useMemo(() => {
    const pageId = selectedPage?.id || '';
    if (!pageId.startsWith('home_') || pageId === 'home_main') return null;
    const slug = pageId.replace(/^home_/, '');
    return industries.find((ind) => {
      const indSlug = normalizeSlug(ind?.slug || ind?.name || '');
      return indSlug === slug;
    }) || null;
  }, [selectedPage, industries]);

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

  const mediaLibraryUrls = useMemo(() => {
    const bucket = new Set();
    uploadedMediaUrls.forEach((url) => {
      if (isLikelyImageUrl(url)) bucket.add(url);
    });
    collectImageUrls(configSnapshot, bucket);
    if (Array.isArray(headerPresets?.images)) {
      headerPresets.images.forEach((item) => {
        const url = item?.url || item?.imageUrl || '';
        if (isLikelyImageUrl(url)) bucket.add(url);
      });
    }
    return Array.from(bucket);
  }, [uploadedMediaUrls, configSnapshot, headerPresets]);

  const filteredMediaLibraryUrls = useMemo(() => {
    const query = (mediaSearchText || '').trim().toLowerCase();
    if (!query) return mediaLibraryUrls;
    return mediaLibraryUrls.filter((url) => url.toLowerCase().includes(query));
  }, [mediaLibraryUrls, mediaSearchText]);

  const pageCount = pages.length;
  const sectionCount = selectedSections.length;
  const versionCount = versions.length;
  const industryCount = industries.length;
  const hasUnsavedChanges = Boolean(draftText && draftText !== lastSavedDraftRef.current);

  const orphanedPages = useMemo(() => {
    if (!pages.length || !industries.length) return [];
    const activeSlugs = new Set(
      industries
        .filter((ind) => ind?.active !== 0)
        .map((ind) => normalizeSlug(ind?.slug || ind?.name || ''))
        .filter(Boolean)
    );
    return pages.filter((page) => {
      const id = page?.id || '';
      if (!id.startsWith('home_') || id === 'home_main') return false;
      const slug = id.replace(/^home_/, '');
      return !activeSlugs.has(slug);
    });
  }, [pages, industries]);

  const currentTabs = useMemo(() => {
    const tabs = configSnapshot?.navigation?.topCategoryTabs;
    return Array.isArray(tabs) ? tabs : [];
  }, [configSnapshot]);

  const handleMoveTab = (fromIndex, direction) => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    if (!next.navigation || !Array.isArray(next.navigation.topCategoryTabs)) return;
    const tabs = next.navigation.topCategoryTabs;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= tabs.length) return;
    const temp = tabs[fromIndex];
    tabs[fromIndex] = tabs[toIndex];
    tabs[toIndex] = temp;
    updateConfigFromBuilder(next, 'Tab order updated. Remember to save draft.');
  };

  const handleRemoveTab = (index) => {
    const config = getConfigForBuilder();
    if (!config) return;
    const next = cloneConfig(config);
    if (!next.navigation || !Array.isArray(next.navigation.topCategoryTabs)) return;
    const tab = next.navigation.topCategoryTabs[index];
    const tabLabel = tab?.label || tab?.id || 'tab';
    setConfirmAction({
      title: 'Remove Tab',
      message: `Remove the "${tabLabel}" tab from navigation? The linked page will not be deleted.`,
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: () => {
        setConfirmAction(null);
        next.navigation.topCategoryTabs.splice(index, 1);
        updateConfigFromBuilder(next, `Tab "${tabLabel}" removed. Remember to save draft.`);
      },
    });
  };

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

  useEffect(() => {
    if (!showVersionDropdown) return;
    const handleClickOutside = (e) => {
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(e.target)) {
        setShowVersionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVersionDropdown]);

  useEffect(() => {
    setPhaseOneImageWarnings({});
    closeMediaPicker();
    const blockType = sectionForm.blockType || sectionForm.type || '';
    setLastAppliedSourceFingerprint(buildCategoryFeedFingerprint(sectionForm, blockType));
    setShowAdvancedSourceSettings(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSectionIndex, sectionForm.blockType, sectionForm.type]);

  useEffect(() => {
    const resolvedBlockType = sectionForm.blockType || sectionForm.type || '';
    if (!phaseOneBlockTypes.has(resolvedBlockType)) return;
    if ((sectionForm.sourceType || 'MANUAL') !== 'CATEGORY_FEED') {
      setSourceCategories([]);
      return;
    }
    const mainId = normalizeCollectionId(sectionForm.sourceMainCategoryId);
    if (!mainId) {
      setSourceCategories([]);
      return;
    }
    loadSourceCategories(mainId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionForm.blockType, sectionForm.type, sectionForm.sourceType, sectionForm.sourceMainCategoryId]);

  useEffect(() => {
    const resolvedBlockType = sectionForm.blockType || sectionForm.type || '';
    if (resolvedBlockType !== 'column_grid') return;
    if (!sourceAutoRefresh || isResolvingSource) return;
    const fingerprint = buildCategoryFeedFingerprint(sectionForm, resolvedBlockType);
    if (!fingerprint || fingerprint === lastAppliedSourceFingerprint) return;
    const timer = setTimeout(() => {
      handleApplyCategoryFeed();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sectionForm.blockType,
    sectionForm.type,
    sectionForm.sourceType,
    sectionForm.sourceIndustryId,
    sectionForm.sourceFeedMode,
    sectionForm.sourceMainCategoryId,
    sectionForm.sourceCategoryIds,
    sectionForm.sourceLimit,
    sectionForm.sourceSortBy,
    sectionForm.sourceActiveOnly,
    sectionForm.sourceHasImageOnly,
    sectionForm.sourceRankingWindowDays,
    sectionForm.mappingTitleField,
    sectionForm.mappingImageField,
    sectionForm.mappingSecondaryImageField,
    sectionForm.mappingDeepLinkTemplate,
    sourceAutoRefresh,
    isResolvingSource,
    lastAppliedSourceFingerprint,
  ]);

  const loadDraft = async () => {
    setIsLoading(true);
    setMessage(emptyMessage);
    try {
      const response = await getAppConfigDraft(token);
      const payload = response?.data;
      if (payload?.config) {
        const text = JSON.stringify(payload.config, null, 2);
        setDraftText(text);
        lastSavedDraftRef.current = text;
        setVersion(payload?.meta?.version || '');
        return;
      }
      const published = await getPublishedAppConfig();
      const publishedPayload = published?.data;
      if (publishedPayload?.config) {
        const text = JSON.stringify(publishedPayload.config, null, 2);
        setDraftText(text);
        lastSavedDraftRef.current = text;
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

  const loadMainCategories = async () => {
    try {
      const response = await listMainCategories(token);
      const items = response?.data || response;
      const sorted = Array.isArray(items)
        ? [...items].sort((a, b) => (a?.ordering ?? 0) - (b?.ordering ?? 0))
        : [];
      setMainCategories(sorted);
    } catch (error) {
      setMainCategories([]);
    }
  };

  const loadSourceCategories = async (mainCategoryId) => {
    const normalizedId = normalizeCollectionId(mainCategoryId);
    if (!normalizedId) {
      setSourceCategories([]);
      return;
    }
    setIsLoadingSourceCategories(true);
    try {
      const response = await listCategories(token, normalizedId);
      const items = response?.data || response;
      const sorted = Array.isArray(items)
        ? [...items].sort((a, b) => (a?.ordering ?? 0) - (b?.ordering ?? 0))
        : [];
      setSourceCategories(sorted);
    } catch (error) {
      setSourceCategories([]);
    } finally {
      setIsLoadingSourceCategories(false);
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
    loadMainCategories();
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
      lastSavedDraftRef.current = draftText;
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

  const requestPublish = () => {
    setConfirmAction({
      title: 'Publish Draft',
      message: 'This will push the current draft live to all users. Are you sure?',
      confirmLabel: 'Publish',
      variant: 'default',
      onConfirm: () => { setConfirmAction(null); handlePublish(); },
    });
  };

  const requestRollback = (id) => {
    setConfirmAction({
      title: 'Rollback Version',
      message: 'Rolling back will overwrite the current draft with this version. Continue?',
      confirmLabel: 'Rollback',
      variant: 'danger',
      onConfirm: () => { setConfirmAction(null); handleRollback(id); },
    });
  };

  const requestDeleteSection = (index) => {
    setConfirmAction({
      title: 'Remove Section',
      message: 'This section will be removed from the page. Remember to save draft afterwards.',
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: () => { setConfirmAction(null); handleDeleteSection(index); },
    });
  };

  const requestDeleteHeaderSection = (index) => {
    setConfirmAction({
      title: 'Remove Header Block',
      message: 'This header block will be removed. Remember to save draft afterwards.',
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: () => { setConfirmAction(null); handleDeleteHeaderSection(index); },
    });
  };

  const requestClearHeader = () => {
    setConfirmAction({
      title: 'Reset Header',
      message: 'All header settings (background, colors, gradient) will be reset to defaults.',
      confirmLabel: 'Reset',
      variant: 'danger',
      onConfirm: () => { setConfirmAction(null); handleClearHeader(); },
    });
  };

  const handleRefresh = async () => {
    await Promise.all([loadDraft(), loadVersions(), loadIndustries(), loadCollections(), loadMainCategories()]);
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
    const base = { ...defaultSectionForm };
    if (pageIndustry) {
      base.sourceType = 'CATEGORY_FEED';
      base.sourceIndustryId = String(resolveIndustryId(pageIndustry) || '');
    }
    setSectionForm(base);
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

  const addMediaUrlToLibrary = (url) => {
    if (!isLikelyImageUrl(url)) return;
    setUploadedMediaUrls((prev) => [url, ...prev.filter((item) => item !== url)]);
  };

  const openMediaPicker = (target) => {
    setMediaPickerTarget(target || null);
    setMediaSearchText('');
  };

  const closeMediaPicker = () => {
    setMediaPickerTarget(null);
    setMediaSearchText('');
  };

  const isTransparentImageRequired = (blockType, field = 'imageUrl') => {
    if (!blockType) return false;
    if (blockType === 'horizontal_scroll_list') return field === 'imageUrl';
    if (blockType === 'category_icon_grid') return field === 'imageUrl';
    if (blockType === 'column_grid') return field === 'imageUrl' || field === 'secondaryImageUrl';
    return false;
  };

  const getWarningKey = (index, field) => `${index}:${field}`;

  const detectImageAlpha = async (url) => new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxSize = 64;
          const ratio = Math.max(img.width, img.height) / maxSize || 1;
          canvas.width = Math.max(1, Math.round(img.width / ratio));
          canvas.height = Math.max(1, Math.round(img.height / ratio));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let hasAlpha = false;
          for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] < 250) {
              hasAlpha = true;
              break;
            }
          }
          resolve({ checked: true, hasAlpha });
        } catch (error) {
          resolve({ checked: false, hasAlpha: false });
        }
      };
      img.onerror = () => resolve({ checked: false, hasAlpha: false });
      img.src = url;
    } catch (error) {
      resolve({ checked: false, hasAlpha: false });
    }
  });

  const validatePhaseOneTransparency = async (index, field, url) => {
    const blockType = sectionForm.blockType || sectionForm.type || '';
    const warningKey = getWarningKey(index, field);
    if (!url || !isTransparentImageRequired(blockType, field)) {
      setPhaseOneImageWarnings((prev) => {
        const next = { ...prev };
        delete next[warningKey];
        return next;
      });
      return;
    }

    const ext = getImageExtension(url);
    if (ext === 'jpg' || ext === 'jpeg') {
      setPhaseOneImageWarnings((prev) => ({
        ...prev,
        [warningKey]: 'JPG does not support transparency. Use PNG or WebP instead.',
      }));
      return;
    }

    if (!['png', 'webp', 'gif', 'avif', 'svg'].includes(ext)) {
      setPhaseOneImageWarnings((prev) => {
        const next = { ...prev };
        delete next[warningKey];
        return next;
      });
      return;
    }

    if (ext === 'svg') {
      setPhaseOneImageWarnings((prev) => {
        const next = { ...prev };
        delete next[warningKey];
        return next;
      });
      return;
    }

    const result = await detectImageAlpha(url);
    if (result.checked && !result.hasAlpha) {
      setPhaseOneImageWarnings((prev) => ({
        ...prev,
        [warningKey]: 'Image ma transparent pixels nathi. White box dekhai shake.',
      }));
      return;
    }
    if (!result.checked) {
      setPhaseOneImageWarnings((prev) => ({
        ...prev,
        [warningKey]: 'Transparency auto-check na thai. Upload PNG/WebP from media library.',
      }));
      return;
    }
    setPhaseOneImageWarnings((prev) => {
      const next = { ...prev };
      delete next[warningKey];
      return next;
    });
  };

  const updatePhaseOneItem = (index, field, value) => {
    setSectionForm((prev) => {
      const blockType = prev.blockType || prev.type || '';
      const nextItems = normalizePhaseOneItems(prev.sduiItems, blockType);
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, sduiItems: nextItems };
    });
  };

  const addPhaseOneItem = () => {
    setSectionForm((prev) => {
      const blockType = prev.blockType || prev.type || '';
      const nextItems = normalizePhaseOneItems(prev.sduiItems, blockType);
      const nextDefault = getPhaseOneDefaultItem(blockType, nextItems.length);
      return { ...prev, sduiItems: [...nextItems, nextDefault] };
    });
    setPhaseOneImageWarnings({});
  };

  const removePhaseOneItem = (index) => {
    setSectionForm((prev) => {
      const blockType = prev.blockType || prev.type || '';
      const nextItems = normalizePhaseOneItems(prev.sduiItems, blockType).filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        sduiItems: nextItems.length ? nextItems : [getPhaseOneDefaultItem(blockType, 0)],
      };
    });
    setPhaseOneImageWarnings({});
  };

  const duplicatePhaseOneItem = (index) => {
    setSectionForm((prev) => {
      const blockType = prev.blockType || prev.type || '';
      const nextItems = normalizePhaseOneItems(prev.sduiItems, blockType);
      const current = nextItems[index];
      if (!current) return prev;
      const clone = { ...current, id: '' };
      nextItems.splice(index + 1, 0, clone);
      return { ...prev, sduiItems: nextItems };
    });
    setPhaseOneImageWarnings({});
  };

  const movePhaseOneItem = (index, direction) => {
    setSectionForm((prev) => {
      const blockType = prev.blockType || prev.type || '';
      const nextItems = normalizePhaseOneItems(prev.sduiItems, blockType);
      const target = index + direction;
      if (target < 0 || target >= nextItems.length) return prev;
      const swapped = [...nextItems];
      [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
      return { ...prev, sduiItems: swapped };
    });
    setPhaseOneImageWarnings({});
  };

  const handlePhaseOneImageChange = (index, field, value) => {
    updatePhaseOneItem(index, field, value);
    validatePhaseOneTransparency(index, field, value);
  };

  const resolveCategoryName = (category) =>
    category?.name || category?.label || category?.title || `Category ${category?.id || ''}`;

  const resolveCategoryImage = (category) =>
    category?.categoryIcon ||
    category?.iconUrl ||
    category?.imageUrl ||
    category?.categoryImage ||
    category?.thumbnailImage ||
    '';

  const isCategoryActive = (category) => {
    if (category?.active === undefined || category?.active === null) return true;
    if (typeof category.active === 'boolean') return category.active;
    return Number(category.active) === 1;
  };

  const resolveDeepLinkFromTemplate = (template, payload) => {
    const safeTemplate = template && typeof template === 'string' ? template : 'app://category/{id}';
    return safeTemplate
      .replaceAll('{id}', String(payload?.id ?? ''))
      .replaceAll('{categoryId}', String(payload?.id ?? ''))
      .replaceAll('{name}', encodeURIComponent(String(payload?.name ?? '')))
      .replaceAll('{slug}', encodeURIComponent(String(payload?.slug ?? payload?.name ?? '')));
  };

  const sortCategoryFeed = (list, sortBy) => {
    const items = Array.isArray(list) ? [...list] : [];
    const mode = String(sortBy || 'MANUAL_RANK').toUpperCase();
    if (mode === 'NAME') {
      return items.sort((a, b) => String(resolveCategoryName(a)).localeCompare(String(resolveCategoryName(b))));
    }
    if (mode === 'LATEST') {
      return items.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    }
    return items.sort((a, b) => {
      const rankA = Number(a?.ordering ?? a?.rank ?? 999999);
      const rankB = Number(b?.ordering ?? b?.rank ?? 999999);
      if (rankA !== rankB) return rankA - rankB;
      return Number(a?.id || 0) - Number(b?.id || 0);
    });
  };

  const resolveSourceCategoriesForForm = async (mainCategoryIdOverride = '') => {
    const mainCategoryId = normalizeCollectionId(mainCategoryIdOverride || sectionForm.sourceMainCategoryId);
    if (!mainCategoryId) {
      throw new Error('Select main category first.');
    }
    if (
      normalizeCollectionId(sectionForm.sourceMainCategoryId) === mainCategoryId &&
      Array.isArray(sourceCategories) &&
      sourceCategories.length
    ) {
      return sourceCategories;
    }
    const response = await listCategories(token, mainCategoryId);
    const items = response?.data || response;
    return Array.isArray(items) ? items : [];
  };

  const applyFestiveColumnGridPreset = () => {
    if ((sectionForm.blockType || sectionForm.type || '') !== 'column_grid') return;
    setSectionForm((prev) => {
      const normalizedItems = normalizePhaseOneItems(prev.sduiItems, 'column_grid');
      return {
        ...prev,
        title: (prev.title || '').trim() || 'Festive finds',
        sectionBgColor: resolveHexColor(prev.sectionBgColor, '#f5f0dc'),
        cardBgColor: resolveHexColor(prev.cardBgColor, '#9ad8f8'),
        columnTopLineStyle: normalizeColumnTopLineStyle(prev.columnTopLineStyle || 'curve'),
        sourceType: 'CATEGORY_FEED',
        sourceFeedMode: 'TOP_SELLING',
        sourceLimit: String(Math.max(1, Math.min(20, Number(prev.sourceLimit || 8)))),
        sourceSortBy: prev.sourceSortBy || 'MANUAL_RANK',
        sourceActiveOnly: true,
        sourceHasImageOnly: true,
        sourceRankingWindowDays: String(Math.max(1, Math.min(365, Number(prev.sourceRankingWindowDays || 30)))),
        mappingTitleField: prev.mappingTitleField || 'name',
        mappingImageField: prev.mappingImageField || 'imageUrl',
        mappingSecondaryImageField: prev.mappingSecondaryImageField || 'categoryImage',
        mappingDeepLinkTemplate: prev.mappingDeepLinkTemplate || 'app://category/{id}',
        sduiItems: normalizedItems.map((item) => ({
          ...item,
          title: item.title || '',
          imageUrl: item.imageUrl || '',
          secondaryImageUrl: item.secondaryImageUrl || '',
          deepLink: item.deepLink || '',
        })),
      };
    });
    setSourceAutoRefresh(true);
    setShowAdvancedSourceSettings(false);
    setMessage({
      type: 'info',
      text: 'Festive preset applied. Select a main category and categories, then refresh the feed.',
    });
  };

  const handleApplyCategoryFeed = async () => {
    const resolvedBlockType = sectionForm.blockType || sectionForm.type || '';
    if (!phaseOneBlockTypes.has(resolvedBlockType)) {
      setMessage({ type: 'error', text: 'Data source currently supported only for SDUI phase-one blocks.' });
      return;
    }
    const sourceType =
      resolvedBlockType === 'category_icon_grid'
        ? 'CATEGORY_FEED'
        : String(sectionForm.sourceType || 'MANUAL').toUpperCase();
    if (sourceType !== 'CATEGORY_FEED') {
      setMessage({ type: 'error', text: 'Select source type as Category feed.' });
      return;
    }
    setIsResolvingSource(true);
    setMessage(emptyMessage);
    try {
      const selectedIds = Array.isArray(sectionForm.sourceCategoryIds)
        ? new Set(sectionForm.sourceCategoryIds.map((id) => normalizeCollectionId(id)).filter(Boolean))
        : new Set();
      const industryId = normalizeCollectionId(sectionForm.sourceIndustryId);
      const feedMode = String(sectionForm.sourceFeedMode || 'TOP_SELLING').toUpperCase();
      const rankingWindowDays = Math.max(1, Math.min(365, Number(sectionForm.sourceRankingWindowDays || 30)));

      let resolvedMainCategoryId = normalizeCollectionId(sectionForm.sourceMainCategoryId);
      let allCategories = [];
      if (resolvedBlockType === 'category_icon_grid') {
        if (!industryId) {
          throw new Error('Select industry first.');
        }
        const industryMainCategories = mainCategories.filter(
          (item) => normalizeMatchValue(resolveMainCategoryIndustryId(item)) === normalizeMatchValue(industryId)
        );
        if (!industryMainCategories.length) {
          throw new Error('No main categories found for selected industry.');
        }
        const isTopSellingMode = feedMode === 'TOP_SELLING';
        if (!resolvedMainCategoryId && isTopSellingMode) {
          const industryCategoryGroups = await Promise.all(
            industryMainCategories.map(async (mainCategory) => {
              const mainId = resolveMainCategoryId(mainCategory);
              if (!mainId) return [];
              const response = await listCategories(token, mainId);
              const items = response?.data || response;
              return Array.isArray(items) ? items : [];
            })
          );
          allCategories = industryCategoryGroups.flat();
        } else {
          if (!resolvedMainCategoryId) {
            resolvedMainCategoryId = resolveMainCategoryId(industryMainCategories[0]);
          }
          allCategories = await resolveSourceCategoriesForForm(resolvedMainCategoryId);
        }
      } else {
        allCategories = await resolveSourceCategoriesForForm(resolvedMainCategoryId);
      }

      let filtered = allCategories.filter((item) => {
        const categoryId = resolveCategoryId(item);
        if (!categoryId) return false;
        if (selectedIds.size > 0 && !selectedIds.has(categoryId)) return false;
        if (sectionForm.sourceActiveOnly && !isCategoryActive(item)) return false;
        if (sectionForm.sourceHasImageOnly && !resolveCategoryImage(item)) return false;
        return true;
      });

      if (resolvedBlockType === 'category_icon_grid' && feedMode === 'TOP_SELLING') {
        const ids = filtered.map((item) => resolveCategoryId(item)).filter(Boolean);
        if (!ids.length) {
          throw new Error('No categories available for top-selling feed.');
        }
        const response = await getHomeCategoryPreview(token, {
          ids,
          limit: 2,
          rankingWindowDays,
        });
        const previewCategories = response?.data?.categories;
        const scoreById = new Map(
          (Array.isArray(previewCategories) ? previewCategories : []).map((item) => {
            const id = resolveCategoryId(item);
            const salesScore = Number(item?.salesScore || 0);
            const itemCount = Array.isArray(item?.items) ? item.items.length : 0;
            const score = salesScore > 0 ? salesScore : itemCount + Number(item?.moreCount || 0);
            return [id, score];
          })
        );
        filtered = [...filtered].sort((a, b) => {
          const aScore = Number(scoreById.get(resolveCategoryId(a)) || 0);
          const bScore = Number(scoreById.get(resolveCategoryId(b)) || 0);
          if (aScore !== bScore) return bScore - aScore;
          return Number(a?.ordering ?? 999999) - Number(b?.ordering ?? 999999);
        });
      } else {
        filtered = sortCategoryFeed(filtered, sectionForm.sourceSortBy);
      }

      const limit = Math.max(1, Math.min(20, Number(sectionForm.sourceLimit || 8)));
      const picked = filtered.slice(0, limit);
      if (!picked.length) {
        throw new Error('No categories matched current source filters.');
      }

      const deepLinkTemplate = sectionForm.mappingDeepLinkTemplate || 'app://category/{id}';
      const titleField = sectionForm.mappingTitleField || 'name';
      const imageField = sectionForm.mappingImageField || 'imageUrl';
      const secondaryImageField = sectionForm.mappingSecondaryImageField || '';

      let nextItems = picked.map((item) => {
        const title =
          (titleField === 'name' ? resolveCategoryName(item) : item?.[titleField]) || resolveCategoryName(item);
        const image = (imageField && item?.[imageField]) || resolveCategoryImage(item);
        const categoryId = resolveCategoryId(item);
        return {
          id: categoryId,
          collectionId: categoryId,
          title: resolvedBlockType === 'horizontal_scroll_list' ? '' : String(title || ''),
          imageUrl: image || '',
          deepLink: resolveDeepLinkFromTemplate(deepLinkTemplate, {
            id: categoryId,
            name: resolveCategoryName(item),
            slug: item?.path || resolveCategoryName(item),
          }),
          subtitle: '',
          badgeText: '',
        };
      });

      if (resolvedBlockType === 'column_grid') {
        const response = await getHomeCategoryPreview(token, {
          ids: picked.map((item) => resolveCategoryId(item)).filter(Boolean),
          limit: 2,
          rankingWindowDays,
        });
        const categoryPreview = response?.data?.categories;
        const byId = new Map(
          (Array.isArray(categoryPreview) ? categoryPreview : [])
            .map((item) => [normalizeCollectionId(item?.id), item])
        );
        nextItems = picked.map((item) => {
          const categoryId = resolveCategoryId(item);
          const preview = byId.get(categoryId);
          const previewItems = Array.isArray(preview?.items) ? preview.items : [];
          const first = previewItems[0] || null;
          const second = previewItems[1] || null;
          const mappedPrimaryImage =
            (imageField && item?.[imageField]) || resolveCategoryImage(item) || '';
          const mappedSecondaryImage =
            (secondaryImageField && item?.[secondaryImageField]) || '';
          const title =
            (titleField === 'name' ? resolveCategoryName(item) : item?.[titleField]) || resolveCategoryName(item);
          return {
            id: categoryId,
            collectionId: categoryId,
            title: String(title || ''),
            imageUrl: first?.imageUrl || mappedPrimaryImage,
            secondaryImageUrl: second?.imageUrl || mappedSecondaryImage,
            deepLink: resolveDeepLinkFromTemplate(deepLinkTemplate, {
              id: categoryId,
              name: resolveCategoryName(item),
              slug: item?.path || resolveCategoryName(item),
            }),
          };
        });
      }

      const selectedMainCategory = mainCategories.find(
        (item) => resolveMainCategoryId(item) === normalizeCollectionId(resolvedMainCategoryId)
      );
      const selectedIndustry = industries.find(
        (item) => normalizeMatchValue(resolveIndustryId(item)) === normalizeMatchValue(industryId)
      );

      setSectionForm((prev) => ({
        ...prev,
        sourceType: 'CATEGORY_FEED',
        sourceFeedMode: feedMode,
        sourceIndustryId: industryId,
        sourceMainCategoryId: normalizeCollectionId(resolvedMainCategoryId),
        sourceLimit: String(limit),
        title:
          resolvedBlockType === 'category_icon_grid'
            ? resolveMainCategoryName(selectedMainCategory) ||
              (selectedIndustry ? `${resolveIndustryLabel(selectedIndustry)} top categories` : prev.title)
            : prev.title,
        sduiItems: nextItems,
      }));
      setLastAppliedSourceFingerprint(
        buildCategoryFeedFingerprint(
          {
            ...sectionForm,
            sourceType: 'CATEGORY_FEED',
            sourceFeedMode: feedMode,
            sourceIndustryId: industryId,
            sourceMainCategoryId: normalizeCollectionId(resolvedMainCategoryId),
            sourceLimit: String(limit),
          },
          resolvedBlockType
        )
      );
      setMessage({ type: 'success', text: `Loaded ${nextItems.length} items from category feed.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to resolve category feed.' });
    } finally {
      setIsResolvingSource(false);
    }
  };

  const handleApplyBrandCollections = async () => {
    const resolvedBlockType = sectionForm.blockType || sectionForm.type || '';
    if (resolvedBlockType !== 'brand_logo_grid') {
      setMessage({ type: 'error', text: 'Collection auto-fill is only for Brand Layout block.' });
      return;
    }
    setIsResolvingSource(true);
    setMessage(emptyMessage);
    try {
      const items = normalizePhaseOneItems(sectionForm.sduiItems, resolvedBlockType);
      const tileIndexes = items
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => (item?.kind || 'tile') === 'tile')
        .slice(0, 4);
      const selectedIds = tileIndexes
        .map(({ item }) => normalizeCollectionId(item.collectionId || item.id))
        .filter(Boolean);
      if (!selectedIds.length) {
        throw new Error('Select at least one collection in middle cards.');
      }

      const response = await getHomeCategoryPreview(token, { ids: selectedIds, limit: 1 });
      const previews = Array.isArray(response?.data?.categories) ? response.data.categories : [];
      const previewById = new Map(previews.map((item) => [resolveCategoryId(item), item]));
      const collectionById = new Map(
        (Array.isArray(collections) ? collections : [])
          .map((item) => [resolveCategoryId(item), item])
          .filter(([id]) => Boolean(id))
      );

      const nextItems = [...items];
      tileIndexes.forEach(({ idx }) => {
        const current = nextItems[idx] || {};
        const collectionId = normalizeCollectionId(current.collectionId || current.id);
        if (!collectionId) return;
        const selectedCollection = collectionById.get(collectionId);
        const preview = previewById.get(collectionId);
        const previewItems = Array.isArray(preview?.items) ? preview.items : [];
        const firstProduct = previewItems[0] || null;
        nextItems[idx] = {
          ...current,
          id: collectionId,
          collectionId,
          title: resolveCategoryName(selectedCollection || preview || current),
          imageUrl: firstProduct?.imageUrl || resolveCategoryImage(selectedCollection || preview || current) || '',
          deepLink:
            current.deepLink ||
            resolveDeepLinkFromTemplate('app://category/{id}', {
              id: collectionId,
              name: resolveCategoryName(selectedCollection || preview || current),
            }),
        };
      });

      setSectionForm((prev) => ({ ...prev, sourceType: 'BRAND_COLLECTIONS', sduiItems: nextItems }));
      setMessage({ type: 'success', text: 'Brand layout collections loaded from API.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to resolve brand layout collections.' });
    } finally {
      setIsResolvingSource(false);
    }
  };

  const applyImageToTarget = (target, url) => {
    if (!target || !url) return;
    if (target.kind === 'header') {
      setSectionForm((prev) => ({ ...prev, bentoHeaderImage: url }));
    } else if (target.kind === 'hero') {
      setSectionForm((prev) => ({ ...prev, bentoHeroImage: url }));
    } else if (target.kind === 'tile') {
      updateBentoTile(target.index, 'imageUrl', url);
    } else if (target.kind === 'sdui') {
      const field = target.field === 'secondaryImageUrl' ? 'secondaryImageUrl' : 'imageUrl';
      handlePhaseOneImageChange(target.index, field, url);
    } else if (target.kind === 'sectionField') {
      setSectionForm((prev) => ({ ...prev, [target.field]: url }));
    } else if (target.kind === 'headerField') {
      setHeaderForm((prev) => ({ ...prev, [target.field]: url }));
    }
    addMediaUrlToLibrary(url);
  };

  const handlePickMediaUrl = (url) => {
    if (!mediaPickerTarget) return;
    applyImageToTarget(mediaPickerTarget, url);
    closeMediaPicker();
    setMessage({ type: 'success', text: 'Image selected from media library.' });
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
      next.dataSources[base.dataSourceRef] = resolveDefaultDataSourceByRef(base.dataSourceRef);
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
      urls.forEach(addMediaUrlToLibrary);
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
      addMediaUrlToLibrary(urls[0]);
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
      urls.forEach(addMediaUrlToLibrary);
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
      applyImageToTarget(bentoUploadTarget, url);
      setMessage({ type: 'success', text: 'Image uploaded.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload image.' });
    } finally {
      setIsUploadingBentoImage(false);
      setBentoUploadTarget(null);
    }
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

  const handleRemovePage = () => {
    const config = getConfigForBuilder();
    if (!config) return;
    if (!selectedPageKey) {
      setMessage({ type: 'error', text: 'No page selected to remove.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const pageIndex = pagesList.findIndex((page, index) => getPageKey(page, index) === selectedPageKey);
    if (pageIndex < 0) {
      setMessage({ type: 'error', text: 'Selected page not found.' });
      return;
    }
    pagesList.splice(pageIndex, 1);
    updateConfigFromBuilder(next, 'Page removed. Remember to save draft.');
    if (pagesList.length > 0) {
      setSelectedPageKey(getPageKey(pagesList[0], 0));
    } else {
      setSelectedPageKey('');
    }
  };

  const requestRemovePage = () => {
    const pageName = selectedPage?.id || selectedPage?.route || selectedPageKey;
    setConfirmAction({
      title: 'Remove Page',
      message: `Remove page "${pageName}"? All sections on this page will be lost.`,
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: () => { setConfirmAction(null); handleRemovePage(); },
    });
  };

  const handleCleanupOrphanedPages = () => {
    const config = getConfigForBuilder();
    if (!config || !orphanedPages.length) return;
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const orphanIds = new Set(orphanedPages.map((p) => p?.id).filter(Boolean));
    const remaining = pagesList.filter((page) => !orphanIds.has(page?.id));
    next.pages = remaining;
    if (Array.isArray(next.navigation?.topCategoryTabs)) {
      const orphanSlugs = new Set([...orphanIds].map((id) => id.replace(/^home_/, '')));
      next.navigation.topCategoryTabs = next.navigation.topCategoryTabs.filter(
        (tab) => !orphanSlugs.has(tab?.id)
      );
    }
    updateConfigFromBuilder(next, `Removed ${orphanIds.size} orphaned page(s). Remember to save draft.`);
    if (orphanIds.has(selectedPageKey) || orphanIds.has(selectedPage?.id)) {
      const firstRemaining = next.pages[0];
      setSelectedPageKey(firstRemaining ? getPageKey(firstRemaining, 0) : '');
    }
  };

  const requestCleanupOrphans = () => {
    const names = orphanedPages.map((p) => p?.id || p?.route).join(', ');
    setConfirmAction({
      title: 'Remove Orphaned Pages',
      message: `Remove ${orphanedPages.length} page(s) that no longer have an active industry? (${names})`,
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: () => { setConfirmAction(null); handleCleanupOrphanedPages(); },
    });
  };

  const handleClonePage = () => {
    const config = getConfigForBuilder();
    if (!config || !selectedPage) {
      setMessage({ type: 'error', text: 'Select a page to duplicate first.' });
      return;
    }
    const id = clonePageId.trim();
    const route = clonePageRoute.trim();
    if (!id || !route) {
      setMessage({ type: 'error', text: 'Page ID and route are required for the duplicate.' });
      return;
    }
    const next = cloneConfig(config);
    const pagesList = ensurePagesArray(next);
    const duplicate = pagesList.some((page) => page?.id === id || page?.route === route);
    if (duplicate) {
      setMessage({ type: 'error', text: 'A page with this ID or route already exists.' });
      return;
    }
    const cloned = cloneConfig(selectedPage);
    cloned.id = id;
    cloned.route = route;
    pagesList.push(cloned);
    updateConfigFromBuilder(next, `Page duplicated as "${id}". Remember to save draft.`);
    setClonePageId('');
    setClonePageRoute('');
    setSelectedPageKey(getPageKey(cloned, pagesList.length - 1));
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
    if (!next.dataSources || typeof next.dataSources !== 'object') {
      next.dataSources = {};
    }
    if (newSection?.dataSourceRef && !next.dataSources[newSection.dataSourceRef]) {
      next.dataSources[newSection.dataSourceRef] = resolveDefaultDataSourceByRef(newSection.dataSourceRef);
    }
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
    if (!next.dataSources || typeof next.dataSources !== 'object') {
      next.dataSources = {};
    }
    if (updated?.dataSourceRef && !next.dataSources[updated.dataSourceRef]) {
      next.dataSources[updated.dataSourceRef] = resolveDefaultDataSourceByRef(updated.dataSourceRef);
    }
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

  const screenBlockType = sectionForm.blockType || sectionForm.type;
  const headerBlockType = headerSectionForm.blockType || headerSectionForm.type;
  const isPhaseOneBlock = phaseOneBlockTypes.has(screenBlockType);
  const isCategoryFeedEligible =
    screenBlockType === 'category_icon_grid' ||
    screenBlockType === 'horizontal_scroll_list' ||
    screenBlockType === 'column_grid' ||
    screenBlockType === 'category_showcase';
  const isHeroBanner = screenBlockType === 'heroBanner' || sectionForm.type === 'banner';
  const isPhaseOneHorizontalList = screenBlockType === 'horizontal_scroll_list';
  const isPhaseOneColumnGrid = screenBlockType === 'column_grid';
  const isPhaseOneCategoryIconGrid = screenBlockType === 'category_icon_grid';
  const isPhaseOneBrandGrid = screenBlockType === 'brand_logo_grid';
  const isPhaseOneProductShelf = screenBlockType === 'product_shelf_horizontal';
  const isPhaseOneHeroCarousel = screenBlockType === 'hero_carousel';
  const isPhaseOneIconList = screenBlockType === 'icon_list';
  const isPhaseOneChipScroll = screenBlockType === 'chip_scroll';
  const isPhaseOneCategoryShowcase = screenBlockType === 'category_showcase';
  const isBeautyHeroBanner = screenBlockType === 'beauty_hero_banner';
  const isBeautyQuickActions = screenBlockType === 'beauty_quick_actions';
  const isBeautyTrendCarousel = screenBlockType === 'beauty_trend_carousel';
  const isBeautyOfferBanner = screenBlockType === 'beauty_offer_banner';
  const isBeautyProductShelf = screenBlockType === 'beauty_product_shelf';
  const isBeautyRoutineList = screenBlockType === 'beauty_routine_list';
  const isBeautyTipChips = screenBlockType === 'beauty_tip_chips';
  const isBeautySalonCarousel = screenBlockType === 'beauty_salon_carousel';
  const currentSourceFingerprint = buildCategoryFeedFingerprint(sectionForm, screenBlockType);
  const hasPendingSourceChanges = Boolean(
    isPhaseOneColumnGrid &&
      String(sectionForm.sourceType || 'MANUAL').toUpperCase() === 'CATEGORY_FEED' &&
      currentSourceFingerprint &&
      currentSourceFingerprint !== lastAppliedSourceFingerprint
  );
  const isMappingDeepLinkTemplateValid = isValidDeepLinkValue(
    sectionForm.mappingDeepLinkTemplate || 'app://category/{id}'
  );
  const isCategoryPreviewGrid = screenBlockType === 'categoryPreviewGrid';
  const isCampaignBento = screenBlockType === 'campaignBento';
  const isMultiItemGrid =
    !isPhaseOneBlock &&
    (screenBlockType === 'multiItemGrid' ||
      isCategoryPreviewGrid);
  const isSectionTitleBlock = screenBlockType === 'sectionTitle' || sectionForm.type === 'title';
  const isScreenSpacer = sectionForm.type === 'spacer';
  const isScreenVideo = sectionForm.type === 'video';
  const isHeaderSearch = headerBlockType === 'searchBar';
  const isHeaderPills = headerBlockType === 'horizontalPills';
  const isGenericHeaderBlock = !isHeaderSearch && !isHeaderPills;
  const screenBlockLabel = resolveBlockLabel(screenBlockType, sectionForm.type || 'Block');
  const headerBlockLabel = resolveBlockLabel(headerBlockType, headerSectionForm.type || 'Block');

  const filteredMainCategoryOptions = useMemo(() => {
    const industryId = normalizeCollectionId(sectionForm.sourceIndustryId);
    const items = Array.isArray(mainCategories) ? mainCategories : [];
    if (!industryId) return items;
    return items.filter(
      (item) => normalizeMatchValue(resolveMainCategoryIndustryId(item)) === normalizeMatchValue(industryId)
    );
  }, [mainCategories, sectionForm.sourceIndustryId]);

  const brandCollectionOptions = useMemo(() => {
    const selectedMainCategoryId = normalizeCollectionId(sectionForm.sourceMainCategoryId);
    let items = Array.isArray(collections) ? [...collections] : [];
    if (selectedMainCategoryId) {
      items = items.filter(
        (item) => resolveCategoryMainCategoryId(item) === selectedMainCategoryId
      );
    }
    return items.sort((a, b) => Number(a?.ordering ?? 999999) - Number(b?.ordering ?? 999999));
  }, [collections, sectionForm.sourceMainCategoryId]);

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
            {isLoading ? <><span className="inline-spinner dark" />Refreshing...</> : 'Refresh'}
          </button>
        </div>
      </div>
      <Banner message={message} />
      
      <div className="app-config-card" style={{ position: 'relative' }}>
        {isLoading && !configSnapshot ? (
          <div className="page-loading-overlay">
            <div className="page-spinner" />
        </div>
        ) : null}
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
            <button
              type="button"
              className="ghost-btn small"
              onClick={() => setShowManagePages((prev) => !prev)}
            >
              {showManagePages ? 'Hide Pages' : 'Manage Pages'}
            </button>
            <button
              type="button"
              className="ghost-btn small"
              onClick={() => setShowManageTabs((prev) => !prev)}
            >
              {showManageTabs ? 'Hide Tabs' : 'Manage Tabs'}
            </button>
            <span className="update-chip">
              {latestUpdated ? `Last updated ${formatDate(latestUpdated)}` : 'No updates yet'}
            </span>
            {hasUnsavedChanges ? <span className="unsaved-chip">Unsaved changes</span> : null}
            {version ? <span className="version-chip">v{version}</span> : null}
            <div className="version-dropdown-wrap" ref={versionDropdownRef}>
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => setShowVersionDropdown((prev) => !prev)}
              >
                History ({versionCount})
              </button>
              {showVersionDropdown && versions.length > 0 ? (
                <div className="version-dropdown">
                  <div className="version-dropdown-header">Recent Versions</div>
                  {versions.slice(0, 5).map((item) => (
                    <div key={item.id} className="version-dropdown-row">
                      <div className="version-dropdown-info">
                        <span className="version-dropdown-id">#{item.id}</span>
                        <span className="version-dropdown-status">{item.status || 'draft'}</span>
                        <span className="version-dropdown-date">{formatDate(item.updated_on || item.published_on)}</span>
                      </div>
                      <button
                        type="button"
                        className="ghost-btn small danger"
                        onClick={(e) => { e.stopPropagation(); setShowVersionDropdown(false); requestRollback(item.id); }}
                        disabled={isLoading}
                      >
                        Rollback
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="ghost-btn small" onClick={handleCreateBaseConfig} disabled={isLoading}>
              Create Base Config
            </button>
            <button type="button" className="ghost-btn small" onClick={ensureHeaderPages} disabled={isLoading}>
              Ensure Header Pages
            </button>
            <button type="button" className="primary-btn compact" onClick={saveDraft} disabled={isLoading}>
              {isLoading ? <><span className="inline-spinner" />Saving...</> : 'Save Draft'}
            </button>
            <button type="button" className="primary-btn compact" onClick={requestPublish} disabled={isLoading}>
              {isLoading ? <><span className="inline-spinner" />Publishing...</> : 'Publish'}
            </button>
          </div>
        </div>

        {showManagePages && configSnapshot ? (
          <div className="manage-pages-panel">
            <div className="manage-pages-section">
              <h4 className="manage-pages-heading">Add Preset Page</h4>
              <div className="manage-pages-row">
                <select
                  value={pagePresetKey}
                  onChange={(e) => setPagePresetKey(e.target.value)}
                >
                  <option value="">Select a preset</option>
                  {pagePresets.map((p) => (
                    <option key={p.id} value={p.id}>{p.label || p.id}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="primary-btn compact"
                  onClick={handleAddPresetPage}
                  disabled={!pagePresetKey || isLoading}
                >
                  Add Preset
                </button>
              </div>
            </div>
            <div className="manage-pages-section">
              <h4 className="manage-pages-heading">Add Custom Page</h4>
              <div className="manage-pages-row">
                <input
                  type="text"
                  placeholder="Page ID (e.g. deals_page)"
                  value={newPageId}
                  onChange={(e) => setNewPageId(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Route (e.g. /deals)"
                  value={newPageRoute}
                  onChange={(e) => setNewPageRoute(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Data source ref (optional)"
                  value={newPageSource}
                  onChange={(e) => setNewPageSource(e.target.value)}
                />
                <button
                  type="button"
                  className="primary-btn compact"
                  onClick={handleAddPage}
                  disabled={!newPageId.trim() || !newPageRoute.trim() || isLoading}
                >
                  Add Page
                </button>
              </div>
            </div>
            {selectedPageKey ? (
              <div className="manage-pages-section">
                <h4 className="manage-pages-heading">Current Page</h4>
                <div className="manage-pages-row">
                  <span className="manage-pages-current">{selectedPage?.id || selectedPage?.route || selectedPageKey}</span>
                  <button
                    type="button"
                    className="ghost-btn small danger"
                    onClick={requestRemovePage}
                    disabled={isLoading}
                  >
                    Remove This Page
                  </button>
                </div>
              </div>
            ) : null}
            {selectedPageKey ? (
              <div className="manage-pages-section">
                <h4 className="manage-pages-heading">Duplicate Page</h4>
                <div className="manage-pages-row">
                  <input
                    type="text"
                    placeholder="New page ID (e.g. home_deals)"
                    value={clonePageId}
                    onChange={(e) => setClonePageId(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="New route (e.g. /home/deals)"
                    value={clonePageRoute}
                    onChange={(e) => setClonePageRoute(e.target.value)}
                  />
                  <button
                    type="button"
                    className="primary-btn compact"
                    onClick={handleClonePage}
                    disabled={!clonePageId.trim() || !clonePageRoute.trim() || isLoading}
                  >
                    Duplicate
                  </button>
                </div>
                <p className="field-help">Creates a copy of the current page with all its sections and header blocks.</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {showManageTabs && configSnapshot ? (
          <div className="manage-pages-panel">
            <div className="manage-pages-section" style={{ flex: '1 1 100%' }}>
              <h4 className="manage-pages-heading">Navigation Tabs (Header Pills)</h4>
              {currentTabs.length > 0 ? (
                <div className="tab-manager-list">
                  {currentTabs.map((tab, index) => (
                    <div key={tab?.id || index} className="tab-manager-row">
                      <span className="tab-label">{tab?.label || tab?.id}</span>
                      <span className="tab-route">{tab?.route}</span>
                      <div className="tab-manager-actions">
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => handleMoveTab(index, -1)}
                          disabled={index === 0}
                          title="Move up"
                        >
                          &#9650;
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => handleMoveTab(index, 1)}
                          disabled={index === currentTabs.length - 1}
                          title="Move down"
                        >
                          &#9660;
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small danger"
                          onClick={() => handleRemoveTab(index)}
                          title="Remove tab"
                        >
                          &#10005;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="field-help">No navigation tabs configured. Use "Ensure Header Pages" to generate tabs from industries.</p>
              )}
            </div>
          </div>
        ) : null}

        {orphanedPages.length > 0 && configSnapshot ? (
          <div className="orphan-warning">
            <span className="orphan-warning-text">
              {orphanedPages.length} page(s) reference industries that no longer exist or are inactive: {orphanedPages.map((p) => p?.id).join(', ')}
            </span>
            <button
              type="button"
              className="ghost-btn small danger"
              onClick={requestCleanupOrphans}
              disabled={isLoading}
            >
              Clean Up
            </button>
          </div>
        ) : null}

        {!configSnapshot ? (
          <div className="empty-state enhanced-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8660ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <h3 className="empty-state-title">No Configuration Found</h3>
            <p className="empty-state-text">Create a base config to start building your home page layout, or switch to Advanced JSON to paste an existing config.</p>
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
                                  {<HeaderBlockPreview block={section} industries={industries} />}
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
                                <PreviewSection section={entry.section} index={entry.index} collections={collections} />
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
                                <PreviewSection section={entry.section} index={entry.index} collections={collections} />
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
                    {!isPhaseOneBlock ? (
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
                    ) : null}
                    {mediaPickerTarget ? (
                      <div className="field field-span media-library-panel">
                        <div className="panel-split">
                          <span className="bento-tile-title">Media library</span>
                          <button type="button" className="ghost-btn small" onClick={closeMediaPicker}>
                            Close
                          </button>
                        </div>
                        <input
                          type="text"
                          value={mediaSearchText}
                          onChange={(event) => setMediaSearchText(event.target.value)}
                          placeholder="Search uploaded images"
                        />
                        <div className="media-library-grid">
                          {filteredMediaLibraryUrls.length ? (
                            filteredMediaLibraryUrls.slice(0, 120).map((url) => (
                              <button
                                key={url}
                                type="button"
                                className="media-library-item"
                                onClick={() => handlePickMediaUrl(url)}
                                title={url}
                              >
                                <div className="media-library-thumb checkerboard">
                                  <img src={url} alt="" />
                                </div>
                                <span>{url.split('/').pop() || 'image'}</span>
                              </button>
                            ))
                          ) : (
                            <p className="field-help">No images in library yet. Upload at least one image.</p>
                          )}
                        </div>
                      </div>
                    ) : null}
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
                    {(isHeroBanner || isMultiItemGrid || isCampaignBento || (isPhaseOneBlock && !isBeautyHeroBanner)) ? (
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
                    {isBeautyOfferBanner ? (
                      <>
                        <label className="field field-span">
                          <span>Subtitle / description</span>
                          <input
                            type="text"
                            value={sectionForm.text}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, text: event.target.value }))}
                            placeholder="Up to 40% off skincare sets and bundles"
                          />
                        </label>
                        <label className="field">
                          <span>Background color</span>
                          <div className="inline-row">
                            <input
                              type="text"
                              value={sectionForm.sectionBgColor}
                              onChange={(event) => setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))}
                              placeholder="#E9C3B3"
                            />
                            <input
                              type="color"
                              className="color-input"
                              value={resolveHexColor(sectionForm.sectionBgColor, '#E9C3B3')}
                              onChange={(event) => setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))}
                            />
                          </div>
                        </label>
                      </>
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
                        <label className="field">
                          <span>Banner variant</span>
                          <select
                            value={sectionForm.bannerVariant}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, bannerVariant: event.target.value }))}
                          >
                            <option value="image">Image banner</option>
                            <option value="text_card">Text card with CTA</option>
                          </select>
                        </label>
                        {sectionForm.bannerVariant === 'text_card' ? (
                          <>
                            <label className="field field-span">
                              <span>Subtitle / description</span>
                              <input
                                type="text"
                                value={sectionForm.text}
                                onChange={(event) => setSectionForm((prev) => ({ ...prev, text: event.target.value }))}
                                placeholder="Up to 40% off on selected items"
                              />
                            </label>
                            <label className="field">
                              <span>Background color</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.sectionBgColor}
                                  onChange={(event) => setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))}
                                  placeholder="#fce7f3"
                                />
                                <input
                                  type="color"
                                  className="color-input"
                                  value={sectionForm.sectionBgColor || '#fce7f3'}
                                  onChange={(event) => setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))}
                                />
                              </div>
                            </label>
                          </>
                        ) : null}
                        {sectionForm.bannerVariant !== 'text_card' ? (
                        <label className="field field-span">
                          <span>Image URL</span>
                          <div className="inline-row">
                            <input
                              type="text"
                              value={sectionForm.imageUrl}
                              onChange={(event) => setSectionForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                              placeholder="https://cdn.example.com/hero.jpg"
                            />
                            <button
                              type="button"
                              className="ghost-btn small"
                              onClick={() => handleBentoImageClick({ kind: 'sectionField', field: 'imageUrl' })}
                              disabled={isUploadingBentoImage}
                            >
                              {isUploadingBentoImage ? 'Uploading...' : 'Upload'}
                            </button>
                            <button
                              type="button"
                              className="ghost-btn small"
                              onClick={() => openMediaPicker({ kind: 'sectionField', field: 'imageUrl' })}
                            >
                              Library
                            </button>
                          </div>
                        </label>
                        ) : null}
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
                    {isPhaseOneBlock ? (
                      <>
                        <label className="field field-span">
                          <span>Data source</span>
                          <div className="field-grid source-config-grid">
                            {isPhaseOneProductShelf ? (
                              <label className="field field-span">
                                <span>Product feed</span>
                                <select
                                  value={sectionForm.dataSourceRef || ''}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({
                                      ...prev,
                                      dataSourceRef: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Manual (no API)</option>
                                  <option value="todaydealproducts">Today&apos;s deals</option>
                                  <option value="home_top_selling_products">Top selling products</option>
                                  <option value="home_most_rated_products">Most rated products</option>
                                  <option value="home_recommended_products">Recommended products</option>
                                </select>
                                <p className="field-help">
                                  Products are loaded from the selected feed. In manual mode you can edit the item list below.
                                </p>
                              </label>
                            ) : (
                              <>
                                {!isPhaseOneCategoryIconGrid && !isPhaseOneBrandGrid && !isPhaseOneCategoryShowcase ? (
                                  <label className="field">
                                    <span>Source type</span>
                                    <select
                                      value={sectionForm.sourceType || 'MANUAL'}
                                      onChange={(event) =>
                                        setSectionForm((prev) => ({
                                          ...prev,
                                          sourceType: event.target.value,
                                        }))
                                      }
                                    >
                                      {SOURCE_TYPE_OPTIONS.map((opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                          disabled={opt.value === 'CATEGORY_FEED' && !isCategoryFeedEligible}
                                        >
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}
                                {isPhaseOneCategoryIconGrid ? (
                                  <>
                                    <label className="field">
                                      <span>Industry</span>
                                      <select
                                        value={sectionForm.sourceIndustryId || ''}
                                        onChange={(event) =>
                                          setSectionForm((prev) => ({
                                            ...prev,
                                            sourceType: 'CATEGORY_FEED',
                                            sourceIndustryId: event.target.value,
                                            sourceMainCategoryId: '',
                                            sourceCategoryIds: [],
                                          }))
                                        }
                                      >
                                        <option value="">Select industry</option>
                                        {industries.map((item) => {
                                          const id = resolveIndustryId(item);
                                          if (!id) return null;
                                          return (
                                            <option key={id} value={id}>
                                              {resolveIndustryLabel(item)}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </label>
                                    <label className="field">
                                      <span>Feed mode</span>
                                      <select
                                        value={sectionForm.sourceFeedMode || 'TOP_SELLING'}
                                        onChange={(event) =>
                                          setSectionForm((prev) => ({
                                            ...prev,
                                            sourceType: 'CATEGORY_FEED',
                                            sourceFeedMode: event.target.value,
                                          }))
                                        }
                                      >
                                        {CATEGORY_ICON_FEED_MODE_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </>
                                ) : null}
                                {isPhaseOneCategoryShowcase ? (
                                  <>
                                    <label className="field">
                                      <span>Variant</span>
                                      <select
                                        value={sectionForm.showcaseVariant || 'circle'}
                                        onChange={(event) =>
                                          setSectionForm((prev) => ({
                                            ...prev,
                                            showcaseVariant: event.target.value,
                                          }))
                                        }
                                      >
                                        {SHOWCASE_VARIANT_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="field">
                                      <span>Industry</span>
                                      <select
                                        value={sectionForm.sourceIndustryId || ''}
                                        onChange={(event) =>
                                          setSectionForm((prev) => ({
                                            ...prev,
                                            sourceType: 'CATEGORY_FEED',
                                            sourceIndustryId: event.target.value,
                                            sourceMainCategoryId: '',
                                            sourceCategoryIds: [],
                                          }))
                                        }
                                      >
                                        <option value="">Select industry</option>
                                        {industries.map((item) => {
                                          const id = resolveIndustryId(item);
                                          if (!id) return null;
                                          return (
                                            <option key={id} value={id}>
                                              {resolveIndustryLabel(item)}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </label>
                                  </>
                                ) : null}
                                {isPhaseOneBrandGrid ? (
                                  <label className="field">
                                    <span>Main category filter</span>
                                    <select
                                      value={sectionForm.sourceMainCategoryId || ''}
                                      onChange={(event) =>
                                        setSectionForm((prev) => ({
                                          ...prev,
                                          sourceType: 'BRAND_COLLECTIONS',
                                          sourceMainCategoryId: event.target.value,
                                        }))
                                      }
                                    >
                                      <option value="">All main categories</option>
                                      {mainCategories.map((item) => {
                                        const id = resolveMainCategoryId(item);
                                        if (!id) return null;
                                        return (
                                          <option key={id} value={id}>
                                            {resolveMainCategoryName(item)}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </label>
                                ) : null}
                                {((isPhaseOneCategoryIconGrid || isPhaseOneCategoryShowcase
                                  ? 'CATEGORY_FEED'
                                  : String(sectionForm.sourceType || 'MANUAL').toUpperCase()) === 'CATEGORY_FEED') &&
                                (isCategoryFeedEligible || isPhaseOneCategoryIconGrid || isPhaseOneCategoryShowcase) ? (
                                  <>
                                    <label className="field">
                                      <span>
                                        {(isPhaseOneCategoryIconGrid || isPhaseOneCategoryShowcase) &&
                                        String(sectionForm.sourceFeedMode || 'TOP_SELLING').toUpperCase() === 'TOP_SELLING'
                                          ? 'Main category (optional)'
                                          : 'Main category'}
                                      </span>
                                      <select
                                        value={sectionForm.sourceMainCategoryId || ''}
                                        onChange={(event) =>
                                          setSectionForm((prev) => ({
                                            ...prev,
                                            sourceType: (isPhaseOneCategoryIconGrid || isPhaseOneCategoryShowcase) ? 'CATEGORY_FEED' : prev.sourceType,
                                            sourceMainCategoryId: event.target.value,
                                            sourceCategoryIds: [],
                                          }))
                                        }
                                      >
                                        <option value="">Select main category</option>
                                        {((isPhaseOneCategoryIconGrid || isPhaseOneCategoryShowcase) ? filteredMainCategoryOptions : mainCategories).map((item) => {
                                          const id = resolveMainCategoryId(item);
                                          if (!id) return null;
                                          return (
                                            <option key={id} value={id}>
                                              {resolveMainCategoryName(item)}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </label>
                                    <label className="field">
                                      <span>Limit</span>
                                      <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={sectionForm.sourceLimit || '8'}
                                        onChange={(event) =>
                                          setSectionForm((prev) => ({
                                            ...prev,
                                            sourceLimit: event.target.value,
                                          }))
                                        }
                                      />
                                    </label>
                                    {!isPhaseOneCategoryIconGrid && !isPhaseOneCategoryShowcase ? (
                                      <label className="field">
                                        <span>Sort</span>
                                        <select
                                          value={sectionForm.sourceSortBy || 'MANUAL_RANK'}
                                          onChange={(event) =>
                                            setSectionForm((prev) => ({
                                              ...prev,
                                              sourceSortBy: event.target.value,
                                            }))
                                          }
                                        >
                                          {CATEGORY_FEED_SORT_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    ) : null}
                                    <div className="field">
                                      <span>Filters</span>
                                      <label className="checkbox-row">
                                        <input
                                          type="checkbox"
                                          checked={sectionForm.sourceActiveOnly !== false}
                                          onChange={(event) =>
                                            setSectionForm((prev) => ({
                                              ...prev,
                                              sourceActiveOnly: event.target.checked,
                                            }))
                                          }
                                        />
                                        Active only
                                      </label>
                                      <label className="checkbox-row">
                                        <input
                                          type="checkbox"
                                          checked={sectionForm.sourceHasImageOnly !== false}
                                          onChange={(event) =>
                                            setSectionForm((prev) => ({
                                              ...prev,
                                              sourceHasImageOnly: event.target.checked,
                                            }))
                                          }
                                        />
                                        With image only
                                      </label>
                                    </div>
                                    {((!isPhaseOneCategoryIconGrid && !isPhaseOneCategoryShowcase) ||
                                      String(sectionForm.sourceFeedMode || 'TOP_SELLING').toUpperCase() ===
                                        'MAIN_CATEGORY') ? (
                                      <label className="field field-span">
                                        <span>Pick categories (optional)</span>
                                        {isLoadingSourceCategories ? (
                                          <p className="field-help">Loading categories...</p>
                                        ) : sourceCategories.length ? (
                                          <div className="checkbox-grid">
                                            {sourceCategories.map((item) => {
                                              const id = resolveCategoryId(item);
                                              if (!id) return null;
                                              const checked = Array.isArray(sectionForm.sourceCategoryIds)
                                                ? sectionForm.sourceCategoryIds.includes(id)
                                                : false;
                                              return (
                                                <label key={id} className="checkbox-row">
                                                  <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                      setSectionForm((prev) => {
                                                        const current = Array.isArray(prev.sourceCategoryIds)
                                                          ? prev.sourceCategoryIds
                                                          : [];
                                                        const next = new Set(current);
                                                        if (next.has(id)) {
                                                          next.delete(id);
                                                        } else {
                                                          next.add(id);
                                                        }
                                                        return { ...prev, sourceCategoryIds: Array.from(next) };
                                                      })
                                                    }
                                                  />
                                                  {resolveCategoryName(item)} <span className="muted">({id})</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <p className="field-help">Select main category to load categories.</p>
                                        )}
                                      </label>
                                    ) : null}
                                    <div className="field field-span">
                                      <div className="inline-row">
                                        {isPhaseOneColumnGrid ? (
                                          <label className="checkbox-row">
                                            <input
                                              type="checkbox"
                                              checked={sourceAutoRefresh}
                                              onChange={(event) => setSourceAutoRefresh(event.target.checked)}
                                            />
                                            Auto-refresh on source change
                                          </label>
                                        ) : null}
                                        <button
                                          type="button"
                                          className="ghost-btn small"
                                          onClick={() => setShowAdvancedSourceSettings((prev) => !prev)}
                                        >
                                          {showAdvancedSourceSettings
                                            ? 'Hide advanced source settings'
                                            : 'Show advanced source settings'}
                                        </button>
                                      </div>
                                      {!sourceAutoRefresh && hasPendingSourceChanges ? (
                                        <p className="field-warning">
                                          Source settings changed. Click Refresh feed to update preview items.
                                        </p>
                                      ) : null}
                                    </div>
                                    {showAdvancedSourceSettings ? (
                                      <div className="field field-span source-advanced-grid">
                                        {(isPhaseOneColumnGrid || isPhaseOneCategoryIconGrid || isPhaseOneCategoryShowcase) ? (
                                          <label className="field">
                                            <span>Top-selling window (days)</span>
                                            <input
                                              type="number"
                                              min="1"
                                              max="365"
                                              value={sectionForm.sourceRankingWindowDays || '30'}
                                              onChange={(event) =>
                                                setSectionForm((prev) => ({
                                                  ...prev,
                                                  sourceRankingWindowDays: event.target.value,
                                                }))
                                              }
                                            />
                                            <p className="field-help">
                                              Category ranking is calculated from order data over the last N days.
                                            </p>
                                          </label>
                                        ) : null}
                                        {!isPhaseOneCategoryIconGrid && !isPhaseOneCategoryShowcase ? (
                                          <>
                                            <label className="field">
                                              <span>Title field</span>
                                              <input
                                                type="text"
                                                value={sectionForm.mappingTitleField || 'name'}
                                                onChange={(event) =>
                                                  setSectionForm((prev) => ({
                                                    ...prev,
                                                    mappingTitleField: event.target.value,
                                                  }))
                                                }
                                                placeholder="name"
                                              />
                                            </label>
                                            <label className="field">
                                              <span>Primary image field</span>
                                              <input
                                                type="text"
                                                value={sectionForm.mappingImageField || 'imageUrl'}
                                                onChange={(event) =>
                                                  setSectionForm((prev) => ({
                                                    ...prev,
                                                    mappingImageField: event.target.value,
                                                  }))
                                                }
                                                placeholder="imageUrl"
                                              />
                                            </label>
                                            {isPhaseOneColumnGrid ? (
                                              <label className="field">
                                                <span>Secondary image field</span>
                                                <input
                                                  type="text"
                                                  value={sectionForm.mappingSecondaryImageField || ''}
                                                  onChange={(event) =>
                                                    setSectionForm((prev) => ({
                                                      ...prev,
                                                      mappingSecondaryImageField: event.target.value,
                                                    }))
                                                  }
                                                  placeholder="secondaryImageUrl"
                                                />
                                              </label>
                                            ) : null}
                                            <label className="field field-span">
                                              <span>Deep link template</span>
                                              <div className="inline-row">
                                                <select
                                                  value={
                                                    DEEP_LINK_TEMPLATE_PRESETS.some(
                                                      (opt) =>
                                                        opt.value ===
                                                        (sectionForm.mappingDeepLinkTemplate || 'app://category/{id}')
                                                    )
                                                      ? sectionForm.mappingDeepLinkTemplate || 'app://category/{id}'
                                                      : ''
                                                  }
                                                  onChange={(event) =>
                                                    setSectionForm((prev) => ({
                                                      ...prev,
                                                      mappingDeepLinkTemplate:
                                                        event.target.value || prev.mappingDeepLinkTemplate,
                                                    }))
                                                  }
                                                >
                                                  <option value="">Custom</option>
                                                  {DEEP_LINK_TEMPLATE_PRESETS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                      {opt.label}
                                                    </option>
                                                  ))}
                                                </select>
                                                <input
                                                  type="text"
                                                  value={sectionForm.mappingDeepLinkTemplate || 'app://category/{id}'}
                                                  onChange={(event) =>
                                                    setSectionForm((prev) => ({
                                                      ...prev,
                                                      mappingDeepLinkTemplate: event.target.value,
                                                    }))
                                                  }
                                                  placeholder="app://category/{id}"
                                                />
                                              </div>
                                              <p className="field-help">
                                                Use {'{id}'}, {'{name}'}, {'{slug}'} placeholders. Example:{' '}
                                                <code>app://category/{'{id}'}</code>,{' '}
                                                <code>app://campaign/{'{slug}'}</code>.
                                              </p>
                                              {!isMappingDeepLinkTemplateValid ? (
                                                <span className="field-warning">
                                                  Deep link should start with app://, traddex://, / or http(s)://
                                                </span>
                                              ) : null}
                                            </label>
                                          </>
                                        ) : null}
                                      </div>
                                    ) : null}
                                    <div className="field field-span">
                                      <div className="inline-row">
                                        <button
                                          type="button"
                                          className="ghost-btn small"
                                          onClick={handleApplyCategoryFeed}
                                          disabled={isResolvingSource}
                                        >
                                          {isResolvingSource
                                            ? 'Loading...'
                                            : isPhaseOneColumnGrid
                                              ? 'Refresh feed'
                                              : 'Apply source'}
                                        </button>
                                        <span className="field-help">
                                          {isPhaseOneCategoryIconGrid || isPhaseOneCategoryShowcase
                                            ? 'Main category title and category icons will auto-fill.'
                                            : isPhaseOneColumnGrid
                                              ? 'Preview images will refresh from the selected categories.'
                                              : 'Top categories will load and item cards below will auto-fill.'}
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  isPhaseOneBrandGrid ? (
                                    <div className="field field-span">
                                      <div className="inline-row">
                                        <button
                                          type="button"
                                          className="ghost-btn small"
                                          onClick={handleApplyBrandCollections}
                                          disabled={isResolvingSource}
                                        >
                                          {isResolvingSource ? 'Loading...' : 'Load selected collections'}
                                        </button>
                                        <span className="field-help">
                                          The middle 4 tiles will auto-populate from the category preview API.
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="field-help field-span">In manual mode you can directly edit items below.</p>
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </label>
                        {isPhaseOneProductShelf ? (
                          <label className="field">
                            <span>Columns</span>
                            <input
                              type="number"
                              min="1"
                              max="4"
                              value={sectionForm.columns || '2'}
                              onChange={(event) =>
                                setSectionForm((prev) => ({
                                  ...prev,
                                  columns: event.target.value,
                                }))
                              }
                              placeholder="2 (e.g. 2 or 3)"
                            />
                          </label>
                        ) : null}
                        <label className="field field-span">
                          <span>Block items</span>
                          <div className="inline-row">
                            {!isPhaseOneCategoryIconGrid &&
                            !isPhaseOneBrandGrid &&
                            !isPhaseOneCategoryShowcase &&
                            !isBeautyHeroBanner &&
                            !isBeautyOfferBanner ? (
                              <button type="button" className="ghost-btn small" onClick={addPhaseOneItem}>
                                + Add item
                              </button>
                            ) : null}
                            <span className="field-help">
                              {isPhaseOneCategoryIconGrid || isPhaseOneCategoryShowcase
                                ? 'Category images are loaded automatically from the category master.'
                                : isPhaseOneBrandGrid
                                  ? 'Top/bottom banners are editable. Middle cards are controlled via the collection dropdown.'
                                  : isPhaseOneProductShelf
                                    ? 'Products come from the data source. Select a product API or collection for this list.'
                                    : isBeautyOfferBanner
                                      ? 'This banner uses the section title, text and CTA fields above.'
                                    : 'Set image + text + deep link for each card.'}
                            </span>
                          </div>
                        </label>
                        <div className="field field-span phase-one-item-grid">
                          {normalizePhaseOneItems(sectionForm.sduiItems, screenBlockType).map((item, idx, allItems) => {
                            const imageWarning = phaseOneImageWarnings[getWarningKey(idx, 'imageUrl')];
                            const secondaryImageWarning =
                              phaseOneImageWarnings[getWarningKey(idx, 'secondaryImageUrl')];
                            const itemKind = item?.kind || 'tile';
                            const isBrandHeroItem = isPhaseOneBrandGrid && itemKind === 'hero';
                            const isBrandCtaItem = isPhaseOneBrandGrid && itemKind === 'cta';
                            const isBrandTileItem = isPhaseOneBrandGrid && itemKind !== 'hero' && itemKind !== 'cta';
                            const showItemActions =
                              !isPhaseOneBrandGrid &&
                              !isPhaseOneCategoryIconGrid &&
                              !isPhaseOneProductShelf &&
                              !isPhaseOneCategoryShowcase &&
                              !isBeautyHeroBanner &&
                              !isBeautyOfferBanner;
                            return (
                              <div
                                key={`phase-one-item-${idx}`}
                                className="phase-one-item-card"
                                style={isBeautyOfferBanner ? { display: 'none' } : undefined}
                              >
                                <div className="phase-one-item-header">
                                  <div className="bento-tile-title">
                                    {isBrandHeroItem
                                      ? 'Top banner'
                                      : isBrandCtaItem
                                        ? 'Bottom banner'
                                        : `Item ${idx + 1}`}
                                  </div>
                                  {showItemActions ? (
                                    <div className="phase-one-item-actions">
                                      <button
                                        type="button"
                                        className="ghost-btn small phase-one-icon-btn"
                                        title="Move up"
                                        onClick={() => movePhaseOneItem(idx, -1)}
                                        disabled={idx === 0}
                                      >
                                        Up
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost-btn small phase-one-icon-btn"
                                        title="Move down"
                                        onClick={() => movePhaseOneItem(idx, 1)}
                                        disabled={idx >= allItems.length - 1}
                                      >
                                        Down
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost-btn small"
                                        onClick={() => duplicatePhaseOneItem(idx)}
                                      >
                                        Duplicate
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost-btn small danger"
                                        onClick={() => removePhaseOneItem(idx)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                                {!isPhaseOneIconList &&
                                !isPhaseOneChipScroll &&
                                !isBeautyQuickActions &&
                                !isBeautyRoutineList &&
                                !isBeautyTipChips &&
                                !isBeautyOfferBanner ? (
                                <div className="phase-one-thumb-row">
                                  <div className="phase-one-thumb checkerboard">
                                    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>Main image</span>}
                                  </div>
                                  {isPhaseOneColumnGrid ? (
                                    <div className="phase-one-thumb checkerboard">
                                      {item.secondaryImageUrl ? (
                                        <img src={item.secondaryImageUrl} alt="" />
                                      ) : (
                                        <span>Second image</span>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                                ) : null}
                              {!isBrandHeroItem && !isBrandCtaItem && !isBeautyOfferBanner && !isBeautyTipChips ? (
                                <label className="field">
                                  <span>Title</span>
                                  <input
                                    type="text"
                                    value={item.title || ''}
                                    onChange={(event) => updatePhaseOneItem(idx, 'title', event.target.value)}
                                    placeholder="Item title"
                                    disabled={isBrandTileItem || isPhaseOneCategoryIconGrid || isPhaseOneCategoryShowcase}
                                  />
                                </label>
                              ) : null}
                              {isBrandTileItem ? (
                                <label className="field">
                                  <span>Collection</span>
                                  <select
                                    value={item.collectionId || item.id || ''}
                                    onChange={(event) => {
                                      const selectedId = normalizeCollectionId(event.target.value);
                                      const selectedCollection = brandCollectionOptions.find(
                                        (entry) => resolveCategoryId(entry) === selectedId
                                      );
                                      updatePhaseOneItem(idx, 'collectionId', selectedId);
                                      updatePhaseOneItem(idx, 'id', selectedId);
                                      updatePhaseOneItem(
                                        idx,
                                        'title',
                                        selectedCollection ? resolveCategoryName(selectedCollection) : ''
                                      );
                                      if (!selectedId) {
                                        updatePhaseOneItem(idx, 'imageUrl', '');
                                      }
                                    }}
                                  >
                                    <option value="">Select collection</option>
                                    {brandCollectionOptions.map((collection) => {
                                      const id = resolveCategoryId(collection);
                                      if (!id) return null;
                                      return (
                                        <option key={id} value={id}>
                                          {resolveCategoryName(collection)}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </label>
                              ) : null}
                              {isPhaseOneHorizontalList ? (
                                <label className="field">
                                  <span>Badge text</span>
                                  <input
                                    type="text"
                                    value={item.badgeText || ''}
                                    onChange={(event) => updatePhaseOneItem(idx, 'badgeText', event.target.value)}
                                    placeholder="Festive finds"
                                  />
                                </label>
                              ) : null}
                              {isPhaseOneHorizontalList ? (
                                <label className="field">
                                  <span>Bottom label</span>
                                  <input
                                    type="text"
                                    value={item.subtitle || ''}
                                    onChange={(event) => updatePhaseOneItem(idx, 'subtitle', event.target.value)}
                                    placeholder="For you"
                                  />
                                </label>
                              ) : null}
                              {isPhaseOneHeroCarousel ? (
                                <>
                                  <label className="field">
                                    <span>Subtitle</span>
                                    <input type="text" value={item.subtitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'subtitle', event.target.value)} placeholder="Curated picks for you" />
                                  </label>
                                  <label className="field">
                                    <span>Badge text</span>
                                    <input type="text" value={item.badgeText || ''} onChange={(event) => updatePhaseOneItem(idx, 'badgeText', event.target.value)} placeholder="Glow Edit" />
                                  </label>
                                  <label className="field">
                                    <span>CTA button text</span>
                                    <input type="text" value={item.ctaText || ''} onChange={(event) => updatePhaseOneItem(idx, 'ctaText', event.target.value)} placeholder="Shop the edit" />
                                  </label>
                                  <label className="field">
                                    <span>CTA link</span>
                                    <input type="text" value={item.ctaLink || ''} onChange={(event) => updatePhaseOneItem(idx, 'ctaLink', event.target.value)} placeholder="app://collection/glow" />
                                  </label>
                                </>
                              ) : null}
                              {isBeautyHeroBanner ? (
                                <>
                                  <label className="field">
                                    <span>Subtitle</span>
                                    <input type="text" value={item.subtitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'subtitle', event.target.value)} placeholder="Curated skincare, makeup, and salon essentials" />
                                  </label>
                                  <label className="field">
                                    <span>Badge text</span>
                                    <input type="text" value={item.badgeText || ''} onChange={(event) => updatePhaseOneItem(idx, 'badgeText', event.target.value)} placeholder="Glow Edit" />
                                  </label>
                                  <label className="field">
                                    <span>CTA button text</span>
                                    <input type="text" value={item.ctaText || ''} onChange={(event) => updatePhaseOneItem(idx, 'ctaText', event.target.value)} placeholder="Shop the edit" />
                                  </label>
                                  <label className="field">
                                    <span>CTA link</span>
                                    <input type="text" value={item.ctaLink || ''} onChange={(event) => updatePhaseOneItem(idx, 'ctaLink', event.target.value)} placeholder="app://collection/glow" />
                                  </label>
                                </>
                              ) : null}
                              {isBeautyQuickActions ? (
                                <>
                                  <label className="field">
                                    <span>Subtitle</span>
                                    <input type="text" value={item.subtitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'subtitle', event.target.value)} placeholder="Chat with experts" />
                                  </label>
                                  <label className="field">
                                    <span>CTA text</span>
                                    <input type="text" value={item.ctaText || ''} onChange={(event) => updatePhaseOneItem(idx, 'ctaText', event.target.value)} placeholder="Book now" />
                                  </label>
                                  <label className="field">
                                    <span>Icon name</span>
                                    <input type="text" value={item.iconName || ''} onChange={(event) => updatePhaseOneItem(idx, 'iconName', event.target.value)} placeholder="chatbubbles-outline" />
                                  </label>
                                  <label className="field">
                                    <span>Icon URL (optional)</span>
                                    <input type="text" value={item.iconUrl || ''} onChange={(event) => updatePhaseOneItem(idx, 'iconUrl', event.target.value)} placeholder="https://cdn.example.com/icon.png" />
                                  </label>
                                  <label className="field">
                                    <span>Accent color</span>
                                    <div className="inline-row">
                                      <input type="text" value={item.accentColor || ''} onChange={(event) => updatePhaseOneItem(idx, 'accentColor', event.target.value)} placeholder="#E9A0B2" />
                                      <input
                                        type="color"
                                        className="color-input"
                                        value={resolveHexColor(item.accentColor, '#E9A0B2')}
                                        onChange={(event) => updatePhaseOneItem(idx, 'accentColor', event.target.value)}
                                      />
                                    </div>
                                  </label>
                                </>
                              ) : null}
                              {isPhaseOneIconList ? (
                                <>
                                  <label className="field">
                                    <span>Icon URL</span>
                                    <input type="text" value={item.iconUrl || ''} onChange={(event) => updatePhaseOneItem(idx, 'iconUrl', event.target.value)} placeholder="https://cdn.example.com/icon.png" />
                                  </label>
                                  <label className="field">
                                    <span>Subtitle</span>
                                    <input type="text" value={item.subtitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'subtitle', event.target.value)} placeholder="Short description" />
                                  </label>
                                </>
                              ) : null}
                              {isPhaseOneChipScroll ? (
                                <label className="field">
                                  <span>Chip text</span>
                                  <input type="text" value={item.text || ''} onChange={(event) => updatePhaseOneItem(idx, 'text', event.target.value)} placeholder="Tip or tag text" />
                                </label>
                              ) : null}
                              {isBeautyTrendCarousel ? (
                                <label className="field">
                                  <span>Subtitle</span>
                                  <input type="text" value={item.subtitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'subtitle', event.target.value)} placeholder="Hydration heroes" />
                                </label>
                              ) : null}
                              {isBeautyProductShelf ? (
                                <>
                                  <label className="field">
                                    <span>Subtitle</span>
                                    <input type="text" value={item.subtitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'subtitle', event.target.value)} placeholder="Vitamin C 15%" />
                                  </label>
                                  <label className="field">
                                    <span>Price label</span>
                                    <input type="text" value={item.price || ''} onChange={(event) => updatePhaseOneItem(idx, 'price', event.target.value)} placeholder="Rs 1,499" />
                                  </label>
                                </>
                              ) : null}
                              {isBeautyRoutineList ? (
                                <>
                                  <label className="field">
                                    <span>Subtitle</span>
                                    <input type="text" value={item.subtitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'subtitle', event.target.value)} placeholder="Gentle gel cleanser" />
                                  </label>
                                  <label className="field">
                                    <span>Icon name</span>
                                    <input type="text" value={item.iconName || ''} onChange={(event) => updatePhaseOneItem(idx, 'iconName', event.target.value)} placeholder="water-outline" />
                                  </label>
                                  <label className="field">
                                    <span>Icon URL (optional)</span>
                                    <input type="text" value={item.iconUrl || ''} onChange={(event) => updatePhaseOneItem(idx, 'iconUrl', event.target.value)} placeholder="https://cdn.example.com/icon.png" />
                                  </label>
                                </>
                              ) : null}
                              {isBeautyTipChips ? (
                                <label className="field">
                                  <span>Chip text</span>
                                  <input type="text" value={item.text || ''} onChange={(event) => updatePhaseOneItem(idx, 'text', event.target.value)} placeholder="SPF daily" />
                                </label>
                              ) : null}
                              {isBeautySalonCarousel ? (
                                <>
                                  <label className="field">
                                    <span>Area / subtitle</span>
                                    <input type="text" value={item.subtitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'subtitle', event.target.value)} placeholder="C G Road, Ahmedabad" />
                                  </label>
                                  <label className="field">
                                    <span>Rating</span>
                                    <input type="text" value={item.rating || ''} onChange={(event) => updatePhaseOneItem(idx, 'rating', event.target.value)} placeholder="4.8" />
                                  </label>
                                  <label className="field">
                                    <span>Distance</span>
                                    <input type="text" value={item.distance || ''} onChange={(event) => updatePhaseOneItem(idx, 'distance', event.target.value)} placeholder="2.4 km" />
                                  </label>
                                </>
                              ) : null}
                              {isPhaseOneColumnGrid ? (
                                <>
                                  <label className="field">
                                    <span>Overlay title</span>
                                    <input type="text" value={item.overlayTitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'overlayTitle', event.target.value)} placeholder="Glass Skin" />
                                  </label>
                                  <label className="field">
                                    <span>Overlay subtitle</span>
                                    <input type="text" value={item.overlaySubtitle || ''} onChange={(event) => updatePhaseOneItem(idx, 'overlaySubtitle', event.target.value)} placeholder="Hydration heroes" />
                                  </label>
                                </>
                              ) : null}
                              {!isPhaseOneCategoryIconGrid &&
                              !isPhaseOneCategoryShowcase &&
                              !isBrandTileItem &&
                              !isPhaseOneProductShelf &&
                              !isPhaseOneChipScroll &&
                              !isPhaseOneIconList &&
                              !isBeautyQuickActions &&
                              !isBeautyRoutineList &&
                              !isBeautyTipChips &&
                              !isBeautyOfferBanner ? (
                                <label className="field">
                                  <span>Image URL</span>
                                  <div className="inline-row">
                                    <input
                                      type="text"
                                      value={item.imageUrl || ''}
                                      onChange={(event) => handlePhaseOneImageChange(idx, 'imageUrl', event.target.value)}
                                      placeholder="https://cdn.example.com/item.jpg"
                                    />
                                    <button
                                      type="button"
                                      className="ghost-btn small"
                                      onClick={() => handleBentoImageClick({ kind: 'sdui', index: idx, field: 'imageUrl' })}
                                      disabled={isUploadingBentoImage}
                                    >
                                      {isUploadingBentoImage ? 'Uploading...' : 'Upload'}
                                    </button>
                                    <button
                                      type="button"
                                      className="ghost-btn small"
                                      onClick={() => openMediaPicker({ kind: 'sdui', index: idx, field: 'imageUrl' })}
                                    >
                                      Library
                                    </button>
                                  </div>
                                  {imageWarning ? <span className="field-warning">{imageWarning}</span> : null}
                                </label>
                              ) : null}
                              {isPhaseOneColumnGrid ? (
                                <label className="field">
                                  <span>Secondary image URL</span>
                                  <div className="inline-row">
                                    <input
                                      type="text"
                                      value={item.secondaryImageUrl || ''}
                                      onChange={(event) => handlePhaseOneImageChange(idx, 'secondaryImageUrl', event.target.value)}
                                      placeholder="https://cdn.example.com/item-2.jpg"
                                    />
                                    <button
                                      type="button"
                                      className="ghost-btn small"
                                      onClick={() =>
                                        handleBentoImageClick({ kind: 'sdui', index: idx, field: 'secondaryImageUrl' })
                                      }
                                      disabled={isUploadingBentoImage}
                                    >
                                      {isUploadingBentoImage ? 'Uploading...' : 'Upload'}
                                    </button>
                                    <button
                                      type="button"
                                      className="ghost-btn small"
                                      onClick={() =>
                                        openMediaPicker({ kind: 'sdui', index: idx, field: 'secondaryImageUrl' })
                                      }
                                    >
                                      Library
                                    </button>
                                  </div>
                                  {secondaryImageWarning ? (
                                    <span className="field-warning">{secondaryImageWarning}</span>
                                  ) : null}
                                </label>
                              ) : null}
                              {!isPhaseOneCategoryIconGrid &&
                              !isPhaseOneCategoryShowcase &&
                              !isPhaseOneProductShelf &&
                              !isBeautyOfferBanner ? (
                                <label className="field">
                                  <span>Deep link</span>
                                  <div className="inline-row">
                                    <select
                                      value={
                                        ITEM_DEEP_LINK_PRESETS.some(
                                          (opt) =>
                                            opt.value &&
                                            (item.deepLink || '').toLowerCase().startsWith(opt.value.toLowerCase())
                                        )
                                          ? ITEM_DEEP_LINK_PRESETS.find((opt) =>
                                              (item.deepLink || '')
                                                .toLowerCase()
                                                .startsWith(opt.value.toLowerCase())
                                            )?.value || ''
                                          : ''
                                      }
                                      onChange={(event) => {
                                        const preset = ITEM_DEEP_LINK_PRESETS.find(
                                          (opt) => opt.value === event.target.value
                                        );
                                        if (preset) {
                                          updatePhaseOneItem(idx, 'deepLink', preset.value);
                                        } else {
                                          updatePhaseOneItem(idx, 'deepLink', item.deepLink || '');
                                        }
                                      }}
                                    >
                                      <option value="">Custom</option>
                                      {ITEM_DEEP_LINK_PRESETS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={item.deepLink || ''}
                                      onChange={(event) => updatePhaseOneItem(idx, 'deepLink', event.target.value)}
                                      placeholder="app://collection/featured"
                                    />
                                  </div>
                                </label>
                              ) : null}
                              {isPhaseOneHorizontalList ? (
                                <span className="field-help">
                                  Featured cards now use image-first style. Upload image and optional text/badge only.
                                </span>
                              ) : null}
                              </div>
                            );
                          })}
                        </div>
                        {isPhaseOneColumnGrid ? (
                          <>
                            <div className="field field-span">
                              <div className="inline-row">
                                <button
                                  type="button"
                                  className="ghost-btn small"
                                  onClick={applyFestiveColumnGridPreset}
                                >
                                  Apply market preset
                                </button>
                                <span className="field-help">
                                  Applies recommended festive defaults and auto-configures CATEGORY_FEED mapping.
                                </span>
                              </div>
                            </div>
                            <label className="field">
                              <span>Section background color</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.sectionBgColor}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))
                                  }
                                  placeholder="#f5f0dc"
                                />
                                <input
                                  type="color"
                                  className="color-input"
                                  value={resolveHexColor(sectionForm.sectionBgColor, '#f5f0dc')}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, sectionBgColor: event.target.value }))
                                  }
                                />
                              </div>
                              <div className="color-palette-row">
                                {COLUMN_GRID_BG_PALETTE.map((color) => (
                                  <button
                                    key={`col-grid-bg-${color}`}
                                    type="button"
                                    className={`color-palette-swatch ${
                                      (sectionForm.sectionBgColor || '').toLowerCase() === color.toLowerCase()
                                        ? 'is-selected'
                                        : ''
                                    }`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        sectionBgColor: color,
                                      }))
                                    }
                                  />
                                ))}
                              </div>
                            </label>
                            <label className="field">
                              <span>Card color (all cards)</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.cardBgColor}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, cardBgColor: event.target.value }))
                                  }
                                  placeholder="#9ad8f8"
                                />
                                <input
                                  type="color"
                                  className="color-input"
                                  value={resolveHexColor(sectionForm.cardBgColor, '#9ad8f8')}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, cardBgColor: event.target.value }))
                                  }
                                />
                              </div>
                              <div className="color-palette-row">
                                {COLUMN_GRID_CARD_BG_PALETTE.map((color) => (
                                  <button
                                    key={`col-grid-card-${color}`}
                                    type="button"
                                    className={`color-palette-swatch ${
                                      (sectionForm.cardBgColor || '').toLowerCase() === color.toLowerCase()
                                        ? 'is-selected'
                                        : ''
                                    }`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        cardBgColor: color,
                                      }))
                                    }
                                  />
                                ))}
                              </div>
                            </label>
                            <label className="field field-span">
                              <span>Section background image URL (optional)</span>
                              <div className="inline-row">
                                <input
                                  type="text"
                                  value={sectionForm.sectionBgImage || ''}
                                  onChange={(event) =>
                                    setSectionForm((prev) => ({ ...prev, sectionBgImage: event.target.value }))
                                  }
                                  placeholder="https://cdn.example.com/festive-bg.png"
                                />
                                <button
                                  type="button"
                                  className="ghost-btn small"
                                  onClick={() => handleBentoImageClick({ kind: 'sectionField', field: 'sectionBgImage' })}
                                  disabled={isUploadingBentoImage}
                                >
                                  {isUploadingBentoImage ? 'Uploading...' : 'Upload'}
                                </button>
                                <button
                                  type="button"
                                  className="ghost-btn small"
                                  onClick={() => openMediaPicker({ kind: 'sectionField', field: 'sectionBgImage' })}
                                >
                                  Library
                                </button>
                              </div>
                              <p className="field-help">
                                If a background image is set it will be rendered in the section; the color is used as a fallback.
                              </p>
                            </label>
                            <label className="field">
                              <span>Top line style</span>
                              <select
                                value={normalizeColumnTopLineStyle(sectionForm.columnTopLineStyle)}
                                onChange={(event) =>
                                  setSectionForm((prev) => ({
                                    ...prev,
                                    columnTopLineStyle: normalizeColumnTopLineStyle(event.target.value),
                                  }))
                                }
                              >
                                {COLUMN_GRID_TOP_LINE_STYLES.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <p className="field-help field-span">
                              "Curve" shows a festive curvy edge; "Flat" shows a straight top strip.
                            </p>
                          </>
                        ) : null}
                      </>
                    ) : null}
                    {isMultiItemGrid ? (
                      <>
                        {!isCategoryPreviewGrid ? (
                          <>
                            <label className="field field-span">
                              <span>Product feed</span>
                              <select
                                value={sectionForm.productFeedMode || 'FREQUENTLY_BOUGHT'}
                                onChange={(event) =>
                                  setSectionForm((prev) => ({
                                    ...prev,
                                    productFeedMode: event.target.value,
                                    dataSourceRef: resolveMultiItemGridDataSourceRef(event.target.value),
                                    itemsPath: '$.products',
                                  }))
                                }
                              >
                                {MULTI_ITEM_GRID_FEED_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <p className="field-help">
                                This block displays products only. The feed selected in the dropdown will be rendered in the app.
                              </p>
                            </label>
                            <label className="field">
                              <span>Initial visible products</span>
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={sectionForm.productLimit || '9'}
                                onChange={(event) =>
                                  setSectionForm((prev) => ({
                                    ...prev,
                                    productLimit: event.target.value,
                                  }))
                                }
                              />
                              <p className="field-help">The grid always renders in 3 columns. This value controls how many products are shown initially.</p>
                            </label>
                          </>
                        ) : (
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
                          </>
                        )}
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
                            <button
                              type="button"
                              className="ghost-btn small"
                              onClick={() => openMediaPicker({ kind: 'header' })}
                            >
                              Library
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
                            <button
                              type="button"
                              className="ghost-btn small"
                              onClick={() => openMediaPicker({ kind: 'hero' })}
                            >
                              Library
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
                                  <button
                                    type="button"
                                    className="ghost-btn small"
                                    onClick={() => openMediaPicker({ kind: 'tile', index: idx })}
                                  >
                                    Library
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
                    {!isEditingFixed && !isPhaseOneBlock ? (
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
                    {showAdvancedFields && !isEditingFixed && !isPhaseOneBlock ? (
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
                          <span>Columns (grid / shelves)</span>
                          <input
                            type="number"
                            min="1"
                            value={sectionForm.columns}
                            onChange={(event) => setSectionForm((prev) => ({ ...prev, columns: event.target.value }))}
                            placeholder="2 (e.g. 2 or 3)"
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
                          className="ghost-btn small danger"
                          onClick={() => requestDeleteSection(editingSectionIndex)}
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
                          className="ghost-btn small danger"
                          onClick={() => requestDeleteHeaderSection(editingHeaderSectionIndex)}
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
                  <div className="properties-empty enhanced-empty">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 15l-2 5L9 9l11 4-5 2z" />
                      <path d="M18.5 18.5L22 22" />
                    </svg>
                    <p className="empty-state-text">Click on any block in the preview to edit its properties here.</p>
                  </div>
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
                          <button type="button" className="ghost-btn small danger" onClick={requestClearHeader}>
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
                    {isLoading ? <><span className="inline-spinner" />Saving...</> : 'Save Draft'}
                  </button>
                  <button type="button" className="primary-btn compact" onClick={requestPublish} disabled={isLoading}>
                    {isLoading ? <><span className="inline-spinner" />Publishing...</> : 'Publish'}
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
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px 12px', color: '#9ca3af' }}>
                        No versions saved yet. Save a draft to create your first version.
                      </td>
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
                            className="ghost-btn small danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              requestRollback(item.id);
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
        <div className="modal-backdrop" onClick={closeEditor} onKeyDown={(e) => { if (e.key === 'Escape') closeEditor(); }}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 className="panel-subheading">{editingSectionIndex !== null ? 'Edit Section' : 'Add Section'}</h3>
                {isEditingFixed ? (
                  <p className="field-help">Fixed sections can only be reordered or hidden.</p>
                ) : null}
              </div>
              <button type="button" className="ghost-btn small" onClick={closeEditor} aria-label="Close">
                x
              </button>
            </div>
            {pageIndustry && editingSectionIndex === null ? (
              <div className="industry-hint">
                This page is linked to <strong>{resolveIndustryLabel(pageIndustry)}</strong> — category feeds will default to this industry.
              </div>
            ) : null}
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
                    onChange={(event) =>
                      setSectionForm((prev) => {
                        const nextType = event.target.value;
                        if (phaseOneBlockTypes.has(nextType)) {
                          return {
                            ...prev,
                            type: nextType,
                            blockType: nextType,
                            sduiItems: normalizePhaseOneItems(prev.sduiItems, nextType),
                          };
                        }
                        return {
                          ...prev,
                          type: nextType,
                          blockType: defaultBlockTypeBySectionType[nextType] || '',
                        };
                      })
                    }
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
                <>
                  <label className="field">
                    <span>Action text</span>
                    <input
                      type="text"
                      value={sectionForm.actionText}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, actionText: event.target.value }))}
                      placeholder="View all"
                    />
                    <p className="field-help">Text for the section header action link (e.g. "View all", "Explore").</p>
                  </label>
                  <label className="field">
                    <span>Action link</span>
                    <input
                      type="text"
                      value={sectionForm.actionLink}
                      onChange={(event) => setSectionForm((prev) => ({ ...prev, actionLink: event.target.value }))}
                      placeholder="app://category/all"
                    />
                  </label>
                  {screenBlockType === 'heroBanner' ? (
                    <label className="field">
                      <span>Banner variant</span>
                      <select
                        value={sectionForm.bannerVariant}
                        onChange={(event) => setSectionForm((prev) => ({ ...prev, bannerVariant: event.target.value }))}
                      >
                        <option value="image">Image banner</option>
                        <option value="text_card">Text card with CTA</option>
                      </select>
                    </label>
                  ) : null}
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
        <div className="modal-backdrop" onClick={closeHeaderEditor} onKeyDown={(e) => { if (e.key === 'Escape') closeHeaderEditor(); }}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 className="panel-subheading">
                  {editingHeaderSectionIndex !== null ? 'Edit Header Block' : 'Add Header Block'}
                </h3>
              </div>
              <button type="button" className="ghost-btn small" onClick={closeHeaderEditor} aria-label="Close">
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
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        variant={confirmAction?.variant}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

export default AppConfigPage;
