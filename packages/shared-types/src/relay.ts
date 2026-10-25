export type RelayRole = 'desktop' | 'mobile' | 'web';

export type RelayFrameType =
  | 'HELLO'
  | 'HELLO_ACK'
  | 'DATA'
  | 'PING'
  | 'PONG'
  | 'PEER_STATUS'
  | 'ERROR';

export interface EncryptedEnvelope {
  counter: number;
  iv: string; // 12-byte hex nonce
  tag: string; // 16-byte hex auth tag
  ciphertext: string; // hex payload
}

export interface RelayHelloPayload {
  ephPub: string; // 32-byte X25519 ephemeral pubkey hex
  sig: string; // 64-byte Ed25519 signature hex
  identityPub: string; // 32-byte Ed25519 identity pubkey hex
  fingerprint: string;
}

export interface RelayWireMessage {
  type: RelayFrameType;
  sessionId: string;
  from: string;
  to: string;
  payload?: any;
  ctr?: number;
  timestamp?: number;
  error?: string;
}

export interface RelayPeerStatus {
  fingerprint: string;
  role: RelayRole;
  status: 'online' | 'offline';
  lastPingAt: number;
}

export interface RelaySessionMetadata {
  sessionId: string;
  desktopFingerprint?: string;
  connectedClients: number;
  createdAt: number;
}
