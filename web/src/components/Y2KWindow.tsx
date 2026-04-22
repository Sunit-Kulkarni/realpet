"use client";
import type { ReactNode } from "react";

export function Y2KWindow({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`y2k-window ${className}`}>
      <div className="y2k-titlebar">
        <span className="y2k-title">{title}</span>
        <div className="y2k-buttons">
          <button className="y2k-btn">_</button>
          <button className="y2k-btn">□</button>
          <button className="y2k-btn">✕</button>
        </div>
      </div>
      <div className="y2k-content">{children}</div>
    </div>
  );
}
