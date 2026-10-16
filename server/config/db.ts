import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGOMS_MD5_CHECK = 'false';

let mongoServer: MongoMemoryServer | null = null;
let isConnected = false;

export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const customUri = process.env.MONGODB_URI;

  if (customUri && customUri.trim() !== '') {
    try {
      console.log('Connecting to provided MongoDB URI...');
      await mongoose.connect(customUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
      });
      isConnected = true;
      console.log('✅ Connected successfully to MongoDB Atlas.');
      return;
    } catch (err: any) {
      console.error('❌ Could not connect to provided MONGODB_URI:', err.message || err);
      // If user provided a link, do NOT silently download 760MB in-memory mongo unless explicitly forced
      if (process.env.FORCE_MEMORY_DB !== 'true') {
        throw new Error(
          `MongoDB connection failed (${err.message}). Check your internet connection or MongoDB Atlas IP whitelist. To force in-memory DB, set FORCE_MEMORY_DB=true.`
        );
      }
      console.warn('Falling back to in-memory instance as FORCE_MEMORY_DB=true...');
    }
  }

  try {
    console.log('Initializing embedded in-memory MongoDB...');
    if (!mongoServer) {
      mongoServer = await MongoMemoryServer.create({
        binary: {
          checkMD5: false,
        },
      });
    }
    const memoryUri = mongoServer.getUri();
    await mongoose.connect(memoryUri);
    isConnected = true;
    console.log(`Connected successfully to in-memory MongoDB at ${memoryUri}`);
  } catch (error) {
    console.error('Failed to initialize in-memory MongoDB:', error);
    throw error;
  }
}

export async function disconnectDB() {
  isConnected = false;
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}
