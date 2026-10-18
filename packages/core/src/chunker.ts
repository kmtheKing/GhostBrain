import { computeBlake3, computeBlake3Hex } from './hash.js';

export interface Chunk {
  ordinal: number;
  chunkHash: Uint8Array;
  chunkHashHex: string;
  headingPath: string;
  text: string;
  tokenCount: number;
  charStart: number;
  charEnd: number;
}

export interface ChunkerOptions {
  targetTokens?: number;
  maxTokens?: number;
  overlapTokens?: number;
  countTokens?: (text: string) => number;
}

/**
 * Fast estimation of subword / WordPiece tokens.
 * Matches words, numbers, and individual punctuation marks.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  // Match word characters or individual punctuation tokens
  const tokens = text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu);
  return tokens ? tokens.length : 0;
}

/**
 * Normalizes text per GhostBrain spec:
 * Unicode NFC, unified linebreaks (\n), collapse excessive vertical whitespace, strip trailing space.
 */
export function normalizeChunkText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface Section {
  headingPath: string;
  level: number;
  rawText: string;
  charStart: number;
  charEnd: number;
}

interface Block {
  type: 'paragraph' | 'code' | 'table' | 'list';
  text: string;
  charStart: number;
  charEnd: number;
}

/**
 * Parses markdown into hierarchical sections based on Markdown headings (#, ##, ###).
 */
function parseSections(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  const headingStack: { level: number; text: string }[] = [];

  let currentSectionText: string[] = [];
  let currentSectionStart = 0;
  let charCursor = 0;

  function getCurrentHeadingPath(): string {
    return headingStack.map((h) => h.text).join(' > ');
  }

  function flushSection(endPos: number) {
    if (currentSectionText.length > 0) {
      const text = currentSectionText.join('\n');
      if (text.trim().length > 0) {
        sections.push({
          headingPath: getCurrentHeadingPath(),
          level: headingStack.length > 0 ? headingStack[headingStack.length - 1].level : 0,
          rawText: text,
          charStart: currentSectionStart,
          charEnd: endPos
        });
      }
      currentSectionText = [];
    }
  }

  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLenWithNewline = line.length + (i < lines.length - 1 ? 1 : 0);

    // Track fenced code blocks to prevent treating `#` comments inside code as headings
    if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      currentSectionText.push(line);
      charCursor += lineLenWithNewline;
      continue;
    }

    if (!inCodeBlock) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushSection(charCursor);
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();

        // Pop headings with >= level to maintain hierarchy
        while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
          headingStack.pop();
        }
        headingStack.push({ level, text: title });

        currentSectionStart = charCursor;
        currentSectionText.push(line);
        charCursor += lineLenWithNewline;
        continue;
      }
    }

    currentSectionText.push(line);
    charCursor += lineLenWithNewline;
  }

  flushSection(charCursor);

  return sections;
}

/**
 * Splits a section's body into semantic blocks: paragraphs, fenced code blocks, tables, and lists.
 */
function parseBlocks(sectionText: string, sectionCharStart: number): Block[] {
  const lines = sectionText.split('\n');
  const blocks: Block[] = [];

  let currentBlockLines: string[] = [];
  let currentBlockType: Block['type'] = 'paragraph';
  let blockStart = sectionCharStart;
  let charOffset = sectionCharStart;

  function flushBlock() {
    if (currentBlockLines.length === 0) return;
    const text = currentBlockLines.join('\n');
    if (text.trim().length > 0) {
      blocks.push({
        type: currentBlockType,
        text,
        charStart: blockStart,
        charEnd: charOffset
      });
    }
    currentBlockLines = [];
  }

  let inCode = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLen = line.length + (i < lines.length - 1 ? 1 : 0);

    // Fenced Code Block
    if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
      if (!inCode) {
        flushBlock();
        inCode = true;
        currentBlockType = 'code';
        blockStart = charOffset;
        currentBlockLines.push(line);
      } else {
        currentBlockLines.push(line);
        inCode = false;
        flushBlock();
        currentBlockType = 'paragraph';
        blockStart = charOffset + lineLen;
      }
      charOffset += lineLen;
      continue;
    }

    if (inCode) {
      currentBlockLines.push(line);
      charOffset += lineLen;
      continue;
    }

    // Markdown Table (starts with | or contains |---|)
    const isTableLine = line.trim().startsWith('|') || /^\s*\|?[-:]+\|[-:|\s]+$/.test(line);
    if (isTableLine) {
      if (!inTable) {
        flushBlock();
        inTable = true;
        currentBlockType = 'table';
        blockStart = charOffset;
      }
      currentBlockLines.push(line);
      charOffset += lineLen;
      continue;
    } else if (inTable) {
      inTable = false;
      flushBlock();
      currentBlockType = 'paragraph';
      blockStart = charOffset;
    }

    // Empty line separates paragraphs
    if (line.trim() === '') {
      flushBlock();
      blockStart = charOffset + lineLen;
      charOffset += lineLen;
      continue;
    }

    // Normal paragraph line
    currentBlockLines.push(line);
    charOffset += lineLen;
  }

  flushBlock();
  return blocks;
}

