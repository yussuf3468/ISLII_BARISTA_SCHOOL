import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildCertificatePdf, type CertificateData } from './certificate-pdf.ts';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  POST /functions/v1/issue-certificate   { enrollment_id: uuid }
 * ─────────────────────────────────────────────────────────────────────────────
 *  Issuing a certificate is one indivisible operation: allocate a number, mint
 *  a verification token, render the PDF, store it, record the row. It runs
 *  server-side for two reasons that both matter.
 *
 *  1. The PDF is the artifact of record. Generated in a browser it would depend
 *     on whose machine produced it, and could be altered between generation and
 *     upload. Here every certificate is byte-for-byte deterministic.
 *  2. `allocate_number()` and INSERT on `certificates` are closed to clients by
 *     RLS. Only the service role reaches them, and the service role exists
 *     nowhere but in this function's environment.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://isliibarista.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Without this the browser re-runs the preflight before every single issue,
  // adding a round trip to an action staff perform in bursts.
  'Access-Control-Max-Age': '86400',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

/**
 * Brand assets live in the public `brand` bucket. Successful fetches are cached
 * for the isolate's lifetime so a burst of issuances doesn't refetch the fonts.
 *
 * FAILURES ARE NEVER CACHED, and that is the whole point of this comment.
 *
 * The first version cached `null` on a miss "for symmetry". The effect was that
 * the very first issuance on a cold isolate — before anyone had uploaded the
 * assets — poisoned that isolate permanently. Uploading the files afterwards
 * changed nothing: the same warm isolate kept serving Times New Roman and kept
 * reporting the assets as missing, for as long as Supabase kept it alive. It
 * looked exactly like a failed upload, which is the worst kind of bug — it
 * sends you to go and check the thing that was never wrong.
 *
 * A negative cache is only ever safe when the thing you are caching cannot
 * appear later. A file in a bucket can appear at any moment.
 */
const assetCache = new Map<string, Uint8Array>();

/** Why an asset did not load, in words the person reading a toast can act on. */
const assetErrors = new Map<string, string>();

