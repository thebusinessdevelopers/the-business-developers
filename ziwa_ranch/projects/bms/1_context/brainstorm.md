# BMS (Business Management Software) — Brainstorm

> **Type:** Software
> **Depth:** Deep
> **Staging:** Staged — V1: Core platform with staff reporting, admin dashboard, stock management, company communication (proven modules from HOD v2.5, rebuilt on clean architecture). V2: Point of Sale (restaurant & craft shop). V3+: Advanced analytics, forecasting, client onboarding portal, further modules.
> **Complexity stance:** Simple as possible — seamless, robust functionality that is truly valuable. No overcomplication. Simple on the surface, thorough underneath.
> **Started:** 30 March 2026

---

## Pre-brainstorm context

This project does not start from zero. Joshua has already built and deployed a substantial staff reporting and admin dashboard system (HOD Daily Reports, v2.5 in production at Ziwa Rhino And Wildlife Ranch). That system is the proving ground and the foundation — but BMS is a ground-up rebuild designed as a proper product, not a Ziwa-specific tool.

### What already exists (HOD Daily Reports v2.5)

A two-application system (HOD portal + Admin portal) built with Next.js 16, Tailwind v4, React 19, backed by Supabase. Currently serving 16 departments with 30+ HOD accounts and 7 admin accounts. Key capabilities:

- **Staff reporting:** Config-driven form engine supporting 11 field types, daily report submission with draft management, photo attachments with AI captioning, edit windows, N/A section toggles, offline resilience
- **Admin dashboard:** Compliance tracking, report review workflow, batch operations, per-department stats, CSV export
- **AI integration:** OpenRouter (Claude 3.5 Sonnet) for daily digests, urgency detection, period analysis, trend detection, cross-departmental correlation. Hugging Face for image captioning/object detection.
- **Stock management (started):** Inventory grid, item library with autocomplete, fuzzy search, duplicate detection, stock quality flagging system, Monday baseline counts, stock projections
- **Company communication (started):** Threaded discussions on reports, @mention system with notifications, announcements, global messages
- **Data quality:** Stock flag table, auto-detection of duplicates, HOD mandatory review popup, admin merge/resolve workflow
- **Export system:** Single report, date range, and executive summary exports with clipboard/print/PDF
- **Google Drive sync:** Photo media pushed to organised Drive folders

### What Karibu does (the system being replaced)

Karibu Hotel Management Software is a Kampala-based hospitality platform ($75–125/month) offering:

- Front desk / reservations / guest profiles
- POS for restaurants, bars, cafes (multi-settlement: cash, card, mobile money, room billing)
- Kitchen Display System (KDS)
- Recipe management with automated food costing and auto menu pricing
- Stores and inventory management with real-time stock reduction on sales
- HR and payroll
- Accounting and finance
- Events and banqueting
- Website booking engine
- Asset management
- Guest portal (QR-based bill viewing, ordering, feedback)

