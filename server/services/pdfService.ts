import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { PATHS, DATA_DIR } from '../config.js';

// Standard paper dimensions in mm
export const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  letter: { width: 279.4, height: 215.9 }, // 11 x 8.5 in
  a4: { width: 297, height: 210 },
  legal: { width: 355.6, height: 215.9 }, // 14 x 8.5 in (Oficio)
  a3: { width: 420, height: 297 },
};

export interface TemplateElement {
  id: string;
  type: 'full_name' | 'first_name' | 'last_name' | 'date' | 'custom_text' | 'certificate_id' | 'qr_code' | 'field';
  label?: string;
  fieldKey?: string;
  staticText?: string;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  widthPercent?: number;
  heightPercent?: number;
  fontFamily?: string;
  fontSize?: number; // in pt
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string; // hex
  letterSpacing?: number;
  qrSize?: number; // in mm
  qrDarkColor?: string;
  qrLightColor?: string;
}

export async function generateCertificatePdf(
  cert: {
    id: string;
    recipient_name: string;
    recipient_email?: string;
    recipient_identifier: string;
    issue_date: string;
    custom_fields?: Record<string, any>;
  },
  template: {
    id: string;
    page_size: string;
    custom_width?: number;
    custom_height?: number;
    orientation: 'landscape' | 'portrait';
    image_path?: string;
    image_fit?: 'fit' | 'cover' | 'stretch' | 'custom';
    image_custom_scale?: number;
    image_custom_x?: number;
    image_custom_y?: number;
    elements_json: string;
  },
  baseUrl: string = 'http://localhost:3000'
): Promise<string> {
  // 1. Determine dimensions in mm
  let widthMm = 279.4;
  let heightMm = 215.9;

  if (template.page_size === 'custom' && template.custom_width && template.custom_height) {
    widthMm = template.custom_width;
    heightMm = template.custom_height;
  } else if (PAPER_SIZES[template.page_size]) {
    const size = PAPER_SIZES[template.page_size];
    widthMm = size.width;
    heightMm = size.height;
  }

  // Adjust for orientation
  if (template.orientation === 'portrait') {
    if (widthMm > heightMm) {
      const temp = widthMm;
      widthMm = heightMm;
      heightMm = temp;
    }
  } else {
    // landscape
    if (heightMm > widthMm) {
      const temp = widthMm;
      widthMm = heightMm;
      heightMm = temp;
    }
  }

  const doc = new jsPDF({
    orientation: template.orientation === 'portrait' ? 'p' : 'l',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  // 2. Draw background image if present
  if (template.image_path) {
    const fullImagePath = path.join(DATA_DIR, template.image_path);
    if (fs.existsSync(fullImagePath)) {
      try {
        // Convert WebP/image to PNG buffer via sharp
        const imageMetadata = await sharp(fullImagePath).metadata();
        const imgWidth = imageMetadata.width || 1000;
        const imgHeight = imageMetadata.height || 750;
        const pngBuffer = await sharp(fullImagePath).png().toBuffer();
        const pngBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

        const imgAspect = imgWidth / imgHeight;
        const pageAspect = widthMm / heightMm;

        const fit = template.image_fit || 'fit';
        let drawX = 0;
        let drawY = 0;
        let drawW = widthMm;
        let drawH = heightMm;

        if (fit === 'stretch') {
          drawW = widthMm;
          drawH = heightMm;
        } else if (fit === 'fit') {
          // Contain
          if (imgAspect > pageAspect) {
            drawW = widthMm;
            drawH = widthMm / imgAspect;
            drawY = (heightMm - drawH) / 2;
          } else {
            drawH = heightMm;
            drawW = heightMm * imgAspect;
            drawX = (widthMm - drawW) / 2;
          }
        } else if (fit === 'cover') {
          // Cover
          if (imgAspect > pageAspect) {
            drawH = heightMm;
            drawW = heightMm * imgAspect;
            drawX = (widthMm - drawW) / 2;
          } else {
            drawW = widthMm;
            drawH = widthMm / imgAspect;
            drawY = (heightMm - drawH) / 2;
          }
        } else if (fit === 'custom') {
          const scale = template.image_custom_scale || 1;
          const offsetX = template.image_custom_x || 0;
          const offsetY = template.image_custom_y || 0;
          drawW = widthMm * scale;
          drawH = (widthMm / imgAspect) * scale;
          drawX = (widthMm - drawW) / 2 + offsetX;
          drawY = (heightMm - drawH) / 2 + offsetY;
        }

        doc.addImage(pngBase64, 'PNG', drawX, drawY, drawW, drawH);
      } catch (err) {
        console.error('Error adding template background image:', err);
      }
    }
  }

  // 3. Parse and draw elements
  let elements: TemplateElement[] = [];
  try {
    elements = JSON.parse(template.elements_json || '[]');
  } catch (e) {
    elements = [];
  }

  // Helper values for replacement
  const nameParts = (cert.recipient_name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const customFields = cert.custom_fields || {};

  for (const el of elements) {
    const posX = (el.xPercent / 100) * widthMm;
    const posY = (el.yPercent / 100) * heightMm;

    if (el.type === 'qr_code') {
      const qrSize = el.qrSize || 25; // in mm
      const verifyUrl = `${baseUrl}/verify/${cert.id}`;
      try {
        const qrBuffer = await QRCode.toBuffer(verifyUrl, {
          width: 500,
          margin: 1,
          color: {
            dark: el.qrDarkColor || '#000000',
            light: el.qrLightColor || '#ffffff',
          },
        });
        const qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;
        // In jsPDF, coordinates for addImage are top-left
        doc.addImage(qrBase64, 'PNG', posX - qrSize / 2, posY - qrSize / 2, qrSize, qrSize);
      } catch (e) {
        console.error('Failed to generate QR code for PDF:', e);
      }
      continue;
    }

    // Determine text content
    let text = '';
    if (el.type === 'full_name') {
      text = cert.recipient_name;
    } else if (el.type === 'first_name') {
      text = firstName;
    } else if (el.type === 'last_name') {
      text = lastName;
    } else if (el.type === 'date') {
      text = cert.issue_date;
    } else if (el.type === 'certificate_id') {
      text = cert.id;
    } else if (el.type === 'field' && el.fieldKey) {
      text = customFields[el.fieldKey] || customFields[el.fieldKey.toLowerCase()] || '';
    } else if (el.type === 'custom_text') {
      text = el.staticText || '';
    }

    if (!text) continue;

    // Font settings
    const fontSize = el.fontSize || 16;
    doc.setFontSize(fontSize);

    // Color
    const hex = el.color || '#1e293b';
    const rgb = hexToRgb(hex);
    if (rgb) {
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
    }

    // Font style
    let style = 'normal';
    if (el.fontWeight === 'bold' || el.fontWeight === '700' || el.fontWeight === '800') {
      style = el.fontStyle === 'italic' ? 'bolditalic' : 'bold';
    } else if (el.fontStyle === 'italic') {
      style = 'italic';
    }
    doc.setFont('helvetica', style);

    const align = el.textAlign || 'center';
    doc.text(text, posX, posY, { align });
  }

  // 4. Save to disk in PATHS.certificatesGenerated
  const fileName = `${cert.id}.pdf`;
  const fullPdfPath = path.join(PATHS.certificatesGenerated, fileName);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(fullPdfPath, pdfBuffer);

  // Return relative path
  return path.relative(DATA_DIR, fullPdfPath).replace(/\\/g, '/');
}

export function generateExamPdf(
  exam: {
    id: string;
    title: string;
    description?: string;
    duration_minutes?: number;
    passing_percentage?: number;
    topic?: string;
  },
  questions: Array<{
    id: string;
    order_index: number;
    type: string;
    prompt: string;
    points: number;
    options_json?: string;
    correct_answer_json: string;
    explanation?: string;
  }>,
  options: { mode: 'student' | 'teacher' }
): string {
  const isTeacher = options.mode === 'teacher';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(exam.title, margin, cursorY);
  cursorY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  if (isTeacher) {
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('[ CLAVE DE RESPUESTAS Y GUÍA DE CALIFICACIÓN ]', margin, cursorY);
    cursorY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
  }

  if (exam.description) {
    const descLines = doc.splitTextToSize(exam.description, contentWidth);
    doc.text(descLines, margin, cursorY);
    cursorY += descLines.length * 5 + 3;
  }

  // Student details box (only for student mode)
  if (!isTeacher) {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, cursorY, contentWidth, 22, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Nombre del Alumno: __________________________________________________', margin + 5, cursorY + 7);
    doc.text('Documento / ID: ______________________    Fecha: _____________________', margin + 5, cursorY + 15);
    if (exam.duration_minutes) {
      doc.text(`Tiempo límite: ${exam.duration_minutes} min`, margin + contentWidth - 45, cursorY + 15);
    }
    cursorY += 28;
  } else {
    cursorY += 4;
  }

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, margin + contentWidth, cursorY);
  cursorY += 8;

  // Questions
  questions.sort((a, b) => a.order_index - b.order_index);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Page overflow check
    if (cursorY > 260) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    const qHeader = `${i + 1}. ${q.prompt} (${q.points} pt${q.points !== 1 ? 's' : ''})`;
    const promptLines = doc.splitTextToSize(qHeader, contentWidth);
    doc.text(promptLines, margin, cursorY);
    cursorY += promptLines.length * 5 + 3;

    let optionsList: any[] = [];
    try {
      optionsList = JSON.parse(q.options_json || '[]');
    } catch (e) {
      optionsList = [];
    }

    let correctAnswer: any = null;
    try {
      correctAnswer = JSON.parse(q.correct_answer_json);
    } catch (e) {
      correctAnswer = q.correct_answer_json;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (q.type === 'multiple_choice') {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      for (let j = 0; j < optionsList.length; j++) {
        const opt = optionsList[j];
        const isCorrect = isTeacher && (opt === correctAnswer || j === correctAnswer || (typeof correctAnswer === 'object' && correctAnswer?.index === j));
        
        if (isCorrect) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(22, 101, 52); // green
          doc.text(`[X] ${letters[j]}) ${opt}  <-- RESPUESTA CORRECTA`, margin + 6, cursorY);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(`[  ] ${letters[j]}) ${opt}`, margin + 6, cursorY);
        }
        cursorY += 6;
      }
    } else if (q.type === 'true_false') {
      const isTrueCorrect = isTeacher && (correctAnswer === true || correctAnswer === 'true' || correctAnswer === 'verdadero');
      const isFalseCorrect = isTeacher && (correctAnswer === false || correctAnswer === 'false' || correctAnswer === 'falso');

      doc.setTextColor(isTrueCorrect ? 22 : 71, isTrueCorrect ? 101 : 85, isTrueCorrect ? 52 : 105);
      doc.setFont('helvetica', isTrueCorrect ? 'bold' : 'normal');
      doc.text(`[  ] Verdadero ${isTrueCorrect ? '<-- CORRECTO' : ''}`, margin + 6, cursorY);
      cursorY += 6;

      doc.setTextColor(isFalseCorrect ? 22 : 71, isFalseCorrect ? 101 : 85, isFalseCorrect ? 52 : 105);
      doc.setFont('helvetica', isFalseCorrect ? 'bold' : 'normal');
      doc.text(`[  ] Falso ${isFalseCorrect ? '<-- CORRECTO' : ''}`, margin + 6, cursorY);
      cursorY += 6;
    } else if (q.type === 'fill_blank' || q.type === 'short_answer') {
      if (isTeacher) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 101, 52);
        doc.text(`Respuesta esperada: ${JSON.stringify(correctAnswer)}`, margin + 6, cursorY);
        cursorY += 6;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Respuesta: _____________________________________________________________', margin + 6, cursorY);
        cursorY += 7;
        doc.text('_________________________________________________________________________', margin + 6, cursorY);
        cursorY += 7;
      }
    } else if (q.type === 'matching') {
      if (Array.isArray(optionsList)) {
        optionsList.forEach((pair: any, pIdx: number) => {
          doc.setTextColor(71, 85, 105);
          const left = pair.left || pair.concept || `Item ${pIdx + 1}`;
          const right = isTeacher ? (pair.right || pair.definition) : '_________________________';
          doc.text(`* ${left}  ----->  ${right}`, margin + 6, cursorY);
          cursorY += 6;
        });
      }
    }

    if (isTeacher && q.explanation) {
      cursorY += 2;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(3, 105, 161);
      const expLines = doc.splitTextToSize(`Explicación pedagógica: ${q.explanation}`, contentWidth - 10);
      doc.text(expLines, margin + 6, cursorY);
      cursorY += expLines.length * 4.5;
    }

    cursorY += 6;
  }

  // Save to disk
  const fileName = `exam_${exam.id}_${options.mode}.pdf`;
  const fullPdfPath = path.join(PATHS.examsGenerated, fileName);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(fullPdfPath, pdfBuffer);

  return path.relative(DATA_DIR, fullPdfPath).replace(/\\/g, '/');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return null;
}
