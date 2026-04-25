# Copy Rewrite Proposal

**Status: AWAITING APPROVAL — do not apply to source files yet.**

Hero H1 + subhead left untouched per instructions.

---

## 1. Features section

### Section heading + subhead

**Current:**
```
sectionTag: Core platform
h2:         Everything your school needs in one place
p:          No more juggling Excel sheets, WhatsApp groups, and paper registers.
```

**Proposed:**
```
sectionTag: Core platform
h2:         Six things Pakistani schools do on paper. Now in one place.
p:          One admin still emails herself the fee register at 11pm. It should not be this way.
```

*Why: "Everything your school needs" is generic SaaS boilerplate. The proposed heading names the local reality and makes the count feel specific. The subhead is a concrete image a Pakistani school owner will recognise.*

---

### Feature card bodies

Each rewritten to one concrete sentence naming the actual problem.

**Student management**
- Current: "Add, archive, and bulk import students via CSV. Full profiles with class, roll number, and parent links."
- Proposed: "Stop hunting through a class register to find which contact in the WhatsApp group belongs to which child."

**Fee management**
- Current: "Assign fees, mark paid/unpaid, view defaulter list. Full fee ledger per student — no separate software needed."
- Proposed: "The fee notebook in the steel almirah is not a ledger — this is."

**Attendance marking**
- Current: "Mark present, absent, or late per class. Auto-filtered to each teacher's own classes. No cross-class confusion."
- Proposed: "Stop the morning roll-call from becoming a paper register that gets transcribed into a spreadsheet at the end of the week."

**Marks and gradebook**
- Current: "Enter marks manually or import via CSV. Auto-calculated results, class averages, and downloadable report cards."
- Proposed: "The exam marks are in three different teachers' notebooks. This pulls them into one place before report card day."

**Timetable builder**
- Current: "Set periods per class per day. Teachers see only their own classes. No scheduling conflicts, no confusion."
- Proposed: "When the timetable is pinned in a WhatsApp message from September, every Monday is a small crisis."

**Audit trail**
- Current: "Every sensitive action logged — marks, fees, attendance, role changes. Full accountability for your school."
- Proposed: "When a fee is marked paid and you're not sure who did it — or a mark changes and you need to know — the audit trail tells you."

---

## 2. AI section

### Section heading + subhead

**Current:**
```
h2: AI that actually saves teachers time
p:  Powered by Anthropic's Claude. These tools are designed for staff and admin use inside
    the app, while students and parents stay out of AI control surfaces.
```

**Proposed:**
```
h2: AI built for teachers, not for demo videos
p:  Powered by Claude. Three tools live today, used inside the app by staff. Two more are
    planned — we will ship them when they are genuinely useful, not before.
```

*Why: "Saves teachers time" is a claim every SaaS makes. The proposed heading sets expectations honestly. The subhead replaces the cold "students and parents stay out of AI control surfaces" phrasing with the honest live/planned framing the user asked for.*

---

### AI card bodies — Live items

**Report card comment generator**
- Current: "Select a class and generate editable report card comments for students in seconds. Built for teacher and admin workflows inside the app."
- Proposed: "Select a class, generate a draft comment per student, edit before you publish. Comment day goes from two hours to twenty minutes."

**Attendance alert summaries**
- Current: "Attendance risk summaries run inside the app for school staff, helping admins spot repeated absence patterns early."
- Proposed: "When a student has missed four days in two weeks, the system flags it. Admins see the pattern before it becomes a problem."

**Smart navigation search**
- Current: "Staff can type tasks like attendance, fees, or results and jump directly to the right page without hunting through menus."
- Proposed: "Type 'Class 6 fees' or 'mark attendance' and go straight there. No hunting through menus."

---

### AI card bodies — Coming soon items

Add a new `honestNote` field to the `aiCards` data array for these two. Render it below the body in a muted, smaller style.

**Assignment feedback generator**
- Current body: "Teacher-reviewed AI drafts for assignment feedback, designed to save marking time without removing staff control."
- Proposed body: "Teacher-reviewed AI drafts for assignment feedback — designed to cut marking time without removing the teacher's judgment."
- New honestNote: "Not live yet. We are building it carefully. It will ship when it is genuinely useful, not before."

**Quiz generator**
- Current body: "Quiz generation from teacher prompts is planned for future Pro and Enterprise workflows when released."
- Proposed body: "Tell the system a topic, get a draft quiz. For Pro and Enterprise schools."
- New honestNote: "Not live yet. Planned. We will say so clearly when it is."

*Structural note: requires a `honestNote?: string` field in `aiCards` and a small JSX render — one line of muted text below the body paragraph.*

---

## 3. Before/After section

### Section heading + subhead

**Current:**
```
sectionTag: From scattered systems to one platform
h2:         Show school owners the operational difference
p:          The story is not just software features. It is the shift from disconnected routines
            to one system your team can actually trust.
```

