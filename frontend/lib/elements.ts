// Ported from Weaponry/lib/elements.ts.
// 4 elements × 3 sub-elements + Change as a meta-element. Description text is
// shown verbatim as the textarea placeholder when the user starts a thought,
// so the wording matters — keep this in sync with Weaponry.

export interface SubElement {
  id: string;
  name: string;
  symbol: string;
  description: string;
}

export interface ElementColor {
  bg: string;
  border: string;
  text: string;
  light: string;
}

export interface ElementDef {
  id: string;
  name: string;
  emoji: string;
  color: ElementColor;
  subElements: SubElement[];
}

export const ELEMENT_COLORS: Record<string, ElementColor> = {
  earth: { bg: "#f0e6d3", border: "#c4a97d", text: "#6b4f2e", light: "#e8dcc8" },
  fire:  { bg: "#fde8e0", border: "#d9634b", text: "#a03820", light: "#f8d4c8" },
  air:   { bg: "#e8f0fe", border: "#8ab4f8", text: "#1a56db", light: "#d4e4fc" },
  water: { bg: "#e0f2f1", border: "#4db6ac", text: "#00695c", light: "#c8e6e4" },
};

export const DEFAULT_COLOR: ElementColor = {
  bg: "#f9fafb",
  border: "#d1d5db",
  text: "#374151",
  light: "#f3f4f6",
};

export const AI_GUIDE_COLOR: ElementColor = {
  bg: "#f3e8ff",
  border: "#a855f7",
  text: "#7e22ce",
  light: "#e9d5ff",
};

export function getElementColor(elementId: string | null | undefined): ElementColor {
  if (!elementId) return DEFAULT_COLOR;
  return ELEMENT_COLORS[elementId] || DEFAULT_COLOR;
}

export const ELEMENTS: ElementDef[] = [
  {
    id: "earth",
    name: "Earth",
    emoji: "🌳",
    color: ELEMENT_COLORS.earth,
    subElements: [
      {
        id: "earth-1",
        name: "Start with Simple",
        symbol: "α",
        description:
          "Master the basics first. Avoid the hard parts. What is a simpler version of this problem you can solve? What are the absolute fundamentals? When you master the basics, the complexities naturally begin to make sense.",
      },
      {
        id: "earth-2",
        name: "Spotlight the Specific",
        symbol: "∃",
        description:
          "Create a concrete, specific example that is simpler than the original problem. Probe it deeply. Then recast whatever you find back to the larger problem. What specific case would expose the hidden structure?",
      },
      {
        id: "earth-3",
        name: "Add the Adjective",
        symbol: "≡",
        description:
          "Add a descriptor to the problem — is it iterative? Defensive? Exploratory? Sequential? Stay with that descriptor until an insight emerges. Do NOT move to another descriptor until you see something new. If the puzzle is multi-faceted, this approach is ideal.",
      },
    ],
  },
  {
    id: "fire",
    name: "Fire",
    emoji: "🔥",
    color: ELEMENT_COLORS.fire,
    subElements: [
      {
        id: "fire-1",
        name: "Fail Fast",
        symbol: "Δ",
        description:
          "Never stare at a blank page. Write something — anything — even if it is wrong. Now you have something to respond to. A rough draft, a bad idea, a wrong answer. The flow of creativity happens when you stop worrying about being right. Produce junk AND gems, then sort later.",
      },
      {
        id: "fire-2",
        name: "Fail Again",
        symbol: "Σ",
        description:
          "Imagine you were told you MUST fail 10 times before you can succeed. Your attitude becomes: 1 down, 9 to go — that is progress! Be persistent. Appreciate failure. Each failed attempt is a precious joule of understanding. Do not wait for failure — actively pursue it as progress.",
      },
      {
        id: "fire-3",
        name: "Fail Intentionally",
        symbol: "∞",
        description:
          "Create a completely unrealistic, extreme, or impossible scenario on purpose. Think outside every box. Then tame it — analyze the exact break-point. What part of the extreme case has promise? What part fails and why? Hold onto the failed attempt as a precious joule and extract deeper understanding.",
      },
    ],
  },
  {
    id: "air",
    name: "Air",
    emoji: "💨",
    color: ELEMENT_COLORS.air,
    subElements: [
      {
        id: "air-1",
        name: "Be Your Own Socrates",
        symbol: "∀",
        description:
          "Ask the meta-question. WHY? What is the REAL question here? Are you even considering the right question? You may be going down the wrong route entirely. Step back and ask: what is the big-picture structure of this problem? What question SHOULD I be asking?",
      },
      {
        id: "air-2",
        name: "Ask Basic Questions",
        symbol: "∅",
        description:
          "If the puzzle requires fundamental knowledge you lack, ask fundamental questions. Do not skip this. Fundamental questions lead to fundamental breakthroughs. What basic concept do you not fully understand that is blocking you?",
      },
      {
        id: "air-3",
        name: "Ask Another Question",
        symbol: "⊕",
        description:
          "If you are stuck, ask a different but RELATED question. Do not keep hammering the same wall. A related question may redirect your thinking and provoke an insight about the original puzzle. If no insight comes, you will at least return to the original problem more refreshed.",
      },
    ],
  },
  {
    id: "water",
    name: "Water",
    emoji: "🌊",
    color: ELEMENT_COLORS.water,
    subElements: [
      {
        id: "water-1",
        name: "Run Down All Paths",
        symbol: "∫",
        description:
          "Stick with one idea until it is obviously a dead-end. Then go down another path. And another. At each dead-end, ask WHY it is a dead-end and understand deeply. Map out which ideas have promise and which do not. Be determined — do not abandon a path too early.",
      },
      {
        id: "water-2",
        name: "Embrace Doubt",
        symbol: "±",
        description:
          "You might be wrong. Consider alternative perspectives. Never be 100% sure about anything. What if the opposite of what you believe is true? What would someone who disagrees with you say? Empathy, not sympathy — genuinely inhabit the other perspective.",
      },
      {
        id: "water-3",
        name: "Never Stop",
        symbol: "→",
        description:
          "Follow your best idea to its absolute conclusion. Do not stop when you get the first insight — that is just the beginning. Ask: what is NEXT? Where does this lead? The birth of a new idea is not the end, it is the start of the real work.",
      },
    ],
  },
];

export const CHANGE_ELEMENT: ElementDef = {
  id: "change",
  name: "Change",
  emoji: "🪨",
  color: { bg: "#ede9fe", border: "#a78bfa", text: "#6d28d9", light: "#ddd6fe" },
  subElements: [],
};

export function getElement(id: string | null | undefined): ElementDef | undefined {
  if (!id) return undefined;
  if (id === "change") return CHANGE_ELEMENT;
  return ELEMENTS.find((e) => e.id === id);
}

export function getSubElement(
  elementId: string | null | undefined,
  subElementId: string | null | undefined,
): SubElement | undefined {
  if (!elementId || !subElementId) return undefined;
  const element = getElement(elementId);
  if (!element) return undefined;
  return element.subElements.find((se) => se.id === subElementId);
}

export function getAllSubElements() {
  return ELEMENTS.flatMap((e) =>
    e.subElements.map((se) => ({ ...se, element: e }))
  );
}
