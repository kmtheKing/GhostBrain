import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  RelayWireMessage,
  RelayHelloPayload,
  EncryptedEnvelope
} from '@ghostbrain/shared-types';

export interface RemoteCitation {
  label: string;
  file: string;
  score?: number;
  line?: number;
  headingPath?: string;
}

export interface HostTelemetry {
  cpuLoad: number;
  cpuCores: number;
  cpuModel: string;
  totalRamMB: number;
  usedRamMB: number;
  activeModel: string;
  tier: string;
  isModelOnline: boolean;
}

export interface RemoteChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thoughts?: string[];
  citations?: RemoteCitation[];
  timestamp: number;
}

export interface UseRelayClientOptions {
  relayUrl?: string;
  sessionId?: string;
  desktopFingerprint?: string;
  pairingCode?: string;
  autoConnect?: boolean;
}

export function useRelayClient(options: UseRelayClientOptions = {}) {
  const relayBaseUrl =
    options.relayUrl ||
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'ws://localhost:8787'
      : 'wss://relay.ghostbrain.local');

  const sessionId = options.sessionId || (typeof window !== 'undefined' ? localStorage.getItem('ghostbrain_session_id') : null) || 'default-vault-session';
  const targetDesktopFp = options.desktopFingerprint || (typeof window !== 'undefined' ? localStorage.getItem('ghostbrain_desktop_fp') : null) || 'desktop';

  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'handshaking' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [streamedAnswer, setStreamedAnswer] = useState('');
  const [streamedThoughts, setStreamedThoughts] = useState<string[]>([]);
  const [citations, setCitations] = useState<RemoteCitation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [telemetry, setTelemetry] = useState<HostTelemetry | null>(null);
  const [timeline, setTimeline] = useState<RemoteChatMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mobileFingerprint = useRef<string>(
    typeof window !== 'undefined'
      ? localStorage.getItem('ghostbrain_mobile_fp') || 'mob_' + Math.random().toString(36).slice(2, 10)
      : 'mob_default'
  );

  const sendCounter = useRef(0);
  const receiveCounter = useRef(0);
  const accumulatedStreamText = useRef('');

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    setError(null);

    const fp = mobileFingerprint.current;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghostbrain_mobile_fp', fp);
    }

    const url = `${relayBaseUrl.replace(/^http/, 'ws')}/session/${sessionId}?role=mobile&fingerprint=${fp}`;
    const code = options.pairingCode || (typeof window !== 'undefined' ? localStorage.getItem('ghostbrain_pairing_code') : null) || undefined;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('handshaking');
        // Send initial HELLO frame to Desktop with OTP pairing code
        const helloMsg: RelayWireMessage = {
          type: 'HELLO',
          sessionId,
          from: fp,
          to: targetDesktopFp,
          payload: {
            ephPub: 'eph_' + Math.random().toString(16).slice(2),
            sig: 'sig_' + Math.random().toString(16).slice(2),
            identityPub: 'id_' + Math.random().toString(16).slice(2),
            fingerprint: fp,
            pairingCode: code,
            clientName: typeof navigator !== 'undefined' && /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile Remote' : 'Web Remote'
          } as RelayHelloPayload
        };
        ws.send(JSON.stringify(helloMsg));
      };

      ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
          const msg = JSON.parse(raw) as RelayWireMessage;

          if (msg.type === 'PONG') return;

          if (msg.type === 'HELLO_ACK') {
            setStatus('connected');
            return;
          }

          if (msg.type === 'ERROR') {
            setError(msg.error || 'Relay tunnel error');
            return;
          }

          // Hydration of continuous timeline and live host telemetry from desktop
          if (msg.type === 'SYNC_INIT') {
            if (msg.payload?.timeline && Array.isArray(msg.payload.timeline)) {
              setTimeline(
                msg.payload.timeline.map((m: any) => ({
                  id: m.id || 'msg_' + Math.random().toString(36).slice(2, 8),
                  role: m.role || 'assistant',
                  content: m.content || '',
                  thoughts: m.thoughts || [],
                  citations: m.citations || [],
                  timestamp: m.timestamp || Date.now()
                }))
              );
            }
            if (msg.payload?.telemetry) {
              setTelemetry(msg.payload.telemetry);
            }
            return;
          }

          if (msg.type === 'MESSAGE_SYNC') {
            const m = msg.payload?.message;
            if (m) {
              setTimeline((prev) => {
                if (prev.some((existing) => existing.id === m.id)) return prev;
                return [
                  ...prev,
                  {
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    thoughts: m.thoughts || [],
                    citations: m.citations || [],
                    timestamp: m.timestamp || Date.now()
                  }
                ];
              });
            }
            return;
          }

          if (msg.type === 'CLEAR_TIMELINE') {
            setTimeline([]);
            return;
          }

          if (msg.type === 'DATA') {
            const envelope = msg.payload as EncryptedEnvelope;
            if (envelope && envelope.ciphertext) {
              try {
                let decryptedText = '';
                try {
                  decryptedText = new TextDecoder().decode(
                    Uint8Array.from(envelope.ciphertext.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [])
                  );
                } catch {
                  decryptedText = envelope.ciphertext;
                }

                const data = JSON.parse(decryptedText);

                if (data.type === 'TOKEN') {
                  accumulatedStreamText.current += data.delta;
                  setStreamedAnswer((prev) => prev + data.delta);
                } else if (data.type === 'THOUGHT') {
                  setStreamedThoughts((prev) => [...prev, data.thought]);
                } else if (data.type === 'SYNC_MESSAGE' && data.message) {
                  const m = data.message;
                  setTimeline((prev) => {
                    if (prev.some((existing) => existing.id === m.id)) return prev;
                    return [...prev, m];
                  });
                } else if (data.type === 'DONE') {
                  setIsStreaming(false);
                  const finalCitations: RemoteCitation[] = data.citations
                    ? data.citations.map((c: any, i: number) => ({
                        label: c.tag || `[S${i + 1}]`,
                        file: c.relPath || c.docPath || 'document',
                        score: c.score,
                        line: c.line,
                        headingPath: c.headingPath
                      }))
                    : [];

                  setCitations(finalCitations);

                  const completedText = data.fullText || accumulatedStreamText.current;
                  const assistantMessage: RemoteChatMessage = {
                    id: 'ast_' + Date.now(),
                    role: 'assistant',
                    content: completedText,
                    thoughts: [...streamedThoughts],
                    citations: finalCitations,
                    timestamp: Date.now()
                  };

                  setTimeline((prev) => [...prev, assistantMessage]);
                  setStreamedAnswer('');
                  setStreamedThoughts([]);
                  accumulatedStreamText.current = '';
                }
              } catch (parseErr) {
                console.warn('[RemoteHook] Decrypt frame error:', parseErr);
              }
            }
          }
        } catch (e: any) {
          console.error('[RemoteHook] Message error:', e);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;
      };

      ws.onerror = () => {
        setStatus('error');
        setError('WebSocket relay unreachable');
      };
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Connection failed');
    }
  }, [options.pairingCode, relayBaseUrl, sessionId, targetDesktopFp, streamedThoughts]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setStatus('disconnected');
    setIsStreaming(false);
  }, []);

  const sendQuery = useCallback(
    async (query: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        throw new Error('Relay tunnel is not connected');
      }

      setStreamedAnswer('');
      setStreamedThoughts([]);
      setCitations([]);
      accumulatedStreamText.current = '';
      setIsStreaming(true);

      // Append user query to timeline immediately
      const userMessage: RemoteChatMessage = {
        id: 'usr_' + Date.now(),
        role: 'user',
        content: query,
        timestamp: Date.now()
      };
      setTimeline((prev) => [...prev, userMessage]);

      const fp = mobileFingerprint.current;
      const ctr = ++sendCounter.current;

      const payloadStr = JSON.stringify({ query, limit: 4 });
      const hexCiphertext = Array.from(new TextEncoder().encode(payloadStr))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const envelope: EncryptedEnvelope = {
        counter: ctr,
        iv: '00'.repeat(12),
        tag: 'ff'.repeat(16),
        ciphertext: hexCiphertext
      };

      const wireMsg: RelayWireMessage = {
        type: 'DATA',
        sessionId,
        from: fp,
        to: targetDesktopFp,
        payload: envelope,
        ctr
      };

      wsRef.current.send(JSON.stringify(wireMsg));
    },
    [sessionId, targetDesktopFp]
  );

  useEffect(() => {
    if (options.autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [options.autoConnect, connect, disconnect]);

  return {
    status,
    error,
    isStreaming,
    streamedAnswer,
    streamedThoughts,
    citations,
    telemetry,
    timeline,
    connect,
    disconnect,
    sendQuery
  };
}
