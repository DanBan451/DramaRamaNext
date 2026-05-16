"use client";

import { useEffect, useRef, useState } from "react";

function useTypewriter(target, streaming) {
  const [shown, setShown] = useState(target || "");
  const targetRef = useRef(target || "");
  const tickRef = useRef(null);

  useEffect(() => {
    targetRef.current = target || "";
    if (!streaming) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setShown(targetRef.current);
      return;
    }
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      setShown((prev) => {
        const t = targetRef.current;
        if (prev.length >= t.length) return prev;
        const behind = t.length - prev.length;
        const step = Math.max(2, Math.ceil(behind / 24));
        return t.slice(0, prev.length + step);
      });
    }, 16);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [target, streaming]);

  return shown;
}

function renderMarkdownish(text) {
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return (
        <strong key={i} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    const italicParts = p.split(/(\*[^*\n]+\*)/g);
    return (
      <span key={i}>
        {italicParts.map((q, j) => {
          if (/^\*[^*\n]+\*$/.test(q)) {
            return (
              <em key={j} className="italic">
                {q.slice(1, -1)}
              </em>
            );
          }
          return <span key={j}>{q}</span>;
        })}
      </span>
    );
  });
}

export default function GuideChatBubble({ role, content, streaming = false }) {
  const visible = useTypewriter(content, !!streaming);

  if (role === "assistant") {
    const showThinking = streaming && !visible;
    return (
      <div className="rounded-lg border border-[#EDD8D8] bg-[#FCF2F2] px-3.5 py-3 text-sm leading-relaxed text-[#2A2A2A] whitespace-pre-wrap break-words">
        {showThinking ? (
          <span className="inline-flex items-center gap-1 text-[#8B4A4A] italic">
            <span className="animate-pulse">Thinking</span>
            <span className="animate-pulse [animation-delay:120ms]">.</span>
            <span className="animate-pulse [animation-delay:240ms]">.</span>
            <span className="animate-pulse [animation-delay:360ms]">.</span>
          </span>
        ) : (
          <>
            {renderMarkdownish(visible)}
            {streaming ? (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary/60 align-text-bottom" />
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-lg bg-black px-3 py-2 text-right text-sm text-white whitespace-pre-wrap break-words">
        {content}
      </div>
    </div>
  );
}
