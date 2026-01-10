"use client";

import { useEffect, useRef } from "react";

// Lightweight, dependency-free confetti for celebratory moments.
export default function ConfettiOverlay({ active, durationMs = 3500, onDone }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const particlesRef = useRef([]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const colors = ["#111111", "#16a34a", "#dc2626", "#2563eb", "#7c3aed", "#f59e0b"];

    const spawn = () => {
      const n = 220;
      const now = performance.now();
      startRef.current = now;
      particlesRef.current = Array.from({ length: n }, (_, i) => {
        const x = Math.random() * window.innerWidth;
        const y = -20 - Math.random() * 200;
        const vx = (Math.random() - 0.5) * 6;
        const vy = 2 + Math.random() * 6;
        const size = 4 + Math.random() * 6;
        return {
          id: i,
          x,
          y,
          vx,
          vy,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.2,
          size,
          color: colors[Math.floor(Math.random() * colors.length)],
        };
      });
    };

    const step = (t) => {
      const elapsed = t - startRef.current;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const gravity = 0.08;
      const drag = 0.995;

      for (const p of particlesRef.current) {
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        // Wrap horizontally for nicer coverage
        if (p.x < -20) p.x = window.innerWidth + 20;
        if (p.x > window.innerWidth + 20) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (elapsed < durationMs) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (onDone) onDone();
      }
    };

    resize();
    spawn();
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, durationMs, onDone]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <canvas ref={canvasRef} />
    </div>
  );
}

