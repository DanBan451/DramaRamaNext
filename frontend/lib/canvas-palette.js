/** Homepage-aligned palette for Forge / Ignite canvas workspaces. */

export const CANVAS = {
  ink: "#2A2A2A",
  inkMuted: "#666666",
  inkLight: "#888888",
  border: "#E5E5E5",
  borderMed: "#DDDDDD",
  borderDark: "#333333",
  bg: "#FFFFFF",
  bgSubtle: "#FAFAFA",
  bgHover: "#F5F5F5",
  cream: "#FAF8F5",
  connection: "#333333",
  connectionHover: "#2A2A2A",
  grid: "#EEEEEE",
  ctaPurple: "#9B5DE5",
  /** Matches Ignite guide AI chat bubble */
  terrainPillBg: "#FCF2F2",
  terrainPillBorder: "#EDD8D8",
  terrainPillText: "#2A2A2A",
};

const TERRAIN_PILL_CLASS =
  "border border-[#EDD8D8] bg-[#FCF2F2] text-[#2A2A2A]";

/** Fire Starter thoughts — matches Ignite guide AI chat bubble / terrain pills */
export const FIRE_STARTER_STYLE = {
  border: CANVAS.terrainPillBorder,
  bg: CANVAS.terrainPillBg,
  text: CANVAS.terrainPillText,
  pillClass: TERRAIN_PILL_CLASS,
};

/** All terrain types share the AI guide bubble palette; label text distinguishes type. */
export const TERRAIN_TYPE_STYLES = {
  fact: {
    pill: TERRAIN_PILL_CLASS,
    stripe: "#EDD8D8",
    label: "FACT",
  },
  history: {
    pill: TERRAIN_PILL_CLASS,
    stripe: "#EDD8D8",
    label: "HISTORY",
  },
  constraint: {
    pill: TERRAIN_PILL_CLASS,
    stripe: "#EDD8D8",
    label: "CONSTRAINT",
  },
  uncertainty: {
    pill: TERRAIN_PILL_CLASS,
    stripe: "#EDD8D8",
    label: "UNCERTAINTY",
  },
};
