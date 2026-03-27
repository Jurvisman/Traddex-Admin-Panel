import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  resolveBlockType,
  resolveBlockLabel,
  resolveLegacyStylePreset,
  resolveIndustryId,
  resolveIndustryLabel,
  normalizeMatchValue,
  normalizeCollectionId,
  resolveMainCategoryIndustryId,
  resolveMainCategoryName,
  resolveCategoryMainCategoryId,
  normalizeColumnTopLineStyle,
  parseAspectRatioValue,
  ensureBentoTiles,
} from './appConfigConstants';

const LEGACY_BENTO_AUTO_BACKGROUNDS = new Set(['#e7f6ff', '#eef7ff', '#a8e0ff']);

const PREVIEW_BENTO_THEMES = {
  default: {
    background: '#E7F6FF',
    surface: 'rgba(255,255,255,0.94)',
    tile: 'rgba(255,255,255,0.88)',
    border: 'rgba(153, 203, 238, 0.9)',
    placeholder: '#CFE9FA',
    badgeBg: 'rgba(255,255,255,0.96)',
    badgeText: '#14507B',
    labelBg: 'rgba(255,255,255,0.92)',
    labelText: '#16324F',
    heroLabelBg: 'rgba(18, 41, 66, 0.44)',
    heroLabelText: '#FFFFFF',
  },
  electronics: {
    background: '#E7F6FF',
    surface: 'rgba(255,255,255,0.94)',
    tile: 'rgba(255,255,255,0.88)',
    border: 'rgba(153, 203, 238, 0.9)',
    placeholder: '#CFE9FA',
    badgeBg: 'rgba(255,255,255,0.96)',
    badgeText: '#14507B',
    labelBg: 'rgba(255,255,255,0.92)',
    labelText: '#16324F',
    heroLabelBg: 'rgba(18, 41, 66, 0.44)',
    heroLabelText: '#FFFFFF',
  },
  beauty: {
    background: '#F7E2EA',
    surface: 'rgba(255,251,253,0.95)',
    tile: 'rgba(255,247,251,0.93)',
    border: 'rgba(227, 189, 205, 0.92)',
    placeholder: '#F1D7E2',
    badgeBg: 'rgba(255,248,251,0.96)',
    badgeText: '#A04E73',
    labelBg: 'rgba(255,248,251,0.92)',
    labelText: '#7F3C5D',
    heroLabelBg: 'rgba(108, 43, 76, 0.42)',
    heroLabelText: '#FFFFFF',
  },
  grocery: {
    background: '#E8F4D7',
    surface: 'rgba(250,255,245,0.96)',
    tile: 'rgba(245,251,238,0.94)',
    border: 'rgba(187, 219, 157, 0.96)',
    placeholder: '#D6E9BE',
    badgeBg: 'rgba(250,255,245,0.97)',
    badgeText: '#2E621C',
    labelBg: 'rgba(250,255,245,0.93)',
    labelText: '#254D17',
    heroLabelBg: 'rgba(38, 82, 23, 0.42)',
    heroLabelText: '#FFFFFF',
  },
};

const normalizeBentoThemePreset = (stylePreset, pageThemePreset) => {
  const explicit = String(stylePreset || '').trim().toLowerCase();
  if (explicit === 'beauty' || explicit === 'electronics' || explicit === 'grocery') return explicit;
  const pagePreset = String(pageThemePreset || '').trim().toLowerCase();
  if (pagePreset === 'beauty' || pagePreset === 'electronics' || pagePreset === 'grocery') return pagePreset;
  return 'default';
};

const resolvePreviewBentoTheme = (stylePreset, pageThemePreset, backgroundColor) => {
  const preset = normalizeBentoThemePreset(stylePreset, pageThemePreset);
  const base = PREVIEW_BENTO_THEMES[preset] || PREVIEW_BENTO_THEMES.default;
  const normalizedBackground = String(backgroundColor || '').trim().toLowerCase();
  const background =
    normalizedBackground && !LEGACY_BENTO_AUTO_BACKGROUNDS.has(normalizedBackground)
      ? backgroundColor
      : base.background;
  return { ...base, background };
};

const normalizeBentoTileSourceType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'CATEGORY_FEED' || normalized === 'COLLECTION_FEED') return normalized;
  return 'MANUAL';
};

const getPreviewBentoTiles = (section, collections, mainCategories, productCollections) => {
  const source = section?.tileSource && typeof section.tileSource === 'object' ? section.tileSource : {};
  const sourceType = normalizeBentoTileSourceType(source?.sourceType || section?.bentoTilesSourceType);
  const rawLimit = Number(source?.limit ?? section?.bentoTilesLimit ?? 4);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.max(1, Math.min(4, Math.trunc(rawLimit))) : 4;

  if (sourceType === 'CATEGORY_FEED') {
    const mainCategoryId = normalizeCollectionId(source?.mainCategoryId || section?.bentoTilesMainCategoryId);
    if (mainCategoryId) {
      const categoryItems = (Array.isArray(collections) ? collections : [])
        .filter(
          (item) =>
            normalizeCollectionId(resolveCategoryMainCategoryId(item)) === mainCategoryId
        )
        .slice(0, limit)
        .map((item, index) => ({
          imageUrl: getPreviewImage(item) || item?.categoryIcon || '',
          label: item?.name || item?.title || `Category ${index + 1}`,
        }));
      if (categoryItems.length) return categoryItems;
    }

    const industryId = normalizeCollectionId(source?.industryId || section?.bentoTilesIndustryId);
    if (industryId) {
      const mainCategoryItems = (Array.isArray(mainCategories) ? mainCategories : [])
        .filter(
          (item) =>
            normalizeCollectionId(resolveMainCategoryIndustryId(item)) === industryId
        )
        .slice(0, limit)
        .map((item, index) => ({
          imageUrl: getPreviewImage(item) || item?.mainCategoryIcon || '',
          label: resolveMainCategoryName(item) || `Category ${index + 1}`,
        }));
      if (mainCategoryItems.length) return mainCategoryItems;
    }
  }

  if (sourceType === 'COLLECTION_FEED') {
    const selectedRefs = Array.isArray(source?.collectionRefs)
      ? source.collectionRefs.map((value) => normalizeCollectionId(value)).filter(Boolean)
      : Array.isArray(section?.bentoTileCollectionRefs)
        ? section.bentoTileCollectionRefs.map((value) => normalizeCollectionId(value)).filter(Boolean)
        : [];
    const collectionMap = new Map();
    (Array.isArray(productCollections) ? productCollections : []).forEach((item) => {
      const slug = normalizeCollectionId(item?.slug);
      const id = normalizeCollectionId(item?.id);
      if (slug) collectionMap.set(slug, item);
      if (id) collectionMap.set(id, item);
    });
    const selectedCollections = selectedRefs
      .map((ref, index) => {
        const item = collectionMap.get(ref);
        if (!item) return null;
        return {
          imageUrl: item?.heroImage || item?.imageUrl || '',
          label: item?.title || item?.slug || `Collection ${index + 1}`,
        };
      })
      .filter(Boolean)
      .slice(0, limit);
    if (selectedCollections.length) return selectedCollections;
  }

  return ensureBentoTiles(section?.tiles).slice(0, limit);
};

