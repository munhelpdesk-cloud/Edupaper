# EduPaper AI — teacher app (prototype)
All data is fake (src/data.js). Replace it with your real DB later. Data you create is saved on the device (localStorage).

    npm install && npm run dev

APK: push to GitHub main -> Actions -> "Build Android APK" -> download artifact.
App icon + native splash come from `resources/brand` and are applied in the workflow.

Pages: Dashboard, Generate Paper (10-step wizard), Question Bank (+ add your own question), Templates & My Formats,
My Papers, Exam Planner, Blueprints, Insights, Subjects & Chapters, Favorites, Profile, Settings, Help & Support.
Theme: follows the phone (light/dark) automatically; override in Settings > Appearance.
Layout: phone = bottom tabs, tablet = icon rail, desktop = full sidebar.

Navigation: every page has its own URL hash (#/my-papers etc.) and one history entry, so browser/Android Back and Forward work. Notifications is a slide-out drawer from the bell (it also gets a history entry, so Back closes it and returns to the same page).

Accounts: first launch shows the intro, then the app opens as a GUEST: everything can be viewed and used without an account. Creating a paper (Generate Paper) and buying a plan ask the person to Sign in / Create account first (#/login, #/register, #/forgot-password), then continue where they left off. Gated pages are listed in GATE in src/App.jsx. Accounts are stored on the device (src/auth.js, passwords are salted + PBKDF2-hashed). To go live, keep the function signatures in src/auth.js and swap the bodies for your server / Supabase auth.

Payments: Account > Plans & Payment (#/plans-and-payment) and #/checkout (UPI, card, netbanking, 18% GST, receipts, cancel/resume renewal). Three plans (Free, Pro, School), monthly or yearly. Prices and plan features live in src/payments.js (placeholders). The gateway is a SIMULATION: processPayment() in src/payments.js never moves money. Replace it with Razorpay/Stripe (create the order on your server, open their hosted checkout, verify on the server before activating the plan) and set DEMO = false to hide the test-card notice. Demo test values: card 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined, UPI ids ending @fail are declined.


Notifications test: Settings > Notifications > "Send test notification" adds an alert to the bell and also fires a real device notification (Android app via @capacitor/local-notifications, browser via the Web Notifications API). See src/notify.js.


Design system (v2): src/styles.css starts with the tokens (colours, radii, type) and ends with the component layer. One solid brand colour (--p), 1px borders, 6-8px radii, no gradients or glow. Dashboard, My Papers and Question Bank use tables/rows; the paper preview and DOCX export share one layout (sections by question type, marks on the right, answer key on a new page). Exam pattern presets are in PATTERNS in src/data.js: verify the marks schemes against the current CBSE/GSEB circulars. src/tex.js converts the maths/chemistry LaTeX in questions to readable Unicode for the DOCX.

Premium layer (v3): deep navy sidebar with a gold marker, Source Serif 4 headings, soft layered depth. Welcome (onboarding) screens have no logo. Notifications: the Android app uses the plugin's default channel, which plays the phone's own notification sound; browsers use a service-worker notification (public/sw.js). If a phone is still silent, check Settings > Apps > EduPaper AI > Notifications > "Default" (sound on, not in silent/Do Not Disturb); uninstall and reinstall resets a muted channel.


School formats v4 (main feature): Templates & My Formats > upload the school's DOCX or PDF.
- DOCX: the uploaded file IS the template (src/template.js). Fonts, margins, logo, header/footer and letterhead stay identical. We auto-detect and update Exam title, Class, Subject, Time and Max marks (also inside tables and headers), remove the old sample questions and write the new paper in the same font. Optional placeholders in the teacher's Word file: {{exam}} {{class}} {{subject}} {{time}} {{marks}} {{medium}} {{board}}, and {{questions}} on its own line to say exactly where questions go (anything after that line is kept, e.g. a closing note).
- PDF: the top of page 1 (before the first Section/instructions) is read with pdf.js and reused as the paper heading (preview, print and Word). Scanned PDFs have no text and are rejected with a clear message.
- Files are stored on the device in IndexedDB (src/store.js).
- Word output is exact. PDF output is the print of the preview (letterhead only). For a pixel-exact PDF of a DOCX format, convert the generated DOCX to PDF on your server (LibreOffice: soffice --headless --convert-to pdf).
Questions step: pick chapter by chapter (ChapterPicker) or auto-generate (spread over chapters, only the chosen types). AI questions: set VITE_AI_URL to your own server (see src/ai.js for the request/response contract). Never put an AI key in the app.
npm install is needed again (new deps: jszip, pdfjs-dist).

Logos: DOCX formats keep the logo exactly (header, letterhead, tables; tested). PDF formats: logos found in the letterhead area of page 1 are cropped from the rendered page (up to 3, left/centre/right kept) and shown in the preview, print and Word export. The upload screen says whether a logo was found. Logos must be real images in the file; a logo drawn as vector shapes in a PDF is not detected.

## Connect to the admin panel (live syllabus and questions)

The app now reads its syllabus and question bank from your EduPaper admin panel, so anything you add, edit, hide or publish there reaches teachers without a new app release.

1. In the admin panel's Supabase project run `supabase/final_setup.sql` (from the admin zip) once.
2. Copy `.env.example` to `.env.local` and fill in the project URL and the **anon** key (Settings → API). Never use the service-role key here.
3. **Questions are off by default** because they would be readable by anyone holding the public key. To share published questions with the app, run once in the SQL editor:
   `update platform_settings set value = '{"questions_public": true}' where key = 'teacher_api';`
   The syllabus does not need this switch.
4. `npm install`, then `npm run dev` or `npm run build`. For Android: `npm run build && npx cap sync android`.

How it behaves
* **Offline-first.** The last successful copy is saved on the device (syllabus in localStorage, questions in IndexedDB) and is used instantly at start-up, with or without internet. The app then refreshes in the background: on start, when the device comes back online, and when the app is reopened after 15 minutes. **Profile → Content updates** shows the status and has an “Update now” button.
* **Safe fallbacks.** With no `.env`, or if the server has no active boards or no published questions, the app keeps its built-in sample content and says so. A failed refresh never wipes what the device already has. The teacher's own questions are never replaced.
* **What maps to what.** Active boards → classes → subjects → chapters appear in the paper wizard and Subjects & Chapters. Inactive and archived items disappear. Published questions appear in the Question Bank and in generated papers. Questions are matched by board, class, subject and chapter together, so two boards with a chapter of the same name never mix.
* **New question types** from the admin panel (Multiple select, Match the following, One word, Assertion-Reason, Passage based, Practical) appear in the type filters and print in their own section. A case study or passage arrives as one question with its passage and sub-questions (i), (ii)…
* **Diagrams.** Questions with an uploaded image show it in the preview and the Word download (resized to fit the page). If the image cannot be downloaded, the old “[Diagram: insert figure here]” line is used. Images are not placed inside a teacher's own uploaded Word format (the placeholder line is used there).
