import * as XLSX from 'xlsx';

export interface ColumnMapping {
  originalHeader: string;
  targetField: string; // 'recipient_name' | 'recipient_identifier' | 'recipient_email' | 'issue_date' | 'custom' | 'ignore'
  customKeyName?: string;
}

export interface ParsedSpreadsheetResult {
  headers: string[];
  rows: Record<string, any>[];
  suggestedMappings: ColumnMapping[];
}

export function detectColumnType(header: string): string {
  const norm = header.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('nombre') && norm.includes('completo')) return 'recipient_name';
  if (norm === 'nombre' || norm === 'nombres' || norm === 'fullname' || norm === 'participante' || norm === 'alumno' || norm === 'estudiante') {
    return 'recipient_name';
  }
  if (norm.includes('apellido')) return 'recipient_last_name';
  if (
    norm.includes('dni') ||
    norm.includes('documento') ||
    norm.includes('cedula') ||
    norm.includes('identificacion') ||
    norm === 'id' ||
    norm.includes('rut') ||
    norm.includes('ci')
  ) {
    return 'recipient_identifier';
  }
  if (norm.includes('correo') || norm.includes('email') || norm.includes('mail')) {
    return 'recipient_email';
  }
  if (norm.includes('fecha') || norm.includes('date') || norm.includes('emision')) {
    return 'issue_date';
  }
  return 'custom';
}

export function generateMappings(headers: string[]): ColumnMapping[] {
  return headers.map((header) => {
    const detected = detectColumnType(header);
    return {
      originalHeader: header,
      targetField: detected,
      customKeyName: detected === 'custom' ? cleanKeyName(header) : undefined,
    };
  });
}

function cleanKeyName(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Parses uploaded Excel (.xlsx, .xls, .csv) file
 */
export async function parseExcelFile(file: File): Promise<ParsedSpreadsheetResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to 2D array to find first real header row
  const rows2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Find first row with at least 1 non-empty cell
  let headerRowIndex = 0;
  for (let i = 0; i < rows2D.length; i++) {
    if (rows2D[i].some((cell) => cell !== undefined && cell !== '')) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = (rows2D[headerRowIndex] || []).map((h, i) =>
    h ? String(h).trim() : `Columna_${i + 1}`
  );

  const headers = rawHeaders.filter((h) => h.length > 0);

  const rows: Record<string, any>[] = [];
  for (let r = headerRowIndex + 1; r < rows2D.length; r++) {
    const rowData = rows2D[r];
    if (!rowData || !rowData.some((c) => c !== '')) continue; // Skip blank lines

    const rowObj: Record<string, any> = {};
    headers.forEach((hdr, colIdx) => {
      rowObj[hdr] = rowData[colIdx] !== undefined ? String(rowData[colIdx]).trim() : '';
    });
    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    suggestedMappings: generateMappings(headers),
  };
}

/**
 * Parses raw text pasted directly from Excel or Google Sheets (TSV or CSV)
 */
export function parsePastedSpreadsheetText(text: string): ParsedSpreadsheetResult {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], suggestedMappings: [] };
  }

  // Detect delimiter (Tab from Excel/Sheets or comma/semicolon)
  const firstLine = lines[0];
  let delimiter = '\t';
  if (!firstLine.includes('\t')) {
    if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes(',')) delimiter = ',';
  }

  const headerTokens = firstLine.split(delimiter).map((col, i) => col.trim() || `Columna_${i + 1}`);
  const headers = headerTokens.filter(Boolean);

  const rows: Record<string, any>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const tokens = lines[i].split(delimiter);
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = tokens[idx] !== undefined ? tokens[idx].trim() : '';
    });
    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    suggestedMappings: generateMappings(headers),
  };
}
