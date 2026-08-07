# System Disclosure & Acceptance Record

**ISLII Barista School — Website and Student Management System**

Prepared by **Lenzro Software Solutions** for **ISLII Barista School**.

| | |
|---|---|
| Document version | 1.0 |
| Date issued | ______________________ |
| Delivered system | isliibarista.com + Student Management System |
| Supabase project | `udrptwferwkqvcajclzy` (region: as provisioned) |

---

## 0. What this document is, and what it is not

**It is** a complete, written statement of what has been built, how it works,
what it holds, what it does not do, and what the School must do to keep it
working. Section 7 lists the known risks. Section 8 lists what is the School's
responsibility from handover onward.

**It is not legal advice**, and it does not by itself limit anybody's legal
liability. Whatever the engagement contract says about liability, warranty and
support is what governs that. The purpose of this record is narrower and
practical: so that no risk listed here can later be described as undisclosed,
and so that whoever maintains the system next does not have to guess.

Please read §7 and §8 before signing §11. If anything in them is unacceptable,
say so before acceptance rather than after — most of it is fixable, and some of
it is only expensive once data is live.

---

## 1. What was delivered

| Component | Description |
|---|---|
| **Public website** | Home, About, Courses (+ 6 course pages), Gallery, FAQ, Contact. Static files; no server or database required. |
| **Certificate verification** | Public pages at `/verify` and `/verify/<token>`. The QR on every printed certificate opens the second. |
| **Student Management System** | `/admin` — students, courses, intakes, enrolments, fees & payments, attendance, grades, certificates, staff roles, audit log. |
| **Database & backend** | Supabase: PostgreSQL, authentication, file storage, one server-side function for certificate generation. |
| **Documentation** | `HANDOVER.md` (ownership & operations), `docs/ADMIN-GUIDE.md` (staff guide), `supabase/README.md` (backend setup), this document. |

Source code, database migrations and all original photography are delivered in
full. There are no hidden components, licence keys or third-party services
beyond those named in §3.

---

## 2. How the system is put together

Three separate things share one domain:

1. **The website** is a set of static files. It has no database and cannot
   "go down" for database reasons. Hosting it costs nothing on the plans
   normally used.

2. **The admin** is loaded only when someone visits `/admin`. A visitor reading
   about a course never downloads it. It talks directly to Supabase.

3. **Certificate verification** is public and deliberately minimal. It reads
   the database through two tightly-restricted functions that return a fixed,
   narrow set of fields (§5).

**There is no server of ours in the middle.** The browser talks to Supabase
directly. This means there is no application server for the School to maintain,
patch or pay for — and it also means **the database's own security rules are
the only thing protecting the data**. That is why §5 matters.

---

## 3. Third-party services the system depends on

| Service | Used for | If it fails |
|---|---|---|
| **Supabase** | Database, staff login, file storage, certificate generation | Admin and certificate verification stop working. The public website continues to work normally. |
| **Static host** (Vercel / Netlify / Cloudflare Pages) | Serving the website | The whole site is unreachable. |
| **Domain registrar** | `isliibarista.com` | Site and **all certificate QR codes** stop resolving. See §7.4. |
| **Unsplash** (images CDN) | Some stock photography | Affected images do not display. Text and function are unaffected. |
| **Google Fonts** | Not used — fonts are self-hosted | — |

No analytics, advertising or tracking service is installed. No student data is
sent to any third party other than Supabase.

---

## 4. The database, in plain terms

Thirteen tables. The short version of each and, where relevant, the rule that
protects it.

| Table | Holds | Notes |
|---|---|---|
| `students` | Name, phone, email, national ID, photo reference, notes | The register. National ID is visible only to Admins. |
| `courses` | Programmes offered, duration, level, certification, standard fee | |
| `intakes` | A cohort of a course — code, start/end dates, capacity, optional cohort fee | Students enrol into intakes, never into courses directly. |
| `enrollments` | Links a student to an intake; status, agreed fee, completion date | **The agreed fee is a snapshot** (§4.1). |
| `payments` | Every receipt: amount, method, reference, date, who recorded it | **Append-only** (§4.2). |
| `attendance` | One mark per student per session: present / late / absent / excused | One row per student per day; taking a register twice corrects, never duplicates. |
| `assessments` | Named, weighted marks for a cohort (papers, practicals) | |
| `assessment_scores` | Each student's mark for each assessment | A mark above the assessment maximum is rejected. |
| `certificates` | Certificate number, verification token, PDF location, status | **Never deleted** (§4.3). |
| `profiles` | Staff accounts and their role | |
| `audit_log` | Who did what, when | Append-only; cannot be edited or deleted by anyone. |
| `expenses` | Money out: what, how much, category, supplier, and optionally which cohort it was for | **Append-only**, exactly like `payments`. |
| `counters` | Sequential numbering for students, certificates, receipts and expenses | Touched only by the system, never by staff. |

