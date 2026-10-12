# EduPaper AI — teacher app (prototype)
All data is fake (src/data.js). Replace it with your real DB later. Data you create is saved on the device (localStorage).

    npm install && npm run dev

APK: push to GitHub main -> Actions -> "Build Android APK" -> download artifact.
App icon + native splash come from `resources/brand` and are applied in the workflow.

Pages: Dashboard, Generate Paper (10-step wizard), Question Bank (+ add your own question), Templates & My Formats,
My Papers, Exam Planner, Blueprints, Insights, Subjects & Chapters, Favorites, Notifications, Profile, Settings, Help & Support.
Theme: follows the phone (light/dark) automatically; override in Settings > Appearance.
Layout: phone = bottom tabs, tablet = icon rail, desktop = full sidebar.
