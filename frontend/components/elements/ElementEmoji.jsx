/**
 * Element emoji (🌳🔥💨🌊) with grayscale so sidebar/canvas stay on the neutral palette.
 * Full-color emoji are unchanged in chat copy elsewhere.
 */
export default function ElementEmoji({ emoji, className = "" }) {
  if (!emoji) return null;
  return (
    <span
      className={`inline-block shrink-0 grayscale opacity-[0.72] contrast-[0.95] ${className}`}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
