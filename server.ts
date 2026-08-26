import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './server/config/db.js';
import { seedDatabase } from './server/services/seed.js';

import authRoutes from './server/routes/authRoutes.js';
import categoryRoutes from './server/routes/categoryRoutes.js';
import bookRoutes from './server/routes/bookRoutes.js';
import memberRoutes from './server/routes/memberRoutes.js';
import assignmentRoutes from './server/routes/assignmentRoutes.js';
import dashboardRoutes from './server/routes/dashboardRoutes.js';
import settingRoutes from './server/routes/settingRoutes.js';
import masterRoutes from './server/routes/masterRoutes.js';
import supplierRoutes from './server/routes/supplierRoutes.js';
import shelfRoutes from './server/routes/shelfRoutes.js';
import superAdminRoutes from './server/routes/superAdminRoutes.js';
import subscriptionRoutes from './server/routes/subscriptionRoutes.js';
import uploadRoutes from './server/routes/uploadRoutes.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'School Library Management Backend',
    });
  });

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/books', bookRoutes);
  app.use('/api/members', memberRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/settings', settingRoutes);
  app.use('/api/masters', masterRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/shelves', shelfRoutes);
  app.use('/api/superadmin', superAdminRoutes);
  app.use('/api/subscription', subscriptionRoutes);
  app.use('/api/upload', uploadRoutes);

  // Global Error Handler for API
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Connect Database & Run Initial Seeding
  try {
    await connectDB();
    await seedDatabase();
  } catch (dbErr) {
    console.error('Database startup error:', dbErr);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 School Library Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
