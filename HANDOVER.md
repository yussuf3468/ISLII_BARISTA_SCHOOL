# Handover — ISLII Barista School

Everything needed to own, run and hand on this system. Written for whoever
inherits it, technical or not.

| | |
|---|---|
| **Live site** | <https://isliibarista.com> |
| **Staff sign-in** | <https://isliibarista.com/admin> |
| **Supabase project** | `udrptwferwkqvcajclzy` |
| **School contact** | isliibaristaschool@gmail.com · +254 746 487878 |

---

## 1. What this is

Two products in one codebase, deliberately:

- **The public website** — marketing pages, course catalogue, gallery, contact.
  Runs entirely on static files. No database, no server, no monthly cost.
- **The student management system** at `/admin` — students, courses, intakes,
  enrolments, fees, attendance, grades and certificates. Backed by Supabase.

They share a domain and a design language but almost no code. The admin is
lazy-loaded, so a visitor reading about the Boba course never downloads it.
That is why the marketing site stays fast no matter how large the admin grows.

There is also a third, public surface worth knowing about: **certificate
verification** at `/verify/<token>`. That URL is what the QR code on every
printed certificate opens. An employer scans it and sees whether the
certificate is genuine. It must keep working for as long as the school's
certificates are in the world — see §8.

---

## 2. Accounts the school must own

Ownership matters more than convenience. Anything in a developer's personal
account is a hostage. Transfer all four before final sign-off.

| Account | Purpose | Transfer |
|---|---|---|
| **Domain registrar** | `isliibarista.com` | Move to a school-owned account; keep auto-renew ON |
| **Supabase** | Database, auth, file storage, certificate PDFs | Organisation owner should be a school address |
| **Hosting** (Vercel / Netlify / Cloudflare Pages) | Serves the built site | Connect to the school's Git account |
| **Google account** | `isliibaristaschool@gmail.com` — contact form destination, Maps listing | Already school-owned; keep recovery details current |

> **Keep one email address as the permanent owner of all four**, not an
> individual's personal address. Staff leave; the school's certificates have to
> outlive them.

---

## 3. Standing this up from scratch

If the system ever has to be rebuilt on a new Supabase project, this is the
whole sequence. Detail lives in **[`supabase/README.md`](supabase/README.md)**.

1. **Create a Supabase project.** Note the URL and the `anon` key.
2. **Run the migrations in order** — `0001` through `0007`, no skipping. Each
   assumes the last. Paste into the SQL editor, or `supabase db push`.
3. **Deploy the certificate function:**
   ```bash
   supabase link --project-ref <ref>
   supabase functions deploy issue-certificate
   supabase secrets set SITE_URL=https://isliibarista.com
   ```
4. **Upload the three brand assets** in `supabase/brand-assets/` to the `brand`
   storage bucket (`crest.png`, `Fraunces.ttf`, `InstrumentSans.ttf`). Without
   them certificates still issue, but in Times New Roman with no crest.
5. **Create the first staff account** at `/admin/login`. **The first person to
   sign up automatically becomes an admin**; everyone after that starts as a
   read-only *viewer* and must be promoted in **Settings → Team**.
6. **Set the front-end environment variables** where the site is hosted:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
   `.env.example` lists them. The anon key is *designed* to be public — it is in
   the browser bundle. Security comes from the database's row-level policies,
   never from hiding that key. **The `service_role` key is the opposite: it
   bypasses every policy and must never appear in front-end code or in Git.**

---

## 4. Deploying a change

```bash
npm install
npm run build     # typechecks, then builds to dist/
```

Point the host at:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20 or newer |

**The SPA fallback is committed to the repository — do not remove it.**

This is a single-page app, so any route without a prerendered file must be
served `/index.html`. Without that, refreshing a deep page — or an employer
opening a certificate QR at `/verify/<token>` — returns an **HTTP 404** from the
host. The page still renders, because the 404 document *is* the app, so the
fault hides easily. But link previewers, corporate proxies, security scanners
and uptime monitors act on the status code, not on what appears afterwards.

| Host | Handled by |
|---|---|
| **Vercel** | `vercel.json` — rewrite plus cache headers |
| **Netlify / Cloudflare Pages** | `public/_redirects` |
| Apache / nginx | Add a rewrite of everything to `/index.html` |

