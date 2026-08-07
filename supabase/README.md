# ISLII Student Management System — Setup

Everything the admin and certificate verification need, from an empty Supabase
project to a working certificate in about twenty minutes.

---

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com) — region **eu-west**
   or the nearest to Nairobi.
2. From **Project Settings → API**, copy the **Project URL** and the **anon
   public** key.

Create `.env.local` in the repo root:

```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> **The `service_role` key must never be added here.** Anything prefixed
> `VITE_` is compiled into the JavaScript every visitor downloads. The anon key
> is designed to be public and is useless without the RLS policies' permission;
> the service role key bypasses RLS entirely and belongs only in Edge Function
> secrets (step 4).

The site runs perfectly well without these — the marketing pages are unaffected
and `/admin` explains what is missing.

---

## 2. Run the migrations

In **SQL Editor**, run each file once, in order:

| Order | File | Creates |
|-------|------|---------|
| 1 | `migrations/0001_schema.sql` | Tables, enums, indexes, constraints |
| 2 | `migrations/0002_functions.sql` | Numbering, verification, triggers |
| 3 | `migrations/0003_rls.sql` | **All security policies** + storage buckets |
| 4 | `migrations/0004_seed.sql` | The six programmes |
| 5 | `migrations/0005_finance_attendance_grades.sql` | Course fees, the payments ledger, attendance, assessments |
| 6 | `migrations/0006_finance_functions_rls.sql` | Their functions, views and **security policies** |
| 7 | `migrations/0007_pricing_integrity.sql` | Cohort pricing, nullable fees, and two data-loss fixes |
| 8 | `migrations/0008_expenses.sql` | The expenses ledger, spending categories, and per-cohort margin |
| 9 | `migrations/0009_discounts.sql` | Per-student discounts, each with a recorded reason |
| 10 | `migrations/0010_unpriced_enrolments.sql` | Fixes students enrolled BEFORE a fee was set showing no fee |

Or with the CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

> **Run all ten, in order, and do not skip `0003` or `0006`.** Until those run
> the tables they cover have no policies and no protection.
>
> **`0007` is not optional and should run before real data goes in.** It stops
> payments being cascade-deleted along with a student (which silently erased the
> school's income), and makes a fee of `0` mean "free" rather than being
> overwritten with the full course price. It resets currently-zero enrolments to
> "unpriced" so they can be priced properly — it skips any enrolment that has
> payments against it, but it is far cleaner to run on an empty system than
> after a term's fees are in.

---

## 3. Create the first staff account

**Authentication → Users → Add user**, with *Auto Confirm* ticked.

The `handle_new_user` trigger creates the matching profile automatically, and
**the first account created becomes `admin`** so the system is reachable. Every
account after that starts as `viewer` — promote them in the `profiles` table:

```sql
update public.profiles set role = 'registrar' where email = 'someone@example.com';
```

| Role | Register students | Enrol | Issue certificates | Revoke | Manage users |
|------|:---:|:---:|:---:|:---:|:---:|
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `registrar` | ✓ | ✓ | ✓ | — | — |
| `viewer` | — | — | — | — | — |

---

## 4. Deploy the certificate function

**Nothing can issue a certificate until this is done.** Until the function is
deployed the endpoint returns `404`, and because a 404 preflight carries no CORS
headers the browser reports it as a **CORS** error — which sends you hunting for
a CORS bug that does not exist.

```bash
supabase login                                    # opens a browser, once
supabase link --project-ref udrptwferwkqvcajclzy
supabase functions deploy issue-certificate

supabase secrets set SITE_URL=https://isliibarista.com
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically — do not set them by hand.

Confirm it is live — this must print `200`, not `404`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS \
  https://udrptwferwkqvcajclzy.supabase.co/functions/v1/issue-certificate \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

### Why `verify_jwt = false` is set for this function

`supabase/config.toml` disables the **gateway's** JWT check for
`issue-certificate`. That is deliberate, and it is not a security hole.

With it enabled, Supabase checks for a JWT *before* the request reaches our code
— including on the browser's CORS preflight. A preflight is an `OPTIONS` request
that by specification carries no `Authorization` header, so the gateway answers
`401`, and the browser reports "preflight does not have HTTP ok status". The
request never arrives.

Authentication simply moved inside the handler, where it can answer `OPTIONS`
first and then check everything else:

| Condition | Response |
|---|---|
| Missing or malformed bearer token | `401` |
| Token that `getUser()` rejects | `401` |
| Role is not `admin` or `registrar` | `403` |

Every privileged write still runs through the service role, which exists nowhere
but in this function's environment.

> **`SITE_URL` is permanent infrastructure.** It is baked into the QR code of
> every certificate ever printed. A certificate handed to an employer in 2035
> will still point here. Changing it later invalidates every certificate printed
> before the change.