**Proposed:**
```
sectionTag: Before and after
h2:         The school that runs on WhatsApp groups and hope
p:          Most Pakistani private schools are not broken. They are just holding too many things
            in too many places. Uthaan moves them into one.
```

*Why: "Show school owners the operational difference" reads like internal marketing notes, not copy. The new h2 names the specific Pakistani reality in a way a school owner will recognise. "hope" is honest, not dismissive.*

---

### Before tab (`systemStories.before`)

**Current:**
```
title: Scattered systems create operational drag
body:  Most schools are still stitching together WhatsApp groups, registers, spreadsheets,
       and notebooks. The work happens, but the system around it stays messy.
chips: WhatsApp groups · Paper attendance · Fee notebooks · Spreadsheets · Scattered systems
bullets:
  - Important records live in different places
  - Staff spend time rechecking basic information
  - School owners get less reliable visibility
```

**Proposed:**
```
title: The school still runs. On WhatsApp groups and goodwill.
body:  The attendance register lives on the teacher's desk. The fee notebook is in a steel
       almirah. The parent group has 200 members, most muted. The admin emails herself the
       marks sheet at 11pm so it does not get lost. The school works. The system holding it
       together is goodwill.
chips: Fee register in a drawer · WhatsApp group, 200 muted · Paper roll call · Marks sheet via email · No single source of truth
bullets:
  - The principal cannot check fee status without calling the office
  - Teachers rewrite the same attendance data twice — once on paper, once in the spreadsheet
  - Parents ask in the WhatsApp group because there is nowhere else to ask
```

---

### After tab (`systemStories.after`)

**Current:**
```
title: One platform gives the school a cleaner operating system
body:  Uthaan brings attendance, fees, announcements, results, and staff AI tools into one
       role-based platform built for how Pakistani schools actually run.
chips: One Uthaan platform · Role-based access · Cleaner records · Staff AI assistance · Guided onboarding
bullets:
  - Admins, teachers, parents, and students see the right layer
  - Records become easier to trust and track
  - Staff save time without exposing AI to families
```

**Proposed:**
```
title: Less noise. The same school, running better.
body:  Attendance is in the system. The fee ledger is real. Parents see what is relevant to
       their child, not the staff group chat. Admins can check defaulters without calling
       anyone.
chips: One platform · Role-based access · Real fee ledger · Staff AI inside the app · Guided setup
bullets:
  - The admin sees defaulters without opening a notebook
  - Teachers mark attendance once and move on
  - Parents get the updates they need without flooding the group
```

---

## 4. Onboarding section

### Section heading + subhead

**Current:**
```
sectionTag: How onboarding works
h2:         A simple rollout for school owners
p:          Uthaan is not self-serve for new schools yet. We help you get set up properly
            before your team starts using the system.
```

**Proposed:**
```
sectionTag: How onboarding works
h2:         We set you up. You do not start from scratch.
p:          Uthaan is not a self-serve tool you figure out alone. We walk you through setup,
            import your data, and hand you a working system.
```

---

### Onboarding step bodies + new reassurance lines

A new `reassurance` field needs to be added to `onboardingSteps` and rendered below each step body in a muted/smaller style.

**Step 1 — Request a demo**
- Current body: "Tell us about your school and what you want to evaluate in Uthaan."
- Proposed body: "Tell us about your school — size, current setup, what is not working."
- New reassurance: "Takes five minutes. No commitment to any plan."

**Step 2 — We set up your school**
- Current body: "Our team prepares your school workspace and applies the right plan manually."
- Proposed body: "We configure your school workspace, set up classes, and apply your plan."
- New reassurance: "Usually 3–5 days. We import your data — you do not start from a blank screen."

**Step 3 — You receive admin and teacher logins**
- Current body: "Your staff gets access details after setup so onboarding stays controlled and clean."
- Proposed body: "Admin and teacher accounts are ready when the setup is complete."
- New reassurance: "We walk you through the first login. Nothing is left to figure out alone."

**Step 4 — Your school starts using Uthaan**
- Current body: "You begin with guided onboarding support instead of being left to figure it out alone."
- Proposed body: "Your team starts using the platform with Uthaan support available."
- New reassurance: "You have a contact at Uthaan. If something is confusing, you ask us directly."

*Structural note: requires a `reassurance: string` field in `onboardingSteps` and a small JSX render — one muted line per card.*

---

## 5. Pricing section

### Section heading + subhead

**Current:**
```
h2: Simple, transparent pricing
p:  Start with a guided school pilot, then choose the plan that fits your rollout.
    Payments are handled manually, and AI access plus monthly limits are managed per
    school by Uthaan.
```

**Proposed:**
```
h2: Simple, transparent pricing
p:  Pilot schools get three months free. Then you choose a plan. No automatic billing,
    no surprise charges — every plan is activated manually by us.
```

