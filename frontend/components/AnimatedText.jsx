"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Compute diff between old and new text
function computeDiff(oldText, newText) {
  if (!oldText) {
    // All new text
    return [{ type: "add", text: newText }];
  }
  if (!newText) {
    // All removed
    return [{ type: "remove", text: oldText }];
  }

  // Simple word-based diff
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  const result = [];
  let i = 0, j = 0;
  
  // Find common prefix
  while (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
    result.push({ type: "same", text: oldWords[i] });
    i++;
    j++;
  }
  
  // Find common suffix
  let oldEnd = oldWords.length - 1;
  let newEnd = newWords.length - 1;
  const suffix = [];
  
  while (oldEnd >= i && newEnd >= j && oldWords[oldEnd] === newWords[newEnd]) {
    suffix.unshift({ type: "same", text: oldWords[oldEnd] });
    oldEnd--;
    newEnd--;
  }
  
  // Middle part: everything between prefix and suffix
  if (i <= oldEnd) {
    const removed = oldWords.slice(i, oldEnd + 1).join("");
    if (removed.trim()) {
      result.push({ type: "remove", text: removed });
    }
  }
  
  if (j <= newEnd) {
    const added = newWords.slice(j, newEnd + 1).join("");
    if (added.trim()) {
      result.push({ type: "add", text: added });
    }
  }
  
  result.push(...suffix);
  
  return result;
}

// Typing animation for a single character sequence
function TypedText({ text, onComplete, speed = 15 }) {
  const [displayedChars, setDisplayedChars] = useState(0);
  
  useEffect(() => {
    if (displayedChars < text.length) {
      const timer = setTimeout(() => {
        setDisplayedChars(prev => Math.min(prev + 1, text.length));
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [displayedChars, text.length, speed, onComplete]);
  
  return (
    <span className="relative">
      <span>{text.slice(0, displayedChars)}</span>
      {displayedChars < text.length && (
        <span className="inline-block w-0.5 h-4 bg-change ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

export default function AnimatedText({ 
  text, 
  previousText = null,
  className = "",
  typingSpeed = 12,
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState("idle"); // idle, removing, adding, complete
  const [diff, setDiff] = useState([]);
  const [visibleAddIndex, setVisibleAddIndex] = useState(0);
  const prevTextRef = useRef(previousText);
  
  // Detect changes and compute diff
  useEffect(() => {
    const oldText = prevTextRef.current;
    
    if (oldText !== null && oldText !== text && text) {
      const newDiff = computeDiff(oldText, text);
      const hasChanges = newDiff.some(d => d.type !== "same");
      
      if (hasChanges) {
        setDiff(newDiff);
        setIsAnimating(true);
        setAnimationPhase("removing");
        setVisibleAddIndex(0);
      }
    }
    
    prevTextRef.current = text;
  }, [text]);
  
  // Handle animation phases
  useEffect(() => {
    if (!isAnimating) return;
    
    if (animationPhase === "removing") {
      // Wait for removal animations, then start adding
      const hasRemovals = diff.some(d => d.type === "remove");
      const delay = hasRemovals ? 400 : 0;
      
      const timer = setTimeout(() => {
        setAnimationPhase("adding");
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [animationPhase, isAnimating, diff]);
  
  // If no previous text or not animating, just show the text
  if (!isAnimating || diff.length === 0) {
    return <span className={className}>{text}</span>;
  }
  
  return (
    <span className={className}>
      <AnimatePresence mode="sync">
        {diff.map((part, index) => {
          if (part.type === "same") {
            return <span key={`same-${index}`}>{part.text}</span>;
          }
          
          if (part.type === "remove") {
            return (
              <motion.span
                key={`remove-${index}`}
                initial={{ opacity: 1, backgroundColor: "rgba(155, 93, 229, 0.2)" }}
                animate={{ 
                  opacity: animationPhase === "removing" ? [1, 0.5, 0] : 0,
                  backgroundColor: ["rgba(155, 93, 229, 0.3)", "rgba(155, 93, 229, 0.1)", "transparent"],
                }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3 }}
                className="inline line-through text-smoke/50"
                style={{ display: animationPhase !== "removing" ? "none" : "inline" }}
              >
                {part.text}
              </motion.span>
            );
          }
          
          if (part.type === "add" && animationPhase === "adding") {
            return (
              <motion.span
                key={`add-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className="relative"
              >
                <span className="bg-change/10 px-0.5 rounded">
                  <TypedText 
                    text={part.text} 
                    speed={typingSpeed}
                    onComplete={() => {
                      // Check if this is the last add
                      const addParts = diff.filter(d => d.type === "add");
                      const currentAddIndex = addParts.indexOf(part);
                      if (currentAddIndex === addParts.length - 1) {
                        setTimeout(() => {
                          setIsAnimating(false);
                          setAnimationPhase("idle");
                          setDiff([]);
                        }, 500);
                      }
                    }}
                  />
                </span>
              </motion.span>
            );
          }
          
          return null;
        })}
      </AnimatePresence>
    </span>
  );
}
