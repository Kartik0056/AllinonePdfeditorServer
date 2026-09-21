/**
 * PDF Editor SDK - PDF Splitter
 * Splits a PDF document by page ranges.
 */

import { PDFDocument } from 'pdf-lib';

export interface SplitResult {
  /** The split PDF bytes */
  data: Uint8Array;
  /** Name for the split file */
  name: string;
  /** Page range string */
  range: string;
  /** Number of pages in this split */
  pageCount: number;
}

/**
 * Splits PDFs by various strategies.
 */
export class PDFSplitter {
  /**
   * Split every page into its own PDF.
   */
  async splitEveryPage(pdfBytes: Uint8Array | ArrayBuffer): Promise<SplitResult[]> {
    const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const results: SplitResult[] = [];

    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);

      results.push({
        data: await newDoc.save(),
        name: `page_${i + 1}.pdf`,
        range: `${i + 1}`,
        pageCount: 1,
      });
    }

    return results;
  }

  /**
   * Split by page ranges.
   * Ranges are 1-indexed strings like "1-5", "6-10", "11-20".
   */
  async splitByRanges(
    pdfBytes: Uint8Array | ArrayBuffer,
    ranges: string[]
  ): Promise<SplitResult[]> {
    const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const results: SplitResult[] = [];

    for (const range of ranges) {
      const { start, end } = this.parseRange(range, totalPages);

      const pageIndices: number[] = [];
      for (let i = start - 1; i < end; i++) {
        pageIndices.push(i);
      }

      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        newDoc.addPage(page);
      }

      results.push({
        data: await newDoc.save(),
        name: `pages_${start}-${end}.pdf`,
        range: `${start}-${end}`,
        pageCount: pageIndices.length,
      });
    }

    return results;
  }

  /**
   * Extract specific pages (1-indexed).
   */
  async extractPages(
    pdfBytes: Uint8Array | ArrayBuffer,
    pages: number[]
  ): Promise<SplitResult> {
    const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    // Convert to 0-indexed
    const pageIndices = pages.map((p) => p - 1);

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    return {
      data: await newDoc.save(),
      name: `extracted_pages.pdf`,
      range: pages.join(','),
      pageCount: pages.length,
    };
  }

  /**
   * Parse a range string like "1-5" into start and end.
   */
  private parseRange(range: string, totalPages: number): { start: number; end: number } {
    const trimmed = range.trim();

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(totalPages, parseInt(endStr, 10));

      if (isNaN(start) || isNaN(end) || start > end) {
        throw new Error(`Invalid range: ${range}`);
      }

      return { start, end };
    }

    // Single page
    const page = parseInt(trimmed, 10);
    if (isNaN(page) || page < 1 || page > totalPages) {
      throw new Error(`Invalid page number: ${range}`);
    }

    return { start: page, end: page };
  }
}
