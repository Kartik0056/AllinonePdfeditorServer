/**
 * Project and File Cleanup Service
 * Automatically cleans up expired projects (10-minute TTL) and removes physical files from disk.
 */

import fs from 'fs';
import path from 'path';
import { Project } from '../models/Project';
import { uploadDir } from '../middleware/upload';

/**
 * Remove physical file associated with a project from storage
 */
export async function removeProjectFileFromDisk(filePath?: string) {
  if (!filePath) return;
  try {
    const filename = path.basename(filePath);
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(uploadDir, filename);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      console.log(`[Cleanup] Removed file: ${filename}`);
    }
  } catch (err: any) {
    console.warn(`[Cleanup] Could not unlink file ${filePath}:`, err.message);
  }
}

/**
 * Clean up all projects that have passed their 10-minute expiry
 */
export async function cleanupExpiredProjects(): Promise<number> {
  try {
    const now = new Date();
    const expiredProjects = await Project.find({
      expiresAt: { $lte: now },
    });

    if (expiredProjects.length === 0) return 0;

    console.log(`[Cleanup] Found ${expiredProjects.length} expired project(s). Purging...`);

    for (const project of expiredProjects) {
      await removeProjectFileFromDisk(project.filePath);
      if (project.thumbnail && !project.thumbnail.startsWith('data:')) {
        await removeProjectFileFromDisk(project.thumbnail);
      }
    }

    const deleteResult = await Project.deleteMany({
      expiresAt: { $lte: now },
    });

    console.log(`[Cleanup] Purged ${deleteResult.deletedCount} expired project(s) from database.`);
    return deleteResult.deletedCount || 0;
  } catch (err: any) {
    console.error('[Cleanup] Error during expired projects cleanup:', err);
    return 0;
  }
}

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic cleanup worker (runs every 30 seconds)
 */
export function startCleanupService() {
  if (cleanupInterval) return;

  console.log('[Cleanup] Starting 10-minute project expiration cleanup worker (every 30s)...');
  // Initial run
  cleanupExpiredProjects().catch(console.error);

  // Interval every 30 seconds
  cleanupInterval = setInterval(() => {
    cleanupExpiredProjects().catch(console.error);
  }, 30 * 1000);
}

/**
 * Stop cleanup worker (for tests or graceful shutdown)
 */
export function stopCleanupService() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
