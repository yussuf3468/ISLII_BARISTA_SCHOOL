import { db } from '@/lib/supabase';
import { site } from '@/config/site';
import type { AttendanceState } from '@/lib/db.types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Attendance sheet → PDF
 * ─────────────────────────────────────────────────────────────────────────────
 *  A school's attendance record is a document, not a screen. It gets filed,
 *  emailed to a sponsor, or produced when a student disputes being barred from
 *  an assessment — so it has to survive leaving the app.
 *
 *  pdf-lib is imported DYNAMICALLY at the call site. It is ~400 KB, and there
 *  is no reason for it to load for someone who opens the register to mark two
 *  students present. The import happens on the click that needs it.
 *
 *  Landscape, because a term is a lot of columns. Dates are chunked across
 *  pages rather than shrunk to fit — an unreadable sheet is not a record.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface SheetStudent {
  enrollment_id: string;
  student_no: string;
  name: string;
  marks: Record<string, AttendanceState>;   // ISO date → state
}

export interface AttendanceSheet {
  courseTitle: string;
  intakeCode: string;
  dates: string[];
  students: SheetStudent[];
}

/** Everything recorded for one cohort, shaped for the document. */
export async function fetchAttendanceSheet(intakeId: string): Promise<AttendanceSheet> {
  const { data: intake, error: iErr } = await db()
    .from('intakes')
    .select('code, course:courses(title)')
    .eq('id', intakeId)
    .single();
  if (iErr) throw iErr;

  const { data: enr, error: eErr } = await db()
    .from('enrollments')
    .select('id, status, student:students(student_no, first_name, last_name)')
    .eq('intake_id', intakeId)
    .neq('status', 'withdrawn');
  if (eErr) throw eErr;

  const rows = (enr ?? []) as Array<Record<string, unknown>>;
  if (!rows.length) {
    const i = intake as Record<string, unknown>;
    return {
      courseTitle: ((i.course as Record<string, unknown>)?.title as string) ?? 'Course',
      intakeCode: i.code as string,
      dates: [],
      students: [],
    };
  }

  const { data: marks, error: mErr } = await db()
    .from('attendance')
    .select('enrollment_id, session_date, state')
    .in('enrollment_id', rows.map((r) => r.id as string))
    .order('session_date');
  if (mErr) throw mErr;

  const dates = [...new Set(
    (marks ?? []).map((m) => (m as { session_date: string }).session_date),
  )].sort();

  const byEnrollment = new Map<string, Record<string, AttendanceState>>();
  for (const m of (marks ?? []) as Array<Record<string, unknown>>) {
    const k = m.enrollment_id as string;
    const cur = byEnrollment.get(k) ?? {};
    cur[m.session_date as string] = m.state as AttendanceState;
    byEnrollment.set(k, cur);
  }

  const i = intake as Record<string, unknown>;
  return {
    courseTitle: ((i.course as Record<string, unknown>)?.title as string) ?? 'Course',
    intakeCode: i.code as string,
    dates,
    students: rows
      .map((r) => {
        const s = r.student as Record<string, unknown>;
        return {
          enrollment_id: r.id as string,
          student_no: s.student_no as string,
          name: `${s.first_name} ${s.last_name}`,
          marks: byEnrollment.get(r.id as string) ?? {},
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** P / A / L / E — one letter, because a column is 22pt wide. */
const MARK_LETTER: Record<AttendanceState, string> = {
  present: 'P', absent: 'A', late: 'L', excused: 'E',
};

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

/** Excused is excluded from the denominator, matching `enrollment_attendance`. */
function rateFor(s: SheetStudent, dates: string[]): string {
  let counted = 0;
  let attended = 0;
  for (const d of dates) {
    const m = s.marks[d];
    if (!m || m === 'excused') continue;
    counted += 1;
    if (m === 'present' || m === 'late') attended += 1;
  }
  return counted === 0 ? '—' : `${Math.round((attended / counted) * 100)}%`;
}

export async function buildAttendancePdf(sheet: AttendanceSheet): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const pdf = await PDFDocument.create();
  // Note: read off the namespace object of a DYNAMIC import, which resolves
  // properly in the browser. (The Edge Function has to use literals instead —
  // Deno's CJS interop hands back an undefined enum there.)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);

  const INK = rgb(0.09, 0.09, 0.11);
  const MUTED = rgb(0.44, 0.44, 0.48);
  const LINE = rgb(0.85, 0.85, 0.87);
  const ABSENT = rgb(0.72, 0.11, 0.11);

  // A4 landscape.
  const W = 841.89;
  const H = 595.28;
  const M = 36;
  const NAME_W = 190;
  const RATE_W = 44;
  const COL_W = 22;
  const ROW_H = 18;

  const perPage = Math.max(1, Math.floor((W - M * 2 - NAME_W - RATE_W) / COL_W));
  // At least one page even when nothing has been recorded yet — a blank sheet
  // with the cohort's name on it is still a usable printout.
  const chunks: string[][] = [];
  for (let i = 0; i < sheet.dates.length; i += perPage) {
    chunks.push(sheet.dates.slice(i, i + perPage));
  }
  if (chunks.length === 0) chunks.push([]);

  const generated = new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  chunks.forEach((dates, pageIndex) => {
    const page = pdf.addPage([W, H]);
    let y = H - M;

    page.drawText(site.name, { x: M, y: y - 12, size: 13, font: bold, color: INK });
    y -= 26;
    page.drawText(`Attendance — ${sheet.courseTitle}`, {
      x: M, y: y - 10, size: 10, font: body, color: INK,
    });
    page.drawText(
      `Cohort ${sheet.intakeCode}   ·   ${sheet.students.length} student${sheet.students.length === 1 ? '' : 's'}` +
      `   ·   ${sheet.dates.length} session${sheet.dates.length === 1 ? '' : 's'}`,
      { x: M, y: y - 24, size: 8.5, font: body, color: MUTED },
    );

    page.drawText(
      `P present · L late · A absent · E excused${chunks.length > 1 ? `   ·   page ${pageIndex + 1} of ${chunks.length}` : ''}`,
      { x: W - M - 260, y: y - 24, size: 8, font: body, color: MUTED },
    );

    y -= 46;

    // Header row
    page.drawLine({
      start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: INK,
    });
    page.drawText('Student', { x: M + 2, y: y + 6, size: 8, font: bold, color: INK });

    dates.forEach((d, i) => {
      page.drawText(shortDate(d), {
        x: M + NAME_W + i * COL_W + 2, y: y + 6, size: 6.5, font: bold, color: INK,
      });
    });

    page.drawText('Rate', {
      x: M + NAME_W + dates.length * COL_W + 4, y: y + 6, size: 8, font: bold, color: INK,
    });

    y -= 4;

    sheet.students.forEach((s, rowIndex) => {
      if (y < M + ROW_H) return;   // chunking keeps this rare; guard anyway
      const rowY = y - ROW_H + 5;

      // Zebra banding: 40 columns of single letters is genuinely hard to track
      // across without it.
      if (rowIndex % 2 === 1) {
        page.drawRectangle({
          x: M, y: y - ROW_H, width: W - M * 2, height: ROW_H,
          color: rgb(0.97, 0.97, 0.98),
        });
      }

      const label = s.name.length > 30 ? `${s.name.slice(0, 29)}…` : s.name;
      page.drawText(label, { x: M + 2, y: rowY, size: 8, font: body, color: INK });
      page.drawText(s.student_no, {
        x: M + 2, y: rowY - 7.5, size: 6, font: body, color: MUTED,
      });

      dates.forEach((d, i) => {
        const mark = s.marks[d];
        if (!mark) return;
        page.drawText(MARK_LETTER[mark], {
          x: M + NAME_W + i * COL_W + 7,
          y: rowY,
          size: 8,
          font: mark === 'absent' ? bold : body,
          color: mark === 'absent' ? ABSENT : INK,
        });
      });

      // The rate on each page is for the WHOLE term, not this page's columns —
      // a per-page rate would be meaningless and quietly wrong.
      page.drawText(rateFor(s, sheet.dates), {
        x: M + NAME_W + dates.length * COL_W + 4, y: rowY, size: 8, font: bold, color: INK,
      });

      page.drawLine({
        start: { x: M, y: y - ROW_H }, end: { x: W - M, y: y - ROW_H },
        thickness: 0.4, color: LINE,
      });

      y -= ROW_H;
    });

    page.drawText(`Generated ${generated}`, {
      x: M, y: M - 14, size: 7, font: body, color: MUTED,
    });
    page.drawText(site.url.replace(/^https?:\/\//, ''), {
      x: W - M - 100, y: M - 14, size: 7, font: body, color: MUTED,
    });
  });

  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoked on the next tick: revoking synchronously can cancel the download
  // in Safari before it starts.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
