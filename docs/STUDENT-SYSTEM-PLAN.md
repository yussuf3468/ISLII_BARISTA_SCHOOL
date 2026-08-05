# ISLII Student Management System — Implementation Plan

**Status:** proposal, awaiting sign-off. Nothing built yet.
**Stack:** Supabase (Postgres + Auth + Storage + Edge Functions) inside the
existing React 18 / TypeScript / Vite site.

---

## 1. What was asked for, and what I'm adding

Requested by the client:

| # | Feature |
|---|---------|
| 1 | Student registration |
| 2 | Student number generation (`ISLII-2026-0001`) |
| 3 | Course assignment |
| 4 | Certificate generation |
| 5 | QR code generation |
| 6 | Certificate verification page |
| 7 | Search certificate by number |
| 8 | Admin dashboard |
| 9 | Printable PDF certificates |

The brief says "not limited to". Four additions are not optional extras — a
verification system without them is not trustworthy, and I'd rather argue for
them now than retrofit later:

| # | Addition | Why it isn't optional |
|---|----------|----------------------|
| 10 | **Certificate revocation** | Certificates get issued to the wrong person, with the wrong name, or to someone who later turns out to have cheated. With no way to withdraw one, a bad certificate verifies as VALID forever — and the moment that happens publicly, every other certificate's credibility goes with it. |
| 11 | **Audit log** | "Who issued this certificate and when" is the first question asked in any dispute. It cannot be reconstructed after the fact. |
| 12 | **Role-based access** | A receptionist registering students should not be able to issue or revoke certificates. |
| 13 | **Intakes / cohorts** | The school already runs capped intakes. Without modelling them, "which class was this student in" is unanswerable, and reporting is impossible. |

---

## 2. Where it lives

**One repo, one app, one deploy** — `/admin` and `/verify` added to the existing site.

```
/                       marketing site (unchanged)
/verify                 public — search by certificate number
/verify/:token          public — full record, this is what the QR opens
/admin/login            staff sign-in
/admin                  dashboard
/admin/students         list, search, register, edit
/admin/students/:id     profile, enrollments, certificates
/admin/certificates     issue, revoke, re-download
/admin/intakes          cohort management
/admin/settings         users & roles
```

**Why not a separate admin app.** The real security boundary is Postgres
Row-Level Security, not which JavaScript bundle the code sits in. Splitting into
two apps doubles the deployment surface and duplicates the design system (crest,
fonts, colours, buttons all already exist here) to buy security that RLS already
provides. `/admin` is a lazy-loaded route group, so marketing visitors never
download it.

**Keys.** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` ship in the client —
that is by design and safe, because the anon key can only do what RLS permits.
The `SERVICE_ROLE_KEY` bypasses RLS entirely and must **never** appear in the
bundle, in the repo, or in an env var prefixed `VITE_`. It lives only in Edge
Function secrets.

---

## 3. Data model

```
profiles          staff accounts, extends auth.users, carries `role`
students          person record + generated student_no
courses           mirrors the 6 programmes on the marketing site
intakes           a cohort: course + start/end dates + capacity
enrollments       student ↔ intake, with status and completion
certificates      the issued artifact: number, verify token, status, PDF path
audit_log         who did what, when, to which row
```

### Key columns

**students**
`id` · `student_no` (unique, `ISLII-2026-0001`) · `first_name` · `last_name` ·
`phone` · `email` · `national_id` · `photo_path` · `notes` · `created_at` · `created_by`

**certificates**
`id` · `certificate_no` (unique) · `verify_token` (unique, random, **not**
sequential) · `student_id` · `enrollment_id` · `issued_at` · `issued_by` ·
`status` (`valid` | `revoked`) · `revoked_at` · `revoked_by` · `revoked_reason` ·
`pdf_path`

### One source of truth for courses

The marketing site drives its cards, detail pages and `Course` structured data
from `src/data/courses.ts`. The SMS needs the same six programmes.

**Recommendation:** keep `courses.ts` as the marketing source (it carries
syllabus copy, photos and SEO fields the database has no business holding), and
seed a lean `courses` table keyed on the **same slugs**. A seed script keeps them
aligned. Trying to serve marketing copy out of Postgres would mean the public
site can no longer be a static build.

---

## 4. The three decisions that determine whether this is trustworthy

Everything else is CRUD. These three are where systems like this actually fail.

### 4.1 Number generation must be race-safe

The obvious implementation is wrong:

```sql
-- WRONG: two registrations a millisecond apart both read 41 and both write 42
SELECT MAX(seq) + 1 FROM students WHERE year = 2026;
```

Under any concurrency this produces duplicate student numbers, and
`student_no` is the one identifier printed on a physical certificate.

**Approach:** a Postgres function holding a per-year counter row and taking a
row lock (`SELECT ... FOR UPDATE`) or a transaction-scoped advisory lock, so the
read-increment-write is atomic. Called via RPC, never reimplemented in JS.

```
ISLII-2026-0001
  │     │    └── zero-padded, per-year sequence
  │     └─────── year of registration
  └───────────── fixed prefix
