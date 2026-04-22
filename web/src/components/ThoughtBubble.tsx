"use client";

export function ThoughtBubble({ text, fresh = false }: { text: string | null; fresh?: boolean }) {
  if (!text) return null;
  return <div className={`thought-bubble ${fresh ? "thought-fresh" : "thought-old"}`}>{text}</div>;
}
