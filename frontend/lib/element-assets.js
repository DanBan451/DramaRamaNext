/** Paper-craft element illustrations (homepage / public/images/elements). */
export const ELEMENT_IMAGE_SRC = {
  earth: "/images/elements/earth.png",
  fire: "/images/elements/fire.png",
  air: "/images/elements/air.png",
  water: "/images/elements/water.png",
  change: "/images/elements/quintessential.png",
};

export function getElementImageSrc(elementId) {
  if (!elementId) return ELEMENT_IMAGE_SRC.change;
  return ELEMENT_IMAGE_SRC[elementId] || ELEMENT_IMAGE_SRC.change;
}
