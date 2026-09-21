/**
 * Convert routes - Image↔PDF, Image↔Image conversions
 */

import { Router, Request, Response } from 'express';
import { uploadImages, uploadPDF, uploadDir } from '../middleware/upload';
import { optionalAuth } from '../middleware/auth';
import { ImageToPDFConverter, ImageFormatConverter } from '../services/converter';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const imgToPdf = new ImageToPDFConverter();
const imgConverter = new ImageFormatConverter();

// POST /api/convert/image-to-pdf
router.post('/image-to-pdf', optionalAuth, uploadImages.array('images', 50), async (req: Request, res: Response) => {
  const uploadedFiles: string[] = [];
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }

    const images = [];
    for (const file of files) {
      uploadedFiles.push(file.path);
      const data = fs.readFileSync(file.path);
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '') as any;
      images.push({ data, name: file.originalname, format: ext === 'jpeg' ? 'jpg' : ext });
    }

    const options = {
      pageSize: (req.body.pageSize || 'A4') as any,
      orientation: (req.body.orientation || 'portrait') as any,
      margin: parseInt(req.body.margin || '36', 10),
      fitToPage: req.body.fitToPage !== 'false',
    };

    const pdfBytes = await imgToPdf.convert(images, options);

    const outputName = `converted_${uuidv4()}.pdf`;
    const outputPath = path.join(uploadDir, outputName);
    fs.writeFileSync(outputPath, pdfBytes);

    res.json({
      success: true,
      data: {
        filename: outputName,
        path: `/uploads/${outputName}`,
        size: pdfBytes.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Conversion failed' });
  } finally {
    for (const f of uploadedFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
});

// POST /api/convert/pdf-to-image
// Note: PDF rendering on server requires a canvas implementation.
// For browser-based rendering, the frontend handles this via PDF.js canvas.
router.post('/pdf-to-image', optionalAuth, uploadPDF.single('file'), async (req: Request, res: Response) => {
  let uploadedFile = '';
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded' });
    }
    uploadedFile = req.file.path;

    // For server-side PDF to image, we provide the PDF data back
    // and the client renders pages via PDF.js canvas then converts
    // This is the recommended approach since PDF.js works best in browser
    res.json({
      success: true,
      data: {
        message: 'PDF-to-image conversion is handled client-side via PDF.js for best quality',
        path: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to process PDF' });
  }
});

// POST /api/convert/image
router.post('/image', optionalAuth, uploadImages.single('image'), async (req: Request, res: Response) => {
  let uploadedFile = '';
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }
    uploadedFile = req.file.path;

    const targetFormat = ((req.body.format || 'png') as string).toLowerCase().replace('.', '') as any;
    const quality = parseInt(req.body.quality || '85', 10);

    const imageData = fs.readFileSync(req.file.path);
    const result = await imgConverter.convert(imageData, targetFormat, quality);

    const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    const outputName = `converted_${uuidv4()}.${ext}`;
    const outputPath = path.join(uploadDir, outputName);
    fs.writeFileSync(outputPath, result.data);

    res.json({
      success: true,
      data: {
        filename: outputName,
        originalName: req.file.originalname,
        path: `/uploads/${outputName}`,
        format: targetFormat,
        size: result.size,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Conversion failed' });
  } finally {
    try { if (uploadedFile) fs.unlinkSync(uploadedFile); } catch {}
  }
});

// POST /api/convert/images-batch (Multiple images conversion)
router.post('/images-batch', optionalAuth, uploadImages.array('images', 50), async (req: Request, res: Response) => {
  const uploadedFiles: string[] = [];
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }

    const targetFormat = ((req.body.format || 'png') as string).toLowerCase().replace('.', '') as any;
    const quality = parseInt(req.body.quality || '85', 10);
    const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;

    const results: any[] = [];
    for (const file of files) {
      uploadedFiles.push(file.path);
      const imageData = fs.readFileSync(file.path);
      const converted = await imgConverter.convert(imageData, targetFormat, quality);

      const outputName = `converted_${uuidv4()}.${ext}`;
      const outputPath = path.join(uploadDir, outputName);
      fs.writeFileSync(outputPath, converted.data);

      const baseName = path.parse(file.originalname).name;
      results.push({
        filename: outputName,
        displayName: `${baseName}.${ext}`,
        originalName: file.originalname,
        path: `/uploads/${outputName}`,
        format: targetFormat,
        size: converted.size,
        width: converted.width,
        height: converted.height,
      });
    }

    // Also generate a zip if more than 1 file
    let zipPath = null;
    let zipFilename = null;
    if (results.length > 1) {
      zipFilename = `batch_converted_${uuidv4()}.zip`;
      const fullZipPath = path.join(uploadDir, zipFilename);
      const output = fs.createWriteStream(fullZipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);

        for (const item of results) {
          const itemFullPath = path.join(uploadDir, item.filename);
          archive.file(itemFullPath, { name: item.displayName });
        }
        archive.finalize();
      });

      zipPath = `/uploads/${zipFilename}`;
    }

    res.json({
      success: true,
      data: {
        converted: results,
        zipPath,
        zipFilename,
        total: results.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Batch conversion failed' });
  } finally {
    for (const f of uploadedFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
});

export default router;
