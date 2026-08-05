# Staff guide — ISLII Student Management

For the people running the school. No technical knowledge assumed.

Sign in at **isliibarista.com/admin** — or scroll to the bottom of any page on
the website and click **Staff sign in**. Bookmark it.

Beside it in the footer is **Verify a certificate**, which is the public page
an employer uses to check a graduate's certificate by number and surname. It is
the same page the QR on a printed certificate opens.

---

## Set-up, in the right order

The system is built around one idea: **a student is enrolled into an *intake*,
not into a course.** A course is the programme you teach ("Barista Course"). An
intake is one running of it ("BAR-2026-01, starting 10 August"). Everything —
fees, attendance, marks, certificates — hangs off the intake.

So the first time you use it, work in this order:

1. **Courses** — add each programme you teach and what it costs.
2. **Intakes** — create a cohort for a course, with start and end dates.
3. **Students** — register the people.
4. **Enrol** each student into an intake, from their record.

Skip a step and things quietly do nothing: a student with no enrolment has no
fee, no register to appear on, and nothing to be certified for.

---

## Money

### Setting a price

Three places, most specific wins:

| Set the fee on | When |
|---|---|
| **The course** | The normal price of the programme. Set it once. |
| **The intake** | This particular cohort costs something different — an evening class, a corporate group, a promotional intake. Leave blank to use the course price. |
| **The student's enrolment** | This one student agreed something different — a discount, a bursary, an instalment deal. |

**You can price things after enrolling people.** If you register students in
week one and agree the price in week two, setting the course or intake fee
fills in everyone who has no fee and no payments yet. It will never overwrite a
fee you negotiated or an account that already has money against it — you'll see
"*N unpriced enrolments now billed at this fee*" when it happens.

A fee of **0 means free** — a scholarship, a staff child, a taster. That is
different from *no fee set*, which means nobody has priced it yet and the
system will refuse to take a payment against it.

### Taking a payment

From the student's record → **Fees** → *Record payment*. A receipt number is
generated automatically.

Always enter the **reference** — the M-Pesa code, bank slip or cheque number.
It is what you quote back to a parent who says they paid. If the same reference
has been receipted before, the system stops you: pasting an M-Pesa code twice
is the most common way a student gets credited twice. You can still proceed if
it is genuinely a separate payment.

**Payments are never edited.** To correct one, an admin deletes it (with a
written reason, recorded permanently) and records the right one. That is
deliberate: a fee ledger you can quietly edit is a fee ledger nobody can trust.

### Seeing where you stand

**Finance** shows billed, collected and outstanding across the school, and the
student list sorted by **who owes the most first** — it is a work list, not a
report. Filter by *Owing*, *Fully paid*, or *No fee set*.

---

## Attendance

**Attendance** → pick the cohort and the date → mark everyone → **Save
register**.

Four states: **Present**, **Late**, **Absent**, **Excused**.

*Excused* does not count against a student's attendance rate — an authorised
absence should not damage a figure you might use to decide whether someone can
sit an assessment. *Late* still counts as attending.

Two things worth knowing:

- **Nothing saves until you press Save.** Marking thirty students and walking
  away loses them. The button tells you how many are pending.
- **Unmarked students are not saved at all.** If anyone is left blank you get a
  warning under the register saying how many. A register that looks saved but
  is silently incomplete is worse than one that failed.

**Export PDF** produces the full term as a filed document — every session as a
column, every student as a row, absences in red, attendance rate per student.
Available to everyone, including read-only accounts, because producing the
record is not the same as editing it.

---

## Grades

**Grades** → pick the cohort → **Add assessment** for each paper, practical or
project. Each has a maximum score and a weight.

**Weight is relative.** Two assessments at weight 1 count equally. One at
weight 3 counts three times as much as one at weight 1. A paper out of 20 and
one out of 100 at the same weight still contribute equally — the maximum is
accounted for, so you never have to do the arithmetic yourself.

Type marks straight into the sheet; the final percentage and grade band update
as you type. **Press Save when you're done** — same rule as the register.

An empty box is **not** a zero. It means unmarked, and that is what appears on
the record. Clearing a box removes the mark rather than scoring zero.

Bands: **Distinction** 80+ · **Credit** 65+ · **Pass** 50+ · below that, Fail.

---

## Certificates

A certificate can only be issued from a **completed** enrolment. So:

1. Open the student → find the enrolment → **Mark as completed**.
2. **Issue certificate.**

The system generates the PDF, allocates a certificate number, and creates a QR
code. The QR opens a public verification page showing the certificate is
genuine — that is what an employer scans.

**If a certificate needs to be withdrawn, revoke it — never delete it.**
Revoking keeps the QR working and makes it report the certificate as revoked.
Deleting would make it verify as "not found", which to an employer is
indistinguishable from a forgery. Revoking asks for a reason, and that reason
is kept permanently.

---

## Students

**Register student** walks through five steps — personal details, programme,
emergency contact, photo, review. You can leave and come back; if you try to
close a part-filled form it asks before discarding.

Bulk-select is for **exporting** a subset to CSV. There is deliberately no bulk
delete: students leave by being marked *withdrawn*, not by being erased, and
"select all → delete" is two clicks from an empty register.

Deleting a single student is possible for admins, from the row menu, and asks
you to type their student number. It will refuse if the student holds a
certificate or has ever paid — those records have to stay intact.

---

## Team and roles

**Settings → Team.** Three roles:

- **Viewer** — can see and export everything, change nothing.
- **Registrar** — the day-to-day role. Everything except revoking
  certificates, deleting payments or students, and changing roles.
- **Admin** — everything, plus the audit log.

New accounts start as **viewer**. If someone signs in and sees no buttons at
all, that is why — an admin needs to promote them. (The screen says so rather
than leaving them guessing.)

---

## The audit log

Admin only. Every registration, certificate issue, revocation, payment and
deletion, with who did it and when. It is the first place to look when a number
is disputed and the reason payments can be deleted safely — nothing disappears
without a trace.

---

## Shortcuts

- **⌘K** (Mac) or **Ctrl+K** (Windows) — search students and jump anywhere.
- The **sidebar collapses** with the button beside the breadcrumbs, for more
  table width. It remembers your choice.
- Every table has a **card view** toggle, and switches to cards automatically
  on a phone.

---

## Working on a phone

Everything works on a phone except one screen: the **grades mark sheet** scrolls
sideways, because a mark sheet without its columns side by side is not a mark
sheet. Registers, payments, student records and registration are all built for
one-handed use.
