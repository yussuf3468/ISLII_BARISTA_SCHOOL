import { registerStudent, type NewStudent } from './api';
import type { Student } from '@/lib/db.types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CSV import / export
 * ─────────────────────────────────────────────────────────────────────────────
 *  Written by hand rather than pulling in a parser, because the format we
 *  actually need is small and the failure modes are specific: Kenyan phone
 *  numbers that must survive as text, names containing commas, and Excel's
 *  habit of eating a leading "+" or reformatting anything digit-shaped.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** RFC-4180 quoting: wrap when the value contains a comma, quote or newline. */
function escapeCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const head = columns.map(escapeCell).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCell(r[c])).join(',')).join('\n');
  // A BOM makes Excel open UTF-8 correctly; without it, accented names mangle.
  return `﻿${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportStudents(students: Student[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  const rows = students.map((s) => ({
    student_no: s.student_no,
    first_name: s.first_name,
    last_name: s.last_name,
    // Prefixed with a tab so Excel keeps "0712345678" as text instead of
    // stripping the leading zero and turning it into a number.
    phone: s.phone ? `\t${s.phone}` : '',
    email: s.email ?? '',
    national_id: s.national_id ? `\t${s.national_id}` : '',
    registered: new Date(s.created_at).toISOString().slice(0, 10),
  }));

  downloadCsv(
    `islii-students-${stamp}.csv`,
    toCsv(rows, ['student_no', 'first_name', 'last_name', 'phone', 'email', 'national_id', 'registered']),
  );
}

/* ── Import ───────────────────────────────────────────────────────────── */

/** Split one CSV line, honouring quotes and doubled escapes. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim().replace(/^\t/, ''));
}

export interface ParsedRow {
  line: number;
  data: NewStudent;
  error?: string;
}

const HEADER_ALIASES: Record<string, keyof NewStudent> = {
  first_name: 'first_name', firstname: 'first_name', 'first name': 'first_name',
  last_name: 'last_name', lastname: 'last_name', 'last name': 'last_name', surname: 'last_name',
  phone: 'phone', mobile: 'phone', 'phone number': 'phone',
  email: 'email', 'e-mail': 'email',
  national_id: 'national_id', 'national id': 'national_id', id_number: 'national_id',
  notes: 'notes', note: 'notes',
};

export function parseStudentCsv(text: string): { rows: ParsedRow[]; headerError?: string } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { rows: [], headerError: 'The file needs a header row and at least one student.' };
  }

  const header = splitLine(lines[0]!).map((h) => h.toLowerCase().replace(/[_\s-]+/g, ' ').trim());
  const mapped = header.map((h) => HEADER_ALIASES[h] ?? HEADER_ALIASES[h.replace(/ /g, '_')]);

  if (!mapped.includes('first_name') || !mapped.includes('last_name')) {
    return {
      rows: [],
      headerError:
        'The header must include a first name and a last name column. Recognised: first_name, last_name, phone, email, national_id, notes.',
    };
  }

  const rows: ParsedRow[] = lines.slice(1).map((line, i) => {
    const cells = splitLine(line);
    const data: NewStudent = { first_name: '', last_name: '' };

    mapped.forEach((key, col) => {
      if (!key) return;
      const value = cells[col] ?? '';
      // Assigned through the typed key union rather than casting the whole
      // object to Record<string, string> — NewStudent's optional fields mean
      // that cast is not provably safe, and TS is right to reject it.
      if (value) data[key] = value;
    });

    let error: string | undefined;
    if (!data.first_name || !data.last_name) error = 'Missing first or last name';
    else if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) error = 'Invalid email';

    return { line: i + 2, data, error };
  });

  return { rows };
}

export interface ImportOutcome {
  created: number;
  failed: { line: number; name: string; reason: string }[];
}

/**
 * Imported sequentially, not in parallel.
 *
 * Student numbers come from a counter row that each insert locks. Firing fifty
 * concurrent registrations would just make them queue on that lock anyway,
 * while making failures far harder to attribute to a line. One at a time is
 * barely slower here and reports precisely which row failed and why.
 */
export async function importStudents(
  rows: ParsedRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportOutcome> {
  const valid = rows.filter((r) => !r.error);
  const failed: ImportOutcome['failed'] = rows
    .filter((r) => r.error)
    .map((r) => ({
      line: r.line,
      name: `${r.data.first_name} ${r.data.last_name}`.trim() || '(blank)',
      reason: r.error!,
    }));

  let created = 0;
  for (const [i, row] of valid.entries()) {
    try {
      await registerStudent(row.data);
      created++;
    } catch (err) {
      failed.push({
        line: row.line,
        name: `${row.data.first_name} ${row.data.last_name}`,
        reason: (err as Error).message,
      });
    }
    onProgress?.(i + 1, valid.length);
  }

  return { created, failed };
}

export const CSV_TEMPLATE =
  'first_name,last_name,phone,email,national_id,notes\n' +
  'Amina,Wanjiru,0712345678,amina@example.com,12345678,\n' +
  'Brian,Otieno,0723456789,,,Transferred from evening class\n';
