"use client";

// Flat elements sidebar.
//
// Previously this was an accordion (expand one element, collapse others).
// User feedback: the accordion was friction — they want to see every element
// and every sub-element at a glance and just scroll. So now we render each
// element as a colored section header with its sub-elements always visible
// underneath. Sub-element rows show the description inline so the user knows
// what the sub-element wants before tagging a thought with it.

import { ELEMENTS } from "@/lib/elements";

export default function ElementsSidebar({
  selectedElement: _selectedElement,
  selectedSubElement,
  onSelect,
  onClear,
  thoughtsByElement = {},
}) {
  void _selectedElement;
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

      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4 space-y-5">
        {ELEMENTS.map((element) => {
          const count = thoughtsByElement[element.id] || 0;
          return (
            <div key={element.id}>
              {/* Element header — always visible, colored background */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: element.color.bg,
                  color: element.color.text,
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{element.emoji}</span>
                  <span className="font-semibold text-sm">{element.name}</span>
                </span>
                {count > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/60">
                    {count}
                  </span>
                )}
              </div>

              {/* Sub-elements — always rendered, no accordion */}
              <div className="mt-1 space-y-0.5">
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
            </div>
          );
        })}

        {selectedSubElement && (
          <button
            onClick={onClear}
            className="w-full text-left text-[11px] text-smoke px-3 py-2 hover:bg-mist/60 rounded-md transition-colors"
          >
            ✕ Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
