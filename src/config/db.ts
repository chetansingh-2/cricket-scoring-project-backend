import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cricket-scoring');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    // Fix for the error handling
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while connecting to MongoDB';
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }
};

export default connectDB;