import { PDFDocument, PDFFont, PDFPage, rgb } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import QRCode from 'npm:qrcode@1.5.4';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Certificate composition — A4 landscape, vector throughout.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Built with pdf-lib rather than rasterising HTML. A certificate is a printed
 *  legal-ish artifact: the type has to stay crisp at any size, the file has to
 *  stay small enough to email, and the layout must not shift because a CSS rule
 *  changed elsewhere in the project.
 *
 *  The QR is drawn as filled rectangles straight from the encoder's module
 *  matrix — so it is vector too, and stays razor-sharp however it is printed or
 *  zoomed. Embedding a PNG of a QR code is the usual approach and it is
 *  measurably worse: scanners struggle with resampled raster codes on paper.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* A4 landscape, in points. */
const PAGE_W = 841.89;
const PAGE_H = 595.28;

/* Brand palette, matching src/styles/globals.css. */
const ESPRESSO = rgb(0.071, 0.051, 0.039); // #120d0a
const COFFEE = rgb(0.29, 0.21, 0.15); // #4a3527
const GOLD = rgb(0.784, 0.631, 0.353); // #c8a15a
const GOLD_DEEP = rgb(0.659, 0.506, 0.247); // #a8813f
const LINEN = rgb(0.988, 0.98, 0.961); // #fcfaf5
const MUTED = rgb(0.48, 0.42, 0.36);

export interface CertificateData {
  certificateNo: string;
  studentNo: string;
  fullName: string;
  courseTitle: string;
  certification: string;
  duration: string;
  intakeStarted: string | null;
  intakeEnded: string | null;
  grade: string | null;
  issuedOn: string;
  verifyUrl: string;
  schoolName: string;
  schoolLocation: string;
}

interface Assets {
  crestPng?: Uint8Array;
  displayFont?: Uint8Array;
  bodyFont?: Uint8Array;
}

/** Centre a string horizontally on the page. */
function drawCentred(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color = ESPRESSO,
  letterSpacing = 0,
) {
  if (letterSpacing === 0) {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (PAGE_W - w) / 2, y, size, font, color });
    return;
  }

  // pdf-lib has no tracking option, so spaced capitals are drawn per glyph.
  const chars = [...text];
  const total =
    chars.reduce((sum, ch) => sum + font.widthOfTextAtSize(ch, size), 0) +
    letterSpacing * (chars.length - 1);

  let x = (PAGE_W - total) / 2;
  for (const ch of chars) {
    page.drawText(ch, { x, y, size, font, color });
    x += font.widthOfTextAtSize(ch, size) + letterSpacing;
  }
}

