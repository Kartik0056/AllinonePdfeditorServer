/**
 * Database configuration - MongoDB connection via Mongoose
 */

import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdfeditor';

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
