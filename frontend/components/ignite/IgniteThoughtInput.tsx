"use client";

/** Minimal thought composer for Ignite (parent pages may inline instead). */
export default function IgniteThoughtInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Add a thought…",
}) {
  return (
    <div className="flex gap-2 items-end border-t border-mist p-2 bg-white">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 border border-mist rounded-md px-2 py-1 text-sm resize-none"
      />
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={onSubmit}
        className="rounded-md bg-change px-3 py-2 text-sm text-white transition-colors hover:bg-change/90 disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}
