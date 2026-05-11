import type { ParsedPage } from "./parse";

// Token estimate: roughly 1 token per 4 characters for English,
// ~1 per 2 characters for Arabic. We use a conservative average.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export interface Chunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
  tokenCount: number;
}

interface ChunkOptions {
  // Target chunk size in characters. ~600 tokens at 3.5 chars/token.
  targetSize: number;
  // Overlap between consecutive chunks, in characters.
  overlap: number;
}

const DEFAULT_OPTS: ChunkOptions = {
  targetSize: 2000,
  overlap: 200,
};

// Split a single page's text into ~targetSize-character chunks, preferring
// to break on paragraph -> sentence -> word boundaries.
function splitPage(text: string, opts: ChunkOptions): string[] {
  if (text.length <= opts.targetSize) return text.length > 0 ? [text] : [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const end = Math.min(cursor + opts.targetSize, text.length);
    let sliceEnd = end;

    if (end < text.length) {
      // Walk back from `end` to find a clean boundary.
      const window = text.slice(cursor, end);
      const paragraphBreak = window.lastIndexOf("\n\n");
      const sentenceBreak = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("؟ "),  // Arabic question mark
        window.lastIndexOf("! "),
        window.lastIndexOf("؟"),
        window.lastIndexOf("۔"),   // Urdu/Arabic full stop
      );
      const wordBreak = window.lastIndexOf(" ");

      // Only respect a boundary if it's at least halfway through the window —
      // otherwise we shrink chunks too much.
      const minAcceptable = opts.targetSize * 0.5;
      if (paragraphBreak > minAcceptable) {
        sliceEnd = cursor + paragraphBreak + 2;
      } else if (sentenceBreak > minAcceptable) {
        sliceEnd = cursor + sentenceBreak + 2;
      } else if (wordBreak > minAcceptable) {
        sliceEnd = cursor + wordBreak + 1;
      }
    }

    const chunk = text.slice(cursor, sliceEnd).trim();
    if (chunk.length > 0) chunks.push(chunk);

    if (sliceEnd >= text.length) break;
    cursor = Math.max(sliceEnd - opts.overlap, cursor + 1);
  }

  return chunks;
}

export function chunkPages(
  pages: ParsedPage[],
  opts: Partial<ChunkOptions> = {},
): Chunk[] {
  const merged: ChunkOptions = { ...DEFAULT_OPTS, ...opts };
  const out: Chunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const slices = splitPage(page.text, merged);
    for (const slice of slices) {
      out.push({
        content: slice,
        pageNumber: page.pageNumber,
        chunkIndex: chunkIndex++,
        tokenCount: estimateTokens(slice),
      });
    }
  }

  return out;
}
