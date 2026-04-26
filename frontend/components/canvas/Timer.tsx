"use client";

import { useEffect, useRef, useState, useCallback } from "react";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface TimerProps {
  running: boolean;
  onTimeUpdate?: (seconds: number) => void;
  reset?: number;
}

export default function Timer({ running, onTimeUpdate, reset }: TimerProps) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    setSeconds(0);
    clearTimer();
  }, [reset, clearTimer]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          onTimeUpdate?.(next);
          return next;
        });
      }, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [running, clearTimer, onTimeUpdate]);

  return (
    <span className="font-mono text-sm text-[var(--text-muted)] tabular-nums">
      {formatDuration(seconds)}
    </span>
  );
}
