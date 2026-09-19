import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

const router = Router();

// GET all templates
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM templates ORDER BY created_at DESC');
    const templates = stmt.all();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single template
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM templates WHERE id = ?');
    const template = stmt.get(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create template
router.post('/', (req, res) => {
  try {
    const {
      name,
      description,
      page_size = 'letter',
      custom_width = 279.4,
      custom_height = 215.9,
      unit = 'mm',
      orientation = 'landscape',
      image_path = null,
      image_fit = 'fit',
      image_custom_scale = 1,
      image_custom_x = 0,
      image_custom_y = 0,
      elements_json = '[]',
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre de la plantilla es obligatorio' });
    }

    const id = `TMPL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO templates (
        id, name, description, page_size, custom_width, custom_height, unit,
        orientation, image_path, image_fit, image_custom_scale, image_custom_x,
        image_custom_y, elements_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name,
      description || '',
      page_size,
      Number(custom_width) || 279.4,
      Number(custom_height) || 215.9,
      unit,
      orientation,
      image_path,
      image_fit,
      Number(image_custom_scale) || 1,
      Number(image_custom_x) || 0,
      Number(image_custom_y) || 0,
      typeof elements_json === 'string' ? elements_json : JSON.stringify(elements_json),
      now,
      now
    );

    const created = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update template
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const {
      name,
      description,
      page_size,
      custom_width,
      custom_height,
      unit,
      orientation,
      image_path,
      image_fit,
      image_custom_scale,
      image_custom_x,
      image_custom_y,
      elements_json,
    } = req.body;

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE templates SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        page_size = COALESCE(?, page_size),
        custom_width = COALESCE(?, custom_width),
        custom_height = COALESCE(?, custom_height),
        unit = COALESCE(?, unit),
        orientation = COALESCE(?, orientation),
        image_path = COALESCE(?, image_path),
        image_fit = COALESCE(?, image_fit),
        image_custom_scale = COALESCE(?, image_custom_scale),
        image_custom_x = COALESCE(?, image_custom_x),
        image_custom_y = COALESCE(?, image_custom_y),
        elements_json = COALESCE(?, elements_json),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      name,
      description,
      page_size,
      custom_width !== undefined ? Number(custom_width) : null,
      custom_height !== undefined ? Number(custom_height) : null,
      unit,
      orientation,
      image_path,
      image_fit,
      image_custom_scale !== undefined ? Number(image_custom_scale) : null,
      image_custom_x !== undefined ? Number(image_custom_x) : null,
      image_custom_y !== undefined ? Number(image_custom_y) : null,
      elements_json !== undefined
        ? (typeof elements_json === 'string' ? elements_json : JSON.stringify(elements_json))
        : null,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE template
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM templates WHERE id = ?');
    stmt.run(id);
    res.json({ success: true, message: 'Plantilla eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
