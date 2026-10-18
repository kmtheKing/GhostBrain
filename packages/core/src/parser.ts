import { promises as fs } from 'fs';
import { extname } from 'path';

export interface ParsedDocument {
  text: string;
  mime: string;
  parser: string;
}

export interface DocumentParser {
  supports(filePath: string): boolean;
  parse(filePath: string): Promise<ParsedDocument>;
}

export class NativeTextParser implements DocumentParser {
  private supportedExts = new Set(['.md', '.markdown', '.txt', '.log', '.json', '.yaml', '.yml']);

  supports(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return this.supportedExts.has(ext);
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const ext = extname(filePath).toLowerCase();
    const content = await fs.readFile(filePath, 'utf8');

    let mime = 'text/plain';
    let parser = 'native-txt';

    if (ext === '.md' || ext === '.markdown') {
      mime = 'text/markdown';
      parser = 'native-md';
    } else if (ext === '.json') {
      mime = 'application/json';
      parser = 'native-json';
    } else if (ext === '.yaml' || ext === '.yml') {
      mime = 'application/yaml';
      parser = 'native-yaml';
    }

    return {
      text: content,
      mime,
      parser
    };
  }
}

export class ParserRouter {
  private parsers: DocumentParser[] = [];

  constructor() {
    // Register native text parser by default
    this.register(new NativeTextParser());
  }

  register(parser: DocumentParser): void {
    this.parsers.unshift(parser); // Newest / most specific first
  }

  findParser(filePath: string): DocumentParser | undefined {
    return this.parsers.find((p) => p.supports(filePath));
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const parser = this.findParser(filePath);
    if (!parser) {
      throw new Error(`Unsupported document format for path: ${filePath}`);
    }
    return parser.parse(filePath);
  }
}

export const defaultParserRouter = new ParserRouter();