**Vercel's Vite preset does not add this automatically**, which is why the file
is committed rather than left to a dashboard setting somebody has to remember.
Vercel checks the filesystem before rewrites, so the 13 prerendered pages and
every hashed asset are still served directly.

---

## 5. Day-to-day running

For staff, the task-by-task guide is **[`docs/ADMIN-GUIDE.md`](docs/ADMIN-GUIDE.md)**.
The short version of who can do what:

| | Viewer | Registrar | Admin |
|---|:--:|:--:|:--:|
| See students, fees, attendance, grades | ● | ● | ● |
| Export CSV / attendance PDF | ● | ● | ● |
| Register students, enrol, take registers, enter marks | | ● | ● |
| Manage courses, intakes and fees | | ● | ● |
| Record payments | | ● | ● |
| Issue certificates | | ● | ● |
| Revoke a certificate, delete a payment or a student | | | ● |
| Change someone's role | | | ● |
| Read the audit log | | | ● |

These are enforced **in the database**, not in the interface. Hiding a button
stops nobody — anyone can open the browser console and call the API directly.
The row-level policies in `0003_rls.sql` and `0006_…_rls.sql` are the real
boundary, which is why they should be changed carefully and never disabled "for
testing" on the live project.

---

## 6. Sessions

Staff are signed out after **30 minutes of inactivity**, with a two-minute
warning and a *Stay signed in* button.

Supabase's own default is the opposite — the access token expires hourly but is
renewed silently, so signing in once keeps you signed in for weeks. That is the
right default for a consumer app and the wrong one here: this admin holds
national ID numbers, phone numbers, photographs and the fee ledger, and it runs
on a shared front-desk machine.

Thirty minutes is chosen against the actual job. Taking a register or entering a
column of marks involves long stretches of looking at paper rather than at the
keyboard, and being logged out mid-cohort would be worse than the risk it
prevents. To change it, edit `timeoutMs` in
`src/components/admin/SessionGuard.tsx`.

Activity in one tab keeps every tab alive, and the countdown is measured against
the wall clock rather than a ticking timer — so closing a laptop for an hour
means the session is already over when it opens, rather than resuming where it
left off.

---

## 7. Hosting plan, uptime and backups

**The project is on the Supabase FREE tier.** Two consequences matter here, and
one of them is not obvious.

### The project sleeps

Free projects pause after roughly a week with no database activity. The admin
going to sleep is an inconvenience — someone clicks *restore*. **Certificate
verification going to sleep is a credibility failure**: an employer scans a
graduate's QR, gets nothing, and cannot tell that apart from a forged
certificate. A school does not touch its admin every week — term breaks,
holidays, quiet months — so this is a question of when, not if.

### There are no automatic backups

Paid plans take daily backups. Free plans take none, and this database holds
every receipt and balance the school has recorded.

### What is in place

Two GitHub Actions workflows, both free, cover the gap:

