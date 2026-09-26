/**
 * Project routes - CRUD operations for user projects with 10-minute TTL auto-expiration
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Project } from '../models/Project';
import { removeProjectFileFromDisk, cleanupExpiredProjects } from '../services/cleanupService';
import { uploadDir } from '../middleware/upload';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/projects - List active non-expired user projects
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Proactively clean up any expired projects in the background
    cleanupExpiredProjects().catch(() => {});

    const now = new Date();
    const projects = await Project.find({
      userId: req.userId,
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: { $exists: false } },
      ],
    })
      .sort({ createdAt: -1 })
      .select('-filePath')
      .lean();

    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/projects - Create project with 10-minute TTL
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, originalFileName, filePath, fileSize, pageCount, metadata } = req.body;

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const project = new Project({
      userId: req.userId,
      name: name || originalFileName,
      originalFileName,
      filePath,
      fileSize,
      pageCount,
      metadata,
      expiresAt,
    });

    await project.save();

    res.status(201).json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/projects/save-edited - Save edited PDF directly with 10-minute auto-expiry
router.post('/save-edited', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, originalFileName, pdfBase64, pageCount, metadata } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'No PDF data provided' });
    }

    // Strip data URL prefix if present
    const cleanBase64 = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Restrict max size to 20MB
    const MAX_SIZE = 20 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return res.status(413).json({
        success: false,
        error: `File exceeds 20MB restriction (Size: ${(buffer.length / (1024 * 1024)).toFixed(1)}MB). Max allowed is 20MB.`,
      });
    }

    const safeName = `edited_${uuidv4()}.pdf`;
    const fullPath = path.join(uploadDir, safeName);
    await fs.promises.writeFile(fullPath, buffer);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Strict 10-minute TTL

    const project = new Project({
      userId: req.userId,
      name: name || originalFileName || 'Edited Document.pdf',
      originalFileName: originalFileName || 'document.pdf',
      filePath: `/uploads/${safeName}`,
      fileSize: buffer.length,
      pageCount: pageCount || 1,
      metadata: metadata || {},
      expiresAt,
    });

    await project.save();

    res.status(201).json({
      success: true,
      message: 'Edited PDF saved to projects with 10-minute auto-delete timer.',
      data: {
        ...project.toObject(),
        downloadUrl: `/uploads/${safeName}`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/projects/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found or expired' });
    }

    // Check if expired
    if (project.expiresAt && project.expiresAt.getTime() <= Date.now()) {
      await removeProjectFileFromDisk(project.filePath);
      await Project.deleteOne({ _id: project._id });
      return res.status(410).json({ success: false, error: 'Project expired and has been deleted' });
    }

    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, metadata, pageCount } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { name, metadata, pageCount, updatedAt: new Date() } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/projects/:id - Manual delete option (deletes from DB and unlinks disk file)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found or already deleted' });
    }

    // Immediately remove physical file from disk
    await removeProjectFileFromDisk(project.filePath);
    if (project.thumbnail && !project.thumbnail.startsWith('data:')) {
      await removeProjectFileFromDisk(project.thumbnail);
    }

    // Remove from MongoDB
    await Project.deleteOne({ _id: project._id });

    res.json({ success: true, message: 'Project and all files permanently deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
