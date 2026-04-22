"use client";

export function ActionButtons({ onAction }: { onAction: (kind: "feed" | "play" | "chat") => void }) {
  return (
    <div className="action-buttons">
      <button className="y2k-button action-btn feed-btn" onClick={() => onAction("feed")}>
        🍖 FEED
      </button>
      <button className="y2k-button action-btn play-btn" onClick={() => onAction("play")}>
        🎮 PLAY
      </button>
      <button className="y2k-button action-btn chat-btn" onClick={() => onAction("chat")}>
        💬 CHAT
      </button>
    </div>
  );
}
