import express from 'express';
import cors from 'cors';
import path from 'path';
import { DATA_DIR, ensureDirectories } from './config.js';
import { seedInitialData } from './seed.js';
import templatesRouter from './routes/templates.js';
import eventsRouter from './routes/events.js';
import certificatesRouter from './routes/certificates.js';
import examsRouter from './routes/exams.js';
import uploadRouter from './routes/upload.js';

ensureDirectories();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve physical files stored in DATA_DIR under /data
app.use('/data', express.static(DATA_DIR));

// API Routes
app.use('/api/templates', templatesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/exams', examsRouter);
app.use('/api/upload', uploadRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    timestamp: new Date().toISOString(),
    dataDir: DATA_DIR,
  });
});

async function startServer() {
  await seedInitialData();

  const isProd = process.env.NODE_ENV?.trim().toLowerCase() === 'production';

  if (isProd) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Integrate Vite dynamically in development only for fast HMR on port 3000
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n======================================================');
    console.log(`  CertiExamGenerator running strictly on PORT ${PORT}`);
    console.log(`  Access URL: http://localhost:${PORT}`);
    console.log(`  DATA_DIR:   ${DATA_DIR}`);
    console.log('======================================================\n');
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
