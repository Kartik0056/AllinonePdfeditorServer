/**
 * Project routes - CRUD operations for user projects
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Project } from '../models/Project';

const router = Router();

// GET /api/projects - List user projects
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const projects = await Project.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select('-filePath')
      .lean();

    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/projects - Create project
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, originalFileName, filePath, fileSize, pageCount, metadata } = req.body;

    const project = new Project({
      userId: req.userId,
      name: name || originalFileName,
      originalFileName,
      filePath,
      fileSize,
      pageCount,
      metadata,
    });

    await project.save();

    res.status(201).json({ success: true, data: project });
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
      return res.status(404).json({ success: false, error: 'Project not found' });
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

// DELETE /api/projects/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
