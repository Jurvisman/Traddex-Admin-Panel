// Schema-driven properties for item-list blocks that are actually addable from the current
// 33-item CMS toolbox (see ITEM_LIST_BLOCK_MIGRATION_CHECKLIST.md at repo root for the full
// reasoning). Migrated ONE block at a time — a block only gets an entry here once it's been
// fully moved off the old shared JSX in AppConfigPage.js and verified live.
//
// NOTE: chip_scroll was migrated here on 2026-08-25 then REVERTED the same day — it turned out
// not to be in the current toolbox at all (removed earlier this session as "Filter Chips" during
// legacy cleanup), so no admin can add a new one; only old already-published pages still have it.
// Not worth spending migration effort on until/unless it's ever re-added to the toolbox. Picking
// a migration target now means checking it's actually in screenToolboxItems first.
//
// Schema shape: { label, maxItems?, itemLabel?: (idx) => string, itemFields: [...] }
// itemFields shape: { name, label, type, placeholder?, showIf?: (sectionForm) => boolean }
// label/placeholder/default may be a plain value or a function of (idx) for per-item variation.
// Supported itemFields types: 'text', 'color', 'image', 'destination-picker', 'deep-link'
export const ITEM_LIST_BLOCK_SCHEMAS = {
  split_promo_row: {
    label: 'Cards',
    maxItems: 2,
    itemLabel: (idx) => (idx === 0 ? 'Left card' : 'Right card'),
    itemFields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Item title' },
      {
        name: 'subtitle',
        label: 'Subtitle',
        type: 'text',
        placeholder: (idx) => (idx === 0 ? 'Fresh | Organic | Daily' : 'Up to 30% OFF'),
      },
      {
        name: 'badgeText',
        label: (idx) => (idx === 0 ? 'Eyebrow label (optional)' : 'Badge text'),
        type: 'text',
        placeholder: (idx) => (idx === 0 ? 'Top Deals' : 'Snack Time'),
      },
      { name: 'ctaText', label: 'CTA button text', type: 'text', placeholder: 'Shop now' },
      {
        name: 'accentColor',
        label: 'Accent color (optional)',
        type: 'color',
        default: (idx) => (idx === 0 ? '#F0F9D8' : '#D8F3AA'),
      },
      { name: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'https://cdn.example.com/item.jpg' },
      { name: 'destination', label: 'Destination', type: 'destination-picker' },
    ],
  },
  promo_hero_banner: {
    label: 'Hero',
    feedActiveHelpText:
      'Promo hero is coming from the selected data source feed. Switch to Hybrid or Manual to edit hero content directly.',
    itemFields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Item title' },
      { name: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'Phones, laptops, and smart gear with fast delivery' },
      { name: 'badgeText', label: 'Badge text', type: 'text', placeholder: 'Electronics Week' },
      { name: 'ctaText', label: 'CTA button text', type: 'text', placeholder: 'Shop now' },
      { name: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'https://cdn.example.com/item.jpg' },
      { name: 'destination', label: 'CTA destination', type: 'destination-picker' },
    ],
  },
  hero_carousel: {
    label: 'Slides',
    feedActiveHelpText:
      'Hero slides are coming from the selected data source feed. Switch to Manual to edit slide images and destinations directly.',
    itemFields: [
      { name: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'https://cdn.example.com/item.jpg' },
      { name: 'destination', label: 'Destination', type: 'destination-picker' },
    ],
  },
  // Always auto-loaded from the category master — admins never enter items manually for
  // these two, so there are no itemFields at all; the feed message is shown unconditionally
  // (see the `isDataSourceFeedActive` wiring for these two blockTypes in AppConfigPage.js).
  category_icon_grid: {
    label: 'Categories',
    feedActiveHelpText: 'Category images are loaded automatically from the category master.',
    itemFields: [],
  },
  category_showcase: {
    label: 'Categories',
    feedActiveHelpText: 'Category images are loaded automatically from the category master.',
    itemFields: [],
  },
  horizontal_scroll_list: {
    label: 'Cards',
    itemFields: [
      { name: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'https://cdn.example.com/item.jpg' },
      { name: 'destination', label: 'Destination', type: 'destination-picker' },
      { name: 'badgeText', label: 'Badge text', type: 'text', placeholder: 'Festive finds' },
      { name: 'subtitle', label: 'Bottom label', type: 'text', placeholder: 'For you' },
    ],
  },
  // No feed/manual toggle exists for this block (unlike shop_card_carousel) — the "Service Feed"
  // panel and manual items both coexist and aren't gated behind isDataSourceFeedActive, so this
  // is a plain always-editable item list.
  service_card_carousel: {
    label: 'Services',
    itemFields: [
      { name: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'https://cdn.example.com/item.jpg' },
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Item title' },
      { name: 'deepLink', label: 'Deep link', type: 'deep-link' },
    ],
  },
  // Even in SHOP_FEED mode, items stay visible/editable as fallback cards shown while the live
  // feed loads (unlike promo_hero_banner/hero_carousel which fully hide items on feed) — so this
  // is intentionally NOT gated behind isDataSourceFeedActive. Old behavior only disabled the
  // "+ Add item" button in feed mode; that nuance isn't modeled here, so Add stays enabled always.
  shop_card_carousel: {
    label: 'Shops',
    itemFields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Item title' },
      { name: 'rating', label: 'Rating', type: 'text', placeholder: '4.8' },
      { name: 'distance', label: 'Distance', type: 'text', placeholder: '2.4 km' },
      { name: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'https://cdn.example.com/item.jpg' },
      { name: 'deepLink', label: 'Deep link', type: 'deep-link' },
    ],
  },
};