| Workflow | Does | Needs (repository secrets) |
|---|---|---|
| `.github/workflows/keep-alive.yml` | Queries the database every 3 days so it never reaches the inactivity threshold | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `.github/workflows/backup.yml` | Weekly `pg_dump`, kept as a 90-day artifact | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` |

Add the secrets under **Settings → Secrets and variables → Actions**, then run
each once with *Run workflow* to confirm they pass before relying on them.

### What they do not cover

- **Storage buckets.** Certificate PDFs and student photographs are files, not
  rows, and a database dump does not contain them. Certificates can be
  regenerated from their records; **photographs cannot**. Download the
  `student-photos` bucket by hand once a term.
- **Point-in-time recovery.** The backup is weekly, so the worst case is losing
  six days of entries.
- **Supabase changing its pause policy.** The keep-alive depends on today's
  behaviour.

**These are mitigations, not equivalents.** The real answer is Supabase Pro
(~$25/month), and it is worth putting to the school in those terms: it is the
cost of guaranteeing that a certificate issued today still verifies in ten
years, which is the entire promise the certificate makes.

- Manual export any time: `supabase db dump -f backup.sql`
- **Test a restore once before you rely on it.** An untested backup is a rumour.

---

## 8. Things that must never change

Short list, but each one silently breaks something that is already in the
world if you get it wrong.

| Do not change | Why |
|---|---|
| `SITE_URL` on the Edge Function | It is baked into the QR of every certificate ever printed. A certificate handed to an employer in 2035 still points at it. Changing it invalidates every certificate issued before the change. |
| The domain, once certificates exist | Same reason. If the school ever rebrands, keep the old domain alive and redirecting. |
| `certificates` table rows | A certificate that exists in the world must always resolve — as valid *or* as revoked. Deleting one makes it verify as "not found", which is indistinguishable from a forgery. Revoke instead; the QR keeps working and reports the revocation. |
| A course's `slug` | It is the join between the database and the marketing copy in `src/data/courses.ts`. Renaming a course is fine; the slug deliberately does not follow. |
| An enrolment's agreed fee, retroactively | Fees are snapshotted at enrolment. A student who enrolled at 30,000 still owes 30,000 after a price rise. That is the correct behaviour, not a bug. |

---

## 9. Where things live

```
src/
  config/site.ts        ← phone, email, address, stats. Single source of truth.
  data/                 ← course copy, FAQ, testimonials (marketing content)
  pages/                ← one file per route
  pages/admin/          ← the student management system
  features/admin/       ← its data layer (API calls, CSV, PDF)
  components/admin/     ← its design system
supabase/
  migrations/           ← 0001 → 0007, run in order
  functions/            ← the certificate generator (Deno)
  brand-assets/         ← crest + fonts to upload to the `brand` bucket
  README.md             ← backend setup, in detail
docs/
  ADMIN-GUIDE.md        ← for the people using it day to day
  STUDENT-SYSTEM-PLAN.md← why the system is shaped the way it is
media-originals/        ← the school's untouched camera files (not in Git)
```

---

## 10. Outstanding before launch

Real values that still need confirming by the school. Search the codebase for
`TODO_CLIENT` to see each one in context; the full table is in
[`README.md`](README.md#️-before-you-go-live).

Outstanding: the exact street address and map coordinates, standalone course
fees, the "Chantilly Butter" spelling, and the Instagram/Facebook links.

### Two things were removed rather than left as TODOs

Both would have been *actively misleading* if the site had gone live with them
still in place, and a comment in the source would not have stopped that.

1. **The graduation and employment rates (98% / 92%) are gone.** They were
   invented for the design and never measured. A published statistic is a claim
   the school has to be able to defend, and these would have been read by people
   deciding where to spend real money on their training. The stat band now
   carries only things that are true — students trained, programmes offered, and
   that every certificate is independently verifiable. If the school starts
   tracking either figure, add it back in `src/data/stats.ts` **with the cohort
   and period it was measured over**.

2. **The testimonials no longer render.** The quotes in
   `src/data/testimonials.ts` are ours, attributed to people who do not exist.
   They are kept as `DRAFT_EXAMPLES` — a format and length guide — and the live
   array is empty, so the section is simply absent until it is filled. Move
   real, permissioned quotes into `testimonials` and it reappears with no other
   change; what to collect is listed at the top of that file.

Publishing invented testimonials misleads someone choosing where to spend real
money on their training, and in many jurisdictions it is also unlawful. This is
the one item on the build where shipping the placeholder could have caused
genuine harm.

---

## 11. If something breaks

| Symptom | Almost always |
|---|---|
| "Failed to send a request to the Edge Function" | The function is not deployed. `supabase functions deploy issue-certificate`. |
| Certificate issues but looks wrong — Times New Roman, no crest | The three brand assets are not in the `brand` bucket. §3 step 4. |
| A staff member sees no buttons anywhere | Their role is `viewer`. An admin promotes them in Settings → Team. The admin screen explains this on-screen rather than just hiding everything. |
| Refreshing a page 404s | The SPA fallback is not configured on the host. §4. |
| "Set the fee for this programme before taking a payment" | Working as intended — price the course or intake first. |
| Admin loads but shows "Backend not configured" | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing from the host's environment. |

The **Audit log** (admin only) records every registration, certificate issue,
revocation, payment and deletion, with who did it and when. It is the first
place to look when a number is disputed.
