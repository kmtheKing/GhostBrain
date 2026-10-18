import type { ModelProvider, ChatMessage, StreamOptions } from './provider.js';

export interface OllamaConfig {
  baseUrl?: string;
  defaultModel?: string;
}

export class OllamaProvider implements ModelProvider {
  public readonly name = 'ollama';
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://127.0.0.1:11434';
    this.defaultModel = config.defaultModel || 'llama3.2:3b';
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(this.baseUrl + '/api/version', { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async *streamChat(messages: ChatMessage[], options: StreamOptions = {}): AsyncIterable<string> {
    const model = options.model || this.defaultModel;
    const body = {
      model: model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      options: {
        temperature: options.temperature !== undefined ? options.temperature : 0.2
      }
    };

    const res = await fetch(this.baseUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options.signal
    });

    if (!res.ok) {
      throw new Error('[Ollama] Chat request failed with status ' + res.status + ': ' + res.statusText);
    }

    if (!res.body) {
      throw new Error('[Ollama] Response body is null');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.message && parsed.message.content) {
              yield parsed.message.content;
            }
          } catch {
            // Ignore malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
