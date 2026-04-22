"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface ChatMsg {
  petId: string;
  petName: string;
  species: string;
  text: string;
  at: number;
}

export function useGlobalChat(petId: string, petName: string, species: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const base = process.env.NEXT_PUBLIC_WORKER_URL ?? "";
    const wsUrl = base.replace(/^https/, "wss").replace(/^http/, "ws");
    const qs = new URLSearchParams({ petId, petName, species }).toString();
    const ws = new WebSocket(`${wsUrl}/api/chat/ws?${qs}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as { type: string } & ChatMsg;
        if (msg.type === "chat") {
          setMessages((prev) => [...prev, msg].slice(-50));
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
  }, [petId, petName, species]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendChat = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "chat", text }));
    }
  }, []);

  return { messages, sendChat };
}
