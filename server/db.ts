import { DatabaseSync } from 'node:sqlite';
import { PATHS, ensureDirectories } from './config.js';

ensureDirectories();

export const db = new DatabaseSync(PATHS.dbFile);

// Enable WAL mode for high performance concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  page_size TEXT NOT NULL DEFAULT 'letter',
  custom_width REAL DEFAULT 279.4,
  custom_height REAL DEFAULT 215.9,
  unit TEXT DEFAULT 'mm',
  orientation TEXT NOT NULL DEFAULT 'landscape',
  image_path TEXT,
  image_fit TEXT DEFAULT 'fit',
  image_custom_scale REAL DEFAULT 1,
  image_custom_x REAL DEFAULT 0,
  image_custom_y REAL DEFAULT 0,
  elements_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_id TEXT NOT NULL,
  unique_field_name TEXT NOT NULL DEFAULT 'documento',
  form_fields_json TEXT NOT NULL DEFAULT '[]',
  is_public_registration INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  template_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_identifier TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  custom_fields_json TEXT DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'valid',
  revocation_reason TEXT,
  pdf_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  logo_path TEXT,
  duration_minutes INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 1,
  passing_percentage REAL DEFAULT 70,
  open_date TEXT,
  close_date TEXT,
  is_active INTEGER DEFAULT 1,
  linked_template_id TEXT,
  linked_event_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(linked_template_id) REFERENCES templates(id) ON DELETE SET NULL,
  FOREIGN KEY(linked_event_id) REFERENCES events(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  points REAL DEFAULT 1,
  options_json TEXT DEFAULT '[]',
  correct_answer_json TEXT NOT NULL,
  explanation TEXT,
  FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_identifier TEXT NOT NULL,
  student_email TEXT,
  attempt_number INTEGER NOT NULL,
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  percentage REAL NOT NULL,
  passed INTEGER NOT NULL,
  answers_json TEXT NOT NULL,
  certificate_id TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY(certificate_id) REFERENCES certificates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cert_event ON certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_cert_recipient ON certificates(recipient_identifier);
CREATE INDEX IF NOT EXISTS idx_cert_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_attempt_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_attempt_student ON exam_attempts(student_identifier);
`);

console.log('Database initialized successfully at', PATHS.dbFile);
