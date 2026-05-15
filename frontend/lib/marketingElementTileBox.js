/**
 * Cool wash over tile imagery so it ties to the `#B8BCC2` section field.
 */
const MOSAIC_TILE_WASH =
  "after:pointer-events-none after:absolute after:inset-0 after:z-[1] after:bg-[#B8BCC2]/30 after:content-['']";

/**
 * Square image frame used by Forge element tiles and Ignite abstract tiles.
 * Keep in sync whenever element tile sizing changes.
 *
 * @param {"compact" | "desktop"} variant
 * @returns {string} Tailwind class string (no shadow — each section adds its own).
 */
export function marketingElementTileBoxClass(variant) {
  return variant === "compact"
    ? `relative aspect-square w-[min(100%,clamp(5.25rem,26vw,7.5rem))] min-w-0 max-w-full overflow-hidden rounded-sm bg-clarity/50 ${MOSAIC_TILE_WASH}`
    : `relative aspect-square h-[min(12.5rem,32vh)] w-[min(12.5rem,32vh)] min-w-0 max-w-full shrink-0 overflow-hidden rounded-sm bg-clarity/50 ${MOSAIC_TILE_WASH}`;
}

/**
 * Applied to Forge element mosaics and Ignite abstract mosaics so both panels
 * read as one family: imagery sits behind copy (requires `./lib` in Tailwind
 * `content` so these utilities are generated).
 */
export const marketingMosaicImageTreatmentClass =
  "z-0 object-cover object-center opacity-[0.88] saturate-[0.42] contrast-[0.96]";
