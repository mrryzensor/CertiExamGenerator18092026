import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { PATHS, DATA_DIR } from '../config.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.type === 'logo' ? PATHS.logosUploads : PATHS.templatesUploads;
    if (!fs.existsSync(type)) {
      fs.mkdirSync(type, { recursive: true });
    }
    cb(null, type);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase() || '.webp';
    cb(null, `${randomName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  },
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo de imagen' });
  }

  // Calculate relative path to DATA_DIR
  const relativePath = path.relative(DATA_DIR, req.file.path).replace(/\\/g, '/');
  const url = `/data/${relativePath}`;

  return res.json({
    success: true,
    relativePath,
    url,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

export default router;