Four read-only views (`enrollment_finance`, `enrollment_attendance`,
`enrollment_grades`, `intake_finance`) calculate balances, attendance rates,
final grades and per-cohort margin on demand. **No totals are stored.** A
corrected or deleted payment can therefore never leave a stale balance behind.

`intake_finance` counts only costs explicitly booked to a cohort — rent and
power are not apportioned, because any split would be invented. It is therefore
**direct cost**, not true profit, and the screen says so.

Three storage areas: `student-photos` (public), `certificates` (private — staff
access only, via time-limited links), `brand` (public — the crest and fonts used
on certificates).

### 4.1 Fees are snapshotted, on purpose

When a student is enrolled, the fee that applies at that moment is **copied onto
their enrolment**. Raising a course price later does not re-bill anybody already
enrolled. A student who enrolled at KES 30,000 still owes KES 30,000.

This is intended behaviour. If the School wants an existing student re-priced,
it must be changed on that student's record deliberately.

Fee values carry three distinct meanings, and the difference matters:

- **No fee set** — nobody has priced it. The system **refuses to accept a
  payment** against it.
- **0** — deliberately free (scholarship, bursary, staff child).
- **Any other value** — the agreed fee.

### 4.2 The payment ledger is append-only

Payments cannot be edited. A correction is made by an Admin **deleting** the
payment — which requires a written reason and is recorded permanently in the
audit log — and recording the correct one.

A student who has ever paid **cannot be deleted** until those payments are dealt
with. This is enforced by the database, not by the interface.

### 4.3 Certificates are never deleted

A certificate that exists in the world must always resolve — as **valid** or as
**revoked**. Withdrawing a certificate is done by *revoking* it, which requires
a reason and keeps the QR working; the verification page then reports it as
revoked.

Deleting one would make it verify as "not found", which to an employer is
indistinguishable from a forgery. The database does not permit it.

---

## 5. Who can do what, and how it is enforced

| Action | Viewer | Registrar | Admin |
|---|:--:|:--:|:--:|
| View students, fees, attendance, grades | ● | ● | ● |
| Export CSV / attendance PDF | ● | ● | ● |
| Register students, enrol, take registers, enter marks | | ● | ● |
| Manage courses, intakes, fees | | ● | ● |
| Record payments | | ● | ● |
| Issue certificates | | ● | ● |
| See a student's national ID | | | ● |
| Revoke a certificate; delete a payment or student | | | ● |
| Change staff roles | | | ● |
| Read the audit log | | | ● |

**These rules live in the database, not in the screens.** Hiding a button stops
nobody — the security rules are applied to every request regardless of what
interface made it. This is the correct design and it is also why those rules
must not be relaxed or disabled, including "temporarily, for testing", on the
live project.

New staff accounts start as **Viewer** and must be promoted by an Admin. The
first account ever created becomes an Admin automatically.

Anonymous visitors have **no access to any table**. Certificate verification
works through two functions that return a deliberately narrow set of fields.
**Phone numbers, email addresses, national ID numbers, notes and all financial
information are never exposed publicly** — not hidden by the interface, but not
retrievable at all.

---

## 6. Personal data the system holds

The School should be aware that this system stores personal data, including
data that is sensitive in Kenyan law:

- Student names, phone numbers, email addresses
- **National ID numbers**
- **Photographs of students**
- Emergency contact details
- Fee and payment records
- Attendance and academic performance records

Under the **Kenya Data Protection Act 2019**, the School — not Lenzro — is the
**data controller** for this information. Responsibilities that follow from that
include (this list is indicative, not exhaustive, and is not legal advice):

- Having a lawful basis for collecting national IDs and photographs, and telling
  students what they are used for
