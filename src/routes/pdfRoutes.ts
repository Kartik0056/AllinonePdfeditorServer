/**
 * PDF routes - Merge, Split, Compress
 */

import { Router, Request, Response } from 'express';
import { uploadMultiplePDFs, uploadPDF, uploadDir } from '../middleware/upload';
import { optionalAuth } from '../middleware/auth';
import { PDFMerger, PDFSplitter } from '../services/pdf';
import { PDFCompressor } from '../services/converter';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const merger = new PDFMerger();
const splitter = new PDFSplitter();
const compressor = new PDFCompressor();

// POST /api/pdf/merge
router.post('/merge', optionalAuth, uploadMultiplePDFs.array('files', 20), async (req: Request, res: Response) => {
  const uploadedFiles: string[] = [];
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 PDFs are required for merging' });
    }

    const inputs = [];
    for (const file of files) {
      uploadedFiles.push(file.path);
      const data = fs.readFileSync(file.path);
      inputs.push({ data: new Uint8Array(data), name: file.originalname });
    }

    const mergedBytes = await merger.merge(inputs);

    // Save merged file
    const outputName = `merged_${uuidv4()}.pdf`;
    const outputPath = path.join(uploadDir, outputName);
    fs.writeFileSync(outputPath, mergedBytes);

    res.json({
      success: true,
      data: {
        filename: outputName,
        path: `/uploads/${outputName}`,
        size: mergedBytes.length,
        pageCount: files.length, // approximate
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Merge failed' });
  } finally {
    // Clean up uploaded source files
    for (const f of uploadedFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
});

// POST /api/pdf/split
router.post('/split', optionalAuth, uploadPDF.single('file'), async (req: Request, res: Response) => {
  let uploadedFile = '';
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded' });
    }
    uploadedFile = req.file.path;

    const { mode, ranges, pages } = req.body;
    const pdfData = fs.readFileSync(req.file.path);
    const pdfBytes = new Uint8Array(pdfData);

    let results;

    switch (mode) {
      case 'every-page':
        results = await splitter.splitEveryPage(pdfBytes);
        break;
      case 'by-range':
        if (!ranges) {
          return res.status(400).json({ success: false, error: 'Ranges are required for range-based splitting' });
        }
        const rangeArray = typeof ranges === 'string' ? JSON.parse(ranges) : ranges;
        results = await splitter.splitByRanges(pdfBytes, rangeArray);
        break;
      case 'extract':
        if (!pages) {
          return res.status(400).json({ success: false, error: 'Pages are required for extraction' });
        }
        const pageArray = typeof pages === 'string' ? JSON.parse(pages) : pages;
        const extracted = await splitter.extractPages(pdfBytes, pageArray);
        results = [extracted];
        break;
      default:
        results = await splitter.splitEveryPage(pdfBytes);
    }

    // If single result, send directly
    if (results.length === 1) {
      const outputName = `split_${uuidv4()}.pdf`;
      const outputPath = path.join(uploadDir, outputName);
      fs.writeFileSync(outputPath, results[0].data);

      return res.json({
        success: true,
        data: {
          type: 'single',
          filename: outputName,
          path: `/uploads/${outputName}`,
          size: results[0].data.length,
        },
      });
    }

    // Multiple results: create ZIP
    const zipName = `split_${uuidv4()}.zip`;
    const zipPath = path.join(uploadDir, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    for (const result of results) {
      archive.append(Buffer.from(result.data), { name: result.name });
    }

    await archive.finalize();

    await new Promise<void>((resolve) => output.on('close', resolve));

    res.json({
      success: true,
      data: {
        type: 'zip',
        filename: zipName,
        path: `/uploads/${zipName}`,
        size: fs.statSync(zipPath).size,
        files: results.map((r) => ({ name: r.name, range: r.range, pageCount: r.pageCount })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Split failed' });
  } finally {
    try { if (uploadedFile) fs.unlinkSync(uploadedFile); } catch {}
  }
});

// POST /api/pdf/compress
router.post('/compress', optionalAuth, uploadPDF.single('file'), async (req: Request, res: Response) => {
  let uploadedFile = '';
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded' });
    }
    uploadedFile = req.file.path;

    const level = (req.body.level || 'medium') as 'low' | 'medium' | 'high';
    const pdfData = fs.readFileSync(req.file.path);

    const result = await compressor.compress(new Uint8Array(pdfData), level);

    const outputName = `compressed_${uuidv4()}.pdf`;
    const outputPath = path.join(uploadDir, outputName);
    fs.writeFileSync(outputPath, result.data);

    res.json({
      success: true,
      data: {
        filename: outputName,
        path: `/uploads/${outputName}`,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        reduction: result.reduction,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Compression failed' });
  } finally {
    try { if (uploadedFile) fs.unlinkSync(uploadedFile); } catch {}
  }
});

export default router;
