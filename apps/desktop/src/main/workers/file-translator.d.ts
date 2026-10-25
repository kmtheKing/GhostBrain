export interface FileTranslationResult {
  path: string;
  ext: string;
  markdown: string;
  pages: number;
  metadata: {
    size: number;
    mtime: number;
    title?: string;
  };
}

export function translateFileToMarkdown(filePath: string): Promise<FileTranslationResult>;
export function isSupportedFile(filePath: string): boolean;
