import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

const router = Router();

// Helper to generate a clean URL slug
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || `event-${Date.now()}`;
}

// GET all events
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT e.*, t.name as template_name, t.page_size, t.orientation
      FROM events e
      LEFT JOIN templates t ON e.template_id = t.id
      ORDER BY e.created_at DESC
    `);
    const events = stmt.all();
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET event by slug (for public registration page)
router.get('/slug/:slug', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT e.*, t.name as template_name, t.image_path as template_image
      FROM events e
      LEFT JOIN templates t ON e.template_id = t.id
      WHERE e.slug = ?
    `);
    const event = stmt.get(req.params.slug);
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single event by id
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT e.*, t.name as template_name
      FROM events e
      LEFT JOIN templates t ON e.template_id = t.id
      WHERE e.id = ?
    `);
    const event = stmt.get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create event
router.post('/', (req, res) => {
  try {
    const {
      name,
      description,
      template_id,
      unique_field_name = 'documento',
      form_fields_json,
      is_public_registration = 1,
    } = req.body;

    if (!name || !template_id) {
      return res.status(400).json({ error: 'El nombre y la plantilla son obligatorios' });
    }

    const id = `EVT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (db.prepare('SELECT id FROM events WHERE slug = ?').get(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Default form fields if none provided
    const defaultFields = [
      { key: 'nombre_completo', label: 'Nombre Completo', type: 'text', required: true },
      { key: 'email', label: 'Correo Electrónico', type: 'email', required: false },
      { key: 'documento', label: 'Documento de Identidad / DNI', type: 'text', required: true },
      { key: 'institucion', label: 'Institución u Organización', type: 'text', required: false },
    ];

    const fieldsToStore = form_fields_json 
      ? (typeof form_fields_json === 'string' ? form_fields_json : JSON.stringify(form_fields_json))
      : JSON.stringify(defaultFields);

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO events (
        id, slug, name, description, template_id, unique_field_name,
        form_fields_json, is_public_registration, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      slug,
      name,
      description || '',
      template_id,
      unique_field_name || 'documento',
      fieldsToStore,
      is_public_registration ? 1 : 0,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update event
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const {
      name,
      description,
      template_id,
      unique_field_name,
      form_fields_json,
      is_public_registration,
    } = req.body;

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE events SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        template_id = COALESCE(?, template_id),
        unique_field_name = COALESCE(?, unique_field_name),
        form_fields_json = COALESCE(?, form_fields_json),
        is_public_registration = COALESCE(?, is_public_registration),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      name,
      description,
      template_id,
      unique_field_name,
      form_fields_json !== undefined
        ? (typeof form_fields_json === 'string' ? form_fields_json : JSON.stringify(form_fields_json))
        : null,
      is_public_registration !== undefined ? (is_public_registration ? 1 : 0) : null,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE event
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    res.json({ success: true, message: 'Evento eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