```

### 4.2 The QR must NOT encode the certificate number

This is the single most important decision in the whole design.

`ISLII-2026-0001` is sequential and human-guessable. If the QR opens
`/verify/ISLII-2026-0001`, then anyone can walk the entire register by
incrementing a number — every graduate's name, course and dates, scraped in a
few minutes.

**So there are two separate lookup paths:**

| Path | Opened by | Input | Shows |
|------|-----------|-------|-------|
| `/verify/:token` | Scanning the QR | Random 22-char token, unguessable | Full public record |
| `/verify` | A human typing | Certificate number **+ surname** | Confirmation only: valid/revoked, name, course, date |

The employer scanning a QR gets everything instantly. Someone guessing numbers
gets nothing without already knowing the graduate's surname — and the search
path is rate-limited on top.

### 4.3 The verification page exposes a deliberately narrow slice

Employers need to confirm a qualification. They do not need the student's phone
number, email, national ID or what they paid.

**Shown:** validity status · student photo (if used) · full name · student
number · course · level · duration · intake dates · certificate number · issue
date · issuing school.

**Never shown:** phone · email · national ID · address · fees · internal notes.

Enforced in the database as a Postgres **view** exposing only those columns, with
an RLS policy permitting anonymous `SELECT` by token — not by filtering in React,
which anyone can bypass by querying Supabase directly with the anon key.

---

## 5. Certificate PDF generation

### Options considered

| Approach | Verdict |
|----------|---------|
| `html2canvas` + `jsPDF` | **No.** Rasterises the DOM — text becomes pixels, output is blurry when printed, files are large, and it breaks whenever CSS changes. |
| `react-pdf` | Workable, React-flavoured API, but client-only and another rendering model to maintain. |
| **`pdf-lib` + `@pdf-lib/fontkit`** | **Chosen.** True vector output, precise placement, embeds fonts and images, and runs in both the browser *and* Deno — so the same code can move between client and Edge Function without a rewrite. |

### Generated server-side, in an Edge Function

Issuing a certificate is a single transactional operation that must not be
splittable by the client:

```
POST /functions/v1/issue-certificate  { enrollment_id }
  ├─ authorise caller (must be admin or registrar)
  ├─ verify the enrollment is completed and has no live certificate
  ├─ allocate certificate_no atomically
  ├─ generate verify_token (crypto random)
  ├─ render QR  →  https://isliibarista.com/verify/<token>
  ├─ compose PDF with pdf-lib
  ├─ upload to Storage  certificates/<year>/<certificate_no>.pdf
  └─ INSERT certificates row  →  return { certificate_no, token, pdf_url }
