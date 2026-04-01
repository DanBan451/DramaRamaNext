"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import AnimatedText from "./AnimatedText";

const ELEMENT_CONFIG = {
  earth: {
    borderColor: "#8B6F47",
    bgTint: "rgba(139, 111, 71, 0.05)",
    width: "100%",
    marginTop: 0,
    description: "foundational",
  },
  fire: {
    borderColor: "#B84233",
    bgTint: "rgba(184, 66, 51, 0.05)",
    width: "85%",
    marginTop: 0,
    marginLeft: "15%",
    description: "exploratory",
  },
  air: {
    borderColor: "#7A8B99",
    bgTint: "rgba(122, 139, 153, 0.05)",
    width: "90%",
    marginTop: 8,
    description: "questioning",
  },
  water: {
    borderColor: "#3D6B7E",
    bgTint: "rgba(61, 107, 126, 0.05)",
    width: "95%",
    marginTop: 0,
    doubleBorder: true,
    description: "connecting",
  },
  change: {
    borderColor: "#9B8EC4",
    bgTint: "rgba(155, 142, 196, 0.08)",
    width: "100%",
    marginTop: 0,
    gradient: true,
    description: "transformative",
  },
};

export default function InsightModule({ 
  type = "earth", 
  text, 
  animated = false,
  mini = false,
  liveUpdate = false,
}) {
  const config = ELEMENT_CONFIG[type] || ELEMENT_CONFIG.earth;
  const prevTextRef = useRef(null);
  const [previousText, setPreviousText] = useState(null);
  
  // Track text changes for live updates
  useEffect(() => {
    if (liveUpdate && prevTextRef.current !== null && prevTextRef.current !== text) {
      setPreviousText(prevTextRef.current);
    }
    prevTextRef.current = text;
  }, [text, liveUpdate]);
  
  const baseStyles = {
    width: config.width,
    marginTop: mini ? config.marginTop / 2 : config.marginTop,
    marginLeft: config.marginLeft || 0,
    background: config.gradient 
      ? `linear-gradient(135deg, white 0%, ${config.bgTint} 100%)`
      : config.bgTint,
    borderLeft: config.doubleBorder 
      ? `3px double ${config.borderColor}`
      : `3px solid ${config.borderColor}`,
  };

  const moduleClasses = `
    ${mini ? 'py-1 px-2' : type === 'change' ? 'py-4 px-4' : 'py-3 px-4'}
    rounded-r
    ${mini ? '' : 'shadow-sm'}
  `;

  const textClasses = `
    font-mono 
    ${mini ? 'text-[8px] leading-tight line-clamp-1' : 'text-sm leading-relaxed'} 
    text-ash
  `;

  const content = (
    <div className={moduleClasses} style={baseStyles}>
      {!mini && (
        <p className={textClasses}>
          {liveUpdate ? (
            <AnimatedText 
              text={text} 
              previousText={previousText}
              typingSpeed={10}
            />
          ) : (
            text
          )}
        </p>
      )}
    </div>
  );

  if (animated && !mini) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export { ELEMENT_CONFIG };