- Registering with the Office of the Data Protection Commissioner if the
  School's processing meets the threshold requiring it
- Responding to a student's request to see, correct or erase their data
- Reporting a personal-data breach within the statutory timeframe
- Not keeping records longer than there is a reason to

**The School is advised to take its own advice on these obligations.** The
system provides the technical means to comply — role restrictions, an audit
trail, national IDs restricted to Admins, and the ability to edit or delete a
student record — but compliance is an organisational matter, not a software
feature.

The public certificate verification page shows a graduate's **name, photograph
and course**. That is its purpose, and it is what the QR is for. If the School
does not want a particular graduate's photograph public, leave the photo field
empty for that student.

---

## 7. Known risks and limitations — please read

Everything in this section is known, disclosed, and either accepted or fixable.
None of it is a defect.

### 7.1 The Supabase project is on the FREE plan ⚠️ **highest risk**

Two consequences:

**a) The project sleeps.** Free projects pause after roughly a week with no
database activity. The admin becoming unavailable is an inconvenience — someone
clicks *restore*. **Certificate verification becoming unavailable is a
credibility failure**: an employer scans a graduate's QR, receives nothing, and
cannot distinguish that from a forged certificate.

A school does not use its admin every week — term breaks, holidays, quiet
months. This is a question of *when*, not *if*.

**b) There are no backups.** Paid plans take automatic daily backups. Free plans
take none. This database holds every receipt and balance the School has recorded.

**Mitigations provided (free):** two automated jobs are included —
`keep-alive.yml` queries the database every three days so it never reaches the
pause threshold, and `backup.yml` takes a weekly database export kept for 90
days. Both must be switched on with the credentials listed in `HANDOVER.md` §7.

**These are mitigations, not equivalents.** They do not cover student
photographs (files, not database rows — these must be downloaded by hand once a
term), they do not provide point-in-time recovery (worst case: six days of
entries lost), and they depend on Supabase's current pause policy continuing.

> **Recommendation: Supabase Pro (approximately USD 25/month).** Stated plainly,
> that is the cost of guaranteeing a certificate issued today still verifies in
> ten years — which is the entire promise the certificate makes to a graduate.
> The School has been informed of this and may decline it; the risk then rests
> with the School.

### 7.2 There is no automated test suite

The system was verified by direct inspection and scripted browser testing at the
time each part was built. There are no regression tests. **The first person to
modify the fee, attendance or grading logic will not have a safety net**, and a
mistake there may not be visible until a balance is wrong.

Anyone changing this code should test against a copy of the database, never
directly against the live one.

### 7.3 Backups exclude uploaded files

A database export contains records, not files. Certificate PDFs can be
regenerated from their records. **Student photographs cannot** — if the storage
area is lost, they are gone. Download the `student-photos` area once a term.

### 7.4 Two values are permanent once certificates exist

- **The domain `isliibarista.com`** and
- **the `SITE_URL` setting on the certificate function**

are both written into the QR code of every certificate ever printed. A
certificate handed to an employer in 2035 still points at them. Changing either
invalidates every certificate issued before the change. If the School ever
rebrands, the old domain must be kept alive and redirecting.

### 7.5 Older browsers cannot display the site

The site is built with Tailwind CSS v4, which requires **Safari 16.4+,
Chrome 111+ or Firefox 128+** (it uses `color-mix()`, `@property` and cascade
layers, which older engines do not understand). Roughly: an iPhone on iOS 16.4
or later, released March 2023. Below that the site cannot render correctly, and
no configuration change fixes it — only rebuilding on an older CSS framework
would, which is a substantial piece of work.

**What happens instead is handled.** A visitor whose browser cannot run the
site — too old, JavaScript disabled, or a chunk that never downloads on a poor
connection — previously saw a dark screen for ever, with no way to tell
"loading" from "broken". They now get a plain page with the School's phone
number, WhatsApp link, address and opening hours, so an incompatible device
becomes a phone call rather than a lost enquiry.

This matters more for the public website than the admin: staff can be asked to
use a current browser, prospective students cannot.

### 7.6 Content still awaiting the School

| Item | Status |
|---|---|
| Exact street address & map coordinates | **Placeholder** — currently "Nairobi CBD" with generic city coordinates. Affects the map, Contact page and local search listing. |
| Instagram / Facebook links | Empty (icons hide themselves) |
| "Chantilly Butter" spelling | Unconfirmed against the brochure |
| Standalone course fees | Not supplied |