/**
 * Chunks a single large block if it exceeds the hard token cap.
 */
function splitLargeBlock(
  block: Block,
  maxTokens: number,
  targetTokens: number,
  countTokens: (text: string) => number
): Block[] {
  const totalTokens = countTokens(block.text);
  if (totalTokens <= maxTokens) {
    return [block];
  }

  // Split on sentence boundaries or line breaks
  const sentences = block.text.split(/(?<=[.?!;:\n])\s+/);
  const subBlocks: Block[] = [];
  let currentText: string[] = [];
  let currentTokens = 0;
  let cursor = block.charStart;

  for (const sentence of sentences) {
    const sTokens = countTokens(sentence);
    if (currentTokens + sTokens > targetTokens && currentText.length > 0) {
      const chunkStr = currentText.join(' ');
      subBlocks.push({
        type: block.type,
        text: chunkStr,
        charStart: cursor,
        charEnd: cursor + chunkStr.length
      });
      cursor += chunkStr.length;
      currentText = [];
      currentTokens = 0;
    }
    currentText.push(sentence);
    currentTokens += sTokens;
  }

  if (currentText.length > 0) {
    const chunkStr = currentText.join(' ');
    subBlocks.push({
      type: block.type,
      text: chunkStr,
      charStart: cursor,
      charEnd: block.charEnd
    });
  }

  return subBlocks;
}

/**
 * Chunks markdown text using heading hierarchy, semantic blocks, target token counts, and overlap.
 */
export function chunkMarkdown(markdown: string, options: ChunkerOptions = {}): Chunk[] {
  const targetTokens = options.targetTokens ?? 200;
  const maxTokens = options.maxTokens ?? 256;
  const overlapTokens = options.overlapTokens ?? 32;
  const countTokens = options.countTokens ?? estimateTokens;

  if (!markdown || markdown.trim().length === 0) {
    return [];
  }

  const sections = parseSections(markdown);
  const chunks: Chunk[] = [];
  let ordinal = 0;

  for (const section of sections) {
    const rawBlocks = parseBlocks(section.rawText, section.charStart);
    const blocks: Block[] = [];

    // Ensure no block exceeds hard cap
    for (const b of rawBlocks) {
      blocks.push(...splitLargeBlock(b, maxTokens, targetTokens, countTokens));
    }

    let currentChunkBlocks: Block[] = [];
    let currentTokens = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockTokens = countTokens(block.text);

      // If adding this block exceeds targetTokens and we already have content
      if (currentTokens + blockTokens > targetTokens && currentChunkBlocks.length > 0) {
        // Emit chunk
        const chunkText = currentChunkBlocks.map((b) => b.text).join('\n\n');
        const normalized = normalizeChunkText(chunkText);
        const charStart = currentChunkBlocks[0].charStart;
        const charEnd = currentChunkBlocks[currentChunkBlocks.length - 1].charEnd;

        chunks.push({
          ordinal: ordinal++,
          chunkHash: computeBlake3(normalized),
          chunkHashHex: computeBlake3Hex(normalized),
          headingPath: section.headingPath,
          text: normalized,
          tokenCount: countTokens(normalized),
          charStart,
          charEnd
        });

        // Compute overlap: keep last block(s) if within overlapTokens budget
        let overlapBudget = overlapTokens;
        const overlapBlocks: Block[] = [];
        for (let j = currentChunkBlocks.length - 1; j >= 0; j--) {
          const candidate = currentChunkBlocks[j];
          const cTokens = countTokens(candidate.text);
          if (cTokens <= overlapBudget && candidate.type !== 'code') {
            overlapBlocks.unshift(candidate);
            overlapBudget -= cTokens;
          } else {
            break;
          }
        }

        currentChunkBlocks = [...overlapBlocks, block];
        currentTokens = currentChunkBlocks.reduce((sum, b) => sum + countTokens(b.text), 0);
      } else {
        currentChunkBlocks.push(block);
        currentTokens += blockTokens;
      }
    }

    // Flush remaining blocks for section
    if (currentChunkBlocks.length > 0) {
      const chunkText = currentChunkBlocks.map((b) => b.text).join('\n\n');
      const normalized = normalizeChunkText(chunkText);
      const charStart = currentChunkBlocks[0].charStart;
      const charEnd = currentChunkBlocks[currentChunkBlocks.length - 1].charEnd;

      chunks.push({
        ordinal: ordinal++,
        chunkHash: computeBlake3(normalized),
        chunkHashHex: computeBlake3Hex(normalized),
        headingPath: section.headingPath,
        text: normalized,
        tokenCount: countTokens(normalized),
        charStart,
        charEnd
      });
    }
  }

  return chunks;
}
