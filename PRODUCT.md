# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Kyle and the Artometrics team, usually on a phone. (Inferred from the repo and the Oct 31 brief: the primary job is to run Dawn’s village of agents, approve anything that would leave the room, keep short quests, and walk the Stanford campus day. The brief’s screenshots are iOS references for this web app, not a native client.)

## Product Purpose

Dawn is a pixel-art village of agents, plus a studio and a model gateway. Trinity, Kali, and Nimbus can draft a send, spend, hire, or post. Nothing leaves until a person taps Approve. Quests are short goals. Atlas is a walkable Stanford day. The older studio stays at `/studio`.

Success means those jobs still work after the restyle, on a phone first.

## Positioning

Agents draft outgoing actions and a person is the gate. Atlas is a day you walk with an 8/16-bit character, not a generic map embed.

## Operating Context

Phone-first web app. Join with a local name on emulators, Google on the Firebase host, or stay “on this phone” with no account. Village memory, quests, and approvals persist locally or in Firestore. Campus walk progress stays in session storage. Studio chat calls Gemini through Firebase AI Logic in the browser. Atlas can be embedded with `/atlas?embed=1`.

## Capabilities and Constraints

Keep working, and reachable: the village scene, agent conversations and the approval gate, group chat, quests (add and check milestones), the team card (name, look, share, save, clear desk), the personal geolocation map, the Cardinal Quest walk (student and researcher, stops, “Cardinal note coming soon”), `/atlas?embed=1`, and `/studio`.

Do not add secrets, delete files, change domain or DNS, or deploy publicly. Open a pull request against `main`. Checks must pass.

Nav names in the brief: Quests, Village, Atlas, Library. Chat, team, and the personal map stay inside those four places.

Open: whether Library should later hold documents beyond agents, rooms, and the studio link. This restyle uses Library for the agent roster, the room, and the team card.

## Brand Commitments

The Oct 31 brief makes these binding:

- The name is Dawn. The wordmark is a serif “Dawn”.
- The shell is dark and calm: near-black ground, soft grey text tiers, one warm accent.
- The shell follows the attached Claude and Grok Bot iOS screens: a left drawer of icon and label rows, Pinned and Recents, a white floating “+ New quest” pill, a search bar pinned at the bottom, round icon buttons in the top corners, list rows of title plus a muted relative date, and catalog rows with an icon tile, a name, one line of reason, and a pill action.
- Atlas follows the brief’s NAVITIME notes: a full-screen flat 2D map, top-down, dark charcoal ground, slightly lighter roads, neon only on the path, active zones, and goals, dark-blue pill markers, a floating translucent search, round controls for layers and recenter, a draggable dark bottom sheet with filter chips, labels that fade when zoomed out, and Kyle’s 8/16-bit character walking the neon path.

## Evidence on Hand

- `README.md`, `ROADMAP.md`, and `codex/manuals/ui-design-system.md` describe the product. They are not customer proof.
- Agent and player sprites live in `public/tiles/`.
- Campus places are names and coordinates in `data/atlas/stanford-places.json`.
- Style references are the four attached screenshots (Claude drawer, chat list, connect catalog, code empty state).
- Do not invent testimonials, customer counts, or pricing.

## Product Principles

- A person approves anything that leaves.
- The phone is the scene the shell is built for.
- The village and the campus walk stay playable.
- Plain words and short goals.
- The pixel character is the person on the map.

## Accessibility & Inclusion

No formal standard was named. Existing screens use labeled controls, 44px touch targets, and a reduced-motion path on the campus walk. Keep those.

## Inference note

No structured question tool was available in this session, so the product record above is taken from the repository and the approved brief. Sentences marked inferred are hypotheses from the repo, confirmed only where the brief says to keep existing features working.
