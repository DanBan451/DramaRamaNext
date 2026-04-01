"use client";

import React from "react";

export default function Spinner({ size = "md", color = "black" }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
  };

  const colorClasses = {
    primary: "border-primary",
    fire: "border-fire",
    gray: "border-smoke",
    black: "border-ash",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} border-t-transparent rounded-full animate-spin`}
    />
  );
}
