# Product

<!-- impeccable:product-schema 1 -->

Inferences below are labeled because the brief said to work without questions. They are not confirmed interviews.

## Platform

web

## Stack

Delegated by the brief: Firebase Auth (Google), Firestore Standard edition in us-west1, Cloud Functions gen2, Firebase Hosting, Resend, Gemini. The browser app is a Vite + React + TypeScript SPA so Hosting can ship on the Spark plan and read `/__/firebase/init.json` at runtime. Inferred: no extra database, no accounts for readers.

## Users

- Readers, inferred: people who want the Artometrics letter on a phone, in daylight, and who must be able to join and leave without an account.
- Desk, confirmed allowlist: `team@artometrics.com` and `kylesmcauliffe@gmail.com`. They compose, send, and read counts.

## Product Purpose

Artometrics keeps a subscriber list, writes a letter, sends it, and leaves a public archive. Success is a confirmed subscriber, a sent issue, a working one-click unsubscribe, and open/click counts, including when Resend is not configured (the send is logged, not mailed).

## Positioning

The letter is the product. Joining requires a stored consent and a confirmation click. Leaving is one click from the mail client. The archive is the same letter, on the web, after it has been sent.

## Operating Context

- Public pages: signup, confirmation, unsubscribe result, archive.
- Desk: Google sign-in, subscriber list, composer, schedule/send, counts, dry-run log.
- Mail transport: Resend when `RESEND_API_KEY` is a real secret on a deployed function. Otherwise a dry-run log. The emulator never calls Resend.
- Drafting: Gemini when `GEMINI_API_KEY` is set; otherwise a local draft from the pasted notes or page text.
- Region and project, confirmed: `us-west1`, Firebase project `newsletter-510519`, web app `newsletter-web`, Spark until functions are deployed.

## Capabilities and Constraints

- Collections: `subscribers`, `issues`, `events`, `sends`, `dryRuns`, `slugs`, `rateLimits`.
- Subscriber documents and send tokens are not readable by the client SDK. The desk reads them through the API.
- Sent issues are world-readable. Drafts are allowlist-only. Clients cannot mark an issue sent or edit counts.
- Double opt-in. `consentAt` stores the consent time with the consent sentence.
- Every send includes a physical address and `List-Unsubscribe` / `List-Unsubscribe-Post`.
- Address on file is a placeholder: Artometrics, 548 Market Street, PMB 00000, San Francisco, CA 94104, United States. Replace it before a real mailing.
- No secrets in source. Hosting reads Firebase config from `/__/firebase/init.json`.
- Do not send real email in tests or from the emulator.
- Undecided: the real street address, the verified Resend from-domain, and whether open tracking should be off for readers who object. The pixel is on for the MVP.

## Brand Commitments

- Name: Artometrics.
- House blue `#0047FF`, confirmed.
- Look: a clean magazine, confirmed. The letter should be readable on an iPhone.
- Voice, inferred: plain studio speech. No hype, no fake testimonials, no invented circulation numbers.

## Evidence on Hand

None yet. No past issues, logos, or photographs were in the brief. Empty states stay empty. A local emulator may show one specimen letter labeled as a specimen. Do not present it as a mailing that happened.

## Product Principles

- Confirmation before the list. A typed email is not consent.
- Leave in one click, and say so in the letter.
- The desk tells the truth about whether mail left the building.
- Counts come from events, not from a guessed dashboard.
- The archive is the letter itself, not a campaign recap.

## Accessibility & Inclusion

Inferred from the iPhone requirement: large type, 16px form fields, visible labels, 44px targets, and text that clears 4.5:1 on paper and on the blue sheet. No account is required to read a sent letter.
