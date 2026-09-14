# Deck 52 emblem pipeline

The supplied black and white PNGs are preserved unchanged in public/assets/emblems/deck52. color.png is an AI-generated colored interpretation of the supplied design (gold, crimson, charcoal, ivory), not a pixel-exact recolor.

Creator: Emblem → Deck 52 white / black / gold-red. Existing deck52 recipes now use the supplied white emblem instead of a placeholder 52. The existing front, back, cape and shoe placements work with all three. Their colors are preserved independently of the costume trim color.

Runtime loads each selected design once, crops transparent padding, and fits it proportionally into a cached 256×256 canvas texture. No extra bones, physics, or geometry are added by choosing color. Source images stay full resolution. Export tools await image loading before writing previews.

Recommended use: white on dark uniforms; black on light uniforms; color for recruitment portraits, banners, vehicles and a large back patch. The full mark has small details: at tiny distances prefer a future separately approved simplified spade/chip symbol. Do not shrink the complete lettering onto every wrist and expect it to stay readable.

A 256×256 RGBA texture is about 256 KiB before mipmaps. Choosing one of three variants does not draw all three. Reuse cached textures across mercenaries. A separate decal can still cost a draw call; atlas/bake into clothing later if profiling identifies a need. No frame-rate claim has been benchmarked.

Validation: three variants load with visible alpha, retain selection and color-preservation rules in the live editor; no page errors. Production build passes.
