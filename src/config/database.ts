/**
 * Database configuration - MongoDB connection via Mongoose
 */

import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  let uri = (process.env.MONGODB_URI || 'mongodb://localhost:27017/pdfeditor').trim();
  // Strip accidental quotes, newlines, tabs, and spaces
  uri = uri.replace(/[\r\n\t]/g, '').replace(/^["']|["']$/g, '').trim();

  // If connecting to MongoDB Atlas and authSource is not specified, ensure authSource=admin
  if (uri.startsWith('mongodb+srv://') && !uri.includes('authSource=')) {
    const sep = uri.includes('?') ? '&' : '?';
    uri = `${uri}${sep}authSource=admin`;
  }

  const maskedUri = uri.replace(/:([^@]+)@/, (_m, pass) => `:****(len:${pass.length})@`);
  console.log(`Connecting to MongoDB: ${maskedUri}`);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
