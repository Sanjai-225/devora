'use client';

/**
 * Real-time Agent Chat UI component for project workspace & requirement analysis.
 * Connects via WebSocket to `/api/v1/projects/{projectId}/agent/ws` with automatic
 * HTTP REST fallback so messages, clarifications, and approvals always succeed.
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { getWebSocketUrl } from '@/lib/api';
import type { ConversationMessage } from '@/types';
import {
  Bot,
  Send,
  User as UserIcon,
  Wifi,
  WifiOff,
  Sparkles,
  CheckCircle2,
  Paintbrush,
} from 'lucide-react';

interface AgentChatPanelProps {
  projectId: string;
  token?: string | null;
  messages: ConversationMessage[];
  currentStage: string;
  shouldWaitForUser: boolean;
  waitReason?: string | null;
  isProcessing?: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onApproveStack?: (choice: 'proceed' | 'design_first' | 'modify') => Promise<void>;
  onWsEvent?: (event: Record<string, unknown>) => void;
}

export function AgentChatPanel({
  projectId,
  token,
  messages,
  currentStage,
  shouldWaitForUser,
  waitReason,
  isProcessing = false,
  onSendMessage,
  onApproveStack,
  onWsEvent,
}: AgentChatPanelProps) {
  const [input, setInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isProcessing]);

  useEffect(() => {
    if (!projectId) return;
    let ws: WebSocket | null = null;
    try {
      const url = getWebSocketUrl(projectId, token || 'dev-token');
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onWsEvent?.(data);
        } catch {
          // Ignore malformed WS frames
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [projectId, token, onWsEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending || isProcessing) return;

    setInput('');
    setSending(true);
    try {
      await onSendMessage(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col rounded-lg bg-surface-1 border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-surface-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-cyan-muted border border-cyan-border flex items-center justify-center text-cyan">
            <Bot size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">Devora Requirement Agent</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-3 text-cyan border border-border">
                {currentStage.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          {wsConnected ? (
            <span className="flex items-center gap-1 text-emerald">
              <Wifi size={12} /> WS LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-text-muted" title="Using REST gateway">
              <WifiOff size={12} /> REST SYNC
            </span>
          )}
        </div>
      </div>

      {/* Conversation feed */}
      <div className="p-4 space-y-3 max-h-[340px] overflow-y-auto bg-canvas/60">
        {messages.length === 0 ? (
          <div className="py-8 text-center">
            <Sparkles size={20} className="text-cyan mx-auto mb-2 opacity-80" />
            <p className="text-xs text-text-secondary">
              Agent is ready to analyze requirements, clarify edge cases, and lock in your stack.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                    isUser
                      ? 'bg-surface-3 border-border text-text-secondary'
                      : 'bg-cyan-muted border-cyan-border text-cyan'
                  }`}
                >
                  {isUser ? <UserIcon size={13} /> : <Bot size={13} />}
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-surface-3 text-text-primary border border-border'
                      : 'bg-surface-2 text-text-secondary border border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-[10px] font-mono text-text-muted uppercase">
                      {isUser ? 'You' : 'Devora Agent'}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {msg.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-text-primary">{msg.content}</div>
                </div>
              </div>
            );
          })
        )}

        {(sending || isProcessing) && (
          <div className="flex items-center gap-2 text-xs text-cyan font-mono px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-cyan animate-ping" />
            Synthesizing specification updates...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Action Bar when waiting for Stack Confirmation */}
      {shouldWaitForUser && waitReason === 'stack_confirmation' && onApproveStack && (
        <div className="px-4 py-2.5 bg-surface-2 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-amber">
            Awaiting stack confirmation:
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<Paintbrush size={13} />}
              onClick={() => onApproveStack('design_first')}
              disabled={sending || isProcessing}
            >
              Design Prototype First
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<CheckCircle2 size={13} />}
              onClick={() => onApproveStack('proceed')}
              disabled={sending || isProcessing}
            >
              Confirm Stack & Proceed
            </Button>
          </div>
        </div>
      )}

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-surface-2 border-t border-border flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            waitReason === 'clarification'
              ? 'Reply to clarify requirements or use the decision controls above...'
              : 'Ask Devora to refine routes, add features, or adjust the tech stack...'
          }
          className="flex-1 h-9 px-3 bg-surface-1 border border-border rounded-[4px] text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-cyan"
          disabled={sending || isProcessing}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={sending || isProcessing}
          icon={<Send size={13} />}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