export const SortableSectionRow = ({ id, className, children }) => {
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

export const ToolboxItem = ({ item, onAdd }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `toolbox:${item.key}`,
  });
  const style = isDragging
    ? {
        opacity: 0.28,
      }
    : {
        transform: CSS.Transform.toString(transform),
      };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`toolbox-item ${isDragging ? 'is-dragging is-drag-source' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="toolbox-grip" />
      <div className="toolbox-body">
        <div className="toolbox-title">{item.label}</div>
        <div className="toolbox-hint">{item.hint}</div>
      </div>
      <button
        type="button"
        className="ghost-btn small"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onClick={() => onAdd(item)}
      >
        Add
      </button>
    </div>
  );
};

export const DropZone = ({ id, isOver, children, className, style, onClick }) => {
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

export const SortablePreviewItem = ({ id, className, onClick, children }) => {
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

export const getPreviewItems = (section, fallbackCount = 4) => {
  const blockType = resolveBlockType(section);
  const sourceType = String(section?.dataSource?.sourceType || section?.sourceType || '').trim().toUpperCase();
  const hasManualItems = Array.isArray(section?.items) && section.items.length > 0;
  if (
    (sourceType === 'DATA_SOURCE' || (sourceType === 'HYBRID' && !hasManualItems)) &&
    blockType === 'promo_hero_banner'
  ) {
    return [
      {
        _placeholder: true,
        title: 'Promo hero',
        subtitle: sourceType === 'HYBRID' ? 'Hybrid live item' : 'Live feed item',
        badgeText: 'Campaign',
        ctaText: 'Open',
      },
    ];
  }
  if (
    sourceType === 'DATA_SOURCE' &&
    (blockType === 'hero_carousel' || blockType === 'media_overlay_carousel')
  ) {
    return Array.from({ length: fallbackCount }).map((_, index) => ({
      _placeholder: true,
      title: blockType === 'hero_carousel' ? `Slide ${index + 1}` : `Card ${index + 1}`,
      subtitle: blockType === 'hero_carousel' ? 'Live feed item' : 'Live data source item',
    }));
  }
  if (Array.isArray(section?.items) && section.items.length > 0) {
    return section.items;
  }
  return Array.from({ length: fallbackCount }).map((_, index) => ({
    _placeholder: true,
    title: `Item ${index + 1}`,
  }));
};

export const getPreviewImage = (item) =>
  item?.imageUrl || item?.imageUri || item?.thumbnailImage || item?.galleryImages?.[0]?.url || '';

export const getPreviewSecondaryImage = (item) => item?.secondaryImageUrl || '';

export const getPreviewTitle = (item) => item?.title || item?.name || item?.label || 'Item';

const resolvePreviewThemeKey = (preset, fallback = 'default') => {
  const normalized = String(preset || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === 'beauty') return 'beauty';
  if (normalized === 'grocery') return 'grocery';
  if (normalized === 'fashion') return 'fashion';
  if (normalized === 'decor') return 'decor';
  if (normalized === 'kids') return 'kids';
  if (normalized === 'sports') return 'sports';
  if (normalized === 'travel') return 'travel';
  if (normalized === 'electronics') return 'electronics';
  if (normalized === 'automobile') return 'automobile';
  return normalized || fallback;
};

const buildPreviewTitleClass = ({ themeKey = '', surface = false } = {}) =>
  [
    'preview-title',
    'preview-title-with-action',
    surface ? 'preview-title-surface-pill' : '',
    themeKey ? `preview-title-theme-${themeKey}` : '',
  ]
    .filter(Boolean)
    .join(' ');

const renderQuickActionPreview = ({ section, index, hidden, title, items, preset = 'electronics' }) => {
  const normalizedPresetKey = resolvePreviewThemeKey(preset, 'electronics');
  const isBeauty = normalizedPresetKey === 'beauty';
  const quickActionThemeClass = `is-${normalizedPresetKey}`;
  return (
    <div key={`preview-${index}`} className={`preview-section preview-quick-action-section-${quickActionThemeClass} ${hidden ? 'is-hidden' : ''}`}>
      {title ? (
        <div className={buildPreviewTitleClass({ themeKey: normalizedPresetKey })}>
          <span>{title}</span>
          {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
        </div>
      ) : null}
      <div className={`preview-quick-actions ${quickActionThemeClass}`}>
        {items.map((item, itemIndex) => (
          <div key={`preview-quick-action-${index}-${itemIndex}`} className="preview-quick-action-card">
            {isBeauty ? (
              <div
                className="preview-quick-action-accent"
                style={{ backgroundColor: item?.accentColor || '#E9A0B2' }}
              />
            ) : null}
            <div className="preview-quick-action-icon">{item?.iconName || item?.icon || 'icon'}</div>
            <div className="preview-quick-action-title">{item?.title || `Action ${itemIndex + 1}`}</div>
            {item?.subtitle ? <div className="preview-quick-action-subtitle">{item.subtitle}</div> : null}
            {item?.ctaText ? <div className="preview-quick-action-cta">{item.ctaText}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ToolboxDragPreview = ({ item }) => (
  <div className="toolbox-drag-overlay">
    <div className="toolbox-item is-dragging">
      <div className="toolbox-grip" />
      <div className="toolbox-body">
        <div className="toolbox-title">{item.label}</div>
        <div className="toolbox-hint">{item.hint}</div>
      </div>
    </div>
  </div>
);

export const HeaderBlockPreview = ({ block, industries }) => {
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

export const PreviewSection = ({
  section,
  index,
  collections,
  mainCategories,
  productCollections,
  pageThemePreset = '',
}) => {
  if (!section) return null;
  const type = section?.type || 'section';
  const blockType = resolveBlockType(section);
  const stylePreset = resolveLegacyStylePreset(section?.blockType, section?.stylePreset);
  const title = section?.title;
  const hidden = section?.enabled === false;
  const collectionIds = Array.isArray(section?.collectionIds)
    ? section.collectionIds.map((value) => normalizeCollectionId(value)).filter(Boolean)
    : [];
  const fallbackCount =
    blockType === 'hero_carousel'
      ? 2
      : blockType === 'brand_logo_grid'
        ? 6
        : type === 'banner'
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

  if (blockType === 'promo_banner') {
    const normalizedPreset = String(stylePreset || '').trim().toLowerCase();
    const isBeautyPreset = normalizedPreset === 'beauty';
    const isGroceryPreset = normalizedPreset === 'grocery';
    const isDecorPreset = normalizedPreset === 'decor';
    if (isBeautyPreset) {
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          <div className="preview-beauty-offer" style={{ '--beauty-offer-base': section?.sectionBgColor || '#E9C3B3' }}>
            <div>
              <div className="preview-beauty-offer-title">{section?.title || 'Beauty Friday'}</div>
              {section?.text ? <div className="preview-beauty-offer-subtitle">{section.text}</div> : null}
            </div>
            {section?.actionText ? <span className="preview-beauty-offer-cta">{section.actionText}</span> : null}
          </div>
        </div>
      );
    }
    if (isGroceryPreset) {
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          <div className="preview-beauty-offer preview-grocery-offer" style={{ '--beauty-offer-base': section?.sectionBgColor || '#D9EDBF' }}>
            <div>
              <div className="preview-beauty-offer-title">{section?.title || 'Snack Time'}</div>
              {section?.text ? <div className="preview-beauty-offer-subtitle">{section.text}</div> : null}
            </div>
            {section?.actionText ? <span className="preview-beauty-offer-cta">{section.actionText}</span> : null}
          </div>
        </div>
      );
    }
    if (isDecorPreset) {
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          <div className="preview-promo-text-card" style={{ backgroundColor: section?.sectionBgColor || '#EFE7DC', borderColor: 'rgba(75,61,52,0.12)' }}>
            <div className="preview-promo-text-title" style={{ color: '#4B3D34' }}>{title || 'Need a full room refresh?'}</div>
            {section?.text ? <div className="preview-promo-text-subtitle" style={{ color: '#7D6B61' }}>{section.text}</div> : null}
            {section?.actionText ? <span className="preview-promo-text-cta" style={{ color: '#C46A4A' }}>{section.actionText}</span> : null}
          </div>
        </div>
      );
    }
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        <div className="preview-promo-text-card" style={{ backgroundColor: section?.sectionBgColor || '#fce7f3' }}>
          <div className="preview-promo-text-title">{title || 'Promo title'}</div>
          {section?.text ? <div className="preview-promo-text-subtitle">{section.text}</div> : null}
          {section?.actionLink || section?.deepLink ? (
            <span className="preview-promo-text-cta">{section?.actionText || 'Shop offers'}</span>
          ) : null}
        </div>
      </div>
    );
  }

  if (blockType === 'heroBanner') {
    const item = items[0] || {};
    const image = section?.imageUrl || getPreviewImage(item);
    const aspectRatio = parseAspectRatioValue(section?.aspectRatio);
    const bannerStyle = aspectRatio ? { aspectRatio } : null;
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? <div className="preview-title">{title}</div> : null}
        <div
          className={`preview-banner ${section?.placement === 'header' ? 'is-header-attached' : ''}`}
          style={bannerStyle || undefined}
        >
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

  if (blockType === 'hero_carousel') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className={`preview-phase-one-carousel ${section?.placement === 'header' ? 'is-header-attached' : ''}`}>
          {items.map((item, itemIndex) => {
            const image = getPreviewImage(item);
            return (
              <div
                key={`preview-hero-carousel-${index}-${itemIndex}`}
                className={`preview-phase-one-hero-card ${section?.placement === 'header' ? 'is-header-attached' : ''}`}
              >
                {image ? <img src={image} alt="" /> : <div className="preview-banner-placeholder" />}
                {item.badgeText ? <span className="preview-hero-badge">{item.badgeText}</span> : null}
                {item.ctaText ? <span className="preview-hero-cta">{item.ctaText}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (blockType === 'horizontal_scroll_list') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-phase-one-featured-row">
          {items.map((item, itemIndex) => {
            const image = getPreviewImage(item);
            const label = item?.title || item?.name || item?.label || '';
            const badge = item?.badgeText || '';
            const subtitle = item?.subtitle || '';
            return (
              <div key={`preview-featured-${index}-${itemIndex}`} className="preview-phase-one-featured-card">
                {badge ? (
                  <span className="preview-phase-one-featured-badge" style={{ color: item?.badgeTextColor || undefined }}>
                    {badge}
                  </span>
                ) : null}
                {label ? (
                  <div className="preview-phase-one-featured-title" style={{ color: item?.titleColor || undefined }}>
                    {label}
                  </div>
                ) : null}
                <div className="preview-phase-one-featured-image-wrap">
                  {image ? <img src={image} alt="" /> : <div className="preview-image-placeholder" />}
                </div>
                {subtitle ? <span className="preview-phase-one-featured-subtitle">{subtitle}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (blockType === 'column_grid') {
    const sectionBgColor = section?.sectionBgColor || '#f5f0dc';
    const sectionBgImage = section?.sectionBgImage || '';
    const cardBgColor = section?.cardBgColor || '#9ad8f8';
    const topLineStyle = normalizeColumnTopLineStyle(section?.columnTopLineStyle);
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        <div
          className="preview-phase-one-column-shell"
          style={
            sectionBgColor
              ? { backgroundColor: sectionBgColor, '--column-shell-bg': sectionBgColor }
              : { '--column-shell-bg': '#f5f0dc' }
          }
        >
          {sectionBgImage ? (
            <img className="preview-phase-one-column-bg-image" src={sectionBgImage} alt="" />
          ) : null}
          <div
            className={`preview-phase-one-column-topline ${
              topLineStyle === 'curve'
                ? 'preview-phase-one-column-topline-curve'
                : 'preview-phase-one-column-topline-flat'
            }`}
          />
          <div className="preview-phase-one-column-content">
            {title ? <div className="preview-title">{title}</div> : null}
            <div className="preview-phase-one-column-grid">
              {items.map((item, itemIndex) => {
                const image = getPreviewImage(item);
                const secondary = getPreviewSecondaryImage(item);
                const label = getPreviewTitle(item);
                return (
                  <div
                    key={`preview-column-grid-${index}-${itemIndex}`}
                    className="preview-phase-one-column-card"
                    style={{ backgroundColor: cardBgColor }}
                  >
                    <div className="preview-phase-one-column-title">{label}</div>
                    <div className="preview-phase-one-column-images">
                      <div className="preview-phase-one-column-image">
                        {image ? <img src={image} alt="" /> : <div className="preview-image-placeholder" />}
                        {item.overlayTitle ? (
                          <div className="preview-column-overlay">
                            <span className="preview-column-overlay-title">{item.overlayTitle}</span>
                            {item.overlaySubtitle ? <span className="preview-column-overlay-subtitle">{item.overlaySubtitle}</span> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="preview-phase-one-column-image">
                        {secondary ? <img src={secondary} alt="" /> : <div className="preview-image-placeholder" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (blockType === 'category_icon_grid') {
    const normalizedIconGridPreset = String(stylePreset || '').trim().toLowerCase();
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className={`preview-phase-one-category-grid preview-icon-grid-theme-${normalizedIconGridPreset || 'default'}`}>
          {items.map((item, itemIndex) => {
            const image = getPreviewImage(item);
            const label = getPreviewTitle(item);
            return (
              <div key={`preview-category-icon-grid-${index}-${itemIndex}`} className="preview-phase-one-category-cell">
                <div className="preview-phase-one-category-image">
                  {image ? <img src={image} alt="" /> : <div className="preview-image-placeholder" />}
                </div>
                <div className="preview-phase-one-category-label">{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (blockType === 'category_showcase') {
    const variant = section?.showcaseVariant || 'circle';
    const normalizedShowcasePreset = resolvePreviewThemeKey(section?.stylePreset);
    const isElectronicsShowcase = normalizedShowcasePreset === 'electronics';
    const isGroceryShowcase = normalizedShowcasePreset === 'grocery';
    const isKidsShowcase = normalizedShowcasePreset === 'kids';
    const isSportsShowcase = normalizedShowcasePreset === 'sports';
    const isTravelShowcase = normalizedShowcasePreset === 'travel';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={buildPreviewTitleClass({ themeKey: normalizedShowcasePreset, surface: true })}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div
          className={`preview-showcase-row preview-showcase-${variant} ${
            isElectronicsShowcase
              ? 'preview-showcase-theme-electronics'
              : isGroceryShowcase
                ? 'preview-showcase-theme-grocery'
                : isKidsShowcase
                  ? 'preview-showcase-theme-kids'
                  : isSportsShowcase
                    ? 'preview-showcase-theme-sports'
                    : isTravelShowcase
                      ? 'preview-showcase-theme-travel'
                : ''
          }`}
        >
          {items.map((item, itemIndex) => {
            const image = getPreviewImage(item);
            const label = getPreviewTitle(item);
            const icon = item?.iconUrl || item?.mainCategoryIcon || '';
            const iconGlyph = String(item?.iconName || item?.icon || label || 'T')
              .trim()
              .charAt(0)
              .toUpperCase();
            if (variant === 'card') {
              return (
                <div key={`preview-showcase-card-${index}-${itemIndex}`} className="preview-showcase-card-item">
                  <div className="preview-showcase-card-image">
                    {image ? <img src={image} alt="" /> : <div className="preview-image-placeholder" />}
                    {isTravelShowcase ? <div className="preview-showcase-card-overlay" /> : null}
                    {icon ? (
                      <img src={icon} alt="" className="preview-showcase-card-badge" />
                    ) : isTravelShowcase ? (
                      <span className="preview-showcase-card-badge-icon">{iconGlyph}</span>
                    ) : null}
                    <div className="preview-showcase-card-label">{label}</div>
                  </div>
                </div>
              );
            }
            return (
              <div key={`preview-showcase-circle-${index}-${itemIndex}`} className="preview-showcase-circle-item">
                <div className="preview-showcase-circle-image">
                  {image ? <img src={image} alt="" /> : <div className="preview-image-placeholder" />}
                  {variant === 'circle_icon' && icon ? (
                    <img src={icon} alt="" className="preview-showcase-icon-badge" />
                  ) : null}
                </div>
                <div className="preview-showcase-circle-label">{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (blockType === 'promo_hero_banner') {
    const hero = items[0] || {};
    const image = getPreviewImage(hero);
    const normalizedPreset = resolvePreviewThemeKey(stylePreset, 'electronics');
    const isBeautyPreset = normalizedPreset === 'beauty';
    const isGroceryPreset = normalizedPreset === 'grocery';
    const isFashionPreset = normalizedPreset === 'fashion';
    const isDecorPreset = normalizedPreset === 'decor';
    const isKidsPreset = normalizedPreset === 'kids';
    const isSportsPreset = normalizedPreset === 'sports';
    const isTravelPreset = normalizedPreset === 'travel';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        <div
          className={`preview-promo-hero ${
            isSportsPreset
              ? 'is-sports'
              : isTravelPreset
                ? 'is-travel'
              : isKidsPreset
                ? 'is-kids'
                : isDecorPreset
                  ? 'is-decor'
                  : isFashionPreset
                    ? 'is-fashion'
                    : isBeautyPreset
                      ? 'is-beauty'
                      : isGroceryPreset
                        ? 'is-grocery'
                        : 'is-electronics'
          } ${
            section?.placement === 'header' ? 'is-header-attached' : ''
          }`}
        >
          {image ? <img src={image} alt="" /> : <div className="preview-banner-placeholder" />}
          <div className="preview-promo-hero-overlay">
            {hero?.badgeText ? <span className="preview-promo-hero-badge">{hero.badgeText}</span> : null}
            <div className="preview-promo-hero-title">{hero?.title || 'Upgrade your tech stack'}</div>
            {hero?.subtitle ? <div className="preview-promo-hero-subtitle">{hero.subtitle}</div> : null}
            {hero?.ctaText ? <span className="preview-promo-hero-cta">{hero.ctaText}</span> : null}
          </div>
        </div>
      </div>
    );
  }

  if (blockType === 'split_promo_row') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        <div className="preview-split-promo-row">
          {items.slice(0, 2).map((item, itemIndex) => (
            <div
              key={`preview-split-promo-${index}-${itemIndex}`}
              className={`preview-split-promo-card ${itemIndex === 0 ? 'is-primary' : 'is-secondary'}`}
              style={item?.accentColor ? { background: `linear-gradient(135deg, ${item.accentColor}, #f8fce8)` } : undefined}
            >
              <div className="preview-split-promo-copy">
                <div className="preview-split-promo-title">{item?.title || (itemIndex === 0 ? 'Top Deals' : 'Snack Time')}</div>
                {item?.subtitle ? <div className="preview-split-promo-subtitle">{item.subtitle}</div> : null}
                {item?.ctaText ? <span className="preview-split-promo-cta">{item.ctaText}</span> : null}
              </div>
              <div className="preview-split-promo-visual">
                {item?.badgeText ? <div className="preview-split-promo-badge">{item.badgeText}</div> : null}
                <div className="preview-split-promo-image">
                  {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'beauty_hero_banner') {
    const hero = items[0] || {};
    const image = getPreviewImage(hero);
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        <div className="preview-beauty-hero">
          {image ? <img src={image} alt="" /> : <div className="preview-banner-placeholder" />}
          <div className="preview-beauty-hero-overlay">
            {hero?.badgeText ? <span className="preview-beauty-hero-badge">{hero.badgeText}</span> : null}
            <div className="preview-beauty-hero-title">{hero?.title || 'Beauty spotlight'}</div>
            {hero?.subtitle ? <div className="preview-beauty-hero-subtitle">{hero.subtitle}</div> : null}
            {hero?.ctaText ? <span className="preview-beauty-hero-cta">{hero.ctaText}</span> : null}
          </div>
        </div>
      </div>
    );
  }

  if (blockType === 'product_card_carousel') {
    const normalizedPreset = String(stylePreset || '').trim().toLowerCase();
    const isBeautyPreset = normalizedPreset === 'beauty';
    const isGroceryPreset = normalizedPreset === 'grocery';
    const previewActionMode = String(section?.actionMode || 'AUTO').trim().toUpperCase();
    const resolvePreviewCtaLabel = (item) => {
      if (item?.ctaText) return item.ctaText;
      if (previewActionMode === 'CALL') return 'Call';
      if (previewActionMode === 'WHATSAPP') return 'WhatsApp';
      if (previewActionMode === 'INQUIRY') return 'Inquiry';
      if (previewActionMode === 'VIEW') return 'View';
      if (previewActionMode === 'NONE') return '';
      if (previewActionMode === 'AUTO') return isGroceryPreset ? 'ADD' : 'View';
      return previewActionMode === 'ADD' ? 'ADD' : 'View';
    };
    const showActionButton = previewActionMode !== 'NONE';
    const showAddPlus = (label) => {
      const normalizedLabel = String(label || '').trim().toUpperCase();
      return normalizedLabel === 'ADD';
    };
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div
            className={`preview-title preview-title-with-action ${
              isBeautyPreset ? '' : 'preview-title-surface-pill'
            }`}
          >
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        {isBeautyPreset ? (
          <div className="preview-beauty-products">
            {items.map((item, itemIndex) => (
              <div key={`preview-product-card-${index}-${itemIndex}`} className="preview-beauty-product-card">
                <div className="preview-beauty-product-image">
                  {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                </div>
                <div className="preview-beauty-product-title">{item?.title || `Product ${itemIndex + 1}`}</div>
                {item?.subtitle ? <div className="preview-beauty-product-subtitle">{item.subtitle}</div> : null}
                {item?.price || showActionButton ? (
                  <div className="preview-beauty-product-footer">
                    {item?.price ? <div className="preview-beauty-product-price">{item.price}</div> : <span />}
                    {showActionButton ? (
                      <div className="preview-beauty-product-cta">{resolvePreviewCtaLabel(item)}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className={`preview-deal-carousel ${isGroceryPreset ? 'is-grocery' : ''}`}>
            {items.map((item, itemIndex) => (
              <div key={`preview-product-card-${index}-${itemIndex}`} className="preview-deal-card">
                <div className="preview-deal-card-image">
                  {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                  {item?.badgeText ? <span className="preview-deal-card-badge">{item.badgeText}</span> : null}
                </div>
                <div className="preview-deal-card-title">{item?.title || `Product ${itemIndex + 1}`}</div>
                {item?.subtitle ? <div className="preview-deal-card-subtitle">{item.subtitle}</div> : null}
                {item?.businessName ? <div className="preview-deal-card-business">{item.businessName}</div> : null}
                {isGroceryPreset && item?.rating ? (
                  <div className="preview-deal-card-meta">
                    <span className="preview-deal-card-rating">★ {item.rating}</span>
                  </div>
                ) : null}
                {isGroceryPreset ? (
                  <div className="preview-deal-card-footer">
                    {item?.price ? <div className="preview-deal-card-price">{item.price}</div> : null}
                    {showActionButton ? (
                      <div className="preview-deal-card-cta">
                        {showAddPlus(resolvePreviewCtaLabel(item)) ? (
                          <span className="preview-deal-card-cta-plus">+</span>
                        ) : null}
                        <span>{resolvePreviewCtaLabel(item)}</span>
                      </div>
                    ) : null}
                  </div>
                ) : item?.price ? (
                  <div className="preview-deal-card-footer">
                    <div className="preview-deal-card-price">{item.price}</div>
                    {showActionButton ? (
                      <div className="preview-deal-card-cta">
                        {showAddPlus(resolvePreviewCtaLabel(item)) ? (
                          <span className="preview-deal-card-cta-plus">+</span>
                        ) : null}
                        <span>{resolvePreviewCtaLabel(item)}</span>
                      </div>
                    ) : null}
                  </div>
                ) : showActionButton ? (
                  <div className="preview-deal-card-footer">
                    <span />
                    <div className="preview-deal-card-cta">
                      {showAddPlus(resolvePreviewCtaLabel(item)) ? (
                        <span className="preview-deal-card-cta-plus">+</span>
                      ) : null}
                      <span>{resolvePreviewCtaLabel(item)}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (blockType === 'media_overlay_carousel') {
    const normalizedPreset = resolvePreviewThemeKey(stylePreset);
    const isBeautyPreset = normalizedPreset === 'beauty';
    const isStacked = String(section?.cardVariant || '').trim().toLowerCase() === 'stacked';
    const themeClass = normalizedPreset ? `is-${normalizedPreset}` : '';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={buildPreviewTitleClass({ themeKey: normalizedPreset, surface: !isBeautyPreset })}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        {isBeautyPreset ? (
          <div className="preview-beauty-trends">
            {items.map((item, itemIndex) => (
              <div key={`preview-media-overlay-${index}-${itemIndex}`} className="preview-beauty-trend-card">
                {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                <div className="preview-beauty-trend-overlay">
                  <div className="preview-beauty-trend-title">{item?.title || `Trend ${itemIndex + 1}`}</div>
                  {item?.subtitle ? <div className="preview-beauty-trend-subtitle">{item.subtitle}</div> : null}
                </div>
              </div>
            ))}
          </div>
        ) : isStacked ? (
          <div className={`preview-media-overlay-stack ${themeClass}`}>
            {items.map((item, itemIndex) => (
              <div key={`preview-media-overlay-${index}-${itemIndex}`} className={`preview-media-overlay-card is-stacked ${themeClass}`}>
                {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                <div className={`preview-media-overlay-gradient ${themeClass}`} />
                <div className="preview-media-overlay-copy">
                  {item?.badgeText ? <div className="preview-media-overlay-badge">{item.badgeText}</div> : null}
                  <div className="preview-media-overlay-title">{item?.title || `Card ${itemIndex + 1}`}</div>
                  {item?.subtitle ? <div className="preview-media-overlay-subtitle">{item.subtitle}</div> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`preview-media-overlay-row ${themeClass}`}>
            {items.map((item, itemIndex) => (
              <div key={`preview-media-overlay-${index}-${itemIndex}`} className={`preview-media-overlay-card ${themeClass}`}>
                {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                <div className={`preview-media-overlay-gradient ${themeClass}`} />
                <div className="preview-media-overlay-copy">
                  <div className="preview-media-overlay-title">{item?.title || `Card ${itemIndex + 1}`}</div>
                  {item?.subtitle ? <div className="preview-media-overlay-subtitle">{item.subtitle}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (blockType === 'quick_action_row') {
    return renderQuickActionPreview({
      section,
      index,
      hidden,
      title,
      items,
      preset: section?.quickActionPreset || 'electronics',
    });
  }

  if (blockType === 'beauty_trend_carousel') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-beauty-trends">
          {items.map((item, itemIndex) => (
            <div key={`preview-beauty-trend-${index}-${itemIndex}`} className="preview-beauty-trend-card">
              {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
              <div className="preview-beauty-trend-overlay">
                <div className="preview-beauty-trend-title">{item?.title || `Trend ${itemIndex + 1}`}</div>
                {item?.subtitle ? <div className="preview-beauty-trend-subtitle">{item.subtitle}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'beauty_routine_list') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-beauty-routine">
          {items.map((item, itemIndex) => (
            <div key={`preview-beauty-routine-${index}-${itemIndex}`} className="preview-beauty-routine-item">
              <div className="preview-beauty-routine-icon">{item?.iconName || 'icon'}</div>
              <div className="preview-beauty-routine-text">
                <div className="preview-beauty-routine-title">{item?.title || `Step ${itemIndex + 1}`}</div>
                {item?.subtitle ? <div className="preview-beauty-routine-subtitle">{item.subtitle}</div> : null}
              </div>
              <span className="preview-icon-list-chevron">&#8250;</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'beauty_tip_chips') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-beauty-tip-chips">
          {items.map((item, itemIndex) => (
            <span key={`preview-beauty-tip-${index}-${itemIndex}`} className="preview-beauty-tip-chip">
              {item?.text || item?.title || `Tip ${itemIndex + 1}`}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'beauty_salon_carousel') {
    const normalizedPreset = String(section?.stylePreset || '').trim().toLowerCase();
    const previewPreset =
      normalizedPreset === 'grocery' || normalizedPreset === 'electronics' || normalizedPreset === 'fashion'
        ? normalizedPreset
        : 'beauty';
    const isGroceryPreset = previewPreset === 'grocery';
    const actionMode = String(section?.actionMode || 'CALL_WHATSAPP').trim().toUpperCase();
    const actionSet =
      actionMode === 'CALL_INQUIRY'
        ? [
            { glyph: 'C', label: 'Call', modifier: 'call' },
            { glyph: 'I', label: 'Inquiry', modifier: 'inquiry' },
          ]
        : actionMode === 'WHATSAPP_INQUIRY'
          ? [
              { glyph: 'W', label: 'WhatsApp', modifier: 'whatsapp' },
              { glyph: 'I', label: 'Inquiry', modifier: 'inquiry' },
            ]
          : [
              { glyph: 'C', label: 'Call', modifier: 'call' },
              { glyph: 'W', label: 'WhatsApp', modifier: 'whatsapp' },
            ];
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={`preview-title preview-title-with-action ${isGroceryPreset ? '' : ''}`}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className={`preview-beauty-salons is-${previewPreset}`}>
          {items.map((item, itemIndex) => (
            <div key={`preview-beauty-salon-${index}-${itemIndex}`} className="preview-beauty-salon-card">
              <div className="preview-beauty-salon-image">
                {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
              </div>
              <div className="preview-beauty-salon-title">{item?.title || `${isGroceryPreset ? 'Store' : 'Salon'} ${itemIndex + 1}`}</div>
              {item?.subtitle ? <div className="preview-beauty-salon-subtitle">{item.subtitle}</div> : null}
              <div className="preview-beauty-salon-meta">
                <span>{item?.rating || '4.8'}</span>
                <span>{item?.distance || (isGroceryPreset ? '20-30 min' : '2.4 km')}</span>
              </div>
              <div className="preview-beauty-salon-actions">
                {actionSet.map((action) => (
                  <div
                    key={`${action.modifier}-${itemIndex}`}
                    className={`preview-beauty-salon-action preview-beauty-salon-action-${action.modifier}`}
                  >
                    <span className="preview-beauty-salon-action-glyph">{action.glyph}</span>
                    <span>{action.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'shop_card_carousel') {
    const normalizedPreset = resolvePreviewThemeKey(stylePreset);
    const themeClass = normalizedPreset ? `is-${normalizedPreset}` : '';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={buildPreviewTitleClass({ themeKey: normalizedPreset, surface: true })}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className={`preview-shop-card-row ${themeClass}`}>
          {items.map((item, itemIndex) => (
            <div key={`preview-shop-card-${index}-${itemIndex}`} className={`preview-shop-card ${themeClass}`}>
              <div className="preview-shop-card-image">
                {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
              </div>
              <div className="preview-shop-card-title">{item?.title || `Place ${itemIndex + 1}`}</div>
              {item?.subtitle ? <div className="preview-shop-card-subtitle">{item.subtitle}</div> : null}
              <div className="preview-shop-card-meta">
                <span>{item?.rating || '4.8'}</span>
                <span>{item?.distance || '2.4 km'}</span>
              </div>
              <div className="preview-shop-card-actions">
                <span className="preview-shop-card-pill">View</span>
                <span className="preview-shop-card-pill">Call</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'product_shelf_horizontal') {
    const normalizedPreset = resolvePreviewThemeKey(stylePreset);
    const themeClass = normalizedPreset ? `is-${normalizedPreset}` : '';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={buildPreviewTitleClass({ themeKey: normalizedPreset, surface: true })}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className={`preview-shelf-row ${themeClass}`}>
          {items.map((item, itemIndex) => (
            <div key={`preview-shelf-${index}-${itemIndex}`} className={`preview-shelf-card ${themeClass}`}>
              <div className="preview-shelf-image">
                {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
              </div>
              <div className="preview-shelf-title">{item?.title || `Product ${itemIndex + 1}`}</div>
              {item?.subtitle ? <div className="preview-shelf-subtitle">{item.subtitle}</div> : null}
              <div className="preview-shelf-footer">
                <span className="preview-shelf-price">{item?.priceLine || item?.price || 'Rs 999'}</span>
                {item?.rating ? <span className="preview-shelf-rating">★ {item.rating}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'sports_live_matches_fixed') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={buildPreviewTitleClass({ themeKey: 'sports', surface: true })}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-sports-match-list">
          {items.map((item, itemIndex) => (
            <div key={`preview-sports-match-${index}-${itemIndex}`} className="preview-sports-match-card">
              <div className="preview-sports-match-copy">
                <div className="preview-sports-match-league">{item?.league || 'League'}</div>
                <div className="preview-sports-match-teams">
                  {(item?.home || 'Home')} vs {(item?.away || 'Away')}
                </div>
                {item?.time ? <div className="preview-sports-match-time">{item.time}</div> : null}
              </div>
              <div className="preview-sports-match-score">
                <div className="preview-sports-match-score-line">{item?.score || '-'}</div>
                <span className={`preview-sports-match-status ${String(item?.status || '').trim().toLowerCase() === 'live' ? 'is-live' : ''}`}>
                  {item?.status || 'Scheduled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'travel_flight_deals_fixed') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={buildPreviewTitleClass({ themeKey: 'travel', surface: true })}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-travel-flight-list">
          {items.map((item, itemIndex) => (
            <div key={`preview-travel-flight-${index}-${itemIndex}`} className="preview-travel-flight-card">
              <div className="preview-travel-flight-header">
                <div className="preview-travel-flight-icon">Air</div>
                <div className="preview-travel-flight-copy">
                  <div className="preview-travel-flight-route">{item?.route || item?.title || 'Route'}</div>
                  <div className="preview-travel-flight-meta">
                    {item?.date || item?.subtitle || 'Date'}
                    {(item?.date || item?.subtitle) && (item?.type || item?.badgeText) ? ' | ' : ''}
                    {item?.type || item?.badgeText || ''}
                  </div>
                </div>
              </div>
              <div className="preview-travel-flight-footer">
                <div className="preview-travel-flight-airline">{item?.airline || item?.label || 'Airline'}</div>
                <div className="preview-travel-flight-price">{item?.price || item?.priceLine || 'Rs 3,999'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'travel_bookings_fixed') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={buildPreviewTitleClass({ themeKey: 'travel', surface: true })}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-travel-booking-list">
          {items.map((item, itemIndex) => {
            const status = String(item?.status || item?.badgeText || 'Pending').trim().toLowerCase();
            return (
              <div key={`preview-travel-booking-${index}-${itemIndex}`} className="preview-travel-booking-card">
                <div className="preview-travel-booking-copy">
                  <div className="preview-travel-booking-title">{item?.title || `Booking ${itemIndex + 1}`}</div>
                  <div className="preview-travel-booking-meta">
                    {item?.meta || item?.subtitle || 'Hotel + flight'}
                    {(item?.meta || item?.subtitle) && (item?.date || item?.text) ? ' | ' : ''}
                    {item?.date || item?.text || ''}
                  </div>
                </div>
                <span className={`preview-travel-booking-status ${status === 'confirmed' ? 'is-confirmed' : 'is-pending'}`}>
                  {item?.status || item?.badgeText || 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (blockType === 'brand_logo_grid') {
    const normalizedPreset = resolvePreviewThemeKey(stylePreset);
    if (normalizedPreset === 'kids') {
      return (
        <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
          {title ? <div className={buildPreviewTitleClass({ themeKey: 'kids', surface: true })}><span>{title}</span></div> : null}
          <div className="preview-kids-brand-row">
            {items.map((item, itemIndex) => (
              <div key={`preview-kids-brand-${index}-${itemIndex}`} className="preview-kids-brand-card">
                <div className="preview-kids-brand-logo">
                  {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                </div>
                <div className="preview-kids-brand-title">{getPreviewTitle(item)}</div>
                {item?.subtitle ? <div className="preview-kids-brand-subtitle">{item.subtitle}</div> : null}
              </div>
            ))}
          </div>
        </div>
      );
    }
    const hero = items.find((item) => item?.kind === 'hero') || items[0] || null;
    const cta = items.find((item) => item?.kind === 'cta') || items[items.length - 1] || null;
    let tiles = items.filter((item) => item?.kind !== 'hero' && item?.kind !== 'cta');
    if (!tiles.length) {
      tiles = items.slice(1, 5);
    }
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? <div className="preview-title">{title}</div> : null}
        <div className="preview-phase-one-brand-wrap">
          {hero ? (
            <div className="preview-phase-one-brand-hero">
              {getPreviewImage(hero) ? <img src={getPreviewImage(hero)} alt="" /> : <div className="preview-banner-placeholder" />}
            </div>
          ) : null}
          <div className="preview-phase-one-brand-grid">
            {tiles.slice(0, 4).map((item, itemIndex) => (
              <div key={`preview-brand-grid-${index}-${itemIndex}`} className="preview-phase-one-brand-card">
                <div className="preview-phase-one-brand-title">{getPreviewTitle(item)}</div>
                <div className="preview-phase-one-brand-image">
                  {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                </div>
              </div>
            ))}
          </div>
          {cta ? (
            <div className="preview-phase-one-brand-cta">
              {getPreviewImage(cta) ? <img src={getPreviewImage(cta)} alt="" /> : <div className="preview-banner-placeholder" />}
            </div>
          ) : null}
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
    const theme = resolvePreviewBentoTheme(stylePreset, pageThemePreset, section?.sectionBgColor);
    const headerImage = section?.headerImage || getPreviewImage(items[0]);
    const hero = section?.hero && typeof section.hero === 'object' ? section.hero : {};
    const heroImage = hero?.imageUrl || getPreviewImage(items[1]);
    const heroBadge = hero?.badgeText || hero?.badge || hero?.priceTag || '';
    const heroLabel = hero?.label || hero?.title || '';
    const tiles = getPreviewBentoTiles(section, collections, mainCategories, productCollections);
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? <div className="preview-title">{title}</div> : null}
        <div
          className="preview-bento"
          style={{
            backgroundColor: theme.background,
            '--preview-bento-surface': theme.surface,
            '--preview-bento-tile': theme.tile,
            '--preview-bento-border': theme.border,
            '--preview-bento-placeholder': theme.placeholder,
            '--preview-bento-label-bg': theme.labelBg,
            '--preview-bento-label-color': theme.labelText,
            '--preview-bento-badge-bg': theme.badgeBg,
            '--preview-bento-badge-color': theme.badgeText,
            '--preview-bento-hero-label-bg': theme.heroLabelBg,
            '--preview-bento-hero-label-color': theme.heroLabelText,
          }}
        >
          <div className="preview-bento-header">
            {headerImage ? <img src={headerImage} alt="" draggable={false} /> : <div className="preview-bento-placeholder" />}
          </div>
          <div className="preview-bento-grid">
            <div className="preview-bento-tiles">
              {tiles.map((tile, tileIndex) => (
                <div key={`preview-bento-${index}-${tileIndex}`} className="preview-bento-tile">
                  {tile.imageUrl ? <img src={tile.imageUrl} alt="" draggable={false} /> : <div className="preview-bento-placeholder" />}
                  <span className="preview-bento-label">
                    {tile.label || `Card ${tileIndex + 1}`}
                  </span>
                </div>
              ))}
            </div>
            {heroImage || heroLabel || heroBadge ? (
              <div className="preview-bento-hero">
                {heroImage ? <img src={heroImage} alt="" draggable={false} /> : <div className="preview-bento-placeholder" />}
                {heroBadge ? <span className="preview-bento-badge">{heroBadge}</span> : null}
                {heroLabel ? <span className="preview-bento-hero-label">{heroLabel}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (blockType === 'info_list') {
    const infoPreset = resolvePreviewThemeKey(stylePreset, 'launch_rows');
    const isLaunchRows = infoPreset === 'launch_rows';
    const isBeautyRoutine = infoPreset === 'beauty_routine';
    const isFashionRows = infoPreset === 'fashion';
    const isKidsRows = infoPreset === 'kids';
    const isSportsRows = infoPreset === 'sports';
    const isTravelRows = infoPreset === 'travel';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={buildPreviewTitleClass({ themeKey: infoPreset, surface: !(isBeautyRoutine || isFashionRows) })}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        {isBeautyRoutine ? (
          <div className="preview-beauty-routine">
            {items.map((item, itemIndex) => (
              <div key={`preview-info-list-${index}-${itemIndex}`} className="preview-beauty-routine-item">
                <div className="preview-beauty-routine-icon">{item?.iconName || 'icon'}</div>
                <div className="preview-beauty-routine-text">
                  <div className="preview-beauty-routine-title">{item?.title || `Step ${itemIndex + 1}`}</div>
                  {item?.subtitle ? <div className="preview-beauty-routine-subtitle">{item.subtitle}</div> : null}
                </div>
                <span className="preview-icon-list-chevron">&#8250;</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={`preview-info-list ${isLaunchRows ? 'is-launch-rows' : isFashionRows ? 'is-fashion' : isKidsRows ? 'is-kids' : isSportsRows ? 'is-sports' : isTravelRows ? 'is-travel' : 'is-support-rows'}`}>
            {items.map((item, itemIndex) => (
              <div key={`preview-info-list-${index}-${itemIndex}`} className="preview-info-list-item">
                <div className="preview-info-list-icon">
                  {item.iconUrl ? <img src={item.iconUrl} alt="" /> : <span>{item?.iconName || 'icon'}</span>}
                </div>
                <div className="preview-info-list-text">
                  <div className="preview-info-list-title">{item?.title || `Item ${itemIndex + 1}`}</div>
                  {item?.subtitle ? <div className="preview-info-list-subtitle">{item.subtitle}</div> : null}
                </div>
                {isLaunchRows ? (
                  <span className="preview-info-list-price">{item?.price || 'Price'}</span>
                ) : (
                  <span className="preview-info-list-chevron">&#8250;</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (blockType === 'icon_list') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-icon-list">
          {items.map((item, itemIndex) => (
            <div key={`preview-icon-list-${index}-${itemIndex}`} className="preview-icon-list-item">
              <div className="preview-icon-list-icon">
                {item.iconUrl ? <img src={item.iconUrl} alt="" /> : <div className="preview-image-placeholder" />}
              </div>
              <div className="preview-icon-list-text">
                <div className="preview-icon-list-title">{item.title || `Item ${itemIndex + 1}`}</div>
                {item.subtitle ? <div className="preview-icon-list-subtitle">{item.subtitle}</div> : null}
              </div>
              <span className="preview-icon-list-chevron">&#8250;</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'chip_scroll') {
    const normalizedPreset = resolvePreviewThemeKey(stylePreset);
    const isBeautyChips = normalizedPreset === 'beauty';
    const isGroceryChips = normalizedPreset === 'grocery';
    const isTravelChips = normalizedPreset === 'travel';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className={buildPreviewTitleClass({ themeKey: normalizedPreset, surface: !isBeautyChips })}>
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        {isBeautyChips ? (
          <div className="preview-beauty-tip-chips">
            {items.map((item, itemIndex) => (
              <span key={`preview-chip-${index}-${itemIndex}`} className="preview-beauty-tip-chip">
                {item.text || item.title || `Chip ${itemIndex + 1}`}
              </span>
            ))}
          </div>
        ) : (
          <div className={`preview-chip-scroll ${isGroceryChips ? 'is-grocery' : isTravelChips ? 'is-travel' : ''}`}>
            {items.map((item, itemIndex) => (
              <span
                key={`preview-chip-${index}-${itemIndex}`}
                className={`preview-chip ${isGroceryChips ? 'is-grocery' : isTravelChips ? 'is-travel' : ''}`}
              >
                {item.text || item.title || `Chip ${itemIndex + 1}`}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (blockType === 'multiItemGrid' || type === 'grid' || type === 'twoColumn' || type === 'heroGrid') {
    const columns = type === 'twoColumn' ? 2 : section?.columns || (type === 'heroGrid' ? 3 : 2);
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-grid" style={{ '--cols': columns }}>
          {items.map((item, itemIndex) => renderCard(item, itemIndex))}
        </div>
      </div>
    );
  }

  return (
    <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
      {title ? (
        <div className="preview-title preview-title-with-action">
          <span>{title}</span>
          {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
        </div>
      ) : null}
      <div className="preview-row">{items.map((item, itemIndex) => renderCard(item, itemIndex))}</div>
    </div>
  );
};
