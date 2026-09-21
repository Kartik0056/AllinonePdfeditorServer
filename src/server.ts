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

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.netlify.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically (for development)
app.use('/uploads', express.static(uploadDir));

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

// ─── Error Handler ──────────────────────────────────────────

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large. Maximum size is 100MB.',
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
    } catch (dbError: any) {
      console.warn(`⚠️  MongoDB connection failed: ${dbError?.message || dbError}`);
      console.warn('⚠️  Auth & projects disabled. Tools still work.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 PDF Editor API running on http://localhost:${PORT}`);
      console.log(`📁 Uploads directory: ${uploadDir}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