```

Doing this in the browser would mean the PDF that becomes the permanent artifact
depends on whose laptop generated it, and could be modified between generation
and upload. Server-side, every certificate is byte-for-byte consistent and the
stored PDF is canonical.

> **Known task:** `pdf-lib` embeds **TTF/OTF**, not WOFF2. The site's
> self-hosted fonts are WOFF2, so TTF builds of Fraunces and Instrument Sans need
> fetching and storing alongside the function. Small job, but it will bite if
> left until implementation day.

### Certificate layout

A4 landscape, matching the brand: crest at top, student name in Fraunces at
display size, course title, intake dates, certificate number, two signature
lines, QR bottom-right with the **verification URL printed as text beneath it**
(so a damaged or unscannable QR doesn't make the certificate unverifiable).

---

## 6. Roles

| Role | Register students | Enroll | Issue certificates | Revoke | Manage users |
|------|:---:|:---:|:---:|:---:|:---:|
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `registrar` | ✓ | ✓ | ✓ | — | — |
| `viewer` | — | — | — | — | — |

Enforced by RLS policies reading `profiles.role`, so a modified frontend cannot
escalate. UI hiding is convenience only.

---

## 7. Build phases

| Phase | Deliverable | Notes |
|-------|-------------|-------|
| **1 — Foundation** | Supabase project, full schema, RLS policies, seed data, auth, `/admin` shell + login, protected routing | The RLS policies are the security model; they get written and tested first, not last |
| **2 — Students** | Registration form (RHF + Zod), atomic student-number RPC, list with search/filter/pagination, student profile, photo upload | |
| **3 — Enrollment** | Courses seeded from `courses.ts`, intake management, assign student → intake, completion status | |
| **4 — Certificates** | `issue-certificate` Edge Function, atomic numbering, QR, pdf-lib layout, Storage upload, revoke flow, audit entries | The heaviest phase |
| **5 — Verification** | Public `/verify/:token`, `/verify` search, public view + anon RLS, rate limiting, revoked and not-found states | |
| **6 — Dashboard & hardening** | Counts and recent activity, audit log viewer, bulk import for existing graduates, backup/export, end-to-end pass | |

Phases 1 and 4 carry nearly all the risk. 2, 3 and 6 are largely mechanical.

---

## 8. Decisions I need before starting

| # | Decision | Why it blocks |
|---|----------|---------------|
| 1 | **Certificate number format** — same series as the student number, or its own (e.g. `ISLII-CERT-2026-0001`)? | One student can earn several certificates, so they cannot share a number. Needs deciding before the schema is written. |
| 2 | **Student photos on certificates?** | Changes the registration flow, storage, the PDF layout and the verify page. Strongly recommended — a photo is what stops someone using a graduate's certificate number as their own. |
| 3 | **Backfill the existing ~500 graduates?** | If yes, we need their data in a spreadsheet and a bulk-import tool, and we must decide whether their certificate numbers are retrofitted or start fresh. |
| 4 | **Who gets accounts, and how many?** | Determines whether the three-role model above is right or over-engineered. |
| 5 | **Certificate design** — does the school have an existing one to match, or do we design it? | Blocks the PDF layout entirely. If we design it, I'll produce it from the brand system already built. |
| 6 | **Grades or scores on certificates?** | Adds assessment fields to the data model. |
| 7 | **Is `isliibarista.com` permanent?** | See below. |

---

## 9. Things worth flagging

**The QR URL is permanent infrastructure.** A printed certificate might be
handed to an employer in 2035. Whatever domain goes into that QR must resolve
forever, or every certificate printed before the change becomes unverifiable.
This deserves an explicit decision from the client, not a default.

**Kenya's Data Protection Act (2019).** Holding names, phone numbers, national
IDs and photographs makes the school a data controller. Registration with the
ODPC may be required depending on scale, and students should be told what is
stored and why. Worth the client confirming with their own advisor — I'm
flagging it, not advising on it.

**Supabase free tier** covers 500 MB database and 1 GB storage. At roughly
200 KB per certificate PDF that is ~5,000 certificates before the storage tier
matters, and the database will not be close. Fine to start; not a surprise later.

**Certificates outlive software.** Whatever happens to this system, the school
should be able to export the full register to CSV and the PDFs to a folder. A
one-click export goes in Phase 6 rather than being an afterthought.

---

## 10. New dependencies

| Package | Version | For |
|---------|---------|-----|
| `@supabase/supabase-js` | 2.112.0 | Client, auth, storage |
| `pdf-lib` | 1.17.1 | Certificate PDFs |
| `@pdf-lib/fontkit` | 1.1.1 | Font embedding |
| `qrcode` | 1.5.4 | QR generation |
| `@tanstack/react-query` | 5.101.4 | Admin data fetching, caching, optimistic updates |

`react-hook-form`, `zod` and `@hookform/resolvers` are already installed and
carry over. All admin-only code is lazy-loaded, so **the public marketing bundle
does not grow**.

---

*Prepared by Lenzro Software Solutions.*
