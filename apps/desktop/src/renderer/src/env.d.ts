/// <reference types="vite/client" />
import type { GhostBrainApi } from '@ghostbrain/shared-types';

declare global {
  interface Window {
    ghostbrain: GhostBrainApi;
  }
}
