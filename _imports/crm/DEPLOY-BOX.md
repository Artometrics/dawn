# Deploy box

Run these commands on the machine that is already logged in as `team@artometrics.com`. Project `crm-510519`. Spark plan first: Hosting, Firestore, and Auth. Do not create a `.env` file in this folder. The production bundle loads Firebase web config from Hosting at `/__/firebase/init.json` and does not connect to the emulators.

The archive extracts in the current directory.

## 1. Unpack and install

```bash
mkdir -p "$HOME/crm-510519"
tar -xzf crm-deploy.tar.gz -C "$HOME/crm-510519"
cd "$HOME/crm-510519"
npm ci
```

`dist/` is already built with emulators off. Hosting `predeploy` runs `npm run build` again. That rebuild is also emulators off, as long as no `.env` file is present.

## 2. One-time project setup

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest projects:list
```

Confirm `crm-510519` is in that list. Then, in the Firebase console for that project:

1. Create Cloud Firestore in **Native** mode (not MongoDB-compatible Enterprise). `nam5` is a reasonable location.
2. Build → Add app → Web, nickname Artometrics. This is what publishes `/__/firebase/init.json`. Do not copy those keys into this repo.
3. Authentication → Sign-in method → enable Google.
4. If the Hosting site does not exist yet:

```bash
npx -y firebase-tools@latest hosting:sites:create crm-510519 --project crm-510519
```

Sign in with Apple stays unwired until the console has an Apple Services ID and the callback `https://crm-510519.firebaseapp.com/__/auth/handler`. Hide My Email addresses are not on the allowlist.

## 3. Spark deploy

```bash
npx -y firebase-tools@latest deploy --only hosting,firestore,auth --project crm-510519
```

That ships:

- Hosting site `crm-510519` from `dist/`
- `firestore.rules` and `firestore.indexes.json`
- the Google Auth brand and authorized domains in `firebase.json` (`localhost`, `crm-510519.web.app`, `crm-510519.firebaseapp.com`)

Open `https://crm-510519.web.app` and sign in with Google as `kylesmcauliffe@gmail.com` or `team@artometrics.com`. On iPhone Safari, Share → Add to Home Screen.

File uploads will say that Cloud Storage is not available. Today will not show a Morning list until the function in section 5 has run. Both are expected on Spark.

## 4. Storage, after Blaze

Upgrade `crm-510519` to Blaze, enable Cloud Storage, then:

```bash
npx -y firebase-tools@latest deploy --only storage --project crm-510519
```

Until that succeeds, the desk ignores attachment failures and keeps working.

## 5. Morning digest and form intake, after Blaze

Cloud Functions are not part of the Spark deploy. From this same directory, after Blaze:

```bash
npm ci --prefix functions
printf '%s\n' 'INTAKE_SECRET=replace-with-a-long-random-string' 'RESEND_ENABLED=false' > functions/.env
npx -y firebase-tools@latest deploy --only functions --project crm-510519
```

`functions/.env` stays on this machine. Do not commit it. `RESEND_ENABLED` must stay `false` until someone deliberately turns email on. While it is false, the job never calls Resend. It writes `digests/latest` and `digests/YYYY-MM-DD` at 08:00 America/Los_Angeles. Today shows that document. Clients cannot write digests.

Replace the secret before deploy. The intake URL is:

```text
https://us-central1-crm-510519.cloudfunctions.net/intake
```

POST JSON with header `x-intake-token: <INTAKE_SECRET>`:

```json
{
  "name": "Nia Brooks",
  "company": "Harbor YouTube",
  "email": "nia@harbor.test",
  "phone": "+1 917 555 0100",
  "instagram": "@nia.brooks",
  "note": "Sponsor read",
  "responseId": "form-response-id"
}
```

A matching `responseId` updates the same lead instead of adding a second person. The function creates a contact, a Lead deal worth $0, a follow-up task, and a note when `note` is present. A missing secret returns 503. A bad token returns 401.

Apps Script can send the same JSON. A bearer token or `?token=` also works. Prefer the header.

To turn Resend on later, set `RESEND_ENABLED=true`, `RESEND_API_KEY`, and `RESEND_FROM` in `functions/.env`, then deploy functions again. Leave it false for this rollout.

## What not to run on Spark

```bash
npx -y firebase-tools@latest deploy --project crm-510519
```

That full deploy also targets Storage and Functions and will fail before the project is on Blaze.
