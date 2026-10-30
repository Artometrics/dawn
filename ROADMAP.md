# Dawn roadmap

Dawn is a pixel-art social app in the shape of [AI Town](https://github.com/a16z-infra/ai-town): agents with an identity and a plan, a loop that walks or starts a conversation, then a memory of what was said. The cast is a chief of staff (Trinity) and two workers (Kali, Nimbus). Gemini runs through Firebase AI Logic. Records live in Firestore. Nothing is sent, spent, hired, or posted until you tap Approve.

## Running now

- HQ tile map (Kenney Tiny Dungeon, CC0) in Phaser. Agents walk toward whoever is nearest, the way AI Town invites a free neighbor.
- When they meet, they talk: greeting, a reply, a goodbye. Prompts are adapted from AI Town's `start` / `continue` / `leave` messages.
- The speaker writes a first-person memory and an importance score from 0 to 9. After enough importance, they write one reflection. That is the Generative Agents memory stream, without embeddings yet.
- Ranking uses word overlap plus recency plus importance. AI Town uses vector search for the relevance term.
- Tap an agent to talk. A send, spend, hire, or post stays pending until you approve it. Approved posts land in the group room.
- Group chat for any signed-in person who knows the room name.
- Atlas is you on an OpenStreetMap map.
- Quests are a short goal with three checks.
- Team card: your pixel, the three agents, share or save.
- Studio gateway maps retired `x-ai/grok-2-1212` to `x-ai/grok-4.7`.

Cooldowns are shorter than AI Town so a visit shows a conversation. AI Town waits 15s after a talk, 10s after an activity, and leaves after 8 messages. This slice uses about 8s and 4 lines.

## Next, to get closer to AI Town

- Turn on Firebase AI Logic for app `1:26033104249:web:1cd4ed7a7b828a264dbba8`, then App Check, then deploy rules and hosting. Until then the loop uses labeled practice lines.
- One server heartbeat, so two browsers don't both run the town. AI Town does this in Convex; Dawn should do it in one Cloud Function or a leased Firestore doc.
- Embeddings and the real rank: relevance, recency (`0.99` per hour), and importance, over-fetching candidates the way `memory.ts` does. Reflection should wait until new memories sum past 500, not 15.
- Pathfinding, invite accept chance (80%), and the original cooldowns and message cap.
- The human as a player in the same loop: walk your character, get invited, and have that chat written into the same memory stream.
- More of the town: rooms, activities with a duration, and the characters you add yourself.

## Later

- Simulation levels: classroom, office, town. Economic studies and agent automation.
- Shared style libraries and portfolios.
- Atlas links to real places and services.
- People build their own spaces: science sims, games, digital companies, club rooms.

## Credits

See `THIRD_PARTY_NOTICES.md`. AI Town is MIT, Copyright (c) 2023 a16z-infra. Generative Agents suggested the memory stream. Tiles are CC0 from Kenney. The map is OpenStreetMap via Leaflet.