async function loadAsset(path: string): Promise<Uint8Array | undefined> {
  const hit = assetCache.get(path);
  if (hit) return hit;

  const url = `${SUPABASE_URL}/storage/v1/object/public/brand/${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      /* "missing" was not enough to act on — it sent us checking an upload that
         may have been fine. The status distinguishes the real causes:
           404 → the file is not in the bucket, or the name/case differs
           400 → the bucket name is wrong
           401/403 → the bucket is not public
         Anything else is worth seeing verbatim rather than paraphrasing. */
      const why =
        res.status === 404
          ? `not found in the 'brand' bucket — check it is at the top level and named exactly '${path}'`
          : res.status === 400
            ? "the 'brand' bucket does not exist"
            : res.status === 401 || res.status === 403
              ? "the 'brand' bucket is not public"
              : `HTTP ${res.status}`;
      assetErrors.set(path, why);
      console.warn(`brand asset ${path}: HTTP ${res.status} — ${url}`);
      return undefined;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0) {
      assetErrors.set(path, 'the uploaded file is empty (0 bytes)');
      return undefined;
    }
    assetCache.set(path, bytes);
    assetErrors.delete(path);
    return bytes;
  } catch (err) {
    assetErrors.set(path, (err as Error).message);
    console.warn(`brand asset ${path}: ${(err as Error).message} — ${url}`);
    return undefined;
  }
}

Deno.serve(async (req) => {
  // The preflight must return 2xx with the CORS headers and nothing else.
  // `status: 200` is explicit rather than implied — a 204 with a body, or any
  // non-OK status, is what produces "preflight does not have HTTP ok status".
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS });
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  /* ── Authorise ────────────────────────────────────────────────────────
     The caller's JWT identifies them; their role comes from the database,
     never from the request body. */
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'missing bearer token' }, 401);

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'invalid session' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', userData.user.id)
    .single();

  if (!profile || !['admin', 'registrar'].includes(profile.role)) {
    return json({ error: 'not authorised to issue certificates' }, 403);
  }

  /* ── Validate the request ─────────────────────────────────────────── */
  let enrollmentId: string;
  try {
    ({ enrollment_id: enrollmentId } = await req.json());
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  if (!enrollmentId) return json({ error: 'enrollment_id is required' }, 400);

  const { data: enrollment, error: enrErr } = await admin
    .from('enrollments')
    .select(`
      id, status, grade, completed_on,
      student:students ( id, student_no, first_name, last_name ),
      intake:intakes ( starts_on, ends_on, course:courses ( title, duration, level, certification ) )
    `)
    .eq('id', enrollmentId)
    .single();

  if (enrErr || !enrollment) return json({ error: 'enrollment not found' }, 404);

  if (enrollment.status !== 'completed') {
    return json(
      { error: 'a certificate can only be issued for a completed enrollment' },
      409,
    );
  }

  // Belt and braces: a partial unique index enforces this in the database too,
  // but returning a clear message beats surfacing a constraint violation.
  const { data: existing } = await admin
    .from('certificates')
    .select('certificate_no')
    .eq('enrollment_id', enrollmentId)
    .eq('status', 'valid')
    .maybeSingle();

  if (existing) {
    return json(
      { error: `a valid certificate already exists: ${existing.certificate_no}` },
      409,
    );
  }

  /* ── Allocate identifiers ─────────────────────────────────────────── */
  const { data: certificateNo, error: numErr } = await admin.rpc('allocate_number', {
    p_kind: 'certificate',
  });
  if (numErr || !certificateNo) return json({ error: 'could not allocate a number' }, 500);

  const { data: verifyToken, error: tokErr } = await admin.rpc('new_verify_token');
  if (tokErr || !verifyToken) return json({ error: 'could not mint a token' }, 500);

  /* ── Render ───────────────────────────────────────────────────────── */
  const student = enrollment.student as Record<string, string>;
  const intake = enrollment.intake as Record<string, unknown>;
  const course = intake.course as Record<string, string>;

  const [crestPng, displayFont, bodyFont] = await Promise.all([
    loadAsset('crest.png'),
    loadAsset('Fraunces.ttf'),
    loadAsset('InstrumentSans.ttf'),
  ]);

  const payload: CertificateData = {
    certificateNo,
    studentNo: student.student_no,
    fullName: `${student.first_name} ${student.last_name}`,
    courseTitle: course.title,
    certification: course.certification,
    duration: course.duration,
    intakeStarted: (intake.starts_on as string) ?? null,
    intakeEnded: (intake.ends_on as string) ?? enrollment.completed_on ?? null,
    grade: enrollment.grade ?? null,
    issuedOn: new Date().toISOString(),
    verifyUrl: `${SITE_URL}/verify/${verifyToken}`,
    schoolName: 'ISLII Barista School',
    schoolLocation: 'Nairobi, Kenya',
  };

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildCertificatePdf(payload, { crestPng, displayFont, bodyFont });
  } catch (err) {
    return json({ error: `PDF generation failed: ${(err as Error).message}` }, 500);
  }

  /* ── Store, then record ───────────────────────────────────────────────
     Upload first: a stored PDF with no row is an orphan we can clean up, but a
     row pointing at a PDF that was never written is a broken certificate. */
  const year = new Date().getFullYear();
  const pdfPath = `${year}/${certificateNo}.pdf`;

  const { error: upErr } = await admin.storage
    .from('certificates')
    .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true });

  if (upErr) return json({ error: `could not store the PDF: ${upErr.message}` }, 500);

  const { data: cert, error: insErr } = await admin
    .from('certificates')
    .insert({
      certificate_no: certificateNo,
      verify_token: verifyToken,
      student_id: student.id,
      enrollment_id: enrollmentId,
      issued_by: profile.id,
      pdf_path: pdfPath,
    })
    .select()
    .single();

  if (insErr) {
    await admin.storage.from('certificates').remove([pdfPath]);
    return json({ error: `could not record the certificate: ${insErr.message}` }, 500);
  }

  await admin.from('audit_log').insert({
    actor: profile.id,
    action: 'certificate.issued',
    entity: 'certificates',
    entity_id: cert.id,
    detail: { certificate_no: certificateNo, student_no: student.student_no },
  });

  return json({
    certificate_no: certificateNo,
    verify_token: verifyToken,
    verify_url: payload.verifyUrl,
    pdf_path: pdfPath,
    // Surfaced so an off-brand fallback render is never silent.
    warnings: [
      !crestPng && `crest.png — ${assetErrors.get('crest.png') ?? 'not loaded'}`,
      !displayFont && `Fraunces.ttf — ${assetErrors.get('Fraunces.ttf') ?? 'not loaded'}`,
      !bodyFont && `InstrumentSans.ttf — ${assetErrors.get('InstrumentSans.ttf') ?? 'not loaded'}`,
    ].filter(Boolean),
    // Echoed so the exact URL the function tried can be opened in a browser.
    // Diagnosing this from the outside meant guessing at which of upload,
    // bucket name, casing or visibility was wrong; now it just says.
    brandBase: `${SUPABASE_URL}/storage/v1/object/public/brand/`,
  });
});
