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

export interface UseRelayClientOptions {
  relayUrl?: string;
  sessionId?: string;
  desktopFingerprint?: string;
  autoConnect?: boolean;
}

export function useRelayClient(options: UseRelayClientOptions = {}) {
  const relayBaseUrl = options.relayUrl || 'wss://relay.ghostbrain.local';
  const sessionId = options.sessionId || localStorage.getItem('ghostbrain_session_id') || 'default-vault-session';
  const targetDesktopFp = options.desktopFingerprint || localStorage.getItem('ghostbrain_desktop_fp') || 'desktop';

  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'handshaking' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [streamedAnswer, setStreamedAnswer] = useState('');
  const [citations, setCitations] = useState<RemoteCitation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mobileFingerprint = useRef<string>(
    typeof window !== 'undefined'
      ? localStorage.getItem('ghostbrain_mobile_fp') || 'mob_' + Math.random().toString(36).slice(2, 10)
      : 'mob_default'
  );

  const sendCounter = useRef(0);
  const receiveCounter = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    setError(null);

    const fp = mobileFingerprint.current;
    const url = `${relayBaseUrl.replace(/^http/, 'ws')}/session/${sessionId}?role=mobile&fingerprint=${fp}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('handshaking');
        // Send initial HELLO frame to Desktop
        const helloMsg: RelayWireMessage = {
          type: 'HELLO',
          sessionId,
          from: fp,
          to: targetDesktopFp,
          payload: {
            ephPub: 'eph_' + Math.random().toString(16).slice(2),
            sig: 'sig_' + Math.random().toString(16).slice(2),
            identityPub: 'id_' + Math.random().toString(16).slice(2),
            fingerprint: fp
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

          if (msg.type === 'DATA') {
            const envelope = msg.payload as EncryptedEnvelope;
            if (envelope && envelope.ciphertext) {
              // Simulated client-side AES-GCM decryption
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
                  setStreamedAnswer((prev) => prev + data.delta);
                } else if (data.type === 'DONE') {
                  setIsStreaming(false);
                  if (data.citations) {
                    setCitations(
                      data.citations.map((c: any, i: number) => ({
                        label: c.tag || `[S${i + 1}]`,
                        file: c.relPath || c.docPath || 'document',
                        score: c.score,
                        headingPath: c.headingPath
                      }))
                    );
                  }
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

      ws.onerror = (e) => {
        setStatus('error');
        setError('WebSocket relay unreachable');
      };
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Connection failed');
    }
  }, [relayBaseUrl, sessionId, targetDesktopFp]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setStatus('disconnected');
    setIsStreaming(false);
  }, []);

  const sendQuery = useCallback(async (query: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('Relay tunnel is not connected');
    }

    setStreamedAnswer('');
    setCitations([]);
    setIsStreaming(true);

    const fp = mobileFingerprint.current;
    const ctr = ++sendCounter.current;

    // Simulated client envelope packaging
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
  }, [sessionId, targetDesktopFp]);

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
    citations,
    connect,
    disconnect,
    sendQuery
  };
}
