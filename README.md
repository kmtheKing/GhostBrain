# GhostBrain

> **Version:** `v0.0.1` | **Status:** Active Development (Phase 1: Local Hybrid RAG)  
> **Privacy Posture:** 100% Offline-First | Local-First Storage | Zero Telemetry

GhostBrain is a commercial, privacy-first "second brain" desktop engine that indexes your local documents with hardware-accelerated local AI. It delivers cited, accurate answers using **Hybrid Reciprocal Rank Fusion (RRF)** across dense vectors and full-text search—backed by an encrypted zero-knowledge remote relay and an air-gapped LAN edition for medical clinics.

---

## Key Architecture Pillars

- **Hybrid RRF Search:** Combines semantic dense embeddings via `sqlite-vec` (cosine distance) and keyword BM25 ranking via SQLite `FTS5` with 60-rank Reciprocal Rank Fusion.
- **Content-Addressable Ingestion:** Streaming 64 KB **BLAKE3** file hashing skips unchanged files instantly (0 ms waste) and preserves chunk embeddings during file renames.
- **Heading-Aware Chunking:** Intelligently preserves Markdown hierarchy (`H1 > H2 > H3`) with fenced code block and table protection, preventing semantic fragmentation.
- **SQLCipher-Ready Foundation:** Built from day one on `better-sqlite3-multiple-ciphers` with Write-Ahead Logging (WAL) and memory temp stores.
- **Zero-Knowledge Cloud Relay:** Pinned end-to-end encrypted relay (X25519 + HKDF-SHA256 + AES-256-GCM) where cloud infrastructure never sees plaintext.
- **Clinical Air-Gap LAN Host:** Dedicated air-gapped LAN server mode for clinic workflows with hash-chained audit trails and zero public internet dependency.

---

## Monorepo Structure

GhostBrain is organized as a high-performance `pnpm` monorepo:

```
GhostBrain/
├── apps/
│   └── desktop/                  # Electron 35 + React 19 + TypeScript desktop daemon
│       ├── src/main/             # Main process, Tray daemon, IPC handlers, SQLite & Watcher
│       ├── src/preload/          # Hardened typed contextBridge interface
│       ├── src/renderer/         # React 19 UI (Stats, Watched Folders, Search, Chat)
│       └── out/                  # Electron build artifacts
├── packages/
│   ├── core/                     # Platform-agnostic RAG primitives & algorithms
│   │   ├── src/hash.ts           # Streaming 64 KB BLAKE3 file hasher
│   │   ├── src/chunker.ts        # Markdown heading-aware hierarchical chunker
│   │   ├── src/parser.ts         # Document parser router (.md, .txt, .json, .yaml)
│   │   └── src/rrf.ts            # Reciprocal Rank Fusion ranking algorithm
│   └── shared-types/             # Strictly typed IPC contracts, payloads & schemas
├── docs/                         # Master architectural & compliance specifications
└── pnpm-workspace.yaml           # Workspace configuration
```

---

## Completed Milestones & Feature Status

| Milestone | Chapter | Description | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Ch 1.1: Electron IPC & Tray** | Hardened window, single instance lock, system tray, SQLite schema v1, WAL pragmas | **Complete** (`692f3b2`) |
| **Phase 1** | **Ch 1.2: Watcher & Chunker** | Chokidar watcher (500ms debounce), BLAKE3 streaming hasher, heading chunker, 11/11 tests | **Complete** (`309345b`) |
| **Phase 1** | **Startup & Native ABI Fix** | Electron 35 upgrade for N-API compatibility with `better-sqlite3-multiple-ciphers` v13 + `sqlite-vec` | **Complete** (`782d9d2`) |
| **Phase 1** | **Ch 1.3: Vector RRF & LLM** | `sqlite-vec` cosine similarity + FTS5 RRF hybrid retrieval & local LLM streaming inference | **Active (Next)** |
| **Phase 1** | **Ch 1.4: Low-Power Modes** | CPU-only and low-VRAM gaming toggles (< 3s release) | Planned |
| **Phase 2** | **Ch 2.1–2.3: Cloud Relay** | E2E encrypted WSS tunnel, Cloudflare Workers/DO, sealed D1 clipper queue | Planned |
| **Phase 3** | **Ch 3.1–3.2: Demo & CI/CD** | WebAssembly demo sandbox, GitHub Actions release matrix | Planned |

---

## Prerequisites & Setup

- **Node.js:** `>= 22.0.0`
- **Package Manager:** `pnpm >= 12.0.0`
- **Platform:** Windows 10/11, macOS, or Linux

### Installation

```bash
# Install all dependencies across the workspace
pnpm install

# Build internal shared packages and desktop bundles
pnpm build
```

---

## Development Commands

```bash
# Run unit tests across all packages (Vitest)
pnpm test

# Typecheck all packages in the workspace strictly
pnpm typecheck

# Launch the desktop application in production build mode
pnpm --filter @ghostbrain/desktop start

# Launch the desktop app with hot-reloading (Vite Dev Server)
pnpm dev
```

---

## Security & Data Integrity

- **Local-First Storage:** All file metadata, extracted chunks, and vector embeddings reside strictly inside:
  - Windows: `%APPDATA%\@ghostbrain\desktop\data\brain.sqlite`
  - macOS: `~/Library/Application Support/@ghostbrain/desktop/data/brain.sqlite`
  - Linux: `~/.config/@ghostbrain/desktop/data/brain.sqlite`
- **Sandboxed Context Bridge:** Renderer runs with `contextIsolation: true` and `nodeIntegration: false`. All renderer-to-main communication is strictly typechecked across dedicated IPC handlers.
- **Non-Destructive Indexing:** GhostBrain never modifies or moves your original files; it only reads and indexes them into the local SQLite vector database.

---

## License & Compliance

GhostBrain is a commercial proprietary project. All rights reserved.
Medical clinic editions strictly conform to HIPAA Security Rule § 164.312 (air-gapped local CA, role-based access control, and hash-chained audit trails).
