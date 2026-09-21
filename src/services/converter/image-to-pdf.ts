/**
 * Document Converter - Image to PDF
 * Converts images (JPG, PNG, WEBP) to PDF documents.
 */

import { PDFDocument } from 'pdf-lib';
import type { ImageToPDFOptions, PageSize, Orientation } from '../../shared';
import { PAGE_SIZES } from '../../shared';
import * as fs from 'fs';
import * as path from 'path';

interface ImageInput {
  data: Buffer | Uint8Array;
  name: string;
  format: 'jpg' | 'jpeg' | 'png' | 'webp';
}

/**
 * Convert images to PDF.
 */
export class ImageToPDFConverter {
  /**
   * Convert one or more images to a PDF document.
   */
  async convert(
    images: ImageInput[],
    options: Partial<ImageToPDFOptions> = {}
  ): Promise<Uint8Array> {
    const {
      pageSize = 'A4',
      orientation = 'portrait',
      margin = 36, // 0.5 inch in points
      fitToPage = true,
    } = options;

    const pdfDoc = await PDFDocument.create();
    const pageDims = this.getPageDimensions(pageSize, orientation, options);

    for (const img of images) {
      try {
        let imageData = img.data;

        // If WEBP, we need sharp to convert (server-side only)
        if (img.format === 'webp') {
          try {
            const sharp = require('sharp');
            imageData = await sharp(imageData).png().toBuffer();
            img.format = 'png' as any;
          } catch {
            throw new Error('WEBP conversion requires sharp module');
          }
        }

        // Embed image
        let embeddedImage;
        if (img.format === 'png') {
          embeddedImage = await pdfDoc.embedPng(imageData);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageData);
        }

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        // Calculate dimensions
        const availableWidth = pageDims.width - margin * 2;
        const availableHeight = pageDims.height - margin * 2;

        let drawWidth = imgWidth;
        let drawHeight = imgHeight;

        if (fitToPage) {
          const scaleX = availableWidth / imgWidth;
          const scaleY = availableHeight / imgHeight;
          const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
        }

        // Center on page
        const x = margin + (availableWidth - drawWidth) / 2;
        const y = margin + (availableHeight - drawHeight) / 2;

        const page = pdfDoc.addPage([pageDims.width, pageDims.height]);
        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      } catch (error: any) {
        throw new Error(`Failed to add image "${img.name}": ${error.message}`);
      }
    }

    return pdfDoc.save();
  }

  /**
   * Get page dimensions based on size and orientation.
   */
  private getPageDimensions(
    pageSize: PageSize,
    orientation: Orientation,
    options: Partial<ImageToPDFOptions>
  ): { width: number; height: number } {
    let dims: { width: number; height: number };

    if (pageSize === 'Custom' && options.customWidth && options.customHeight) {
      dims = { width: options.customWidth, height: options.customHeight };
    } else {
      dims = PAGE_SIZES[pageSize as keyof typeof PAGE_SIZES] || PAGE_SIZES.A4;
    }

    if (orientation === 'landscape') {
      return { width: Math.max(dims.width, dims.height), height: Math.min(dims.width, dims.height) };
    }

    return { width: Math.min(dims.width, dims.height), height: Math.max(dims.width, dims.height) };
  }
}
