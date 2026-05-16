"use client";

import { useState } from "react";
import ElementEmoji from "@/components/elements/ElementEmoji";
import { ELEMENTS } from "@/lib/elements";

function SubElementRow({ sub, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 text-sm border-b border-mist bg-white transition-colors hover:bg-[#F5F5F5] ${
        isSelected
          ? "border-l-2 border-l-[#2A2A2A] font-medium bg-[#FAFAFA] text-[#2A2A2A]"
          : "border-l-2 border-l-transparent text-ash"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-mist text-[11px] font-bold text-smoke">
          {sub.symbol}
        </span>
        <span>{sub.name}</span>
      </div>
      <p className={`mt-0.5 ml-7 line-clamp-2 text-xs ${isSelected ? "text-smoke" : "text-smoke"}`}>
        {sub.description}
      </p>
    </button>
  );
}

export default function ElementsSidebar({
  selectedElement,
  selectedSubElement,
  onSelect,
  onClear,
  thoughtsByElement = {},
  onCollapse,
  variant = "flat",
}) {
  const accordion = variant === "accordion";
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3
            className={
              accordion
                ? "text-xs font-medium uppercase tracking-wider text-smoke"
                : "text-[11px] font-mono uppercase tracking-[0.2em] text-smoke"
            }
          >
            Elements
          </h3>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-smoke transition-colors hover:bg-[#F5F5F5] hover:text-black"
              title="Collapse elements panel"
              aria-label="Collapse elements panel"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-smoke">
          Pick a sub-element, then click the canvas to drop a thought tagged with it.
        </p>
      </div>

      <div className="scrollbar-hide flex-1 overflow-y-auto px-3 pb-4">
        {accordion ? (
          <div className="space-y-0">
            {ELEMENTS.map((element) => {
              const isExpanded = expanded === element.id;
              const count = thoughtsByElement[element.id] || 0;
              const hasSelectedSub =
                selectedSubElement &&
                element.subElements.some((s) => s.id === selectedSubElement);
              return (
                <div key={element.id} className="border-b border-mist">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : element.id)}
                    className={`flex w-full items-center justify-between rounded-none px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F5F5F5] ${
                      isExpanded || hasSelectedSub
                        ? "border-l-2 border-l-[#2A2A2A] font-semibold text-[#2A2A2A]"
                        : "border-l-2 border-l-transparent text-ash"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ElementEmoji emoji={element.emoji} />
                      <span>{element.name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {count > 0 ? (
                        <span className="rounded bg-mist px-1.5 py-0.5 font-mono text-[10px] text-smoke">
                          {count}
                        </span>
                      ) : null}
                      <svg
                        className={`h-3.5 w-3.5 text-smoke transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  {isExpanded ? (
                    <div className="border-t border-mist">
                      {element.subElements.map((sub) => (
                        <SubElementRow
                          key={sub.id}
                          sub={sub}
                          isSelected={selectedSubElement === sub.id}
                          onSelect={() => onSelect(element.id, sub.id)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-0">
            {ELEMENTS.map((element) => {
              const count = thoughtsByElement[element.id] || 0;
              const hasSelectedSub =
                selectedSubElement &&
                element.subElements.some((s) => s.id === selectedSubElement);
              return (
                <div key={element.id} className="mb-1 border-b border-mist">
                  <div
                    className={`flex items-center justify-between px-3 py-2.5 ${
                      selectedElement === element.id || hasSelectedSub
                        ? "border-l-2 border-l-[#2A2A2A] font-semibold text-[#2A2A2A]"
                        : "border-l-2 border-l-transparent text-ash"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <ElementEmoji emoji={element.emoji} className="text-base" />
                      <span className="text-sm">{element.name}</span>
                    </span>
                    {count > 0 ? (
                      <span className="rounded bg-mist px-1.5 py-0.5 font-mono text-[10px] text-smoke">
                        {count}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    {element.subElements.map((sub) => (
                      <SubElementRow
                        key={sub.id}
                        sub={sub}
                        isSelected={selectedSubElement === sub.id}
                        onSelect={() => onSelect(element.id, sub.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedSubElement ? (
          <button
            type="button"
            onClick={onClear}
            className="mt-3 w-full rounded-md px-3 py-2 text-left text-xs text-smoke transition-colors hover:bg-[#F5F5F5]"
          >
            ✕ Clear selection
          </button>
        ) : null}
      </div>
    </div>
  );
}
