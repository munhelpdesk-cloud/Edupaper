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
