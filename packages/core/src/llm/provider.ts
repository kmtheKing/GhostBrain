export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  signal?: AbortSignal;
}

export interface ModelProvider {
  name: string;
  checkHealth(): Promise<boolean>;
  streamChat(messages: ChatMessage[], options?: StreamOptions): AsyncIterable<string>;
}