### 7.7 Two items were deliberately removed

- **Graduation and employment rates (98% / 92%)** were drafts written for the
  design, never measured by anyone. They were **removed rather than published**,
  because a published statistic is a claim the School must be able to defend,
  and prospective students would have relied on it.
- **All testimonials were placeholder text** attributed to people who do not
  exist. The section does not render until real, permissioned quotes are
  supplied. Publishing invented testimonials is misleading and, in many
  jurisdictions, unlawful.

Both can be reinstated the moment the School has real figures and real quotes.

---

## 8. The School's responsibilities from handover

1. **Own the accounts.** Domain, Supabase, hosting and the Google account should
   all be owned by a permanent School email address, not any individual's
   personal account. (`HANDOVER.md` §2.)
2. **Decide on the hosting plan** (§7.1) and, if remaining on free, switch on
   both automated jobs and confirm they run.
3. **Verify backups work.** Download one and restore it into a test project
   once. An untested backup is a rumour.
4. **Download student photographs** once a term.
5. **Manage staff accounts** — promote new staff, and remove access promptly
   when someone leaves.
6. **Protect Admin accounts.** An Admin can delete payments and revoke
   certificates. Give the role only to people who need it.
7. **Never share the `service_role` key.** It bypasses every security rule. It
   belongs only in Supabase's own settings, never in an email, a document or the
   website's code.
8. **Meet the data-protection obligations** in §6.
9. **Supply the outstanding content** in §7.6.
10. **Test on a copy** before changing anything, and keep the migration files —
    they are the definition of the database.

---

## 9. What is not included

- Ongoing hosting, domain or Supabase fees
- Maintenance, monitoring, support or bug fixing beyond the agreed engagement
- Content updates, photography or copywriting after handover
- Training beyond the supplied documentation
- Recovery of data lost through deletion by a School user, or through absence of
  a backup the School chose not to enable
- Compliance registration or legal advice of any kind
- Third-party outages (Supabase, hosting provider, registrar, image CDN)

---

## 10. Verified working at handover

The following were confirmed by direct testing:

- Build and type checking pass with no errors
- All seven database migrations applied to the live project
- Certificate generation, storage, download and QR verification — end to end
- Staff sign-in, role restrictions, and 30-minute inactivity sign-out
- Admin layout at 390px, 768px, 1024px, 1280px and 1440px with no horizontal
  overflow at any width
- Per-page share cards for all 13 public pages
- Attendance PDF export
- Fee calculation, payment recording and duplicate-reference protection

**Known cosmetic issue open at time of writing:** the certificate crest and
brand typefaces render as fallbacks until the three files in
`supabase/brand-assets/` are uploaded to the `brand` storage area. Certificates
issue, store and verify correctly; only their appearance is affected.

---

## 11. Acceptance

By signing below, the School confirms that it has received the system described
in §1, has read §7 (Known risks and limitations) and §8 (Responsibilities), and
accepts the system on that basis.

Signing does not waive any right the School has under the engagement contract or
under law.

**For ISLII Barista School**

| | |
|---|---|
| Name | ______________________________ |
| Position | ______________________________ |
| Signature | ______________________________ |
| Date | ______________________________ |

**For Lenzro Software Solutions**

| | |
|---|---|
| Name | ______________________________ |
| Signature | ______________________________ |
| Date | ______________________________ |

---

### Items specifically acknowledged

Please initial each. These are the points most likely to matter later.

| | Item | Initials |
|---|---|:--:|
| 1 | The Supabase project is on the **free plan**: it pauses when unused, and takes **no automatic backups** (§7.1) | ______ |
| 2 | Supabase **Pro was recommended** and the decision rests with the School (§7.1) | ______ |
| 3 | Backups **do not include student photographs**; the School will download them each term (§7.3) | ______ |
| 4 | The **domain and certificate URL are permanent** once certificates are issued (§7.4) | ______ |
| 5 | The School is the **data controller** for student personal data under the Kenya Data Protection Act 2019 (§6) | ______ |
| 6 | Invented statistics and placeholder testimonials were **removed and must not be reinstated without real data** (§7.7) | ______ |
| 7 | There is **no automated test suite**; changes must be tested on a copy (§7.2) | ______ |