---

## 5. Upload the brand assets for the PDF

All three files are **already prepared** in `supabase/brand-assets/`. Upload them
into the `brand` bucket (created by `0003_rls.sql`) at the **top level, no
folder**, keeping the names exactly as they are:

| File | Size | What it is |
|------|------|-----------|
| `crest.png` | 362 KB | The school crest, 471×512 |
| `Fraunces.ttf` | 35 KB | Display face — student name, headings |
| `InstrumentSans.ttf` | 37 KB | Body face — labels, dates, numbers |

Dashboard → **Storage** → `brand` → *Upload files*. Or:

```bash
supabase storage cp supabase/brand-assets/crest.png          ss:///brand/crest.png
supabase storage cp supabase/brand-assets/Fraunces.ttf       ss:///brand/Fraunces.ttf
supabase storage cp supabase/brand-assets/InstrumentSans.ttf ss:///brand/InstrumentSans.ttf
```

**If any of the three is missing, issuance still succeeds** — the function falls
back to Times/Helvetica, skips the crest, and returns a `warnings` array so it is
never *silently* off-brand. The certificate simply will not look like the
school's.

### Why these are not just the files from the website

Two conversions had to happen, and both are easy to get wrong:

- **The crest is WebP on the site.** pdf-lib embeds PNG and JPEG only. A WebP
  upload fetches successfully and then fails at `embedPng`, which reads like a
  corrupt file rather than a wrong format.
- **The fonts are WOFF2 on the site, and variable.** pdf-lib cannot read WOFF2 at
  all. Decompressing to `.ttf` is necessary but *not sufficient*: fontkit embeds
  a variable font at its **default instance**, and Fraunces defaults to
  `wght=900, opsz=9, WONK=1` — an ultra-black display face with the quirky
  alternates switched on. Downloading the variable TTF straight from Google Fonts
  produces exactly that. These two are pinned static instances (Fraunces
  `wght=600 opsz=48`, Instrument Sans `wght=400`), so every certificate renders
  identically forever.

To regenerate them, see the conversion steps in this file's git history, or
re-run the decompression with `fontTools` + `varLib.instancer`.

---

## 6. Try it end to end

1. Sign in at `/admin/login`.
2. **Intakes → New intake** — pick a course, give it a code (`BAR-2026-01`) and
   a start date.
3. **Students → Register student** — a number like `ISLII-2026-0001` is
   allocated automatically.
4. Open the student, **enrol** them into the intake.
5. **Mark as completed**, then **Issue certificate**.
6. The verification URL appears immediately. Open it, or download the PDF and
   scan the QR with a phone.

---

## How the security actually works

**Anonymous visitors have no table access at all.** Not restricted access —
none. The entire public surface is two `SECURITY DEFINER` functions,
`verify_certificate(token)` and `find_certificate(no, surname)`, each returning
a fixed, narrow column list. Phone numbers, emails, national IDs and internal
notes cannot be reached even by querying PostgREST directly with the anon key
lifted out of the bundle.

**The QR encodes a random 144-bit token, never the certificate number.**
Certificate numbers run in sequence, so a QR pointing at `…/verify/ISLII-CERT-2026-0001`
would let anyone walk the whole register by incrementing a number. The typed
search additionally requires the holder's surname for the same reason.

**Numbers are allocated under a row lock.** `allocate_number()` uses
`UPDATE … RETURNING` on a counter row, so simultaneous registrations serialise
instead of both reading the same value. `SELECT max(seq)+1` would produce
duplicate student numbers under load — on a document that gets printed.

**Certificates are never deleted, only revoked.** A revoked certificate keeps
resolving and reports itself as revoked. If it vanished, its QR would return
"not found", which an employer cannot distinguish from a forgery. The database
has no DELETE policy on `certificates` at all.

**The React app's role checks are cosmetic.** They hide buttons. Every
privileged action is independently enforced by RLS or inside a function, so a
tampered frontend achieves nothing.

---

## Costs

The free tier covers 500 MB database and 1 GB storage. At roughly 150–250 KB per
certificate PDF that is around 5,000 certificates before storage matters, and
the database will not be near its limit. No surprises at this scale.

---

## Backups

Supabase takes daily backups on paid plans. Regardless of plan, export the
register periodically — a certificate outlives the software that issued it:

```sql
copy (
  select c.certificate_no, c.status, c.issued_at, s.student_no,
         s.first_name, s.last_name, co.title, i.starts_on, i.ends_on
  from certificates c
  join students s on s.id = c.student_id
  join enrollments e on e.id = c.enrollment_id
  join intakes i on i.id = e.intake_id
  join courses co on co.id = i.course_id
  order by c.issued_at
) to stdout with csv header;
```
