export interface SafeReadResult {
  path: string;
  content: string;
  isCompanion: boolean;
  type?: string;
  isBinary?: boolean;
  previewMarkdown?: string;
}

export interface SafeWriteResult {
  path: string;
  backupPath?: string;
  isCompanion: boolean;
}

export function isBinaryFile(filePath: string): boolean;
export function safeReadFile(filePath: string): Promise<SafeReadResult>;
export function safeWriteFile(filePath: string, content: string): Promise<SafeWriteResult>;