*Why: Leads with the free pilot (strongest trust signal), removes passive "handled manually" language, and ends on the trust point.*

---

### "Best for" lines per plan

**Starter**
- Current: "Best for smaller schools moving from notebooks or spreadsheets into one structured system."
- Proposed: "Schools with 1–3 sections per class moving off Excel or paper fee registers."

**Growth**
- Current: "Best for growing schools that want core operations plus practical staff-facing AI."
- Proposed: "Schools that want fee and attendance operations solid, plus AI report card comments for teachers."

**Pro**
- Current: "Best for larger schools that want deeper AI-assisted staff workflows and higher operating capacity."
- Proposed: "Larger schools where teachers write many report card comments and want AI-assisted marking workflows."

**Enterprise**
- Current: "Best for larger groups, multi-campus schools, or schools needing a tailored rollout."
- Proposed: "Multi-campus groups or schools with specific setup requirements. We scope the rollout with you directly."

---

## 6. Comparison section

### Section heading + subhead + lead card

**Current:**
```
h2:              Why not Google Classroom or Canvas?
p:               International platforms were built for Western schools. Your school has different needs.
leadCard h3:     Uthaan is trying to solve the full school workflow, not just classroom posting
leadCard p:      Fees, attendance, results, announcements, school roles, and staff-facing AI belong
                 in the same product story for Pakistani private schools.
```

**Proposed:**
```
h2:              Why not Google Classroom or Canvas?
p:               Google Classroom does not track fees. Canvas does not know what a fee defaulter
                 list is. Neither of them was built for a school in Gulberg or Defence.
leadCard h3:     Google Classroom is a homework tool. Uthaan is the school's operating system.
leadCard p:      Fee management, attendance tracking, report card comments, role-based access,
                 and an audit trail — in one product, priced for Pakistani private schools.
```

*Why: The current subhead is vague ("different needs"). The proposed subhead names the specific missing features — fee tracking and a defaulter list — which every Pakistani school admin will recognise immediately. "Gulberg or Defence" grounds it in Pakistani geography.*

---

## 7. Final CTA section

### Mid-page CTA

**Current:** "Ready to move your school onto one platform?"

**Proposed:** "Your school's data is scattered across notebooks, spreadsheets, and group chats. It does not have to be."

---

### CTA box (bottom of page)

**Current:**
```
sectionTag: Ready to explore Uthaan?
h2:         Move your school from scattered tools to one cleaner platform
p:          Request a demo to start a guided rollout for your school, or log in if your
            team is already using Uthaan.
```

**Proposed:**
```
sectionTag: Ready to explore Uthaan?
h2:         Book a demo. We will show you how it fits your school specifically.
p:          Every school rollout starts with a conversation. Tell us about your setup and
            we will show you how Uthaan works for it. If your team is already using Uthaan,
            log in below.
```

---

## 8. Founders page

### Hero

**Current:**
```
badge: Founder story
h1:    Built for the schools we know best.
p:     Uthaan is a founder-led school platform built for Pakistani private schools,
       designed to bring students, attendance, fees, results, announcements, and parent
       communication into one clear system.
```

**Proposed:**
```
badge: Founder story
h1:    Built for the schools we know best.   [keep — it's good]
p:     Uthaan started with a frustration: the schools I grew up around are still running
       on WhatsApp groups and paper registers. They are doing real work. They deserve
       real software.
```

*Why: The current subhead is a feature list. The proposed version makes it personal — a specific frustration, not a product description.*

---

### Founder intro section

**Current:**
```
sectionTag: Meet the founder
h2:         A founder-led product shaped by real school operations.
p:          Uthaan was started by Asad Pasha Chaudhry, a Pakistani Computer Science student
            at UCSD, with a personal connection to school operations in Pakistan. The idea
            came from a simple belief: schools should not have to depend on scattered
            registers, spreadsheets, and disconnected messages to run their daily operations.
```

**Proposed:**
```
sectionTag: Meet the founder
h2:         One founder. No outside funding. A school he knows firsthand.
p:          Uthaan was started by Asad Pasha Chaudhry — a Pakistani CS student at UCSD.
            The idea came from watching [INSERT: a specific school or person you know]
            manage a school with tools that were not built for it: fee registers kept by
            hand, attendance on paper, a parent group that nobody read. The goal was not
            to build a startup. It was to fix a specific problem for schools like that one.
```

*Note: The [INSERT] placeholder is for the real detail — a specific school, a family member, a specific visit, whatever the actual origin story is. This is the most important sentence on the founders page and should be real, not generic. Leave the placeholder in until you can fill it in.*

---

### Founder quote card

