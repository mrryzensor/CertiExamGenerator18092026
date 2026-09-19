export type PaperSize = 'letter' | 'a4' | 'legal' | 'a3' | 'custom';
export type Orientation = 'landscape' | 'portrait';
export type ImageFitMode = 'fit' | 'cover' | 'stretch' | 'custom';

export interface TemplateElement {
  id: string;
  type: 'full_name' | 'first_name' | 'last_name' | 'date' | 'custom_text' | 'certificate_id' | 'qr_code' | 'field';
  label?: string;
  fieldKey?: string;
  staticText?: string;
  xPercent: number; // 0 to 100% relative to document width
  yPercent: number; // 0 to 100% relative to document height
  widthPercent?: number;
  heightPercent?: number;
  fontFamily?: string;
  fontSize?: number; // pt
  fontWeight?: string; // 'normal' | '500' | '600' | 'bold'
  fontStyle?: string; // 'normal' | 'italic'
  textDecoration?: string; // 'none' | 'underline'
  textTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  textAlign?: 'left' | 'center' | 'right';
  color?: string; // hex
  letterSpacing?: number; // px
  // QR code properties
  qrSize?: number; // size in mm or relative units
  qrDarkColor?: string;
  qrLightColor?: string;
  qrCornerRadius?: number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  page_size: PaperSize;
  custom_width?: number; // mm
  custom_height?: number; // mm
  unit: string;
  orientation: Orientation;
  image_path?: string;
  image_fit: ImageFitMode;
  image_custom_scale: number;
  image_custom_x: number;
  image_custom_y: number;
  elements_json: string; // JSON string of TemplateElement[]
  created_at: string;
  updated_at: string;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date';
  required: boolean;
  placeholder?: string;
}

export interface EventItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  template_id: string;
  template_name?: string;
  template_image?: string;
  unique_field_name: string;
  form_fields_json: string; // JSON string of FormField[]
  is_public_registration: number;
  created_at: string;
  updated_at: string;
}

export type CertificateStatus = 'valid' | 'revoked';

export interface Certificate {
  id: string; // permanent unique ID e.g. CERT-A89F-4B2C-2026
  event_id?: string;
  template_id: string;
  template_name?: string;
  event_name?: string;
  recipient_name: string;
  recipient_email?: string;
  recipient_identifier: string;
  issue_date: string;
  custom_fields_json?: string;
  status: CertificateStatus;
  revocation_reason?: string;
  pdf_path?: string;
  created_at: string;
  updated_at: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching' | 'short_answer';

export interface Question {
  id: string;
  exam_id?: string;
  order_index: number;
  type: QuestionType;
  prompt: string;
  points: number;
  options?: any; // Array of choices or matching pairs
  options_json?: string;
  correct_answer?: any;
  correct_answer_json?: string;
  explanation?: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  topic?: string;
  logo_path?: string;
  duration_minutes: number;
  max_attempts: number;
  passing_percentage: number;
  open_date?: string;
  close_date?: string;
  is_active: number;
  linked_template_id?: string;
  linked_template_name?: string;
  linked_event_id?: string;
  question_count?: number;
  attempts_count?: number;
  created_at: string;
  updated_at: string;
  questions?: Question[];
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_name: string;
  student_identifier: string;
  student_email?: string;
  attempt_number: number;
  score: number;
  max_score: number;
  percentage: number;
  passed: number;
  answers_json: string;
  certificate_id?: string;
  issued_cert_id?: string;
  started_at: string;
  completed_at: string;
}

export interface GeminiKeyConfig {
  id: string;
  key: string;
  label: string;
  status: 'active' | 'quota_exceeded' | 'invalid' | 'untested';
  lastUsed?: string;
}
