"use client";

/**
 * PuzzleTypewriter — hero “A quick story” column: short phased typewriter.
 * Red (`text-primary`) = urgent puzzle beats; blue `#5B9BD5` = contemplative
 * frame (echoes cool mask tones) on “Most people can’t” + shared with page eyebrow/link.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cool light–mid blue aligned with hero mask blues */
const HERO_MASK_BLUE = "#5B9BD5";

const COPY_OPEN =
  "Pick one thing you wish you were better at. Your work. A craft. Something heavy.";
const COPY_Q1 = "What would change about your situation if you got better at it?";
const COPY_BEAT1 = "Most people can answer that easily.";
const COPY_Q2 = "What would change about how you think to make it happen?";
const COPY_BEAT2 = "Most people can't.";
const COPY_RES = "That's the puzzle this is built to solve.";

function Cursor({ color = "#111", visible = true }) {
  if (!visible) return null;
  return (
    <span
      className="inline-block align-text-bottom ml-[2px]"
      style={{
        width: 2,
        height: "1.1em",
        background: color,
        animation: "cursorBlink 1s step-end infinite",
      }}
    />
  );
}

export default function PuzzleTypewriter({ onReady }) {
  const [open, setOpen] = useState("");
  const [openDone, setOpenDone] = useState(false);

  const [q1, setQ1] = useState("");
  const [q1Done, setQ1Done] = useState(false);

  const [beat1, setBeat1] = useState("");
  const [beat1Done, setBeat1Done] = useState(false);

  const [q2, setQ2] = useState("");
  const [q2Done, setQ2Done] = useState(false);

  const [beat2, setBeat2] = useState("");
  const [beat2Done, setBeat2Done] = useState(false);

  const [resolution, setResolution] = useState("");
  const [resolutionDone, setResolutionDone] = useState(false);

  const [cursorAt, setCursorAt] = useState("none");
  const hasRun = useRef(false);

  const typeText = useCallback(async (setter, text, speed = 38) => {
    for (let i = 1; i <= text.length; i++) {
      setter(text.slice(0, i));
      await wait(speed + (Math.random() * 14 - 7));
    }
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    (async () => {
      await wait(400);

      setCursorAt("open");
      await typeText(setOpen, COPY_OPEN, 13);
      await wait(280);
      setOpenDone(true);

      setCursorAt("q1");
      await wait(100);
      await typeText(setQ1, COPY_Q1, 15);
      await wait(320);
      setQ1Done(true);

      setCursorAt("beat1");
      await typeText(setBeat1, COPY_BEAT1, 14);
      await wait(280);
      setBeat1Done(true);

      setCursorAt("q2");
      await wait(100);
      await typeText(setQ2, COPY_Q2, 15);
      await wait(320);
      setQ2Done(true);

      setCursorAt("beat2");
      await typeText(setBeat2, COPY_BEAT2, 14);
      await wait(280);
      setBeat2Done(true);

      setCursorAt("resolution");
      await typeText(setResolution, COPY_RES, 13);
      await wait(160);
      setResolutionDone(true);

      setCursorAt("none");
      onReady && onReady();
    })();
  }, [typeText, onReady]);

  const bodyClass =
    "font-display text-[clamp(1.55rem,3.8vw,1.95rem)] font-medium text-ash leading-[1.68] tracking-tight";
  const questionClass =
    "font-display text-[clamp(1.42rem,4.1vw,2.1rem)] font-semibold italic text-primary leading-[1.5] tracking-tight";
  const blueContemplativeClass =
    "font-display text-[clamp(1.58rem,3.95vw,2rem)] font-semibold italic leading-[1.68] tracking-tight";
  const resolutionClass =
    "font-display text-[clamp(1.72rem,4.25vw,2.2rem)] font-bold text-ash leading-[1.62] tracking-tight";

  return (
    <>
      <style jsx global>{`
        @keyframes cursorBlink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>

      <div className="flex w-full flex-col gap-y-10 tb:gap-y-11">
        {/* Paragraph 1 — dark body; “heavy” accent */}
        <div className={`${bodyClass} min-h-[2.5rem]`}>
          {openDone ? (
            <>
              Pick one thing you wish you were better at. Your work. A craft. Something{" "}
              <span className="text-primary font-semibold italic">heavy</span>.
            </>
          ) : (
            <>
              {open}
              <Cursor visible={cursorAt === "open"} />
            </>
          )}
        </div>

        {openDone && (
          <div className={`${questionClass} min-h-[2.75rem]`}>
            {q1Done ? <span>{COPY_Q1}</span> : (
              <>
                {q1}
                <Cursor color="#8B0000" visible={cursorAt === "q1"} />
              </>
            )}
          </div>
        )}

        {q1Done && (
          <div className={`${bodyClass} min-h-[1.75rem]`}>
            {beat1Done ? (
              COPY_BEAT1
            ) : (
              <>
                {beat1}
                <Cursor visible={cursorAt === "beat1"} />
              </>
            )}
          </div>
        )}

        {beat1Done && (
          <div className={`${questionClass} min-h-[2.75rem]`}>
            {q2Done ? <span>{COPY_Q2}</span> : (
              <>
                {q2}
                <Cursor color="#8B0000" visible={cursorAt === "q2"} />
              </>
            )}
          </div>
        )}

        {q2Done && (
          <div
            className={`${blueContemplativeClass} min-h-[1.5rem]`}
            style={{ color: HERO_MASK_BLUE }}
          >
            {beat2Done ? (
              COPY_BEAT2
            ) : (
              <>
                {beat2}
                <Cursor color={HERO_MASK_BLUE} visible={cursorAt === "beat2"} />
              </>
            )}
          </div>
        )}

        {beat2Done && (
          <div className={`${resolutionClass} min-h-[2.25rem]`}>
            {resolutionDone ? (
              <>
                That&apos;s the{" "}
                <span className="text-primary italic text-[1.18em] font-bold">puzzle</span> this is built to
                solve.
              </>
            ) : (
              <>
                {resolution}
                <Cursor color="#8B0000" visible={cursorAt === "resolution"} />
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
