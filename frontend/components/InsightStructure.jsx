"use client";

import React from "react";
import { motion } from "framer-motion";
import InsightModule, { ELEMENT_CONFIG } from "./InsightModule";

export default function InsightStructure({ 
  insights = [], 
  animated = false,
  mini = false,
  liveUpdate = false,
}) {
  if (!insights || insights.length === 0) {
    return mini ? null : (
      <div className="text-center py-8">
        <p className="text-smoke text-sm">Your understanding structure will appear here</p>
      </div>
    );
  }

  const spineColor = "#DDDDDD";
  const spineWidth = mini ? 1 : 1;
  
  return (
    <div className={`relative ${mini ? 'p-1' : 'py-4'}`}>
      {/* Spine line */}
      <motion.div
        className="absolute bg-[#DDDDDD]"
        style={{
          left: mini ? 4 : 12,
          top: 0,
          width: spineWidth,
        }}
        initial={animated ? { height: 0 } : { height: "100%" }}
        animate={{ height: "100%" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      {/* Modules */}
      <div className={`relative ${mini ? 'space-y-0.5' : 'space-y-3'}`} style={{ marginLeft: mini ? 8 : 20 }}>
        {insights.map((insight, index) => {
          const element = insight.element || "earth";
          const config = ELEMENT_CONFIG[element] || ELEMENT_CONFIG.earth;
          const isFireBranch = element === "fire";
          
          return (
            <div key={index} className="relative">
              {/* Connection point to spine */}
              {!mini && (
                <motion.div
                  className="absolute bg-[#DDDDDD]"
                  style={{
                    left: -8,
                    top: element === "air" ? 16 : 12,
                    width: 8,
                    height: 1,
                  }}
                  initial={animated ? { scaleX: 0 } : { scaleX: 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, delay: animated ? index * 0.15 + 0.2 : 0 }}
                />
              )}
              
              {/* Fire branch connector (extra horizontal line) */}
              {isFireBranch && !mini && (
                <motion.div
                  className="absolute bg-[#DDDDDD]"
                  style={{
                    left: 0,
                    top: 12,
                    width: "15%",
                    height: 1,
                  }}
                  initial={animated ? { scaleX: 0 } : { scaleX: 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.2, delay: animated ? index * 0.15 + 0.3 : 0 }}
                />
              )}

              {/* The module itself */}
              {animated && !mini ? (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: index * 0.15 + 0.1,
                    ease: "easeOut" 
                  }}
                >
                  <InsightModule
                    type={element}
                    text={insight.text || insight.insight_text}
                    animated={false}
                    mini={mini}
                    liveUpdate={liveUpdate}
                  />
                </motion.div>
              ) : (
                <InsightModule
                  type={element}
                  text={insight.text || insight.insight_text}
                  animated={false}
                  mini={mini}
                  liveUpdate={liveUpdate}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
