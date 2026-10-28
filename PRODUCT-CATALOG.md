# Product catalogue update — 28 October 2026

Owner-supplied prices, stored in paise. Coconut quantities refer to complete packs, not individual coconuts. Mini / medium / temple or kitchen packs contain 2 / 5 / 10 coconuts. The six pack products enforce the minimum two-piece purchase without changing historical orders. Oil is sold as separate 1 L and 1 kg products; flakes as 100 g packets.

Existing products are deactivated, not deleted. Existing stock on reruns is preserved. New stock starts at zero until the owner enters actual pack/bottle/packet counts in Admin > Products. Do not invent inventory. Run `node --env-file=.env --import tsx scripts/update-product-catalog.ts` to apply the catalogue to a configured database. The script replaces the active catalogue; run only when this replacement is intended.

## Image generation
Built-in image generation tool used. Final optimized assets are in `public/images/products/`:
- pooja-coconut.webp
- normal-coconut.webp
- coconut-oil.webp (shared by both sizes; illustrative packaging disclosed in descriptions)
- desiccated-coconut.webp
- roasted-coconut.webp

Prompt set: realistic premium ecommerce photography on warm ivory stone with softly blurred Kerala palm greenery, soft natural studio light, landscape 4:3, centered complete subjects with generous margins. Pooja coconut preserves the owner's brown fibrous whole coconut. Normal coconut uses one whole mature brown coconut and one cut half. Oil preserves the supplied bottle/brand appearance. Desiccated coconut isolates the black 100 g pouch; roasted coconut isolates the white 100 g pouch. Preserve supplied branding; no invented claims or decorative text. Product packaging may vary; oil photograph is illustrative and the product title controls the supplied size.

Checks: TypeScript passed; nine regression tests passed including seeded Tamil/Hindi content coverage. Supabase read-back confirmed all ten active options and prices. Three previous products deactivated; no order records changed.
