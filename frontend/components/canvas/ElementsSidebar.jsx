"use client";

import { useState } from "react";
import ElementThumbnail from "@/components/elements/ElementThumbnail";
import { ELEMENTS, CHANGE_ELEMENT } from "@/lib/elements";

const SIDEBAR_ELEMENTS = [...ELEMENTS, CHANGE_ELEMENT];

function SubElementRow({ sub, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-b border-[#E5E5E5] bg-white py-3 pl-3 pr-3 text-left transition-colors hover:bg-[#F5F5F5] ${
        isSelected
          ? "border-l-2 border-l-[#2A2A2A] font-medium text-[#2A2A2A]"
          : "border-l-2 border-l-transparent text-[#2A2A2A]"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#F0F0F0] text-[11px] font-bold text-[#666666]">
          {sub.symbol}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium leading-snug">{sub.name}</span>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[#888888]">
            {sub.description}
          </p>
        </div>
      </div>
    </button>
  );
}

function ElementRow({
  element,
  count,
  isExpanded,
  isRowActive,
  onToggle,
  selectedSubElement,
  onSelectSub,
}) {
  const hasSubs = element.subElements.length > 0;

  return (
    <div className="border-b border-[#E5E5E5]">
      <button
        type="button"
        onClick={() => (hasSubs ? onToggle() : null)}
        disabled={!hasSubs}
        className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[#F5F5F5] ${
          isRowActive
            ? "border-l-2 border-l-[#2A2A2A] font-semibold text-[#2A2A2A]"
            : "border-l-2 border-l-transparent text-[#2A2A2A]"
        } ${!hasSubs ? "cursor-default" : ""}`}
      >
        <ElementThumbnail elementId={element.id} size="sidebar" />
        <span className="min-w-0 flex-1 font-serif text-[17px] leading-tight">{element.name}</span>
        <span className="flex shrink-0 items-center gap-2">
          {count > 0 ? (
            <span className="rounded-full bg-[#F0F0F0] px-2 py-0.5 font-mono text-[10px] text-[#666666]">
              {count}
            </span>
          ) : null}
          {hasSubs ? (
            <svg
              className={`h-3.5 w-3.5 text-[#888888] transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          ) : null}
        </span>
      </button>
      {isExpanded && hasSubs ? (
        <div>
          {element.subElements.map((sub) => (
            <SubElementRow
              key={sub.id}
              sub={sub}
              isSelected={selectedSubElement === sub.id}
              onSelect={() => onSelectSub(element.id, sub.id)}
            />
          ))}
        </div>
      ) : null}
      {isExpanded && !hasSubs ? (
        <p className="border-t border-[#E5E5E5] px-4 py-3 text-[12px] leading-relaxed text-[#888888]">
          Emerges from practice across the other elements — not a separate tagging lens.
        </p>
      ) : null}
    </div>
  );
}

export default function ElementsSidebar({
  selectedElement,
  selectedSubElement,
  onSelect,
  onClear,
  thoughtsByElement = {},
  onCollapse,
}) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="shrink-0 px-4 pb-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-accent-blue">
            Elements
          </h3>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#888888] transition-colors hover:bg-[#F5F5F5] hover:text-black"
              title="Collapse elements panel"
              aria-label="Collapse elements panel"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[#666666]">
          Pick an element. Click the canvas to drop a tagged thought.
        </p>
      </div>

      <div className="scrollbar-hide flex-1 overflow-y-auto">
        {SIDEBAR_ELEMENTS.map((element) => {
          const isExpanded = expanded === element.id;
          const count = thoughtsByElement[element.id] || 0;
          const hasSelectedSub =
            selectedSubElement &&
            element.subElements.some((s) => s.id === selectedSubElement);
          const isRowActive = isExpanded || hasSelectedSub || selectedElement === element.id;

          return (
            <ElementRow
              key={element.id}
              element={element}
              count={count}
              isExpanded={isExpanded}
              isRowActive={isRowActive}
              onToggle={() => setExpanded(isExpanded ? null : element.id)}
              selectedSubElement={selectedSubElement}
              onSelectSub={onSelect}
            />
          );
        })}

        {selectedSubElement ? (
          <div className="px-3 py-3">
            <button
              type="button"
              onClick={onClear}
              className="w-full rounded-md px-2 py-2 text-left text-xs text-[#888888] transition-colors hover:bg-[#F5F5F5] hover:text-[#2A2A2A]"
            >
              ✕ Clear selection
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
