/**
 * Document Converter - PDF Compression
 * Reduces PDF file size by recompressing streams and downsampling images using sharp.
 */

import { PDFDocument, PDFRawStream, PDFName, decodePDFRawStream } from 'pdf-lib';
import * as pako from 'pako';
import sharp from 'sharp';
import type { CompressionLevel, CompressionResult } from '../../shared';

/**
 * Compresses PDF files with substantial size reduction using image downsampling and stream recompression.
 */
export class PDFCompressor {
  /**
   * Compress a PDF with the given level.
   */
  async compress(
    pdfBytes: Uint8Array | ArrayBuffer,
    level: CompressionLevel = 'medium'
  ): Promise<CompressionResult> {
    const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const originalSize = bytes.length;

    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const context = pdfDoc.context;

    // Collect all raw streams
    const imageStreams: PDFRawStream[] = [];
    const otherStreams: PDFRawStream[] = [];

    context.enumerateIndirectObjects().forEach(([, obj]) => {
      if (obj instanceof PDFRawStream) {
        const subtype = obj.dict.get(PDFName.of('Subtype'));
        if (subtype === PDFName.of('Image')) {
          imageStreams.push(obj);
        } else {
          otherStreams.push(obj);
        }
      }
    });

    // 1. Process image streams asynchronously with sharp
    await Promise.all(
      imageStreams.map(async (stream) => {
        await this.compressImageWithSharp(stream, level, context);
      })
    );

    // 2. Recompress other content streams with pako deflate
    const deflateLevel = this.getDeflateLevel(level);
    for (const stream of otherStreams) {
      try {
        const decoded = decodePDFRawStream(stream);
        const rawBytes = new Uint8Array(decoded.decode());
        const compressed = pako.deflate(rawBytes, { level: deflateLevel });

        if (compressed.length < rawBytes.length) {
          (stream as any).contents = compressed;
          stream.dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
          stream.dict.set(PDFName.of('Length'), context.obj(compressed.length));
        }
      } catch {
        // Skip streams that can't be decoded or recompressed
      }
    }

    // 3. Save optimized document with object streams
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const compressedData = new Uint8Array(compressedBytes);
    const reduction = ((originalSize - compressedData.length) / originalSize) * 100;

    return {
      originalSize,
      compressedSize: compressedData.length,
      reduction: Math.max(0, Math.round(reduction * 10) / 10),
      data: compressedData,
    };
  }

  /**
   * Get deflate compression level for non-image streams.
   */
  private getDeflateLevel(level: CompressionLevel): pako.DeflateFunctionOptions['level'] {
    switch (level) {
      case 'low': return 6;
      case 'medium': return 8;
      case 'high': return 9;
      default: return 8;
    }
  }

  /**
   * Apply image downscaling and compression via sharp.
   */
  private async compressImageWithSharp(
    stream: PDFRawStream,
    level: CompressionLevel,
    context: any
  ): Promise<void> {
    try {
      const contents = (stream as any).contents;
      if (!contents || contents.length === 0) return;

      const rawBuffer = Buffer.from(contents);
      let img = sharp(rawBuffer);
      const metadata = await img.metadata().catch(() => null);
      if (!metadata || !metadata.width || !metadata.height) return;

      // Settings based on compression level
      let maxDimension = 1600;
      let quality = 68;

      if (level === 'high') {
        maxDimension = 1280;
        quality = 55;
      } else if (level === 'low') {
        maxDimension = 1920;
        quality = 80;
      }

      // Resize and re-encode as optimized JPEG
      const targetWidth = Math.min(metadata.width, maxDimension);
      const targetHeight = Math.min(metadata.height, maxDimension);

      const compressedBuffer = await img
        .resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer();

      // Only apply if the compressed image is actually smaller
      if (compressedBuffer.length < contents.length) {
        const newMeta = await sharp(compressedBuffer).metadata();
        (stream as any).contents = new Uint8Array(compressedBuffer);
        stream.dict.set(PDFName.of('Length'), context.obj(compressedBuffer.length));
        if (newMeta.width) stream.dict.set(PDFName.of('Width'), context.obj(newMeta.width));
        if (newMeta.height) stream.dict.set(PDFName.of('Height'), context.obj(newMeta.height));
        stream.dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
        stream.dict.delete(PDFName.of('DecodeParms'));
      }
    } catch {
      // Gracefully fall back to original image on any processing issue
    }
  }
}
