/**
 * Document Converter - Image Format Converter
 * Converts between JPG, PNG, and WEBP formats using Sharp.
 */

import sharp from 'sharp';
import type { ImageFormat } from '../../shared';
// @ts-ignore
import decodeHeic from 'heic-decode';

export interface ImageConversionResult {
  data: Buffer;
  format: ImageFormat;
  width: number;
  height: number;
  size: number;
}

/**
 * Convert between image formats.
 */
export class ImageFormatConverter {
  /**
   * Helper to normalize input data into a Sharp instance, handling HEIC if necessary.
   */
  private async getSharpInstance(inputData: Buffer | Uint8Array): Promise<sharp.Sharp> {
    const buf = Buffer.isBuffer(inputData) ? inputData : Buffer.from(inputData);
    try {
      const meta = await sharp(buf).metadata();
      if (meta.format) {
        return sharp(buf);
      }
    } catch {
      // If sharp cannot read directly, attempt heic-decode
    }

    try {
      const decoded = await decodeHeic({ buffer: buf });
      return sharp(Buffer.from(decoded.data), {
        raw: {
          width: decoded.width,
          height: decoded.height,
          channels: 4,
        },
      });
    } catch {
      return sharp(buf);
    }
  }

  /**
   * Convert an image to the target format.
   */
  async convert(
    inputData: Buffer | Uint8Array,
    targetFormat: ImageFormat,
    quality: number = 85
  ): Promise<ImageConversionResult> {
    let processor = await this.getSharpInstance(inputData);

    switch (targetFormat) {
      case 'jpg':
      case 'jpeg':
        processor = processor.jpeg({ quality, mozjpeg: true });
        break;
      case 'png':
        processor = processor.png({ compressionLevel: 9 - Math.floor(quality / 12) });
        break;
      case 'webp':
        processor = processor.webp({ quality });
        break;
      case 'tiff':
        processor = processor.tiff({ quality });
        break;
      case 'gif':
        processor = processor.gif();
        break;
      case 'avif':
        processor = processor.avif({ quality });
        break;
      case 'heic':
      case 'heif':
        try {
          processor = processor.heif({ quality, compression: 'av1' });
        } catch {
          processor = processor.avif({ quality });
        }
        break;
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }

    const outputBuffer = await processor.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    return {
      data: outputBuffer,
      format: targetFormat,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: outputBuffer.length,
    };
  }

  /**
   * Get image metadata.
   */
  async getMetadata(inputData: Buffer | Uint8Array): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    const processor = await this.getSharpInstance(inputData);
    const metadata = await processor.metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: inputData.length,
    };
  }

  /**
   * Resize an image.
   */
  async resize(
    inputData: Buffer | Uint8Array,
    width: number,
    height: number,
    format?: ImageFormat
  ): Promise<Buffer> {
    let processor = (await this.getSharpInstance(inputData)).resize(width, height, { fit: 'inside' });

    if (format) {
      switch (format) {
        case 'jpg':
        case 'jpeg':
          processor = processor.jpeg();
          break;
        case 'png':
          processor = processor.png();
          break;
        case 'webp':
          processor = processor.webp();
          break;
        case 'tiff':
          processor = processor.tiff();
          break;
        case 'gif':
          processor = processor.gif();
          break;
        case 'avif':
          processor = processor.avif();
          break;
        case 'heic':
        case 'heif':
          try {
            processor = processor.heif({ compression: 'av1' });
          } catch {
            processor = processor.avif();
          }
          break;
      }
    }

    return processor.toBuffer();
  }
}
