"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const markdownComponents = {
  p: ({ children }) => <span className="block mb-4 last:mb-0">{children}</span>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h2: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h3: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h4: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h5: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h6: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <span>{children}</span>,
  ol: ({ children }) => <span>{children}</span>,
  li: ({ children }) => <span>{children} </span>,
  code: ({ children }) => <span>{children}</span>,
  pre: ({ children }) => <span>{children}</span>,
  blockquote: ({ children }) => <span>{children}</span>,
  a: ({ children }) => <span>{children}</span>,
};

// Compute word-level diff between old and new text
function computeWordDiff(oldText, newText) {
  if (!oldText || oldText.trim() === "") {
    return [{ type: "add", text: newText }];
  }
  if (!newText || newText.trim() === "") {
    return [{ type: "remove", text: oldText }];
  }

  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  const result = [];
  
  // LCS-based diff for better accuracy
  const lcs = [];
  for (let i = 0; i <= oldWords.length; i++) {
    lcs[i] = [];
    for (let j = 0; j <= newWords.length; j++) {
      if (i === 0 || j === 0) {
        lcs[i][j] = 0;
      } else if (oldWords[i - 1] === newWords[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find diff
  let i = oldWords.length;
  let j = newWords.length;
  const diffParts = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      diffParts.unshift({ type: "same", text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      diffParts.unshift({ type: "add", text: newWords[j - 1] });
      j--;
    } else if (i > 0) {
      diffParts.unshift({ type: "remove", text: oldWords[i - 1] });
      i--;
    }
  }
  
  // Merge consecutive same-type parts
  const merged = [];
  for (const part of diffParts) {
    if (merged.length > 0 && merged[merged.length - 1].type === part.type) {
      merged[merged.length - 1].text += part.text;
    } else {
      merged.push({ ...part });
    }
  }
  
  return merged;
}

// Typing effect component
function TypeWriter({ text, onComplete, speed = 8 }) {
  const [displayed, setDisplayed] = useState(0);
  
  useEffect(() => {
    if (displayed < text.length) {
      const timer = setTimeout(() => {
        setDisplayed(prev => Math.min(prev + 2, text.length)); // Type 2 chars at a time for speed
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [displayed, text.length, speed, onComplete]);
  
  return (
    <>
      <span>{text.slice(0, displayed)}</span>
      {displayed < text.length && (
        <span className="inline-block w-0.5 h-4 bg-change animate-pulse align-middle" />
      )}
    </>
  );
}

export default function LiveDocument({ text, className = "" }) {
  const [displayText, setDisplayText] = useState(text || "");
  const [diff, setDiff] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle, removing, adding, done
  const prevTextRef = useRef(null);
  const animationQueue = useRef([]);
  
  // Detect text changes
  useEffect(() => {
    const oldText = prevTextRef.current;
    
    if (oldText !== null && oldText !== text && text) {
      const newDiff = computeWordDiff(oldText, text);
      const hasChanges = newDiff.some(d => d.type !== "same");
      
      if (hasChanges) {
        setDiff(newDiff);
        setIsAnimating(true);
        setPhase("removing");
      } else {
        setDisplayText(text);
      }
    } else if (oldText === null && text) {
      // First load - just show text
      setDisplayText(text);
    }
    
    prevTextRef.current = text;
  }, [text]);
  
  // Animation phase transitions
  useEffect(() => {
    if (!isAnimating) return;
    
    if (phase === "removing") {
      const hasRemovals = diff.some(d => d.type === "remove");
      const delay = hasRemovals ? 600 : 50;
      
      const timer = setTimeout(() => {
        setPhase("adding");
      }, delay);
      return () => clearTimeout(timer);
    }
    
    if (phase === "done") {
      const timer = setTimeout(() => {
        setDisplayText(text);
        setIsAnimating(false);
        setPhase("idle");
        setDiff([]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, isAnimating, diff, text]);
  
  // Count additions to know when typing is complete
  const addParts = diff.filter(d => d.type === "add");
  const [completedAdds, setCompletedAdds] = useState(0);
  
  useEffect(() => {
    if (phase === "adding" && addParts.length > 0 && completedAdds >= addParts.length) {
      setPhase("done");
      setCompletedAdds(0);
    }
  }, [completedAdds, addParts.length, phase]);
  
  // Reset completed adds when starting new animation
  useEffect(() => {
    if (phase === "removing") {
      setCompletedAdds(0);
    }
  }, [phase]);
  
  // If not animating, show rendered markdown
  if (!isAnimating || diff.length === 0) {
    return (
      <div className={`font-mono text-sm leading-relaxed text-ash ${className}`}>
        {displayText ? (
          <ReactMarkdown components={markdownComponents}>{displayText}</ReactMarkdown>
        ) : (
          <span className="text-smoke italic">Your understanding will appear here as you explore...</span>
        )}
      </div>
    );
  }
  
  // Render animated diff
  let addIndex = 0;
  
  return (
    <div className={`font-mono text-sm leading-relaxed text-ash whitespace-pre-wrap ${className}`}>
      {diff.map((part, index) => {
        if (part.type === "same") {
          return <span key={`same-${index}`}>{part.text}</span>;
        }
        
        if (part.type === "remove") {
          return (
            <motion.span
              key={`remove-${index}`}
              initial={{ opacity: 1, backgroundColor: "rgba(155, 93, 229, 0.25)" }}
              animate={phase === "removing" 
                ? { opacity: [1, 0.7, 0], backgroundColor: "rgba(155, 93, 229, 0)" }
                : { opacity: 0 }
              }
              transition={{ duration: 0.5 }}
              className="line-through"
              style={{ display: phase !== "removing" ? "none" : "inline" }}
            >
              {part.text}
            </motion.span>
          );
        }
        
        if (part.type === "add") {
          const currentAddIndex = addIndex++;
          
          if (phase !== "adding") {
            return null;
          }
          
          return (
            <motion.span
              key={`add-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-change/15 rounded px-0.5"
            >
              <TypeWriter
                text={part.text}
                speed={6}
                onComplete={() => setCompletedAdds(prev => prev + 1)}
              />
            </motion.span>
          );
        }
        
        return null;
      })}
    </div>
  );
}
