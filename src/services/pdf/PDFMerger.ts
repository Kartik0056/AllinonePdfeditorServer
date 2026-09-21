/**
 * PDF Editor SDK - PDF Merger
 * Merges multiple PDF documents into one.
 */

import { PDFDocument } from 'pdf-lib';

export interface MergeInput {
  data: Uint8Array | ArrayBuffer;
  name?: string;
}

/**
 * Merges multiple PDFs into a single document.
 */
export class PDFMerger {
  /**
   * Merge multiple PDFs into one.
   * @param inputs Array of PDF data to merge
   * @returns Merged PDF as Uint8Array
   */
  async merge(inputs: MergeInput[]): Promise<Uint8Array> {
    if (inputs.length === 0) {
      throw new Error('No PDFs to merge');
    }

    if (inputs.length === 1) {
      const bytes = inputs[0].data instanceof Uint8Array
        ? inputs[0].data
        : new Uint8Array(inputs[0].data);
      return bytes;
    }

    const mergedDoc = await PDFDocument.create();

    for (const input of inputs) {
      try {
        const bytes = input.data instanceof Uint8Array
          ? input.data
          : new Uint8Array(input.data);

        const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);

        for (const page of copiedPages) {
          mergedDoc.addPage(page);
        }
      } catch (error: any) {
        throw new Error(
          `Failed to merge ${input.name || 'PDF'}: ${error.message}`
        );
      }
    }

    return mergedDoc.save();
  }

  /**
   * Merge specific pages from multiple PDFs.
   * @param inputs Array of { data, pages } where pages is 0-indexed
   */
  async mergeSelectedPages(
    inputs: Array<{ data: Uint8Array | ArrayBuffer; pages: number[] }>
  ): Promise<Uint8Array> {
    const mergedDoc = await PDFDocument.create();

    for (const input of inputs) {
      const bytes = input.data instanceof Uint8Array
        ? input.data
        : new Uint8Array(input.data);

      const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(srcDoc, input.pages);

      for (const page of copiedPages) {
        mergedDoc.addPage(page);
      }
    }

    return mergedDoc.save();
  }
}
