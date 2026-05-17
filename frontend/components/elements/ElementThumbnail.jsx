"use client";

import Image from "next/image";
import { getElement } from "@/lib/elements";
import { getElementImageSrc } from "@/lib/element-assets";

const SIZES = {
  sidebar: { className: "h-10 w-10 rounded-md", px: 40 },
  card: { className: "h-10 w-10 rounded-md", px: 40 },
  node: { className: "h-7 w-7 rounded-[6px]", px: 28 },
};

/**
 * Paper-craft element illustration. Falls back to emoji in a cream tile if image fails.
 */
export default function ElementThumbnail({ elementId, size = "sidebar", className = "" }) {
  const el = getElement(elementId);
  const src = getElementImageSrc(elementId);
  const dim = SIZES[size] || SIZES.sidebar;

  if (!el) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center border border-[#E5E5E5] bg-[#FAF8F5] ${dim.className} ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden border border-[#E5E5E5] bg-[#FAF8F5] shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${dim.className} ${className}`}
    >
      <Image
        src={src}
        alt=""
        width={dim.px}
        height={dim.px}
        className="h-full w-full object-cover"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent && !parent.querySelector("[data-emoji-fallback]")) {
            const span = document.createElement("span");
            span.setAttribute("data-emoji-fallback", "true");
            span.className = "absolute inset-0 flex items-center justify-center text-lg grayscale";
            span.textContent = el.emoji;
            parent.appendChild(span);
          }
        }}
      />
    </span>
  );
}
