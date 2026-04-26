"use client";

// Weaponry-style elements sidebar.
// Each element collapses into an accordion; its sub-elements only render when
// expanded. Sub-element rows show the description so the user can read what
// the sub-element actually means before tagging a thought.
// The selected sub-element is highlighted using the element's color.

import { useState } from "react";
import { ELEMENTS } from "@/lib/elements";

export default function ElementsSidebar({
  selectedElement,
  selectedSubElement,
  onSelect,
  onClear,
  thoughtsByElement = {},
}) {
  // Auto-expand the element whose sub-element is currently selected; otherwise
  // expand none on first render. Toggling a header collapses it.
  const [expanded, setExpanded] = useState(selectedElement);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-[11px] font-mono tracking-[0.2em] text-smoke uppercase">
          Elements
        </h3>
        <p className="text-[11px] text-smoke mt-1 leading-relaxed">
          Pick a sub-element, then click the canvas to drop a thought tagged
          with it.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {ELEMENTS.map((element) => {
          const isExpanded = expanded === element.id;
          const count = thoughtsByElement[element.id] || 0;

          return (
            <div key={element.id}>
              <button
                onClick={() =>
                  setExpanded(isExpanded ? null : element.id)
                }
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isExpanded
                    ? "text-black"
                    : "text-ash hover:bg-mist/60"
                }`}
                style={
                  isExpanded
                    ? {
                        backgroundColor: element.color.bg,
                        color: element.color.text,
                      }
                    : undefined
                }
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{element.emoji}</span>
                  <span className="font-semibold">{element.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  {count > 0 ? (
                    <span className="text-[10px] font-mono text-smoke px-1.5 py-0.5 rounded bg-white/60">
                      {count}
                    </span>
                  ) : null}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>

              {isExpanded && (
                <div className="ml-2 mt-1 mb-2 space-y-0.5">
                  {element.subElements.map((sub) => {
                    const isSelected = selectedSubElement === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onSelect(element.id, sub.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          isSelected
                            ? "text-white"
                            : "text-ash hover:bg-mist/60"
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: element.color.text }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{
                              backgroundColor: isSelected
                                ? "rgba(255,255,255,0.25)"
                                : element.color.light,
                              color: isSelected
                                ? "#ffffff"
                                : element.color.text,
                            }}
                          >
                            {sub.symbol}
                          </span>
                          <span className="font-medium">{sub.name}</span>
                        </div>
                        <div
                          className={`text-[11px] mt-1 ml-7 leading-snug ${
                            isSelected ? "text-white/85" : "text-smoke"
                          }`}
                        >
                          {sub.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {(selectedElement || selectedSubElement) && (
          <button
            onClick={onClear}
            className="w-full text-left text-[11px] text-smoke mt-3 px-3 py-2 hover:bg-mist/60 rounded-md transition-colors"
          >
            ✕ Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
