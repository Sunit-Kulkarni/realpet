"use client";
import { useRef, useEffect, useState } from "react";
import { useGlobalChat } from "@/hooks/useGlobalChat";
import { Y2KWindow } from "./Y2KWindow";

const SPECIES_EMOJI: Record<string, string> = { blob: "🫧", cat: "🐱", dragon: "🐉" };

export function ChatWindow({ petId, petName, species }: { petId: string; petName: string; species: string }) {
  const { messages, sendChat } = useGlobalChat(petId, petName, species);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    sendChat(text);
    setInput("");
  }

  return (
    <Y2KWindow title="🌐 Pet Sanctuary Chat — All Pets Welcome!">
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">No one is talking yet... be the first! 🐾</p>
        )}
        {messages.map((msg, i) => {
          const isSystem = msg.text.startsWith("*") && msg.text.endsWith("*");
          return (
            <div key={i} className={`chat-msg ${isSystem ? "chat-system" : ""} ${msg.petId === petId ? "chat-own" : ""}`}>
              {!isSystem && (
                <span className="chat-name">
                  {SPECIES_EMOJI[msg.species] ?? "🐾"} {msg.petName}:
                </span>
              )}
              <span className="chat-text">{msg.text}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          className="y2k-input chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={`${petName} says...`}
          maxLength={200}
        />
        <button className="y2k-button chat-send-btn" onClick={handleSend}>
          Send 💬
        </button>
      </div>
    </Y2KWindow>
  );
}
