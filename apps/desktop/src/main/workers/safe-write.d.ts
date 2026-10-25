export interface SafeReadResult {
  path: string;
  content: string;
  isCompanion: boolean;
  type?: string;
  isBinary?: boolean;
  previewMarkdown?: string;
}

export interface SafeWriteResult {
  success?: boolean;
  path: string;
  backupPath?: string;
  isCompanion: boolean;
  originalPath?: string;
  message?: string;
}

export function assertSafePath(targetPath: string, allowedRoots?: string[]): string;
export function isBinaryFile(filePath: string): boolean;
export function safeReadFile(filePath: string, allowedRoots?: string[]): Promise<SafeReadResult>;
export function safeWriteFile(filePath: string, content: string, allowedRoots?: string[]): Promise<SafeWriteResult>;
export function createFolderOrFile(
  targetPath: string,
  isDirectory?: boolean,
  content?: string,
  allowedRoots?: string[]
): Promise<any>;
