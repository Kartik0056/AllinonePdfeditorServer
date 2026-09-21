/**
 * File routes - Upload files
 */

import { Router, Request, Response } from 'express';
import { uploadAny, uploadDir } from '../middleware/upload';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const router = Router();

// GET /api/files/download/:filename
router.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const rawFilename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const safeFilename = path.basename(rawFilename || '');
    const filePath = path.join(uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found or expired' });
    }

    const downloadName = (req.query.name as string) || safeFilename;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.download(filePath, downloadName);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Download failed' });
  }
});

// POST /api/files/upload
router.post('/upload', optionalAuth, uploadAny.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Validate file magic bytes
    const filePath = req.file.path;
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    // Validate PDF magic bytes
    if (req.file.mimetype === 'application/pdf') {
      const pdfMagic = buffer.toString('ascii', 0, 5);
      if (pdfMagic !== '%PDF-') {
        fs.unlinkSync(filePath);
        return res.status(400).json({ success: false, error: 'Invalid PDF file' });
      }
    }

    // Validate image magic bytes
    if (req.file.mimetype.startsWith('image/')) {
      const isJPEG = buffer[0] === 0xff && buffer[1] === 0xd8;
      const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50;
      const isWEBP = buffer[0] === 0x52 && buffer[1] === 0x49;

      if (!isJPEG && !isPNG && !isWEBP) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ success: false, error: 'Invalid image file' });
      }
    }

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
});

// POST /api/files/upload-multiple
router.post('/upload-multiple', optionalAuth, uploadAny.array('files', 20), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const fileInfos = files.map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      path: `/uploads/${f.filename}`,
    }));

    res.json({ success: true, data: fileInfos });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
});

export default router;
