"use client";

import React from "react";

/**
 * LiveDocument — renders the Understanding Document as scratch-paper notes.
 * Each newline-separated line gets its own visual line, like jotted notes on a napkin.
 */
export default function LiveDocument({ text }) {

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
      // Unescape literal \n that the LLM may produce inside JSON strings
      .replace(/\\n/g, "\n")
      // Collapse triple+ newlines to double
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const cleaned = cleanText(text);

  if (!cleaned) {
    return (
      <div className="rounded-sm bg-[#FDFBF7] border border-[#EDE8DF] px-5 py-6">
        <p className="font-mono text-xs text-smoke/50 italic">
          No notes yet. Share your thoughts to start building.
        </p>
      </div>
    );
  }

  // Split on any newline (single or double) so each note gets its own line
  const lines = cleaned.split(/\n+/).filter((l) => l.trim());

  return (
    <div className="rounded-sm bg-[#FDFBF7] border border-[#EDE8DF] px-5 py-5">
      <div className="space-y-2.5">
        {lines.map((line, i) => (
          <p
            key={i}
            className="font-mono text-[13px] leading-[1.65] text-[#3A3A3A]"
          >
            {line.trim()}
          </p>
        ))}
      </div>
    </div>
  );
}
