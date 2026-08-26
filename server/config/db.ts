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
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      isConnected = true;
      console.log('Connected successfully to MongoDB.');
      return;
    } catch (err) {
      console.warn('Could not connect to provided MONGODB_URI, falling back to in-memory instance:', err);
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
