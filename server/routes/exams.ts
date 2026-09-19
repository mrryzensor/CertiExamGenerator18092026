import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { db } from '../db.js';
import { DATA_DIR, PATHS } from '../config.js';
import { generateExamPdf, generateCertificatePdf } from '../services/pdfService.js';
import { generateCertificateId } from './certificates.js';

const router = Router();

// GET all exams
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT e.*,
             (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) as question_count,
             (SELECT COUNT(*) FROM exam_attempts a WHERE a.exam_id = e.id) as attempts_count,
             t.name as linked_template_name
      FROM exams e
      LEFT JOIN templates t ON e.linked_template_id = t.id
      ORDER BY e.created_at DESC
    `);
    const exams = stmt.all();
    res.json(exams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single exam with full questions list (for admin/editor)
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const exam: any = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    const questions = db.prepare(
      'SELECT * FROM questions WHERE exam_id = ? ORDER BY order_index ASC'
    ).all(id);

    res.json({
      ...exam,
      questions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET public exam data for students taking the exam (strips correct answers & explanations!)
router.get('/public/:id', (req, res) => {
  try {
    const { id } = req.params;
    const exam: any = db.prepare(`
      SELECT id, title, description, topic, logo_path, duration_minutes,
             max_attempts, passing_percentage, open_date, close_date, is_active
      FROM exams WHERE id = ?
    `).get(id);

    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    if (!exam.is_active) {
      return res.status(403).json({ error: 'Este examen se encuentra inactivo actualmente.' });
    }

    const now = new Date();
    if (exam.open_date && new Date(exam.open_date) > now) {
      return res.status(403).json({
        error: `El examen aún no está disponible. Abre el ${new Date(exam.open_date).toLocaleString()}`,
      });
    }

    if (exam.close_date && new Date(exam.close_date) < now) {
      return res.status(403).json({
        error: `El examen ha cerrado. Fecha límite: ${new Date(exam.close_date).toLocaleString()}`,
      });
    }

    // Select questions without exposing answers
    const rawQuestions: any[] = db.prepare(
      'SELECT id, order_index, type, prompt, points, options_json FROM questions WHERE exam_id = ? ORDER BY order_index ASC'
    ).all(id);

    const questions = rawQuestions.map((q) => {
      let options: any = [];
      try {
        options = JSON.parse(q.options_json || '[]');
        // For matching questions in public mode, strip the right-side matches and provide shuffled right terms
        if (q.type === 'matching' && Array.isArray(options)) {
          const leftItems = options.map((item: any, i: number) => item.left || item.concept || `Item ${i + 1}`);
          const rightItems = options
            .map((item: any) => item.right || item.definition || '')
            .filter(Boolean)
            .sort(() => Math.random() - 0.5); // shuffle
          options = { leftItems, rightItems };
        }
      } catch (e) {
        options = [];
      }
      return {
        id: q.id,
        order_index: q.order_index,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        options,
      };
    });

    res.json({
      exam,
      questions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create exam
router.post('/', (req, res) => {
  try {
    const {
      title,
      description = '',
      topic = '',
      logo_path = null,
      duration_minutes = 0,
      max_attempts = 1,
      passing_percentage = 70,
      open_date = null,
      close_date = null,
      linked_template_id = null,
      linked_event_id = null,
      questions = [],
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'El título del examen es obligatorio' });
    }

    const id = `EXAM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO exams (
        id, title, description, topic, logo_path, duration_minutes,
        max_attempts, passing_percentage, open_date, close_date,
        is_active, linked_template_id, linked_event_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      id,
      title,
      description,
      topic,
      logo_path,
      Number(duration_minutes) || 0,
      Number(max_attempts) || 1,
      Number(passing_percentage) || 70,
      open_date,
      close_date,
      linked_template_id,
      linked_event_id,
      now,
      now
    );

    // Insert questions
    if (Array.isArray(questions)) {
      const qStmt = db.prepare(`
        INSERT INTO questions (
          id, exam_id, order_index, type, prompt, points,
          options_json, correct_answer_json, explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q: any, index: number) => {
        const qId = `Q-${crypto.randomBytes(4).toString('hex')}`;
        qStmt.run(
          qId,
          id,
          q.order_index !== undefined ? q.order_index : index,
          q.type || 'multiple_choice',
          q.prompt || '',
          Number(q.points) || 1,
          typeof q.options_json === 'string' ? q.options_json : JSON.stringify(q.options || []),
          typeof q.correct_answer_json === 'string'
            ? q.correct_answer_json
            : JSON.stringify(q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer),
          q.explanation || ''
        );
      });
    }

    const created = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update exam
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    const {
      title,
      description,
      topic,
      logo_path,
      duration_minutes,
      max_attempts,
      passing_percentage,
      open_date,
      close_date,
      is_active,
      linked_template_id,
      linked_event_id,
      questions,
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE exams SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        topic = COALESCE(?, topic),
        logo_path = COALESCE(?, logo_path),
        duration_minutes = COALESCE(?, duration_minutes),
        max_attempts = COALESCE(?, max_attempts),
        passing_percentage = COALESCE(?, passing_percentage),
        open_date = COALESCE(?, open_date),
        close_date = COALESCE(?, close_date),
        is_active = COALESCE(?, is_active),
        linked_template_id = COALESCE(?, linked_template_id),
        linked_event_id = COALESCE(?, linked_event_id),
        updated_at = ?
      WHERE id = ?
    `).run(
      title,
      description,
      topic,
      logo_path,
      duration_minutes !== undefined ? Number(duration_minutes) : null,
      max_attempts !== undefined ? Number(max_attempts) : null,
      passing_percentage !== undefined ? Number(passing_percentage) : null,
      open_date,
      close_date,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      linked_template_id,
      linked_event_id,
      now,
      id
    );

    // Update questions if passed
    if (Array.isArray(questions)) {
      db.prepare('DELETE FROM questions WHERE exam_id = ?').run(id);
      const qStmt = db.prepare(`
        INSERT INTO questions (
          id, exam_id, order_index, type, prompt, points,
          options_json, correct_answer_json, explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q: any, index: number) => {
        const qId = q.id || `Q-${crypto.randomBytes(4).toString('hex')}`;
        qStmt.run(
          qId,
          id,
          q.order_index !== undefined ? q.order_index : index,
          q.type || 'multiple_choice',
          q.prompt || '',
          Number(q.points) || 1,
          typeof q.options_json === 'string'
            ? q.options_json
            : JSON.stringify(q.options || q.options_json || []),
          typeof q.correct_answer_json === 'string'
            ? q.correct_answer_json
            : JSON.stringify(q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer),
          q.explanation || ''
        );
      });
    }

    const updated = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE exam
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM exams WHERE id = ?').run(id);
    res.json({ success: true, message: 'Examen eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET exam PDF download (student or teacher mode)
router.get('/:id/pdf/:mode', (req, res) => {
  try {
    const { id, mode } = req.params;
    const isTeacher = mode === 'teacher';

    const exam: any = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    const questions: any[] = db.prepare(
      'SELECT * FROM questions WHERE exam_id = ? ORDER BY order_index ASC'
    ).all(id);

    const relativePath = generateExamPdf(exam, questions, {
      mode: isTeacher ? 'teacher' : 'student',
    });

    const fullPdfPath = path.join(DATA_DIR, relativePath);
    const cleanTitle = (exam.title || 'Examen').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const downloadName = `${cleanTitle}_${isTeacher ? 'ClaveDocente' : 'Estudiante'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    fs.createReadStream(fullPdfPath).pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST submit online exam by student
router.post('/public/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      student_name,
      student_identifier,
      student_email = '',
      answers = {}, // { [questionId]: answerValue }
      started_at = new Date().toISOString(),
    } = req.body;

    if (!student_name || !student_identifier) {
      return res.status(400).json({
        error: 'El nombre del estudiante y el documento/identificador son requeridos',
      });
    }

    const exam: any = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    // Check attempts limit
    const prevAttempts: any[] = db.prepare(`
      SELECT * FROM exam_attempts
      WHERE exam_id = ? AND student_identifier = ?
      ORDER BY attempt_number DESC
    `).all(id, student_identifier);

    if (exam.max_attempts > 0 && prevAttempts.length >= exam.max_attempts) {
      return res.status(403).json({
        error: `Has alcanzado el número máximo de intentos permitidos (${exam.max_attempts}).`,
        attempts: prevAttempts,
      });
    }

    const nextAttemptNumber = prevAttempts.length + 1;

    // Retrieve all questions with correct answers
    const questions: any[] = db.prepare(
      'SELECT * FROM questions WHERE exam_id = ? ORDER BY order_index ASC'
    ).all(id);

    let totalScore = 0;
    let maxScore = 0;
    const breakdown: any[] = [];

    questions.forEach((q) => {
      const points = Number(q.points) || 1;
      maxScore += points;

      let correctAns: any;
      try {
        correctAns = JSON.parse(q.correct_answer_json);
      } catch (e) {
        correctAns = q.correct_answer_json;
      }

      const userAns = answers[q.id];
      let isCorrect = false;

      if (q.type === 'multiple_choice') {
        if (typeof correctAns === 'number') {
          isCorrect = userAns === correctAns;
        } else {
          isCorrect = String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
        }
      } else if (q.type === 'true_false') {
        const normUser = String(userAns).trim().toLowerCase();
        const normCorrect = String(correctAns).trim().toLowerCase();
        isCorrect =
          normUser === normCorrect ||
          (normUser === 'true' && (normCorrect === 'verdadero' || normCorrect === '1')) ||
          (normUser === 'false' && (normCorrect === 'falso' || normCorrect === '0'));
      } else if (q.type === 'fill_blank' || q.type === 'short_answer') {
        const normUser = String(userAns || '').trim().toLowerCase();
        if (Array.isArray(correctAns)) {
          isCorrect = correctAns.some(
            (alt) => String(alt).trim().toLowerCase() === normUser
          );
        } else {
          isCorrect = normUser === String(correctAns || '').trim().toLowerCase();
        }
      } else if (q.type === 'matching') {
        // userAns is expected to be an object { [leftItem]: rightItem }
        if (userAns && typeof userAns === 'object' && typeof correctAns === 'object') {
          let allMatch = true;
          let pairCount = 0;
          Object.entries(correctAns).forEach(([k, v]) => {
            pairCount++;
            if (String(userAns[k] || '').trim().toLowerCase() !== String(v || '').trim().toLowerCase()) {
              allMatch = false;
            }
          });
          isCorrect = pairCount > 0 && allMatch;
        }
      }

      const earned = isCorrect ? points : 0;
      totalScore += earned;

      breakdown.push({
        question_id: q.id,
        prompt: q.prompt,
        type: q.type,
        points_possible: points,
        points_earned: earned,
        is_correct: isCorrect,
        user_answer: userAns,
        correct_answer: correctAns,
        explanation: q.explanation,
      });
    });

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = percentage >= (exam.passing_percentage || 70) ? 1 : 0;
    const completedAt = new Date().toISOString();
    const attemptId = `ATT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // AUTOMATIC CERTIFICATE ISSUANCE IF PASSED AND LINKED
    let certificateIssued: any = null;
    if (passed === 1 && (exam.linked_template_id || exam.linked_event_id)) {
      const templateId = exam.linked_template_id;
      const eventId = exam.linked_event_id;

      // Check if student already has a certificate for this template/event to avoid duplicates:
      let existingCert: any = null;
      if (eventId) {
        existingCert = db.prepare(
          'SELECT * FROM certificates WHERE event_id = ? AND recipient_identifier = ?'
        ).get(eventId, student_identifier);
      } else if (templateId) {
        existingCert = db.prepare(
          'SELECT * FROM certificates WHERE template_id = ? AND recipient_identifier = ?'
        ).get(templateId, student_identifier);
      }

      if (existingCert) {
        // Reuse existing certificate without creating duplicate
        certificateIssued = existingCert;
      } else if (templateId) {
        const template: any = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
        if (template) {
          const certId = generateCertificateId();
          const issueDate = completedAt.split('T')[0];
          const baseUrl = `${req.protocol}://${req.get('host')}`;

          const pdfPath = await generateCertificatePdf(
            {
              id: certId,
              recipient_name: student_name,
              recipient_email: student_email,
              recipient_identifier: student_identifier,
              issue_date: issueDate,
              custom_fields: {
                nota: `${percentage.toFixed(1)}%`,
                curso: exam.title,
                examen_id: exam.id,
              },
            },
            template,
            baseUrl
          );

          db.prepare(`
            INSERT INTO certificates (
              id, event_id, template_id, recipient_name, recipient_email,
              recipient_identifier, issue_date, custom_fields_json, status,
              pdf_path, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?, ?, ?)
          `).run(
            certId,
            eventId,
            templateId,
            student_name,
            student_email,
            student_identifier,
            issueDate,
            JSON.stringify({ nota: `${percentage.toFixed(1)}%`, curso: exam.title }),
            pdfPath,
            completedAt,
            completedAt
          );

          certificateIssued = db.prepare('SELECT * FROM certificates WHERE id = ?').get(certId);
        }
      }
    }

    // Insert attempt record
    db.prepare(`
      INSERT INTO exam_attempts (
        id, exam_id, student_name, student_identifier, student_email,
        attempt_number, score, max_score, percentage, passed,
        answers_json, certificate_id, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      attemptId,
      id,
      student_name,
      student_identifier,
      student_email,
      nextAttemptNumber,
      totalScore,
      maxScore,
      percentage,
      passed,
      JSON.stringify(answers),
      certificateIssued ? certificateIssued.id : null,
      started_at,
      completedAt
    );

    res.json({
      attempt_id: attemptId,
      attempt_number: nextAttemptNumber,
      max_attempts: exam.max_attempts,
      score: totalScore,
      max_score: maxScore,
      percentage: Number(percentage.toFixed(1)),
      passing_percentage: exam.passing_percentage,
      passed: passed === 1,
      breakdown,
      certificate: certificateIssued,
    });
  } catch (error: any) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET all results / attempts for an exam
router.get('/:id/results', (req, res) => {
  try {
    const { id } = req.params;
    const attempts = db.prepare(`
      SELECT a.*, c.id as issued_cert_id
      FROM exam_attempts a
      LEFT JOIN certificates c ON a.certificate_id = c.id
      WHERE a.exam_id = ?
      ORDER BY a.completed_at DESC
    `).all(id);

    res.json(attempts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET export exam results to Excel
router.get('/:id/results/excel', (req, res) => {
  try {
    const { id } = req.params;
    const exam: any = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    const rows: any[] = db.prepare(`
      SELECT a.id as "ID Intento",
             a.student_name as "Alumno",
             a.student_identifier as "Documento / ID",
             a.student_email as "Correo",
             a.attempt_number as "Intento #",
             a.score as "Puntos Obtenidos",
             a.max_score as "Puntos Totales",
             a.percentage as "Porcentaje %",
             CASE WHEN a.passed = 1 THEN 'Aprobado' ELSE 'Reprobado' END as "Resultado",
             a.certificate_id as "Certificado Emitido",
             a.completed_at as "Fecha y Hora"
      FROM exam_attempts a
      WHERE a.exam_id = ?
      ORDER BY a.completed_at DESC
    `).all(id);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const cleanTitle = (exam.title || 'Resultados').replace(/[^a-zA-Z0-9_\-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Resultados_${cleanTitle}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
