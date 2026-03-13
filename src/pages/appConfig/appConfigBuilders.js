import {
  normalizeColumnTopLineStyle,
  phaseOneBlockTypes,
  normalizePhaseOneItems,
  ensureBentoTiles,
  normalizeCollectionId,
  toNumberOrNull,
  resolveMultiItemGridDataSourceRef,
  resolveMultiItemGridFeedMode,
  parseCsvList,
  fromLocalInputValue,
  toLocalInputValue,
  formatCsvList,
  resolveBlockType,
  resolveLegacyStylePreset,
  resolveLegacyCardVariant,
  defaultSectionForm,
  STYLE_PRESET_OPTIONS,
} from './appConfigConstants';

export const buildUniqueSectionId = (baseId, sections) => {
  if (!sections.some((section) => section?.id === baseId)) return baseId;
  let index = 2;
  while (sections.some((section) => section?.id === `${baseId}_${index}`)) {
    index += 1;
  }
  return `${baseId}_${index}`;
};

export const ensurePagesArray = (config) => {
  if (!Array.isArray(config.pages)) {
    config.pages = [];
  }
  return config.pages;
};

export const ensureScreenSections = (page) => {
  if (!page.screen || typeof page.screen !== 'object') {
    page.screen = { type: 'screen', sections: [] };
  }
  if (!Array.isArray(page.screen.sections)) {
    page.screen.sections = [];
  }
  return page.screen.sections;
};

export const ensureHeaderBlocks = (page) => {
  if (!page.header || typeof page.header !== 'object') {
    page.header = {};
  }
  if (!Array.isArray(page.header.blocks)) {
    page.header.blocks = [];
  }
  return page.header.blocks;
};