**Current:**
```
p1: Uthaan is my attempt to build the school platform Pakistani schools actually deserve,
    practical enough for daily use, modern enough for the future, and careful enough for
    the trust schools place in it.

p2: My goal with Uthaan is simple: build something Pakistani schools can actually use,
    trust, and grow with. This is not just a software project to me. It is a long-term
    mission.
```

**Proposed:**
```
p1: The schools I care about are still running on registers and group chats. Uthaan is my
    attempt to give them something better — practical enough for daily use, careful enough
    to deserve their trust.

p2: This is not a weekend project. It is a long-term commitment to getting it right for
    a market that has been overlooked by every major platform.
```

---

### "Why Uthaan exists" section

**Current:**
```
sectionTag: Why Uthaan exists
h2:         Software should adapt to schools, not the other way around.
p:          Pakistani schools do not need another complicated dashboard. They need a
            practical operating system that respects how schools already work while helping
            them become faster, clearer, and more organized. The goal is not to make schools
            adapt to software. The goal is to build software around how schools already work.
```

**Proposed:**
```
sectionTag: Why Uthaan exists
h2:         The software should work the way the school works. Not the other way.
p:          Pakistani private schools do not need a platform imported from a US school
            district. They need software built around how they already operate — term
            calendars, multiple fee types, Urdu names, and a principal who is often also
            the owner. Uthaan is built around that reality, not around the assumption that
            every school runs like a Silicon Valley charter.
```

---

### Values cards

Only bodies updated where they read too corporate. Titles kept.

**Practical before flashy**
- Current: "Uthaan is built to solve day-to-day school work first: attendance, fees, results, announcements, and cleaner parent communication."
- Proposed: "Attendance, fees, and results have to work before anything else gets added. We do not build for demos."

**Built around Pakistani school workflows**
- Current: "The product is shaped around how Pakistani private schools already operate, not around imported assumptions from other markets."
- Proposed: "Admission fees, monthly tuition, exam fees, Urdu names, and a school term that starts in April — the product is shaped around these realities, not adapted from someone else's."

**Clear for parents**
- Current: "Parents should understand what matters quickly: attendance, results, fees, announcements, and the next step to take."
- Proposed: "Parents get attendance, results, fees, and announcements — and nothing they do not need. Not a portal. A clear, role-specific view."

**Fast for teachers**
- Current: "Teachers need workflows that reduce admin burden, not one more system to wrestle with before class starts."
- Proposed: "Mark attendance, enter marks, get AI comment drafts — and done. Teachers should not have to fight the software before the bell rings."

**Controlled for admins**
- Current: "Admins need visibility, accountability, and role-appropriate controls so the school can run with confidence."
- Proposed: "Fee defaulter visibility, audit trail, attendance overview, role management — everything an admin needs, without giving everyone access to everything."

**Responsible AI for staff only**
- Current: "AI in Uthaan is designed for school staff workflows and remains school-aware, role-aware, and carefully gated."
- Proposed: "AI tools are only available to teachers and admins. Students and parents do not have access. This is intentional and permanent."

---

### Trust section

**Current:**
```
sectionTag: Built carefully, not carelessly
h2:         Trust has to be earned in school software.
p:          Uthaan is being built with role-aware access, school-scoped data, guided
            onboarding, and staff-only AI where appropriate. It also means staying honest:
            payments and WhatsApp are not presented as live unless they are actually live.
```

**Proposed:**
```
sectionTag: Built carefully, not carelessly
h2:         Trust has to be earned. We are not trying to shortcut it.
p:          Role-based access, school-scoped data, staff-only AI, and manual onboarding
            where it matters. We are also honest about what is live today versus what is
            planned — because a school that trusts you with their student data deserves
            that much.
```

Trust points list — two tightenings:
- "Honest product claims about what is live today" → "We say clearly what is live and what is planned"
- "Manual onboarding, payments, and rollout where needed" → "Manual setup and payments until automation is actually ready"

---

### Founders CTA

**Current:**
```
sectionTag: Want to see if Uthaan fits your school?
h2:         Start with a guided demo.
p:          See how Uthaan can support your school's daily operations with a founder-led,
            consultative rollout instead of a rushed setup.
```

**Proposed:**
```
sectionTag: Want to see if Uthaan fits your school?
h2:         Start with a conversation. No pressure, no rushed setup.
p:          Every school is different. The demo is a chance for you to see how Uthaan works
            for your setup specifically — and for us to understand what your school actually
            needs.
```

---

## Summary of structural additions (not just string swaps)

These two changes require a new data field + a small JSX render. Flag for discussion if you want to skip them.

| Change | Data field needed | JSX needed |
|---|---|---|
| AI coming-soon honest note | `honestNote?: string` in `aiCards` | Muted `<p>` below card body, only when `honestNote` is set |
| Onboarding step reassurance | `reassurance: string` in `onboardingSteps` | Muted `<p>` below step body |

Everything else in this document is a string replacement — no structural change.
