"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * LiveDocument — renders the Deep Understanding Document as clean formatted text.
 * Strips markdown artifacts and renders with proper typography.
 * Animates new content appearing.
 */
export default function LiveDocument({ text }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTextRef = useRef("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      return;
    }

    const prev = prevTextRef.current;
    prevTextRef.current = text;

    // If text is entirely new or changed, animate the new portion
    if (text !== prev && text.length > prev.length) {
      setIsAnimating(true);
      setDisplayedText(text);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    } else {
      setDisplayedText(text);
    }
  }, [text]);

  // Clean markdown artifacts from the text
  function cleanText(raw) {
    if (!raw) return "";
    return raw
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold markers
      .replace(/\*\*(.*?)\*\*/g, "$1")
      // Remove italic markers
      .replace(/\*(.*?)\*/g, "$1")
      // Remove inline code
      .replace(/`(.*?)`/g, "$1")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Collapse triple+ newlines to double
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const cleaned = cleanText(displayedText);

  if (!cleaned) {
    return (
      <p className="text-smoke/50 italic text-sm">
        Your understanding builds here as you think through the puzzle...
      </p>
    );
  }

  // Split into paragraphs
  const paragraphs = cleaned.split(/\n\n+/);

  return (
    <div ref={containerRef} className="space-y-4">
      {paragraphs.map((para, i) => {
        const isLast = i === paragraphs.length - 1;
        return (
          <p
            key={i}
            className={`text-sm leading-relaxed text-ash transition-all duration-500 ${
              isLast && isAnimating
                ? "animate-fade-in"
                : ""
            }`}
          >
            {para.trim()}
          </p>
        );
      })}
    </div>
  );
}
