"use client";

import Image from "next/image";

function GeometricPlaceholder() {
  return (
    <div
      className="flex aspect-square w-full items-center justify-center rounded-t-[10px] bg-[#F5F5F5]"
      aria-hidden
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-[#CCCCCC]">
        <rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-t-[10px] bg-[#F0F0F0]">
      <div
        className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#EEEEEE] via-[#F8F8F8] to-[#E8E8E8]"
        aria-hidden
      />
      <p className="absolute inset-x-0 bottom-4 text-center font-serif text-sm italic text-[#999999]">
        Forging your Fire Starter…
      </p>
    </div>
  );
}

/**
 * Fire Starter card hero image — completed, loading, or failed placeholder.
 */
export default function FireStarterImage({ fireStarter, className = "" }) {
  const status = fireStarter?.image_generation_status || "pending";
  const url = fireStarter?.image_url;

  if (status === "completed" && url) {
    return (
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-t-[10px] bg-[#F5F5F5] ${className}`}
      >
        <Image
          src={url}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 400px"
          unoptimized
        />
      </div>
    );
  }

  if (status === "failed") {
    return <GeometricPlaceholder />;
  }

  if (status === "pending" || status === "generating") {
    return <LoadingPlaceholder />;
  }

  return <LoadingPlaceholder />;
}
