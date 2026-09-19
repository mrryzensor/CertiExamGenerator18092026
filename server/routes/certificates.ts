import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { db } from '../db.js';
import { DATA_DIR, PATHS } from '../config.js';
import { generateCertificatePdf } from '../services/pdfService.js';

const router = Router();

// Generate a secure, permanent, unpredictable ID
export function generateCertificateId(): string {
  const part1 = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
  const part2 = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
  const year = new Date().getFullYear();
  return `CERT-${part1}-${part2}-${year}`;
}

// GET all certificates with search, filtering and pagination
router.get('/', (req, res) => {
  try {
    const { search, event_id, template_id, status } = req.query;

    let query = `
      SELECT c.*, t.name as template_name, e.name as event_name
      FROM certificates c
      LEFT JOIN templates t ON c.template_id = t.id
      LEFT JOIN events e ON c.event_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (
        c.recipient_name LIKE ? OR 
        c.recipient_email LIKE ? OR 
        c.recipient_identifier LIKE ? OR 
        c.id LIKE ?
      )`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (event_id) {
      query += ' AND c.event_id = ?';
      params.push(event_id);
    }

    if (template_id) {
      query += ' AND c.template_id = ?';
      params.push(template_id);
    }

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC';

    const stmt = db.prepare(query);
    const certificates = stmt.all(...params);

    res.json(certificates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET public verification data (used by QR scanner / verification page)
router.get('/verify/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare(`
      SELECT c.id, c.recipient_name, c.recipient_email, c.recipient_identifier,
             c.issue_date, c.status, c.revocation_reason, c.created_at,
             t.name as template_name, e.name as event_name, e.description as event_description
      FROM certificates c
      LEFT JOIN templates t ON c.template_id = t.id
      LEFT JOIN events e ON c.event_id = e.id
      WHERE c.id = ?
    `);
    const certificate = stmt.get(id);

    if (!certificate) {
      return res.status(404).json({
        found: false,
        status: 'not_found',
        message: 'Certificado no encontrado en el sistema oficial.',
      });
    }

    res.json({
      found: true,
      certificate,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET download certificate PDF physically from disk
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare(`
      SELECT c.*, t.page_size, t.custom_width, t.custom_height, t.orientation,
             t.image_path, t.image_fit, t.image_custom_scale, t.image_custom_x,
             t.image_custom_y, t.elements_json
      FROM certificates c
      JOIN templates t ON c.template_id = t.id
      WHERE c.id = ?
    `);
    const certWithTemplate: any = stmt.get(id);

    if (!certWithTemplate) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }

    let fullPdfPath = certWithTemplate.pdf_path 
      ? path.join(DATA_DIR, certWithTemplate.pdf_path) 
      : null;

    // If PDF does not exist on disk, generate it physically right now
    if (!fullPdfPath || !fs.existsSync(fullPdfPath)) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let customFields = {};
      try {
        customFields = JSON.parse(certWithTemplate.custom_fields_json || '{}');
      } catch (e) {}

      const relativePdfPath = await generateCertificatePdf(
        {
          id: certWithTemplate.id,
          recipient_name: certWithTemplate.recipient_name,
          recipient_email: certWithTemplate.recipient_email,
          recipient_identifier: certWithTemplate.recipient_identifier,
          issue_date: certWithTemplate.issue_date,
          custom_fields: customFields,
        },
        certWithTemplate,
        baseUrl
      );

      db.prepare('UPDATE certificates SET pdf_path = ? WHERE id = ?').run(relativePdfPath, id);
      fullPdfPath = path.join(DATA_DIR, relativePdfPath);
    }

    const cleanRecipientName = (certWithTemplate.recipient_name || 'Participante')
      .replace(/[^a-zA-Z0-9_\-]/g, '_');
    const downloadName = `Certificado_${cleanRecipientName}_${certWithTemplate.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    const fileStream = fs.createReadStream(fullPdfPath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST single certificate issuance
router.post('/', async (req, res) => {
  try {
    const {
      event_id = null,
      template_id,
      recipient_name,
      recipient_email = '',
      recipient_identifier,
      issue_date = new Date().toISOString().split('T')[0],
      custom_fields = {},
    } = req.body;

    if (!template_id || !recipient_name || !recipient_identifier) {
      return res.status(400).json({
        error: 'template_id, recipient_name y recipient_identifier son obligatorios',
      });
    }

    // Check duplicate if event_id is present
    if (event_id) {
      const existing = db.prepare(
        'SELECT * FROM certificates WHERE event_id = ? AND recipient_identifier = ?'
      ).get(event_id, recipient_identifier);

      if (existing) {
        return res.status(409).json({
          error: 'Ya existe un certificado emitido para este participante en este evento',
          certificate: existing,
        });
      }
    }

    const template: any = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const id = generateCertificateId();
    const now = new Date().toISOString();
    const customFieldsJson = typeof custom_fields === 'string' ? custom_fields : JSON.stringify(custom_fields);

    // Generate physical PDF immediately
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const pdfPath = await generateCertificatePdf(
      {
        id,
        recipient_name,
        recipient_email,
        recipient_identifier,
        issue_date,
        custom_fields,
      },
      template,
      baseUrl
    );

    const stmt = db.prepare(`
      INSERT INTO certificates (
        id, event_id, template_id, recipient_name, recipient_email,
        recipient_identifier, issue_date, custom_fields_json, status,
        pdf_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?, ?, ?)
    `);

    stmt.run(
      id,
      event_id,
      template_id,
      recipient_name,
      recipient_email,
      recipient_identifier,
      issue_date,
      customFieldsJson,
      pdfPath,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST batch certificate issuance (from Excel or clipboard paste)
router.post('/batch', async (req, res) => {
  try {
    const {
      event_id = null,
      template_id,
      issue_date = new Date().toISOString().split('T')[0],
      recipients = [], // Array of recipient items
    } = req.body;

    if (!template_id || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'template_id y una lista de destinatarios válida son obligatorios',
      });
    }

    const template: any = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const results = {
      totalReceived: recipients.length,
      issued: 0,
      skippedDuplicates: 0,
      certificates: [] as any[],
      errors: [] as any[],
    };

    for (const item of recipients) {
      try {
        const name = (item.recipient_name || item.nombre_completo || item.nombre || '').trim();
        const identifier = (item.recipient_identifier || item.documento || item.dni || item.identificador || item.email || '').trim();
        const email = (item.recipient_email || item.email || item.correo || '').trim();
        const date = item.issue_date || issue_date;

        if (!name || !identifier) {
          results.errors.push({ item, error: 'Falta nombre o identificador' });
          continue;
        }

        // Duplicate check if event_id is given
        if (event_id) {
          const existing = db.prepare(
            'SELECT * FROM certificates WHERE event_id = ? AND recipient_identifier = ?'
          ).get(event_id, identifier);

          if (existing) {
            results.skippedDuplicates++;
            results.certificates.push({ ...existing, isExisting: true });
            continue;
          }
        }

        const id = generateCertificateId();
        const now = new Date().toISOString();
        const customFields = item.custom_fields || { ...item };
        // Clean standard fields from custom_fields
        delete customFields.recipient_name;
        delete customFields.nombre_completo;
        delete customFields.recipient_identifier;
        delete customFields.documento;
        delete customFields.recipient_email;
        delete customFields.email;
        delete customFields.issue_date;

        const pdfPath = await generateCertificatePdf(
          {
            id,
            recipient_name: name,
            recipient_email: email,
            recipient_identifier: identifier,
            issue_date: date,
            custom_fields: customFields,
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
          id,
          event_id,
          template_id,
          name,
          email,
          identifier,
          date,
          JSON.stringify(customFields),
          pdfPath,
          now,
          now
        );

        const created = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
        results.certificates.push(created);
        results.issued++;
      } catch (err: any) {
        results.errors.push({ item, error: err.message });
      }
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST public participant registration
router.post('/public-register', async (req, res) => {
  try {
    const {
      event_id,
      recipient_name,
      recipient_email,
      recipient_identifier,
      custom_fields = {},
    } = req.body;

    if (!event_id || !recipient_name || !recipient_identifier) {
      return res.status(400).json({
        error: 'Todos los campos obligatorios deben ser completados',
      });
    }

    const event: any = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const template: any = db.prepare('SELECT * FROM templates WHERE id = ?').get(event.template_id);
    if (!template) {
      return res.status(404).json({ error: 'Plantilla del evento no encontrada' });
    }

    // Duplicate verification for this event:
    const existing: any = db.prepare(
      'SELECT * FROM certificates WHERE event_id = ? AND recipient_identifier = ?'
    ).get(event_id, recipient_identifier);

    if (existing) {
      // Participant already completed this form!
      return res.json({
        isExisting: true,
        message: 'Ya estás registrado en este evento. Aquí está tu certificado.',
        certificate: existing,
      });
    }

    // Fresh registration:
    const id = generateCertificateId();
    const issueDate = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const pdfPath = await generateCertificatePdf(
      {
        id,
        recipient_name,
        recipient_email,
        recipient_identifier,
        issue_date: issueDate,
        custom_fields,
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
      id,
      event_id,
      event.template_id,
      recipient_name,
      recipient_email || '',
      recipient_identifier,
      issueDate,
      JSON.stringify(custom_fields),
      pdfPath,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    res.status(201).json({
      isExisting: false,
      message: '¡Registro exitoso! Tu certificado oficial ha sido emitido.',
      certificate: created,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update participant data (preserving same permanent ID and QR)
router.put('/:id/update-data', async (req, res) => {
  try {
    const { id } = req.params;
    const cert: any = db.prepare(`
      SELECT c.*, t.page_size, t.custom_width, t.custom_height, t.orientation,
             t.image_path, t.image_fit, t.image_custom_scale, t.image_custom_x,
             t.image_custom_y, t.elements_json
      FROM certificates c
      JOIN templates t ON c.template_id = t.id
      WHERE c.id = ?
    `).get(id);

    if (!cert) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }

    const { recipient_name, recipient_email, custom_fields } = req.body;
    const now = new Date().toISOString();

    const updatedName = recipient_name || cert.recipient_name;
    const updatedEmail = recipient_email !== undefined ? recipient_email : cert.recipient_email;
    let updatedCustom = cert.custom_fields_json ? JSON.parse(cert.custom_fields_json) : {};
    if (custom_fields) {
      updatedCustom = { ...updatedCustom, ...custom_fields };
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const newPdfPath = await generateCertificatePdf(
      {
        id: cert.id, // Preserves the exact same permanent ID!
        recipient_name: updatedName,
        recipient_email: updatedEmail,
        recipient_identifier: cert.recipient_identifier,
        issue_date: cert.issue_date,
        custom_fields: updatedCustom,
      },
      cert,
      baseUrl
    );

    db.prepare(`
      UPDATE certificates SET
        recipient_name = ?,
        recipient_email = ?,
        custom_fields_json = ?,
        pdf_path = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updatedName,
      updatedEmail,
      JSON.stringify(updatedCustom),
      newPdfPath,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    res.json({
      success: true,
      message: 'Datos actualizados correctamente conservando el mismo ID y QR',
      certificate: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT toggle status (valid / revoked)
router.put('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, revocation_reason } = req.body;

    if (status !== 'valid' && status !== 'revoked') {
      return res.status(400).json({ error: "El estado debe ser 'valid' o 'revoked'" });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE certificates SET
        status = ?,
        revocation_reason = ?,
        updated_at = ?
      WHERE id = ?
    `).run(status, revocation_reason || null, now, id);

    const updated = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE certificate
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const cert: any = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    if (cert && cert.pdf_path) {
      const fullPath = path.join(DATA_DIR, cert.pdf_path);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }
    db.prepare('DELETE FROM certificates WHERE id = ?').run(id);
    res.json({ success: true, message: 'Certificado eliminado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET export certificates to Excel (.xlsx)
router.get('/export/excel', (req, res) => {
  try {
    const { event_id, template_id, status } = req.query;

    let query = `
      SELECT c.id as "ID Certificado",
             c.recipient_name as "Nombre Completo",
             c.recipient_identifier as "Identificador / Documento",
             c.recipient_email as "Correo",
             c.issue_date as "Fecha Emisión",
             c.status as "Estado",
             c.revocation_reason as "Motivo Revocación",
             t.name as "Plantilla",
             e.name as "Evento",
             c.custom_fields_json
      FROM certificates c
      LEFT JOIN templates t ON c.template_id = t.id
      LEFT JOIN events e ON c.event_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (event_id) { query += ' AND c.event_id = ?'; params.push(event_id); }
    if (template_id) { query += ' AND c.template_id = ?'; params.push(template_id); }
    if (status) { query += ' AND c.status = ?'; params.push(status); }
    query += ' ORDER BY c.created_at DESC';

    const rows: any[] = db.prepare(query).all(...params);

    const formattedRows = rows.map((r) => {
      let custom: any = {};
      try { custom = JSON.parse(r.custom_fields_json || '{}'); } catch (e) {}
      const { custom_fields_json, ...base } = r;
      // Flatten custom fields into columns
      return {
        ...base,
        ...custom,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificados');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Certificados_Emitidos.xlsx"');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
