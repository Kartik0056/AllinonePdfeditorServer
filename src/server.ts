/**
 * Backend - Express Server Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/database';
import authRoutes from './routes/authRoutes';
import fileRoutes from './routes/fileRoutes';
import pdfRoutes from './routes/pdfRoutes';
import convertRoutes from './routes/convertRoutes';
import projectRoutes from './routes/projectRoutes';
import { startCleanupService } from './services/cleanupService';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────

// Trust reverse proxy (Render, Cloudflare, Vercel)
app.set('trust proxy', 1);

// CORS - Handle preflight and all cross-origin requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing (support up to 50MB for 20MB binary base64 documents)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically with cross-origin access headers
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// ─── Routes ─────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/convert', convertRoutes);
app.use('/api/projects', projectRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'PDF Editor API is running', timestamp: new Date().toISOString() });
});

// Root route for ping/monitoring
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'PDF Studio API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Error Handler ──────────────────────────────────────────

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File exceeds 20MB limit. The maximum allowed PDF size is 20MB.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field.',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  });
});

// ─── Start Server ───────────────────────────────────────────

const startServer = async () => {
  try {
    // Connect to MongoDB (optional - app works without it for tool features)
    try {
      await connectDB();
      console.log('✅ MongoDB Atlas connected successfully');
      // Start 10-minute auto-expiry and file cleanup service
      startCleanupService();
    } catch (dbError: any) {
      console.warn(`⚠️  MongoDB connection failed: ${dbError?.message || dbError}`);
      console.warn('⚠️  Auth & projects disabled. Tools still work.');
    }

    const serverPort = Number(PORT) || 5000;
    app.listen(serverPort, '0.0.0.0', () => {
      console.log(`🚀 PDF Editor API running on http://0.0.0.0:${serverPort}`);
      console.log(`📁 Uploads directory: ${uploadDir}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
