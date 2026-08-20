"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listMessages, sendMessage, subscribeToMessages } from "@/lib/messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface ChatThreadProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
}

export function ChatThread({ conversationId, currentUserId, otherUserName }: ChatThreadProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    listMessages(supabase, conversationId).then((initial) => {
      if (!cancelled) {
        setMessages(initial);
        setLoading(false);
      }
    });

    const channel = subscribeToMessages(supabase, conversationId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;

    setSending(true);
    setError(null);
    const body = draft;
    setDraft("");

    try {
      const message = await sendMessage(supabase, conversationId, currentUserId, body);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to send.");
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border">
      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Say hello to {otherUserName} to kick off the negotiation.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted text-foreground"
                )}
              >
                {message.body}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${otherUserName}...`}
          className="min-h-[44px] flex-1 resize-none"
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Send message">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      {error && <p className="px-3 pb-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
