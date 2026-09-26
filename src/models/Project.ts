/**
 * Project model - Mongoose schema for user projects
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  pageCount: number;
  thumbnail?: string;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
    },
    metadata: {
      title: String,
      author: String,
      subject: String,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // Auto-expire after 10 minutes
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
