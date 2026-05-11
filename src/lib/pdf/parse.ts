import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedPdf {
  pages: ParsedPage[];
  pageCount: number;
}

export async function parsePdf(buffer: ArrayBuffer): Promise<ParsedPdf> {
  const data = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(data);
  const { text, totalPages } = await extractText(pdf, { mergePages: false });

  // unpdf returns string[] when mergePages is false.
  const pageTexts = Array.isArray(text) ? text : [text];

  const pages: ParsedPage[] = pageTexts.map((raw, i) => ({
    pageNumber: i + 1,
    text: raw.replace(/[ \t]+/g, " ").trim(),
  }));

  return { pages, pageCount: totalPages };
}

// Heuristic: detect dominant script. Used only to tag the document so
// the UI can flip rtl/ltr direction for previews.
export function detectLanguage(text: string): "ar" | "en" | "mixed" | null {
  const sample = text.slice(0, 4000);
  if (sample.length === 0) return null;
  let arabic = 0;
  let latin = 0;
  for (const ch of sample) {
    const code = ch.codePointAt(0)!;
    // Arabic block: U+0600-U+06FF, Arabic Supplement: U+0750-U+077F
    if ((code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f)) {
      arabic++;
    } else if (code >= 0x0041 && code <= 0x007a) {
      latin++;
    }
  }
  const total = arabic + latin;
  if (total === 0) return null;
  const arRatio = arabic / total;
  if (arRatio > 0.7) return "ar";
  if (arRatio < 0.1) return "en";
  return "mixed";
}
