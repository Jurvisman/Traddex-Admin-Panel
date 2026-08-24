// Schema-driven properties for screen (non-header) blocks — same pattern as headerBlockSchemas.js.
// Only a block's genuinely UNIQUE fields belong here. Most screen blocks (title, image, visibility,
// the multi-item + destination-picker system) share a lot of JSX with many other block types and are
// deliberately left in AppConfigPage.js's hand-written form until that shared system itself gets a
// schema-driven pass — migrating just one block's slice of shared code here would risk breaking the
// other ~15 block types that reuse the same JSX.
import { AD_SLOT_TYPE_OPTIONS } from './appConfigConstants';

export const SCREEN_BLOCK_SCHEMAS = {
  ad_banner: {
    label: 'Ad Banner',
    fields: [
      {
        name: 'slotType',
        label: 'Ad slot',
        type: 'select',
        options: AD_SLOT_TYPE_OPTIONS,
        default: 'FULL_BANNER',
        helpText: 'Must match the published advertisement slot type.',
      },
    ],
  },
};

// Audience-targeting fields shown in the shared "Advanced" panel for any qualifying block
// (see AppConfigPage.js's `!isEditingFixed && !isPhaseOneBlock && !isMultiItemGrid` group) —
// not tied to one block type, so these live outside SCREEN_BLOCK_SCHEMAS.
//
// Only "Target user types" is exposed. The other 3 (roles, industries, subscription status)
// were removed from the UI at the user's request, 2026-08-25 — reasoning:
// - Target industries: every page is already scoped to one industry, so a per-block industry
//   filter is always redundant with the page it's placed on.
// - Target subscription statuses: every business has a mandatory subscription to use the
//   platform at all, so filtering by "active" is close to meaningless, and regular (non-business)
//   users have no subscription at all — the field doesn't map cleanly onto either user type.
// - Target roles: business-employee roles are custom per business, not used for this kind of
//   targeting in practice.
// The underlying `targeting.roles/industries/subscriptionStatuses` are still validated by the
// backend and still checked app-side (DynamicHomeSections.tsx / HomeSections.tsx /
// HeaderHeroSections.tsx) — removing the UI here doesn't require touching that, since with
// nothing writing to them they simply stay empty (a no-op filter).
export const TARGET_USER_TYPE_OPTIONS = [
  { value: 'USER', label: 'User (customer)' },
  { value: 'BUSINESS', label: 'Business (seller)' },
  { value: 'LOGISTIC', label: 'Logistic partner' },
  { value: 'INSURANCE', label: 'Insurance partner' },
];

export const TARGETING_FIELDS = [
  { name: 'targetUserTypes', label: 'Target user types', type: 'checkbox-list', span: true, options: TARGET_USER_TYPE_OPTIONS },
];
