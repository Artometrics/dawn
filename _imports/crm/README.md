# Artometrics

Private desk for Kyle at Artometrics: people, companies, the pipeline, follow-ups, and a today view. React + Vite, Firebase Auth, Firestore, and Cloud Storage. Installable on iPhone Safari.

The allowlist is `kylesmcauliffe@gmail.com` and `team@artometrics.com`. Both must be verified. Everyone else is denied by the client and by the security rules.

## Local desk

Two processes. The dev app talks to the emulators, not the live project.

```bash
npm install
npm run emulators
```

In another terminal:

```bash
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123) and choose **Preview as Kyle**. That account exists only on the Auth emulator. Turn **Demo** on in Settings to load the synthetic Northline / Kite / Harbor desk, and off to delete those records.

```bash
npm test
npm run test:rules
npm run build
```

`test:rules` starts the Firestore and Storage emulators and checks the allowlist, schema, and file-type rules.

## Deploy

Project `crm-510519`, hosting site `crm-510519`, Spark plan first. The exact commands for the logged-in deploy machine are in `DEPLOY-BOX.md`.

Production builds do not talk to the emulators and do not bake a web config. On Hosting, the app reads `/__/firebase/init.json` at startup. Register a Web app on the project before the first visit.

Spark deploy (Hosting, Firestore rules and indexes, Auth):

```bash
npx -y firebase-tools@latest deploy --only hosting,firestore,auth --project crm-510519
```

Cloud Storage and Cloud Functions need the Blaze plan. Without them, file uploads explain that Storage is unavailable, the morning digest simply does not appear, and the form intake URL is not live. The rest of the desk still works.

Create Cloud Firestore in **Native** mode, not MongoDB-compatible Enterprise. A nearby multi-region such as `nam5` is a reasonable default.

The morning function writes `digests/latest` at 08:00 America/Los_Angeles. Resend email stays off unless `RESEND_ENABLED=true` in `functions/.env`. The form intake endpoint is `intake`, and it refuses requests until `INTAKE_SECRET` is set.

### Gemini drafts

Drafts are optional and never send mail. They stay off until both of these are true:

- Firebase AI Logic is enabled on `crm-510519` (`npx -y firebase-tools@latest init ailogic`, or the console).
- App Check is on for the web app with a reCAPTCHA v3 site key, and `VITE_RECAPTCHA_SITE_KEY` is set at build time.

On the emulators, and on any build without that key, the contact page explains why a draft is unavailable.

### iPhone

Deploy over HTTPS, then in Safari use Share → Add to Home Screen. Sessions persist in IndexedDB. Google and Apple use a redirect on iOS and in the installed app so the sheet is not blocked. The service worker does not intercept `/__/auth`.

## What is in the desk

- People: name, company, email, phone, Instagram, site, tags, source
- Companies
- Pipeline: Lead, Contacted, Proposal, Won, Lost, with a dollar value
- Notes and an activity timeline on each person
- Tasks with due dates, and Today (overdue, due today, open proposals)
- Search across the loaded desk
- CSV import and export
- Quick add from the red button (a follow-up tomorrow is on by default)
- Photo, PDF, or text attachments, 10MB, including HEIC

Writes land in the local Firestore cache first, so the sheet closes before the network round trip. Offline edits sync when the phone is back online.

## Rules

`firestore.rules` and `storage.rules` allow only the two verified emails. Documents have a fixed field set, size limits, and immutable owner / demo / created-at stamps. Activities and file records are append-only. These rules are a prototype: review them before a wider team uses the desk.

Demo rows are fictional (`demo: true`) and use `.test` addresses.

## Search indexing

SEO/indexing intentionally disabled; re-enable robots, sitemap, meta at promoted launch.
