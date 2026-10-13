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

Accounts: first launch shows the intro, then Sign in / Create account (#/login, #/register, #/forgot-password). Nothing else is rendered until you are signed in. Accounts are stored on the device (src/auth.js, passwords are salted + PBKDF2-hashed). To go live, keep the function signatures in src/auth.js and swap the bodies for your server / Supabase auth.

Payments: Account > Plans & Payment (#/plans-and-payment) and #/checkout (UPI, card, netbanking, 18% GST, receipts, cancel/resume renewal). Prices and plan features live in src/payments.js (placeholders). The gateway is a SIMULATION: processPayment() in src/payments.js never moves money. Replace it with Razorpay/Stripe (create the order on your server, open their hosted checkout, verify on the server before activating the plan) and set DEMO = false to hide the test-card notice. Demo test values: card 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined, UPI ids ending @fail are declined.