/** Shrink the display size until the name fits the available measure. */
function fitText(text: string, font: PDFFont, startSize: number, maxWidth: number): number {
  let size = startSize;
  while (size > 18 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

/** Draw the QR as vector squares from the encoder's module matrix. */
async function drawQr(page: PDFPage, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const count: number = qr.modules.size;
  const data: ArrayLike<number> = qr.modules.data;
  const module = size / count;

  // Quiet zone — a QR without ~4 modules of margin fails to scan reliably.
  const quiet = module * 2;
  page.drawRectangle({
    x: x - quiet,
    y: y - quiet,
    width: size + quiet * 2,
    height: size + quiet * 2,
    color: rgb(1, 1, 1),
  });

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!data[row * count + col]) continue;
      page.drawRectangle({
        x: x + col * module,
        // PDF origin is bottom-left; QR rows run top-down.
        y: y + (count - row - 1) * module,
        width: module,
        height: module,
        color: ESPRESSO,
      });
    }
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function buildCertificatePdf(
  data: CertificateData,
  assets: Assets = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  pdf.setTitle(`${data.certificateNo} — ${data.fullName}`);
  pdf.setAuthor(data.schoolName);
  pdf.setSubject(data.courseTitle);
  pdf.setProducer('ISLII Student Management System');
  pdf.setCreationDate(new Date());

  // Custom fonts when the brand TTFs are present, otherwise the PDF standard
  // set. The fallback keeps issuance working rather than failing hard, and the
  // caller surfaces a warning so it is never silently off-brand.
  //
  // The standard names are written as LITERALS rather than read off the
  // `StandardFonts` enum. pdf-lib is CJS, and under Deno's `npm:` interop a
  // TypeScript enum imported as a named export can arrive as `undefined` —
  // `StandardFonts.TimesRoman` then evaluates to undefined and pdf-lib rejects
  // it with "`font` must be of type `string`…", which reads like a bug in the
  // certificate data rather than a module-resolution quirk. These four strings
  // are fixed by the PDF specification and will never change.
  const display = assets.displayFont
    ? await pdf.embedFont(assets.displayFont, { subset: true })
    : await pdf.embedFont('Times-Roman');
  const displayItalic = assets.displayFont
    ? display
    : await pdf.embedFont('Times-Italic');
  const body = assets.bodyFont
    ? await pdf.embedFont(assets.bodyFont, { subset: true })
    : await pdf.embedFont('Helvetica');

  const page = pdf.addPage([PAGE_W, PAGE_H]);

  /* ── Ground ─────────────────────────────────────────────────────────── */
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: LINEN });

  /* Double rule frame: espresso hairline outside, gold inside. */
  page.drawRectangle({
    x: 22, y: 22, width: PAGE_W - 44, height: PAGE_H - 44,
    borderColor: ESPRESSO, borderWidth: 1.4,
  });
  page.drawRectangle({
    x: 30, y: 30, width: PAGE_W - 60, height: PAGE_H - 60,
    borderColor: GOLD, borderWidth: 0.6,
  });

  /* ── Crest ──────────────────────────────────────────────────────────── */
  let cursorY = PAGE_H - 62;
  if (assets.crestPng) {
    const crest = await pdf.embedPng(assets.crestPng);
    const h = 84;
    const w = (crest.width / crest.height) * h;
    page.drawImage(crest, { x: (PAGE_W - w) / 2, y: cursorY - h, width: w, height: h });
    cursorY -= h + 20;
  } else {
    cursorY -= 12;
  }

  /* ── Titles ─────────────────────────────────────────────────────────── */
  drawCentred(page, data.schoolName.toUpperCase(), body, 10, cursorY, COFFEE, 3.4);
  cursorY -= 30;

  drawCentred(page, 'Certificate of Completion', display, 30, cursorY, ESPRESSO);
  cursorY -= 16;

  page.drawLine({
    start: { x: PAGE_W / 2 - 54, y: cursorY },
    end: { x: PAGE_W / 2 + 54, y: cursorY },
    thickness: 1,
    color: GOLD,
  });
  cursorY -= 30;

  /* ── Recipient ──────────────────────────────────────────────────────── */
  drawCentred(page, 'This is to certify that', body, 11.5, cursorY, MUTED);
  cursorY -= 44;

  const nameSize = fitText(data.fullName, display, 42, PAGE_W - 200);
  drawCentred(page, data.fullName, display, nameSize, cursorY, ESPRESSO);
  cursorY -= 14;

  const nameWidth = display.widthOfTextAtSize(data.fullName, nameSize);
  page.drawLine({
    start: { x: (PAGE_W - nameWidth) / 2 - 16, y: cursorY },
    end: { x: (PAGE_W + nameWidth) / 2 + 16, y: cursorY },
    thickness: 0.6,
    color: GOLD_DEEP,
  });
  cursorY -= 28;

  drawCentred(page, 'has successfully completed the', body, 11.5, cursorY, MUTED);
  cursorY -= 30;

  const courseSize = fitText(data.courseTitle, displayItalic, 22, PAGE_W - 240);
  drawCentred(page, data.courseTitle, displayItalic, courseSize, cursorY, GOLD_DEEP);
  cursorY -= 24;

  const period =
    data.intakeStarted && data.intakeEnded
      ? `${formatDate(data.intakeStarted)}  —  ${formatDate(data.intakeEnded)}`
      : data.duration;
  drawCentred(page, period, body, 10.5, cursorY, MUTED);
  cursorY -= 18;

  drawCentred(page, data.certification, body, 9.5, cursorY, COFFEE);
  if (data.grade) {
    cursorY -= 16;
    drawCentred(page, `Awarded with ${data.grade}`, body, 10, cursorY, COFFEE);
  }

  /* ── Footer: details left, signatures centre, QR right ───────────────── */
  const footY = 78;

  page.drawLine({
    start: { x: 58, y: footY + 74 },
    end: { x: PAGE_W - 58, y: footY + 74 },
    thickness: 0.5,
    color: rgb(0.78, 0.74, 0.68),
  });

  const label = (t: string, v: string, x: number, y: number) => {
    page.drawText(t.toUpperCase(), { x, y: y + 13, size: 6.5, font: body, color: MUTED });
    page.drawText(v, { x, y, size: 10, font: body, color: ESPRESSO });
  };

  label('Certificate No.', data.certificateNo, 58, footY + 40);
  label('Student No.', data.studentNo, 58, footY + 8);
  label('Date of Issue', formatDate(data.issuedOn), 235, footY + 40);
  label('Issued at', data.schoolLocation, 235, footY + 8);

  /* Signature lines */
  const sigY = footY + 14;
  for (const [x, role] of [
    [430, 'Lead Trainer'],
    [590, 'Director'],
  ] as const) {
    page.drawLine({
      start: { x, y: sigY + 16 }, end: { x: x + 120, y: sigY + 16 },
      thickness: 0.6, color: COFFEE,
    });
    page.drawText(role, { x, y: sigY, size: 7.5, font: body, color: MUTED });
  }

  /* QR + the URL in plain text beneath it. If the code is damaged, scuffed or
     photocopied badly, the certificate must still be verifiable by typing. */
  const qrSize = 86;
  const qrX = PAGE_W - 58 - qrSize;
  const qrY = footY + 6;
  await drawQr(page, data.verifyUrl, qrX, qrY, qrSize);

  const caption = 'Scan to verify';
  const capW = body.widthOfTextAtSize(caption, 7);
  page.drawText(caption, {
    x: qrX + (qrSize - capW) / 2, y: qrY - 12, size: 7, font: body, color: MUTED,
  });

  const host = data.verifyUrl.replace(/^https?:\/\//, '');
  const hostW = body.widthOfTextAtSize(host, 6);
  page.drawText(host, {
    x: qrX + (qrSize - hostW) / 2, y: qrY - 21, size: 6, font: body, color: MUTED,
  });

  return pdf.save();
}
