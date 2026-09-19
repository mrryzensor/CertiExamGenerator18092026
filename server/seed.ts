import { db } from './db.js';
import { generateCertificatePdf, generateExamPdf } from './services/pdfService.js';
import { generateCertificateId } from './routes/certificates.js';

export async function seedInitialData() {
  const existingTemplates = db.prepare('SELECT COUNT(*) as count FROM templates').get() as { count: number };
  if (existingTemplates.count > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding initial professional templates, events, certificates and exams...');

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // 1. Initial Template
  const templateId = 'TMPL-OFICIAL-01';
  const initialElements = [
    {
      id: 'el-cert-title',
      type: 'custom_text',
      label: 'Título Certificado',
      staticText: 'CERTIFICADO DE RECONOCIMIENTO',
      xPercent: 50,
      yPercent: 28,
      fontFamily: 'Cinzel',
      fontSize: 26,
      fontWeight: 'bold',
      color: '#1e1b4b',
      textAlign: 'center',
    },
    {
      id: 'el-cert-subtitle',
      type: 'custom_text',
      label: 'Subtítulo',
      staticText: 'Por haber completado con distinción académica el programa oficial',
      xPercent: 50,
      yPercent: 38,
      fontFamily: 'Inter',
      fontSize: 13,
      fontWeight: 'normal',
      color: '#475569',
      textAlign: 'center',
    },
    {
      id: 'el-cert-name',
      type: 'full_name',
      label: 'Nombre del Participante',
      xPercent: 50,
      yPercent: 50,
      fontFamily: '"Playfair Display"',
      fontSize: 32,
      fontWeight: 'bold',
      fontStyle: 'italic',
      color: '#0f172a',
      textAlign: 'center',
    },
    {
      id: 'el-cert-date',
      type: 'date',
      label: 'Fecha de Emisión',
      xPercent: 28,
      yPercent: 78,
      fontFamily: 'Inter',
      fontSize: 12,
      fontWeight: 'normal',
      color: '#475569',
      textAlign: 'center',
    },
    {
      id: 'el-cert-qr',
      type: 'qr_code',
      label: 'QR de Verificación',
      xPercent: 82,
      yPercent: 78,
      qrSize: 24,
      qrDarkColor: '#1e1b4b',
      qrLightColor: '#ffffff',
    },
    {
      id: 'el-cert-id',
      type: 'certificate_id',
      label: 'ID Único del Certificado',
      xPercent: 82,
      yPercent: 91,
      fontFamily: 'Roboto',
      fontSize: 8,
      fontWeight: 'bold',
      color: '#64748b',
      textAlign: 'center',
    },
  ];

  db.prepare(`
    INSERT INTO templates (
      id, name, description, page_size, custom_width, custom_height, unit,
      orientation, image_path, image_fit, image_custom_scale, image_custom_x,
      image_custom_y, elements_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    templateId,
    'Diploma de Certificación Profesional',
    'Plantilla oficial con tipografía Cinzel y Playfair Display en formato Carta Horizontal',
    'letter',
    279.4,
    215.9,
    'mm',
    'landscape',
    null,
    'fit',
    1,
    0,
    0,
    JSON.stringify(initialElements),
    now,
    now
  );

  // 2. Initial Event
  const eventId = 'EVT-CIBER-2026';
  const eventSlug = 'ciberseguridad-y-cloud-2026';
  db.prepare(`
    INSERT INTO events (
      id, slug, name, description, template_id, unique_field_name,
      form_fields_json, is_public_registration, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    eventSlug,
    'Programa de Especialización en Ciberseguridad y Cloud 2026',
    'Completa tu registro para recibir de forma inmediata tu certificado de participación con ID criptográfico y QR.',
    templateId,
    'documento',
    JSON.stringify([
      { key: 'nombre_completo', label: 'Nombre Completo', type: 'text', required: true },
      { key: 'documento', label: 'Documento / DNI', type: 'text', required: true },
      { key: 'email', label: 'Correo Electrónico', type: 'email', required: false },
      { key: 'institucion', label: 'Empresa o Universidad', type: 'text', required: false },
    ]),
    1,
    now,
    now
  );

  // 3. Initial Sample Certificate
  const sampleCertId = 'CERT-8X92-MN4P-2026';
  const tmpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as any;

  const pdfRelPath = await generateCertificatePdf(
    {
      id: sampleCertId,
      recipient_name: 'Ing. Mateo Alexander Benavides',
      recipient_email: 'mateo.benavides@ejemplo.com',
      recipient_identifier: '74829103',
      issue_date: today,
      custom_fields: { institucion: 'Tech Institute' },
    },
    tmpl,
    'http://localhost:3000'
  );

  db.prepare(`
    INSERT INTO certificates (
      id, event_id, template_id, recipient_name, recipient_email,
      recipient_identifier, issue_date, custom_fields_json, status,
      pdf_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?, ?, ?)
  `).run(
    sampleCertId,
    eventId,
    templateId,
    'Ing. Mateo Alexander Benavides',
    'mateo.benavides@ejemplo.com',
    '74829103',
    today,
    JSON.stringify({ institucion: 'Tech Institute' }),
    pdfRelPath,
    now,
    now
  );

  // 4. Initial Exam with Questions
  const examId = 'EXAM-CLOUD-SEC';
  db.prepare(`
    INSERT INTO exams (
      id, title, description, topic, duration_minutes, max_attempts,
      passing_percentage, is_active, linked_template_id, linked_event_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `).run(
    examId,
    'Evaluación Técnica: Fundamentos de Ciberseguridad y Arquitectura Cloud',
    'Examen formativo con temporizador de 30 minutos. Al obtener 70% o más, se emitirá automáticamente tu certificado oficial.',
    'Ciberseguridad y Redes Cloud',
    30,
    2,
    70,
    templateId,
    eventId,
    now,
    now
  );

  const sampleQuestions = [
    {
      type: 'multiple_choice',
      prompt: '¿Cuál es el protocolo criptográfico estándar utilizado para asegurar comunicaciones web mediante HTTPS?',
      points: 2,
      options: ['TLS (Transport Layer Security)', 'FTP (File Transfer Protocol)', 'SNMP', 'TELNET'],
      correct_answer: 'TLS (Transport Layer Security)',
      explanation: 'TLS provee autenticación y privacidad mediante cifrado asimétrico y simétrico en la web moderna.',
    },
    {
      type: 'true_false',
      prompt: 'En el modelo de responsabilidad compartida en Cloud, la seguridad "DE la nube" es responsabilidad exclusiva del proveedor de nube (CSP).',
      points: 2,
      options: [],
      correct_answer: true,
      explanation: 'El proveedor se encarga de la infraestructura física y centros de datos (seguridad DE la nube), mientras que el cliente se encarga de los datos y accesos (seguridad EN la nube).',
    },
    {
      type: 'fill_blank',
      prompt: 'El principio de seguridad que establece que un usuario o servicio solo debe contar con los permisos indispensables para su función se conoce como principio de menor...',
      points: 2,
      options: [],
      correct_answer: 'privilegio',
      explanation: 'El principio de menor privilegio (Least Privilege) reduce la superficie de ataque y el riesgo de escalada de privilegios.',
    },
    {
      type: 'multiple_choice',
      prompt: '¿Qué tipo de ataque consiste en enviar solicitudes forjadas con la intención de saturar los recursos de un servidor hasta dejarlo inoperativo?',
      points: 2,
      options: ['DDoS (Denegación de Servicio Distribuida)', 'Phishing', 'SQL Injection', 'Cross-Site Scripting'],
      correct_answer: 'DDoS (Denegación de Servicio Distribuida)',
      explanation: 'Un ataque DDoS satura el ancho de banda o la memoria del objetivo mediante una red distribuida de bots (botnet).',
    },
    {
      type: 'matching',
      prompt: 'Relaciona cada término de seguridad con su definición clave:',
      points: 2,
      options: [
        { left: 'Firewall', right: 'Filtra y monitorea tráfico según reglas predefinidas' },
        { left: 'MFA', right: 'Autenticación con múltiples factores de verificación' },
      ],
      correct_answer: {
        Firewall: 'Filtra y monitorea tráfico según reglas predefinidas',
        MFA: 'Autenticación con múltiples factores de verificación',
      },
      explanation: 'MFA requiere más de una evidencia para validar la identidad y el Firewall controla el tráfico perimetral.',
    },
  ];

  const qStmt = db.prepare(`
    INSERT INTO questions (
      id, exam_id, order_index, type, prompt, points,
      options_json, correct_answer_json, explanation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sampleQuestions.forEach((q, idx) => {
    qStmt.run(
      `Q-SAMPLE-${idx + 1}`,
      examId,
      idx,
      q.type,
      q.prompt,
      q.points,
      JSON.stringify(q.options),
      JSON.stringify(q.correct_answer),
      q.explanation
    );
  });

  console.log('Initial seed completed successfully!');
}