export const buildSectionFromForm = (base, form) => {
  const next = { ...(base || {}) };
  const resolvedBlockType = form.blockType?.trim() || form.type?.trim() || '';
  const isColumnGridBlock = resolvedBlockType === 'column_grid';
  const isCampaignBentoBlock = resolvedBlockType === 'campaignBento';
  const isProductCardCarouselBlock = resolvedBlockType === 'product_card_carousel';
  const stylePresetOptions = STYLE_PRESET_OPTIONS[resolvedBlockType] || [];
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
  setOrDelete('actionText', form.actionText?.trim());
  setOrDelete('actionLink', form.actionLink?.trim());
  if (resolvedBlockType === 'quick_action_row') {
    setOrDelete('quickActionPreset', form.quickActionPreset?.trim() || 'electronics');
  } else {
    delete next.quickActionPreset;
  }
  if (stylePresetOptions.length) {
    setOrDelete('stylePreset', form.stylePreset?.trim() || stylePresetOptions[0]?.value || '');
  } else {
    delete next.stylePreset;
  }
  setOrDelete('cardVariant', form.cardVariant?.trim());
  setOrDelete(
    'bannerVariant',
    resolvedBlockType === 'heroBanner' && form.bannerVariant === 'text_card' ? 'text_card' : undefined
  );
  setOrDelete('showcaseVariant', form.showcaseVariant && form.showcaseVariant !== 'circle' ? form.showcaseVariant : undefined);
  setOrDelete('imageUrl', form.imageUrl?.trim());
  setOrDelete('aspectRatio', form.aspectRatio?.trim());
  setOrDelete('deepLink', form.deepLink?.trim());
  setOrDelete('placeholder', form.placeholder?.trim());
  setOrDelete('sectionBgColor', form.sectionBgColor?.trim());
  if (isColumnGridBlock) {
    setOrDelete('sectionBgImage', form.sectionBgImage?.trim());
    next.columnTopLineStyle = normalizeColumnTopLineStyle(form.columnTopLineStyle);
    delete next.columnTopLineColor;
    delete next.columnTopLineImage;
  } else {
    delete next.sectionBgImage;
    delete next.columnTopLineStyle;
    delete next.columnTopLineColor;
    delete next.columnTopLineImage;
  }
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
  if (isCampaignBentoBlock) {
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
  } else {
    delete next.hero;
    delete next.tiles;
    if (!isColumnGridBlock) {
      delete next.headerImage;
    }
  }
  if (phaseOneBlockTypes.has(resolvedBlockType)) {
    const normalizedItems = normalizePhaseOneItems(form.sduiItems, resolvedBlockType)
      .map((item) => {
        const clean = {};
        Object.entries(item || {}).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          const text = String(value).trim();
          if (!text) return;
          if (key === 'kind' && text === 'tile') return;
          clean[key] = text;
        });
        return clean;
      })
      .filter((item) => Object.keys(item).length > 0);
    if (normalizedItems.length > 0) {
      next.items = normalizedItems;
    } else {
      delete next.items;
    }
  }
  setOrDelete('itemsPath', form.itemsPath?.trim());
  setOrDelete('itemTemplateRef', form.itemTemplateRef?.trim());
  setOrDelete('dataSourceRef', form.dataSourceRef?.trim());
  const isLegacyMultiItemGrid =
    !phaseOneBlockTypes.has(resolvedBlockType) && resolvedBlockType === 'multiItemGrid';
  const sourceType = String(form.sourceType || 'MANUAL').trim().toUpperCase();
  if (isLegacyMultiItemGrid) {
    const feedMode = String(form.productFeedMode || 'FREQUENTLY_BOUGHT').trim().toUpperCase();
    const productLimitRaw = toNumberOrNull(form.productLimit);
    const productLimit = productLimitRaw ? Math.max(1, Math.min(60, productLimitRaw)) : 9;
    next.productFeedMode = feedMode;
    next.dataSourceRef = resolveMultiItemGridDataSourceRef(feedMode);
    next.itemsPath = '$.products';
    next.columns = 3;
    next.productLimit = productLimit;
    delete next.dataSource;
    delete next.mapping;
  } else {
    if (sourceType && sourceType !== 'MANUAL') {
      const sourcePayload = { sourceType };
      const sourceIndustryId = normalizeCollectionId(form.sourceIndustryId);
      if (sourceIndustryId) sourcePayload.industryId = sourceIndustryId;
      if (sourceType === 'CATEGORY_FEED' && form.sourceFeedMode) {
        sourcePayload.mode = String(form.sourceFeedMode).trim().toUpperCase();
      }
      const mainCategoryId = normalizeCollectionId(form.sourceMainCategoryId);
      if (mainCategoryId) sourcePayload.mainCategoryId = mainCategoryId;
      const sourceCategoryIds = Array.isArray(form.sourceCategoryIds)
        ? form.sourceCategoryIds.map((value) => normalizeCollectionId(value)).filter(Boolean)
        : [];
      if (sourceCategoryIds.length) sourcePayload.categoryIds = sourceCategoryIds;
      const sourceLimit = toNumberOrNull(form.sourceLimit);
      if (sourceLimit) sourcePayload.limit = Math.max(1, Math.min(20, sourceLimit));
      if (sourceType === 'CATEGORY_FEED') {
        const rankingWindowDays = toNumberOrNull(form.sourceRankingWindowDays);
        if (rankingWindowDays) sourcePayload.rankingWindowDays = Math.max(1, Math.min(365, rankingWindowDays));
        if (form.sourceSortBy) sourcePayload.sortBy = String(form.sourceSortBy).trim().toUpperCase();
        if (form.sourceLevel) sourcePayload.level = String(form.sourceLevel).trim().toUpperCase();
        sourcePayload.filters = {
          activeOnly: form.sourceActiveOnly !== false,
          hasImageOnly: form.sourceHasImageOnly !== false,
        };
      }
      next.dataSource = sourcePayload;
    } else {
      delete next.dataSource;
    }
    if (sourceType === 'CATEGORY_FEED') {
      const mappingPayload = {};
      const titleField = String(form.mappingTitleField || '').trim();
      const imageField = String(form.mappingImageField || '').trim();
      const secondaryImageField = String(form.mappingSecondaryImageField || '').trim();
      const deepLinkTemplate = String(form.mappingDeepLinkTemplate || '').trim();
      if (titleField) mappingPayload.titleField = titleField;
      if (imageField) mappingPayload.imageField = imageField;
      if (secondaryImageField) mappingPayload.secondaryImageField = secondaryImageField;
      if (deepLinkTemplate) mappingPayload.deepLinkTemplate = deepLinkTemplate;
      if (Object.keys(mappingPayload).length) {
        next.mapping = mappingPayload;
      } else {
        delete next.mapping;
      }
    } else {
      delete next.mapping;
    }
    delete next.productFeedMode;
    delete next.productLimit;
  }
  if (isProductCardCarouselBlock) {
    delete next.dataSource;
    delete next.mapping;
    const hasFeedSource = Boolean(String(form.dataSourceRef || '').trim());
    if (hasFeedSource) {
      const feedMode = String(form.productFeedMode || 'BESTSELLER').trim().toUpperCase();
      const productLimitRaw = toNumberOrNull(form.productLimit);
      const productLimit = productLimitRaw ? Math.max(1, Math.min(60, productLimitRaw)) : 8;
      const sourceIndustryId = normalizeCollectionId(form.sourceIndustryId);
      const sourceMainCategoryId = normalizeCollectionId(form.sourceMainCategoryId);
      const sourceCategoryIds = Array.isArray(form.sourceCategoryIds)
        ? form.sourceCategoryIds.map((value) => normalizeCollectionId(value)).filter(Boolean)
        : [];
      next.productFeedMode = feedMode;
      next.dataSourceRef = resolveMultiItemGridDataSourceRef(feedMode);
      next.itemsPath = '$.products';
      next.productLimit = productLimit;
      next.dataSource = {
        sourceType: 'PRODUCT_FEED',
        ...(sourceIndustryId ? { industryId: sourceIndustryId } : {}),
        ...(sourceMainCategoryId ? { mainCategoryId: sourceMainCategoryId } : {}),
        ...(sourceCategoryIds.length ? { categoryIds: sourceCategoryIds } : {}),
        filters: {
          hasImageOnly: form.sourceHasImageOnly !== false,
          inStockOnly: form.sourceInStockOnly === true,
        },
      };
      delete next.items;
    } else {
      delete next.dataSource;
      delete next.productFeedMode;
      delete next.productLimit;
      delete next.dataSourceRef;
      delete next.itemsPath;
    }
  }
  if (isLegacyMultiItemGrid) {
    next.columns = 3;
  } else {
    const columns = form.columns !== '' ? Number(form.columns) : null;
    if (columns && !Number.isNaN(columns)) {
      next.columns = columns;
    } else {
      delete next.columns;
    }
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
  if (!isLegacyMultiItemGrid && collectionIds.length > 0) {
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

export const parseGradientList = (value) => {
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

export const buildSectionFormFromConfig = (section, fallbackType) => {
  const items = Array.isArray(section?.items) ? section.items : [];
  const legacyBlockType = section?.blockType || '';
  const firstItem = items[0] || {};
  const hero = section?.hero && typeof section.hero === 'object' ? section.hero : {};
  const tiles = ensureBentoTiles(section?.tiles);
  const source = section?.dataSource && typeof section.dataSource === 'object' ? section.dataSource : {};
  const mapping = section?.mapping && typeof section.mapping === 'object' ? section.mapping : {};
  const resolvedType = section?.type === 'campaign' ? 'campaignBento' : section?.type || fallbackType;
  const resolvedBlockType = resolveBlockType(section);
  const isVisualDataSourceBlock =
    resolvedBlockType === 'hero_carousel' ||
    resolvedBlockType === 'media_overlay_carousel' ||
    resolvedBlockType === 'promo_hero_banner';
  return {
    id: section?.id || '',
    type: resolvedType,
    blockType: resolvedBlockType,
    title: section?.title || '',
    text: section?.text || '',
    actionText: section?.actionText || '',
    actionLink: section?.actionLink || '',
    quickActionPreset:
      section?.quickActionPreset ||
      (legacyBlockType === 'beauty_quick_actions' ? 'beauty' : defaultSectionForm.quickActionPreset),
    stylePreset: resolveLegacyStylePreset(legacyBlockType, section?.stylePreset || ''),
    cardVariant: resolveLegacyCardVariant(legacyBlockType, section?.cardVariant || section?.variant || ''),
    bannerVariant: resolvedBlockType === 'heroBanner' ? section?.bannerVariant || 'image' : 'image',
    showcaseVariant: section?.showcaseVariant || 'circle',
    imageUrl: section?.imageUrl || firstItem?.imageUrl || '',
    aspectRatio: section?.aspectRatio || '',
    deepLink: section?.deepLink || firstItem?.deepLink || firstItem?.targetUrl || '',
    sectionBgColor: section?.sectionBgColor || '',
    sectionBgImage: section?.sectionBgImage || '',
    columnTopLineStyle: normalizeColumnTopLineStyle(section?.columnTopLineStyle),
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
    sduiItems: phaseOneBlockTypes.has(resolvedBlockType)
      ? normalizePhaseOneItems(items, resolvedBlockType)
      : [],
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
    sourceType:
      source?.sourceType ||
      ((resolvedBlockType === 'product_card_carousel' && section?.dataSourceRef)
        ? 'PRODUCT_FEED'
        : (isVisualDataSourceBlock && section?.dataSourceRef)
          ? 'DATA_SOURCE'
          : section?.sourceType) ||
      'MANUAL',
    sourceIndustryId: source?.industryId ? String(source.industryId) : (section?.sourceIndustryId ? String(section.sourceIndustryId) : ''),
    sourceFeedMode: source?.mode || section?.sourceFeedMode || defaultSectionForm.sourceFeedMode,
    productFeedMode: resolveMultiItemGridFeedMode(
      section?.dataSourceRef,
      section?.productFeedMode || defaultSectionForm.productFeedMode
    ),
    productLimit:
      section?.productLimit !== undefined && section?.productLimit !== null
        ? String(section.productLimit)
        : defaultSectionForm.productLimit,
    sourceMainCategoryId: source?.mainCategoryId ? String(source.mainCategoryId) : '',
    sourceCategoryIds: Array.isArray(source?.categoryIds)
      ? source.categoryIds.map((value) => normalizeCollectionId(value)).filter(Boolean)
      : [],
    sourceLimit:
      source?.limit !== undefined && source?.limit !== null ? String(source.limit) : defaultSectionForm.sourceLimit,
    sourceRankingWindowDays:
      source?.rankingWindowDays !== undefined && source?.rankingWindowDays !== null
        ? String(source.rankingWindowDays)
        : defaultSectionForm.sourceRankingWindowDays,
    sourceSortBy: source?.sortBy || defaultSectionForm.sourceSortBy,
    sourceLevel: source?.level || defaultSectionForm.sourceLevel,
    sourceActiveOnly: source?.filters?.activeOnly !== false,
    sourceHasImageOnly: source?.filters?.hasImageOnly !== false,
    sourceInStockOnly: source?.filters?.inStockOnly === true,
    mappingTitleField: mapping?.titleField || defaultSectionForm.mappingTitleField,
    mappingImageField: mapping?.imageField || defaultSectionForm.mappingImageField,
    mappingSecondaryImageField: mapping?.secondaryImageField || '',
    mappingDeepLinkTemplate: mapping?.deepLinkTemplate || defaultSectionForm.mappingDeepLinkTemplate,
  };
};
