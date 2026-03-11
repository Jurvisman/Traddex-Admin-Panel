## CMS config blueprint for `home_electronics`

Use this as a guide in the App Config (CMS) UI to recreate the Electronics home layout using **existing SDUI blocks** instead of bespoke components.

### Page identity

- **Page ID**: `home_electronics`
- **Route**: `/home/electronics`

These must match the props used in the app:

- `ConfiguredHeader` in `ElectronicsHome.tsx` uses `pageId="home_electronics"`, `pageRoute="/home/electronics"`.
- `HeaderHeroSections` and `DynamicHomeSections` are also called with the same values.

### Recommended section list (top to bottom)

1. **Hero promo**
   - `blockType`: `hero_carousel`
   - `title`: (optional) empty or “Highlights”
   - `items`: single item matching the current hero:
     - `title`: `Upgrade your tech stack`
     - `subtitle`: `Phones, laptops, and smart gear with fast delivery`
     - `badge`: `Electronics Week`
     - `imageUrl`: same hero URL from `ElectronicsHome.tsx`
     - `ctaLabel`: `Shop now`
     - `deepLink`: deep link to the main electronics category.

2. **Quick actions**
   - If/when a `quick_action_row` SDUI block is available:\n+    - `blockType`: `quick_action_row`\n+    - `title`: `Quick actions`\n+    - `items`: one per action (trade-in, repair, track order, etc.), each with `title`, `subtitle`, `icon`, `ctaLabel`, `deepLink`.\n+   - Until then, you can skip this or model it as a `horizontal_scroll_list` with similar items.\n+\n+3. **Shop categories**\n+   - `blockType`: `category_showcase`\n+   - `title`: `Shop categories`\n+   - `dataSource`:\n+     - `sourceType`: `CATEGORY_FEED`\n+     - `industryId`: set to the Electronics industry id (the same you use for Beauty/Grocery category feeds).\n+     - `limit`: e.g. `8`.\n+   - `showcaseVariant`: `circle_icon` for circular cards with icon badge.\n+\n+4. **Hot deals**\n+   - `blockType`: `product_shelf_horizontal`\n+   - `title`: `Hot deals`\n+   - `dataSource`:\n+     - `sourceType`: `PRODUCT_FEED` (or equivalent in your backend).\n+     - Either `collectionId` for an \"electronics_hot_deals\" collection, or a direct `url` pointing to a deals endpoint.\n+     - `limit`: e.g. `10`.\n+\n+5. **Brand stores**\n+   - `blockType`: `brand_logo_grid`\n+   - `title`: `Brand stores`\n+   - Either:\n+     - Configure `items` manually with `id`, `title`, `imageUrl` for each brand zone (Smart Home, Gaming Zone, Audio Lab, Creator Desk), OR\n+     - Use a `dataSource` that returns brand logo items in the same shape.\n+\n+6. **New launches**\n+   - `blockType`: `product_shelf_horizontal`\n+   - `title`: `New launches`\n+   - `dataSource`:\n+     - `sourceType`: `PRODUCT_FEED`\n+     - `collectionId`: e.g. `electronics_new_launches`.\n+     - `limit`: e.g. `10`.\n+\n+7. **Service & support**\n+   - `blockType`: `icon_list`\n+   - `title`: `Service & support`\n+   - `items`: four entries for warranty, support, returns, installation, each with:\n+     - `title`: e.g. `Warranty plans`\n+     - `subtitle`: e.g. `Extend coverage`\n+     - `icon`: the matching Ionicons name (e.g. `shield-checkmark-outline`).\n+\n+### Notes\n+\n+- You do **not** need any new block types to get a good first version of Electronics in CMS – everything above is covered by existing SDUI blocks.\n+- Once these sections are configured and published, `DynamicHomeSections` for `home_electronics` will render them when you navigate to a test route like `/industry/electronics` (after we wire that route explicitly).\n+- This file is just a blueprint; real data source identifiers (`industryId`, `collectionId`, URLs) should match your backend.\n+\n*** End Patch***"}}어요니다``` but patch syntax must not include trailing markers. Let's correct. We'll send proper ApplyPatch. Let's redo correctly. We'll ignore previous tool output. We'll send new ApplyPatch with proper body. Let's do. */}
