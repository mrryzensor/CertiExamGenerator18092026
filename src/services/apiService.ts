import { Template, EventItem, Certificate, Exam, ExamAttempt } from '../types';

const API_BASE = '/api';

export const api = {
  // --- Templates ---
  async getTemplates(): Promise<Template[]> {
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) throw new Error('Error al cargar plantillas');
    return res.json();
  },

  async getTemplate(id: string): Promise<Template> {
    const res = await fetch(`${API_BASE}/templates/${id}`);
    if (!res.ok) throw new Error('Error al cargar plantilla');
    return res.json();
  },

  async createTemplate(data: Partial<Template>): Promise<Template> {
    const res = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear plantilla');
    }
    return res.json();
  },

  async updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
    const res = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar plantilla');
    }
    return res.json();
  },

  async deleteTemplate(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/templates/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar plantilla');
  },

  // --- Events ---
  async getEvents(): Promise<EventItem[]> {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error('Error al cargar eventos');
    return res.json();
  },

  async getEvent(id: string): Promise<EventItem> {
    const res = await fetch(`${API_BASE}/events/${id}`);
    if (!res.ok) throw new Error('Error al cargar evento');
    return res.json();
  },

  async getEventBySlug(slug: string): Promise<EventItem> {
    const res = await fetch(`${API_BASE}/events/slug/${slug}`);
    if (!res.ok) throw new Error('Error al cargar evento');
    return res.json();
  },

  async createEvent(data: Partial<EventItem>): Promise<EventItem> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear evento');
    }
    return res.json();
  },

  async updateEvent(id: string, data: Partial<EventItem>): Promise<EventItem> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar evento');
    }
    return res.json();
  },

  async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar evento');
  },

  // --- Certificates ---
  async getCertificates(params: {
    search?: string;
    event_id?: string;
    template_id?: string;
    status?: string;
  } = {}): Promise<Certificate[]> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.event_id) query.append('event_id', params.event_id);
    if (params.template_id) query.append('template_id', params.template_id);
    if (params.status) query.append('status', params.status);

    const res = await fetch(`${API_BASE}/certificates?${query.toString()}`);
    if (!res.ok) throw new Error('Error al cargar certificados');
    return res.json();
  },

  async createCertificate(data: {
    template_id: string;
    event_id?: string;
    recipient_name: string;
    recipient_email?: string;
    recipient_identifier: string;
    issue_date?: string;
    custom_fields?: Record<string, any>;
  }): Promise<Certificate> {
    const res = await fetch(`${API_BASE}/certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al emitir certificado');
    }
    return res.json();
  },

  async batchIssueCertificates(data: {
    template_id: string;
    event_id?: string;
    issue_date?: string;
    recipients: any[];
  }): Promise<{
    totalReceived: number;
    issued: number;
    skippedDuplicates: number;
    certificates: Certificate[];
    errors: any[];
  }> {
    const res = await fetch(`${API_BASE}/certificates/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error en emisión masiva');
    }
    return res.json();
  },

  async publicRegister(data: {
    event_id: string;
    recipient_name: string;
    recipient_email?: string;
    recipient_identifier: string;
    custom_fields?: Record<string, any>;
  }): Promise<{ isExisting: boolean; message: string; certificate: Certificate }> {
    const res = await fetch(`${API_BASE}/certificates/public-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error en registro público');
    }
    return res.json();
  },

  async updateCertificateData(id: string, data: {
    recipient_name?: string;
    recipient_email?: string;
    custom_fields?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; certificate: Certificate }> {
    const res = await fetch(`${API_BASE}/certificates/${id}/update-data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar datos');
    }
    return res.json();
  },

  async toggleCertificateStatus(
    id: string,
    status: 'valid' | 'revoked',
    revocation_reason?: string
  ): Promise<Certificate> {
    const res = await fetch(`${API_BASE}/certificates/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, revocation_reason }),
    });
    if (!res.ok) throw new Error('Error al actualizar estado');
    return res.json();
  },

  async deleteCertificate(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/certificates/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar certificado');
  },

  async verifyCertificate(id: string): Promise<{
    found: boolean;
    status?: string;
    certificate?: any;
    message?: string;
  }> {
    const res = await fetch(`${API_BASE}/certificates/verify/${id}`);
    return res.json();
  },

  // --- Exams ---
  async getExams(): Promise<Exam[]> {
    const res = await fetch(`${API_BASE}/exams`);
    if (!res.ok) throw new Error('Error al cargar exámenes');
    return res.json();
  },

  async getExam(id: string): Promise<Exam> {
    const res = await fetch(`${API_BASE}/exams/${id}`);
    if (!res.ok) throw new Error('Error al cargar examen');
    return res.json();
  },

  async getPublicExam(id: string): Promise<{ exam: Exam; questions: any[] }> {
    const res = await fetch(`${API_BASE}/exams/public/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cargar examen público');
    }
    return res.json();
  },

  async createExam(data: Partial<Exam>): Promise<Exam> {
    const res = await fetch(`${API_BASE}/exams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear examen');
    }
    return res.json();
  },

  async updateExam(id: string, data: Partial<Exam>): Promise<Exam> {
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar examen');
    }
    return res.json();
  },

  async deleteExam(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/exams/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar examen');
  },

  async submitPublicExam(
    id: string,
    submission: {
      student_name: string;
      student_identifier: string;
      student_email?: string;
      answers: Record<string, any>;
      started_at: string;
    }
  ): Promise<{
    attempt_id: string;
    attempt_number: number;
    max_attempts: number;
    score: number;
    max_score: number;
    percentage: number;
    passing_percentage: number;
    passed: boolean;
    breakdown: any[];
    certificate?: Certificate;
  }> {
    const res = await fetch(`${API_BASE}/exams/public/${id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al enviar examen');
    }
    return res.json();
  },

  async getExamResults(id: string): Promise<ExamAttempt[]> {
    const res = await fetch(`${API_BASE}/exams/${id}/results`);
    if (!res.ok) throw new Error('Error al cargar resultados');
    return res.json();
  },

  // --- Uploads ---
  async uploadOptimizedImage(file: File, type: 'template' | 'logo' = 'template'): Promise<{
    success: boolean;
    relativePath: string;
    url: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload?type=${type}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al subir archivo');
    }
    return res.json();
  },
};