**What Karibu lacks (the BMS opportunity):**
- AI-powered analysis, forecasting, trend detection
- Smart notifications and urgency detection
- Cross-departmental intelligence and correlation
- Modern, clean UI (Karibu's interface is dated and rigid)
- Staff reporting and daily operational intelligence
- Meaningful company communication tools
- Data quality management
- Configurable, department-aware workflows
- Clean onboarding for new clients

### Key decisions already made

1. **Single unified application** — one app that can be shipped to any hospitality business. Feature toggles and onboarding handle per-client customisation (staff lists, inventory, menus, enabled modules). No system changes per client.

2. **Clean database** — new Supabase project, clean schema designed from scratch. The HOD v2.5 database serves as context and training/testing data, not as the starting point.

3. **Three-branch strategy:**
   - `main` — clean, demo-ready, shippable to clients
   - `dev` — all development, testing, and approval happens here
   - `ziwa` — Ziwa-specific deployment, can include Ziwa-specific customisations without compromising main

4. **Ziwa is the test case** — built right for Ziwa first, but designed generically from the start. Ziwa validates, the architecture serves everyone.

5. **Not just replacing Karibu** — BMS goes significantly beyond what Karibu offers. The intelligence layer (AI analysis, forecasting, cross-departmental insights, smart notifications) and the communication layer are entirely new territory that Karibu doesn't touch.

---

## The product philosophy

### Intelligence is the centrepiece

The entire system exists to be intelligent. Not intelligent in the "slap AI on everything" sense — intelligent in the sense that it collects, processes, stores, extracts, and communicates information better than any person or team of people could do manually.

Joshua's articulation of what intelligence means in BMS — the six functions:

1. **Information collection** — the system makes it easy and natural for staff to input data. Reports, stock counts, sales transactions, requisitions, communications. Every interaction is a data collection event, designed so the person entering it doesn't feel like they're "doing data entry" — they're just doing their job, and the system captures what matters.

2. **Information storage** — data is stored cleanly, structured properly, and never lost. The database schema is not an afterthought — it's the foundation. Clean data in, clean data available forever. No ambiguity, no duplication, no orphaned records.

3. **Information actionability** — the system surfaces what needs attention. Not a dashboard full of numbers waiting to be interpreted — active, specific, actionable items. "Kitchen food cost jumped 34% this week — here's why." "Security hasn't reported gate checks in 3 days." "Store issued 100kg sugar but Kitchen only used 40kg." The system connects dots that humans miss.

4. **Information visibility** — the right people see the right information at the right time. An HOD sees what's relevant to their department. A GM sees the cross-departmental picture. A CEO sees the executive summary. Nobody gets information they don't need, and nobody misses information they do.

5. **Accountability enforcement** — the system tracks who did what, when, and whether it was done properly. Compliance isn't a report you generate monthly — it's a live, always-current state. Late submissions, missing reports, unresolved flags, unacknowledged messages — all tracked, all visible to the people who need to act on them.

6. **Eyes, ears and mouth of the business** — for owners and managers who can't be everywhere at once, BMS is their presence in the building. It sees what's happening (reports, stock movements, sales), it hears what staff are saying (communications, flags, escalations), and it speaks on their behalf (announcements, directives, automated alerts). The owner opens BMS and knows the state of their business — not from a wall of data, but from a system that has already processed, prioritised, and presented what matters.

### The AI boundary — "code where code works, AI where code can't"

This is a critical engineering principle. Joshua's position:

- **Code, functions, and logic are foundational.** Static calculations, validation rules, data aggregation, compliance tracking, stock deductions, form rendering — all of this is deterministic code. It must be reliable, predictable, and fast. No AI involved.

- **AI is used only where deterministic code genuinely cannot do the job.** Natural language analysis of report text, trend detection across unstructured data, cross-departmental pattern recognition, urgency classification, executive summaries — these require understanding context and nuance that code alone can't handle. That's where AI earns its place.

- **AI must never be a crutch for poor engineering.** If something can be solved with a well-written function, a database query, or a config-driven rule, that is always the preferred path. AI adds latency, cost, unpredictability, and external dependency. It should only appear where its value clearly exceeds those costs.

*[Partner note: This is a genuinely mature engineering philosophy. Most products in this space either avoid AI entirely or scatter it everywhere as a marketing feature. The "code where code works" principle means BMS's intelligence layer will be built on a rock-solid deterministic foundation, with AI applied surgically where it actually creates value. This makes the system more reliable, faster, cheaper to run, and easier to debug than an "AI-first" approach.]*

### Development discipline

The system must be built with rigorous standards:

- **Refined development rules** — how code is written, structured, and reviewed. Following proper rules, official documentation, and established libraries. No shortcuts, no invented patterns when proven ones exist.

- **Alteration rules** — how the system evolves. Every change documented, every evolution tracked. Snapshots at meaningful milestones. The system must be constantly evolving, and every evolution must be recorded for future reference.

- **Testing rules** — how changes are validated before they reach production. The three-branch strategy (dev → ziwa → main) is itself a testing pipeline, but there must also be standards for what "tested" means at each gate.

*[Partner note: These three rule sets — development, alteration, and testing — should become the core of `3_architecture/build_rules.md` when we reach the architecture phase. They're not just guidelines; they're the operational contract for anyone who builds on this system.]*

### One phase per chat — standing rule

**One phase per chat, never more.** This applies from the first planning conversation to the last development task, for the entire lifetime of this project.

At the end of every chat, before the conversation closes, the AI must produce:
1. **A snapshot or record** of what was accomplished in this chat — decisions made, documents produced, changes made, anything that happened
2. **A handover document** (`next_chat_handover.md` at the project root) — a complete, self-contained brief that tells the next AI agent exactly what the project is, what phase they are executing, what to read to load context, what to produce, and what the quality gate is

The next chat reads the handover, loads the context it specifies, and executes its single phase. Then writes its own handover for the chat after that. And so on, indefinitely.

This rule exists because: AI context is finite and expensive. A fresh AI with the right context beats a stale AI with accumulated drift. Discipline in handovers is what makes the project's intelligence live in the files — not in any single conversation thread.

*[Partner note: This is one of the most important operating principles in the project. The quality of every handover document directly determines the quality of the next chat's output. A poor handover means the next AI wastes time rebuilding context or, worse, makes decisions based on an incomplete picture. Every handover should be written as if the person reading it has never encountered this project before — because the AI reading it hasn't.]*

---

## Architecture decisions

### Role and visibility model

**Staff and HODs — rigid.** A kitchen HOD sees kitchen data. A security HOD sees security data. No configuration needed, no ambiguity. Their role is defined at account creation and that's what they get. Simplicity is the goal here, and it's the right call — staff don't need flexibility, they need clarity.

**Managers (GM, department heads with cross-departmental oversight) — configurable.** During onboarding, these accounts can be assigned visibility across specific departments or the whole operation. A GM might see everything. A Food & Beverage manager might see Kitchen, Store, and F&B. This configuration happens at the tenant level, not at the system level.

**Owners, board, elected admins — see everything.** No configuration required. Full access is their baseline. This tier also includes the BMS system admin (Joshua) who can access any tenant for support purposes.

*[Partner note: This three-tier model (rigid staff, configurable managers, full-access ownership) is clean and sensible. It maps directly to how real hospitality businesses are structured. The "configurable managers" tier is the only one that adds complexity — and it's contained complexity, handled at onboarding rather than scattered throughout the codebase.]*

### Application structure and user experience

**Single unified application.** One login, one URL. Staff see a role-appropriate landing page with navigation to the modules they have access to. The admin portal is a section within the same application, not a separate deployment. Admins can navigate to it from the main dashboard; non-admin users see it listed but cannot enter.

**Initial landing page:** A clean navigation hub showing the sections available to the logged-in user — Reporting, Inventory, POS, Admin Portal, etc. Each section is visually distinct. Locked sections are visible but clearly inaccessible, so users understand the system's scope without confusion.

*[Partner note: This is a strong UX decision. Showing locked modules to non-admin users has a secondary benefit: it communicates the system's full capability. A kitchen HOD who can see that an Admin Portal exists — but can't enter it — understands that their data is being reviewed. Passive accountability reinforcement.]*

### Multi-tenancy model

**Shared schema, tenant-isolated data.** All clients live in the same Supabase database schema. Every table that contains business data has a `tenant_id` (or `organisation_id`) column. Row-level security enforces isolation — a query made by a Ziwa user cannot return data belonging to another client, ever. Supabase RLS policies handle this at the database level.

**Implication:** The schema must be designed from the start to be generic enough to serve any hospitality business, not Ziwa-specific. Department names, menu items, inventory categories, staff roles — none of these are hardcoded. They are data, configured per tenant during onboarding.

*[Partner note: The right choice for this stage. The key constraint it creates is this: the architecture must be genuinely generic before the first line of code is written. "Ziwa-specific" thinking cannot contaminate the schema design. Departments, forms, staff, inventory, menus — everything that Ziwa has configured must be representable in a universal model that any lodge could configure differently. The brainstorm and architecture phase need to stress-test this specifically: can every Ziwa-specific data pattern be expressed in the generic schema?]*

### Onboarding architecture

**Product feature, not a service.** Onboarding is a self-contained module within the application — a guided, multi-step form submission process that a new client or their admin completes independently. No manual intervention from Joshua required once the tenant account is created.

Structure mirrors the HOD form engine philosophy: config-driven, multi-step forms for each component. Components include:
- Staff list (names, roles, departments, login credentials)
- Inventory (categories, items, units, par levels)
- Menu (dishes, prices, ingredients, categories)
- Department setup (names, responsibilities, reporting requirements)
- Accommodation (room types, room numbers, capacity)
- Activities (game drives, guided walks, packages, pricing)
- Feature toggles (which modules are active for this client)

Each component is a structured form submission — not freeform, not a spreadsheet upload (initially). The same data validation and quality principles that govern HOD reporting apply here: clean input enforced at the point of entry.

*[Partner note: This is architecturally elegant. The onboarding forms become the seed data for every other module. The inventory entered at onboarding becomes the starting state for stock management. The menu entered at onboarding becomes the POS item catalogue. The staff list becomes the user accounts. The departments become the reporting structure. Every component feeds a downstream module — which means onboarding is not just setup, it's the first data collection event in the system's life.]*

Onboarding components confirmed:
- Staff list (names, roles, departments, login credentials, monthly wage)
- Inventory (categories, items, units, par levels)
- Menu (dishes, prices, ingredients, categories)
- Department setup (names, responsibilities, reporting structure)
- Accommodation (room types, room numbers, capacity)
- Services (configurable per client — game drives for wildlife lodges, pool service, laundry, spa, etc. for others)
- Feature toggles (which modules are active)

### POS and stock integration

**Intimate connection, validated daily.** POS is not a separate system that happens to share a database — it actively deducts from live stock when a sale is made. A restaurant meal sold → ingredients deducted from kitchen stock in real time. A craft shop item sold → craft shop inventory reduced immediately.

**Daily validation gates** — both Kitchen and Store reconcile stock at end of day. The system computes what *should* be on the shelves based on opening stock + inbound stock − sales deductions − requisitions issued. The HOD's physical count is compared against that calculated figure. Variances are flagged automatically, not buried. Discrepancies require explanation before the report can be submitted. This is where the accountability function of the intelligence layer becomes concrete.

**Kitchen Display System deferred to V3.** V2 POS operates without a KDS — orders are communicated through the existing channels (physical dockets, verbal). The POS records the sale and triggers the stock deduction. KDS is the next layer of kitchen integration.

### Requisitions — V1 requirement

Formal goods-movement between departments. The flow: a department (e.g. Kitchen) creates a requisition for items from the Store → Storekeeper reviews and approves or rejects → on approval, goods are issued → stock deducted from Store, credited to the requesting department. Both parties confirm the movement. The system maintains a complete requisition ledger.

How this connects to POS (architecture question deferred): when Kitchen has received stock via requisition and then sells meals via POS, the ingredient deduction needs to trace back through the requisition chain. This is a complex but important data flow — the system should eventually be able to answer "we received 50kg of beef this week, 30kg was used in meals sold, where did the other 20kg go?" That level of traceability is V2/V3 territory but the schema must support it from V1.

---

## Communication module

**In-app only.** WhatsApp integration is not viable — Meta's developer approval process in Uganda is broken, unsupported, and not worth pursuing. All communication stays within BMS.

**Department-to-department model.** Communication flows between departments and between departments and admins/owners. Not individual direct messages between staff members — the unit of communication is the department, not the person. A message from Kitchen goes to Store (or to Admin), not from Sensio to Denis personally. This keeps communication purposeful and operational rather than becoming a general chat app.

**Direction:** Bidirectional — departments can initiate to other departments or upward to admin. Admins can broadcast down to specific departments or all departments. Ownership can communicate to all.

*[Partner note: The "department as sender/recipient" model is a smart constraint. It keeps communication tied to operational context, prevents BMS from becoming a social chat tool, and means every message is implicitly associated with a department's operational state. It also maps cleanly to the role/visibility model — if you're a Kitchen HOD, you communicate as Kitchen, not as an individual. This is accountability by design.]*

**Contextual threads.** Beyond direct department-to-department messaging, communication should also exist in context — threaded discussion attached to a report, a requisition, a stock flag, or a booking. The thread lives on the record it refers to, so context is never lost. Direct department messages are for operational conversations that don't belong to a specific record.


## Guest portal

**Reservations first.** A simple guest-facing page where guests can make a booking — accommodation type, dates, number of guests, special requests. Staff confirm the booking in BMS; the guest receives a confirmation. No payment required at booking stage initially.

**Roadmap beyond V1:**
- Restaurant orders (guests order from room or table via the portal)
- Feedback (post-stay or during-stay ratings and comments — valuable guest data)
- Tips (optional gratuity at checkout)
- Payment integration when Stripe or equivalent is enabled

**Architecture note:** The guest portal is a public-facing interface within the same application — no login required for the reservation form, but the booking is created in the tenant's data. Guest profiles are built from booking data and enriched with each subsequent visit.

## Timeline and quality gate

No fixed timeline. The quality gate is Joshua's satisfaction with each phase before it moves forward. The three-branch strategy (dev → ziwa → main) is the release process itself: dev is where things are built, ziwa is where they're tested in real operational conditions, main is where they land when genuinely ready.

---

## Module scope and roadmap

### Confirmed in scope (full BMS roadmap)

**Operations and intelligence (V1):**
- Staff reporting (config-driven daily reports by department)
- Admin dashboard (compliance, oversight, AI analysis)
- Stock management (inbound, outbound, requisitions between departments)
- Company communication (announcements, messaging, notifications)
- Onboarding module (guided multi-step setup for new clients)

**POS and commerce (V2):**
- Point of sale — restaurant and retail (craft shop, gift shop)
- Invoicing — auto-generated, easy issue or download
- Receipts — auto-generated on payment confirmation
- Payment integration — architecture ready for Stripe or similar; toggle on/off per client. Manual payment confirmation as default.

**Kitchen intelligence (V3):**
- Kitchen Display System (live order display, colour-coded alerts)

**Guest management (roadmap — version TBD):**
- Reservations and bookings
- Guest profiles (valuable data: visit history, preferences, spend, feedback)

**Workforce and finance (roadmap — version TBD):**
- HR module — staff profiles, workforce data, employment records
- Payroll — simple model: monthly wage set at onboarding, tracked from there. Not a full payroll system.
- Accounting and finance — key revenue and cost areas to build an accurate P&L. Not a full accounting package.

**Services module (configurable per client):**
- Each business configures their own service offerings: game drives (wildlife lodges), pool service, laundry, spa, guided walks, etc.
- Tracked for reporting and revenue — feeds into P&L
- Most lodges have services beyond accommodation and F&B; the model must be universal

### Reporting form configuration — Option A (template library)

BMS ships with a library of pre-built department templates: Kitchen, F&B, Housekeeping, Security, Store, Front Desk, Maintenance, Drivers, Accounts, Electrical, Plumbing, IT, Wildlife, Craft Shop, Reception, and so on. During onboarding, a client maps their departments to the relevant templates. They can toggle sections on or off and enable or disable optional fields — but they cannot build forms from scratch.

This is the right call. Most hospitality businesses share the same core departments. The template library covers 95% of real-world needs. The remaining 5% either maps to a close-enough template or gets handled through a custom request (Joshua builds a new template, it goes into the library for all clients). No blank-canvas form builder — too complex to build, too dangerous to misconfigure.

*[Partner note: This decision has a significant architectural consequence: form configurations must be database-driven and per-tenant, not hardcoded TypeScript files as in HOD v2.5. A "template" is a record in the database. A tenant "activates" a template and stores their configuration overrides (which sections are enabled, which fields are required). The form renderer reads from the database at runtime, not from a static config file. This is a meaningfully different and more complex architecture than HOD — but it's the only architecture that scales to multiple clients without code changes per client.]*

### Intelligence layer — what the GM sees

The intelligence layer is not a dashboard of numbers. It is a system that has already done the thinking. Specifically, it must be capable of:

- **Extracting insights** from submitted reports — identifying what matters in the noise of daily operational data
- **Spotting trends** across time — stock consumption patterns, compliance rates, recurring issues in specific departments, seasonal patterns in occupancy or sales
- **Cross-report issue detection** — finding problems that appear in multiple separate reports but are only visible when connected. Kitchen reports low vegetable stock on Monday. Store reports large vegetable delivery on Tuesday. Accounts reports unusually low food cost on Wednesday. These three data points tell a story that no individual report reveals.
- **Weakness identification** — departments that consistently submit incomplete reports, sections habitually marked N/A, recurring challenges that are never resolved, patterns of late submission
- **Consistency auditing** — flagging when a report contradicts previous reports or contradicts data from other departments. Kitchen claims 0 stock wastage for 14 consecutive days — that warrants a flag.
- **Stock intervention prompts** — proactive alerts before a problem becomes a crisis. "At current consumption rate, Kitchen will run out of cooking oil in 3 days." "Store has received no stock for 8 days — is this intentional?"
- **Suggestions** — actionable recommendations, not generic observations. Not "food costs are high" but "food cost has exceeded budget by 23% for 3 consecutive weeks — the primary driver is beef, which is being used at 1.8x the recipe standard."
- **Responsibility mapping** — making clear who owns what. When an issue is identified, the system knows which department and which role is responsible for resolving it. Accountability is tied to a person, not left floating.

*[Partner note: This is the clearest articulation of what separates BMS from every other system in this space. The intelligence layer described here is not a reporting tool with some AI sprinkled on top. It is an active operational co-pilot that turns raw daily data into prioritised, specific, actionable intelligence. The data collection discipline — clean forms, mandatory fields, validation gates, stock reconciliation — is what makes this intelligence possible. Garbage in, garbage out is the threat; BMS's entire data quality architecture exists to prevent it.]*

### Confirmed out of scope
- Asset management (Karibu has it — BMS does not)
- Events and banqueting management
- Full double-entry accounting (BMS tracks key P&L areas, not a replacement for accounting software)
- Full HR/payroll platform (simple workforce tracking only)

### The P&L vision
BMS builds an accurate profit and loss from its own data. Revenue flows in from POS sales, accommodation bookings, services. Costs flow in from stock purchases, staff wages, requisitions. The accounting module is not a separate system — it's the financial intelligence layer that aggregates data already captured by other modules and presents it as a coherent financial picture. This is a significant differentiator from Karibu's standalone accounting module.

*[Partner note: This is a genuinely powerful vision. Most hospitality systems have an accounting module that you enter data into separately. BMS's accounting emerges naturally from operational data already being captured — every sale, every stock movement, every service booking automatically feeds the P&L. The only manual inputs are things the system can't observe: external supplier invoices, utility bills, one-off costs. This means the P&L is always current, always accurate, and requires minimal manual accounting work.]*

---

## Synthesis

*This synthesis was written at the close of the brainstorm. It captures where the project landed — what BMS actually is, what the priorities are, and what needs to happen next. Read this section first if you're coming to this document fresh.*

### What BMS is

BMS is a hospitality and tourism business management platform built from the ground up. It is designed as a single, unified, shippable product — one application that any lodge, hotel, or tourism operation can onboard themselves, configure to their structure, and immediately begin using. Ziwa Rhino And Wildlife Ranch is the first client and live test case. Every other lodge is the eventual customer.

The system's defining characteristic is not any single module. It is intelligence. BMS collects operational data from every corner of a business — daily department reports, stock movements, sales, bookings, staff activity, communications — processes it cleanly, and surfaces what matters to the people who need to act on it. For a business owner who cannot be everywhere at once, BMS is their eyes, ears, and mouth in the operation.

It replaces Karibu and systems like it. But it does not just replace them — it does what they cannot do. Karibu records what happened. BMS understands what it means, connects the dots across departments, spots problems before they become crises, holds the organisation accountable, and tells management what they need to hear in a form they can act on.

### Where it started vs where it landed

The project did not start from zero. HOD Daily Reports v2.5 — already in production at Ziwa — proved the core concepts: config-driven forms, AI-powered analysis, department accountability, admin oversight. BMS takes that foundation and rebuilds it properly: clean database, generic multi-tenant schema, single unified application, and a module roadmap that eventually covers every dimension of a hospitality business.

The key evolution from HOD to BMS: HOD is a Ziwa tool. BMS is a product.

### The module roadmap

| Version | Modules |
|---|---|
| **V1** | Onboarding, staff reporting (template library), admin dashboard, stock management (inbound/outbound/requisitions), company communication |
| **V2** | Point of sale (restaurant + retail), invoicing, receipts, payment architecture (Stripe-ready, toggle on/off) |
| **V3** | Kitchen Display System, reservations/bookings, guest portal (reservations → orders → feedback → tips), guest profiles |
| **V4+** | HR and staff profiles, payroll (simple), accounting and P&L, services management, advanced forecasting |

### The five non-negotiables

1. **Generic schema first.** Every data model must serve any hospitality business, not just Ziwa. Nothing Ziwa-specific in the core schema. Ziwa's configuration is data, not code.

2. **Code is foundational, AI is surgical.** Deterministic logic — validation, calculations, stock deductions, compliance tracking, form rendering — is always code. AI appears only where code genuinely cannot do the job: natural language analysis, trend detection across unstructured data, cross-departmental pattern recognition. No AI as a crutch for weak engineering.

3. **Data quality is non-negotiable.** The intelligence layer is only as good as the data feeding it. Mandatory fields, validation gates, stock reconciliation, duplicate prevention, consistency checks — these are not nice-to-haves. They are the foundation that makes intelligence possible.

4. **Development discipline.** Refined rules for development, alteration, and testing. Every change documented, every evolution tracked, every version snapshotted. The three-branch strategy (dev → ziwa → main) is the release pipeline. Nothing reaches main that hasn't been tested in real operational conditions at Ziwa.

5. **Simplicity of use.** The people using this daily are lodge staff, not software engineers. The interface must be effortless. Complex things must happen invisibly. The depth of the system should never surface as complexity for the user.

### Open questions for the research and architecture phases

1. **Template library design** — what are the standard templates that ship with BMS? What fields and sections are universal across all hospitality businesses? What is genuinely variable? This defines the boundaries of the template system.

2. **Database-driven form configuration** — how does the schema represent a department template, a tenant's configuration overrides, and the resulting rendered form? This is the most architecturally significant difference from HOD v2.5.

3. **Multi-tenant RLS model** — how does Supabase Row Level Security enforce tenant isolation cleanly without adding query complexity everywhere? What does the tenant context propagation pattern look like?

4. **Stock traceability chain** — how do requisitions (V1), POS ingredient deductions (V2), and supplier inbound stock (V1) connect in the schema to enable full goods-movement traceability?

5. **Payment integration architecture** — what does a "toggle on/off" Stripe integration look like technically? How is the schema designed to support payment records regardless of whether they came from Stripe, mobile money, or manual entry?

6. **Intelligence layer triggers** — which insights are computed on demand (user opens a page), which are computed on a schedule (nightly batch), and which are computed in real time (stock threshold breach)? This shapes the backend architecture significantly.

---

## Post-research update

Research (30 March 2026) confirmed the project direction and added one material calibration:

**Intelligence priority:** The brainstorm assumed BMS would differentiate mainly on intelligence without specifying which kind. Research reveals that **operational intelligence** (accountability enforcement, cross-department anomaly detection, morning brief) is more immediately valuable to Ugandan lodge owners than **predictive intelligence** (revenue forecasting, demand modelling). The Rafiki Lodge fraud case, the staff accountability research, and the absence of data-driven decision-making at 40% of surveyed hotels all point the same direction. V1 must nail operational accountability. Predictive intelligence is a V3+ priority.

**Architecture confirmations:** Offline-first architecture, mobile money as first-class payments, and WhatsApp as a submission/notification channel are all confirmed as required — not optional — for this market. These must be designed into the architecture from day one, not retrofitted.

**Competitive landscape:** WhatsApp + spreadsheets is the dominant incumbent, not Karibu. BMS must be simple enough to displace zero-cost familiar tools, not just a paid legacy system. This raises the UX bar.

