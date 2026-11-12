# Deploy notes for Kyle

Nothing here is deployed by the PR. Apply it on dawn-1 yourself.

## Gateway env (`gateway.env`)

| Variable | Meaning |
| --- | --- |
| `DAWN_AUTH_DISABLED=1` | Every request is the owner. Testing only. The owner check stays in the code. Remove it to turn sign-in back on. |
| `DAWN_DAILY_REQUEST_CAP` | Model requests per UTC day across all chats. Default 200. |
| `DAWN_MAX_OUTPUT_TOKENS` | Tokens per reply. Default 600, never above 1200. |
| `DAWN_IP_RATE_PER_MINUTE` | Chat messages per IP per minute. Default 20. |
| `DAWN_SPEND_CAP_USD` | Monthly dollar cap (already used). NightCode needs it above 0 to call a model. |
| `DAWN_NIGHTCODE_MODEL` | `gemini`, `xai` or `openrouter` turns on real NightCode replies. `off` or `mock` keeps fixtures. Teammates use the model whenever a key exists. |
| `NEXT_PUBLIC_DAWN_LIVE_ORIGIN` | Build-time. The live address the static site links to. Default `https://2-29-173-68.sslip.io`. |

**Warning.** With `DAWN_AUTH_DISABLED=1`, anyone who can reach the host can start NightCode sessions (including build mode and bash in the jail), write desk files, and spend the model budget up to the caps. Keep the caps low, and turn it off when testing ends.

## Caddy (`deploy/Caddyfile`)

1. Sign-in is now one switch: `DAWN_AUTH_SNIPPET=dawn_auth_off` in Caddy's environment turns the proxy step off. Unset keeps Google sign-in. Set the gateway flag too.
2. **Root cause of NightCode "Could not start a session."** `handle /api/kits*` had no `forward_auth`, so the gateway never saw the owner email and answered 401. It now imports `dawn_auth`. A test reads the Caddyfile and fails if that line goes missing.
3. **Root cause of Bot desk "Not found" download.** `/desk`, `/code`, `/kits`, `/preview` were not in `@public`, so they fell to `respond "Not found" 404` (plain text, which iPhone Safari downloads as `desk.txt`). They are public now, and the last block serves `404.html` with status 404.
4. `/editor` (OpenVSCode) always uses `dawn_auth_on`, even when the switch is off. It has a terminal. If it hangs on a blank page while sign-in is off, that is the sign-in redirect. Sign in once through `/oauth2/start?rd=/editor`, or open the Dawn editor at `/code/editor`, which needs no sign-in.
5. `oauth2-proxy.cfg`: `cookie_expire` 168h to 720h.
6. Reload with `caddy reload`. The Caddyfile was not run against a live Caddy here, so check `caddy validate` first.

## Firebase

`firebase.json` redirects `/atlas`, `/town`, `/editor`. Deploy the static site as usual after `npm run build`.

## OpenVSCode theme

`editor/deploy/settings.json` already sets `Artometrics Dark`. `install-ubuntu.sh` copies it to the user settings on install. If the live editor is light, copy that file to `/var/lib/dawn-code/vscode/data/User/settings.json`.
