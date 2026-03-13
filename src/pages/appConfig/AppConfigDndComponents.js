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
  normalizeColumnTopLineStyle,
  parseAspectRatioValue,
  ensureBentoTiles,
} from './appConfigConstants';

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

const renderQuickActionPreview = ({ section, index, hidden, title, items, preset = 'electronics' }) => {
  const isBeauty = String(preset || '').trim().toLowerCase() === 'beauty';
  return (
    <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
      {title ? (
        <div className="preview-title preview-title-with-action">
          <span>{title}</span>
          {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
        </div>
      ) : null}
      <div className={`preview-quick-actions ${isBeauty ? 'is-beauty' : 'is-electronics'}`}>
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

export const PreviewSection = ({ section, index, collections }) => {
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
    const isBeautyPreset = String(stylePreset || '').trim().toLowerCase() === 'beauty';
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

  if (blockType === 'hero_carousel') {
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-phase-one-carousel">
          {items.map((item, itemIndex) => {
            const image = getPreviewImage(item);
            return (
              <div key={`preview-hero-carousel-${index}-${itemIndex}`} className="preview-phase-one-hero-card">
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
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-phase-one-category-grid">
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
    const isElectronicsShowcase = String(section?.stylePreset || '').trim().toLowerCase() === 'electronics';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div
          className={`preview-showcase-row preview-showcase-${variant} ${
            isElectronicsShowcase ? 'preview-showcase-theme-electronics' : ''
          }`}
        >
          {items.map((item, itemIndex) => {
            const image = getPreviewImage(item);
            const label = getPreviewTitle(item);
            const icon = item?.iconUrl || item?.mainCategoryIcon || '';
            if (variant === 'card') {
              return (
                <div key={`preview-showcase-card-${index}-${itemIndex}`} className="preview-showcase-card-item">
                  <div className="preview-showcase-card-image">
                    {image ? <img src={image} alt="" /> : <div className="preview-image-placeholder" />}
                    {icon ? <img src={icon} alt="" className="preview-showcase-card-badge" /> : null}
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
    const isBeautyPreset = String(stylePreset || '').trim().toLowerCase() === 'beauty';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        <div className={`preview-promo-hero ${isBeautyPreset ? 'is-beauty' : 'is-electronics'}`}>
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
    const isBeautyPreset = String(stylePreset || '').trim().toLowerCase() === 'beauty';
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
                {item?.price ? <div className="preview-beauty-product-price">{item.price}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="preview-deal-carousel">
            {items.map((item, itemIndex) => (
              <div key={`preview-product-card-${index}-${itemIndex}`} className="preview-deal-card">
                <div className="preview-deal-card-image">
                  {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                  {item?.badgeText ? <span className="preview-deal-card-badge">{item.badgeText}</span> : null}
                </div>
                <div className="preview-deal-card-title">{item?.title || `Product ${itemIndex + 1}`}</div>
                {item?.subtitle ? <div className="preview-deal-card-subtitle">{item.subtitle}</div> : null}
                {item?.price ? <div className="preview-deal-card-price">{item.price}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (blockType === 'media_overlay_carousel') {
    const isBeautyPreset = String(stylePreset || '').trim().toLowerCase() === 'beauty';
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
        ) : (
          <div className="preview-media-overlay-row">
            {items.map((item, itemIndex) => (
              <div key={`preview-media-overlay-${index}-${itemIndex}`} className="preview-media-overlay-card">
                {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
                <div className="preview-media-overlay-gradient" />
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
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
            <span>{title}</span>
            {section?.actionText ? <span className="preview-action-link">{section.actionText}</span> : null}
          </div>
        ) : null}
        <div className="preview-beauty-salons">
          {items.map((item, itemIndex) => (
            <div key={`preview-beauty-salon-${index}-${itemIndex}`} className="preview-beauty-salon-card">
              <div className="preview-beauty-salon-image">
                {getPreviewImage(item) ? <img src={getPreviewImage(item)} alt="" /> : <div className="preview-image-placeholder" />}
              </div>
              <div className="preview-beauty-salon-title">{item?.title || `Salon ${itemIndex + 1}`}</div>
              {item?.subtitle ? <div className="preview-beauty-salon-subtitle">{item.subtitle}</div> : null}
              <div className="preview-beauty-salon-meta">
                <span>{item?.rating || '4.8'}</span>
                <span>{item?.distance || '2.4 km'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (blockType === 'brand_logo_grid') {
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

  if (blockType === 'info_list') {
    const infoPreset = String(stylePreset || '').trim().toLowerCase();
    const isLaunchRows = infoPreset === 'launch_rows';
    const isBeautyRoutine = infoPreset === 'beauty_routine';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div
            className={`preview-title preview-title-with-action ${
              isBeautyRoutine ? '' : 'preview-title-surface-pill'
            }`}
          >
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
          <div className={`preview-info-list ${isLaunchRows ? 'is-launch-rows' : 'is-support-rows'}`}>
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
    const isBeautyChips = String(stylePreset || '').trim().toLowerCase() === 'beauty';
    return (
      <div key={`preview-${index}`} className={`preview-section ${hidden ? 'is-hidden' : ''}`}>
        {title ? (
          <div className="preview-title preview-title-with-action">
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
          <div className="preview-chip-scroll">
            {items.map((item, itemIndex) => (
              <span key={`preview-chip-${index}-${itemIndex}`} className="preview-chip">
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
