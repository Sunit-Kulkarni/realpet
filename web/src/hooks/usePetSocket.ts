"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Pet } from "@/lib/api";

type ServerMsg =
  | { type: "state"; pet: Pet }
  | { type: "thought"; text: string; mood: { hunger: number; happiness: number }; at: number }
  | { type: "event"; kind: string; at: number };

export function usePetSocket(petId: string) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [events, setEvents] = useState<{ kind: string; at: number }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const base = process.env.NEXT_PUBLIC_WORKER_URL ?? "";
    const wsUrl = base.replace(/^https/, "wss").replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/api/pets/${petId}/ws`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as ServerMsg;
        if (msg.type === "state") setPet(msg.pet);
        else if (msg.type === "thought")
          setThoughts((prev) => [msg.text, ...prev].slice(0, 20));
        else if (msg.type === "event")
          setEvents((prev) => [{ kind: msg.kind, at: msg.at }, ...prev].slice(0, 20));
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();
  }, [petId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendAction = useCallback((kind: "feed" | "play" | "chat") => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "action", kind }));
    }
  }, []);

  return { pet, thoughts, events, sendAction };
}
