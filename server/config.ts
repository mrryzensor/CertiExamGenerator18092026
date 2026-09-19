import path from 'path';
import fs from 'fs';

export const DATA_DIR = process.env.DATA_DIR 
  ? path.resolve(process.env.DATA_DIR) 
  : path.resolve(process.cwd(), 'data');

export const PATHS = {
  data: DATA_DIR,
  db: path.join(DATA_DIR, 'db'),
  dbFile: path.join(DATA_DIR, 'db', 'certiexam.db'),
  templatesUploads: path.join(DATA_DIR, 'uploads', 'templates'),
  logosUploads: path.join(DATA_DIR, 'uploads', 'logos'),
  certificatesGenerated: path.join(DATA_DIR, 'generated', 'certificates'),
  examsGenerated: path.join(DATA_DIR, 'generated', 'exams'),
};

export function ensureDirectories() {
  Object.values(PATHS).forEach((dirPath) => {
    // If it's a file, ensure parent dir
    const targetDir = path.extname(dirPath) ? path.dirname(dirPath) : dirPath;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  });
}
