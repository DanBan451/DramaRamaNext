"use client";

/**
 * Rubik’s-inspired loader: colored faces on a small 3D-style cube twist.
 */
export default function CreativeSpinner({ className = "", label = "Loading" }) {
  return (
    <div
      className={`flex flex-col items-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="w-9 h-9 [perspective:120px]"
        style={{ perspective: "120px" }}
      >
        <div
          className="relative w-full h-full [transform-style:preserve-3d] animate-cube-twist"
          style={{ transformStyle: "preserve-3d" }}
        >
          <span
            className="absolute inset-0 rounded shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] opacity-95 bg-gradient-to-br from-change to-purple-300"
            style={{ transform: "rotateY(0deg) translateZ(10px)" }}
          />
          <span
            className="absolute inset-0 rounded shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] opacity-95 bg-gradient-to-br from-fire to-orange-300"
            style={{ transform: "rotateY(90deg) translateZ(10px)" }}
          />
          <span
            className="absolute inset-0 rounded shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] opacity-95 bg-gradient-to-br from-sky-600 to-sky-300"
            style={{ transform: "rotateX(90deg) translateZ(10px)" }}
          />
          <span
            className="absolute inset-0 rounded shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] opacity-95 bg-gradient-to-br from-green-600 to-green-300"
            style={{ transform: "rotateX(-90deg) translateZ(10px)" }}
          />
        </div>
      </div>
    </div>
  );
}
