# Dawn site map

One fixed shell on every route and on both origins (the live gateway origin and the static Firebase site).

- Top bar: menu button (left), page title (center), account (right).
- One slide-over sidebar. It docks beside the page on desktop. The current page is highlighted.
- No tab or pill bar. No footer.
- The list lives in `src/lib/site/nav.ts` (`NAV_GROUPS`). The sidebar, the top bar title, the 404 page and the tests all read it, so this file and the app cannot drift. `src/lib/site/shell.browser.test.ts` checks that every link below returns 200 `text/html`.

## Sidebar

| Section | Entry | Link | Purpose |
| --- | --- | --- | --- |
| (top) | Atlas | `/` | The map of Cardinal. Home. |
| (top) | Quests | `/village?section=quests` | Quest list and quest chat. |
| (top) | Village | `/village?section=village` | The 8-bit village. |
| (top) | Characters | `/village?section=characters` | Character maker (Forge). |
| (top) | Library | `/village?section=library` | Saved characters and scenes. |
| Work | Projects | `/projects` | Desk projects and files. |
| Work | Studio | `/studio` | Image and note studio. |
| Work | Recipes | `/artifacts` | Style recipes: gallery, detail view, mixer. |
| Work | Letter | `/letter` | The public letter, signup, and archive. |
| Work | Newsletter | `/newsletter` | Compose, the subscriber list, a dry-run send, and counts. |
| Work | Invoices | `/invoices` | Numbered invoices, PDF, and print. |
| Work | Contacts | `/contacts` | People, companies, the pipeline, and today. |
| Work | Cuts | `/cuts` | YouTube cut board, script, chapters, captions, and the license shelf. |
| Work | Shows | `/shows` | Podcast shows, RSS feed, embed player, and download counts. |
| Work | Research | `/research` | Cited answers over PDFs, transcripts, and web clips. |
| Code | Code | `/code` | Code hub: cards for every code tool, and the "Open VS Code" button. |
| Code | NightCode | `/kits/nightcode` | Plan with read-only tools, or build. |
| Code | Teammates | `/kits/teammates` | A Builder and a Reviewer in one chat. |
| Code | Editor | `/code/editor` | Dawn's own file editor. |
| Code | Kits | `/kits` | Dashboard of the small tools. |
| Agents | Agents | `/agents` | Agent chats, groups, spend meter. |
| Agents | Bot desk | `/desk` | The bot desk. |
| Agents | Data | `/agents?section=data` | Export and delete your data. |
| Agents | Settings | `/agents?section=settings` | Agent settings. |

Pinned characters (Trinity, Kali, Nimbus) open `/village?agent=<id>`. The account menu links to `/credits`.

## Pages that are not sidebar entries

| Route | Purpose | Reached from |
| --- | --- | --- |
| `/credits` | Credits and licenses, including where each code tool came from. | Account menu |
| `/kits/assistant`, `/kits/browser`, `/kits/sandbox`, `/kits/sendkit` | One kit each. Highlight "Kits". | `/kits` |
| `/preview` and `/preview/*` | Review pages for design work. | Not linked |

## Old routes that merge or redirect

| Old route | Now | How |
| --- | --- | --- |
| `/atlas` | `/` | Redirect page, plus Firebase and Caddy redirects |
| `/town` | `/village?section=village` | Redirect page, plus Firebase redirect |
| `/editor` (static origin) | `/code` | Redirect page, plus Firebase redirect |
| `/editor` (live origin) | OpenVSCode | Caddy sends it to OpenVSCode. Only the "Open VS Code" button links here. |
| `/agents?section=recipes` | `/artifacts` | Client redirect |
| `/agents?section=letter` | `/letter` | Client redirect |
| `/agents?section=edit` | `/agents?section=new` | Client redirect |
| Second sidebar of Village and Quests | The shared sidebar | Deleted |
| Pill bar of Agents, Recipes, Letter, Data | The shared sidebar | Deleted |
| Atlas home drawer | The shared sidebar | Deleted |

## Unknown routes

Both origins serve the in-shell 404 page (top bar, sidebar, "Back to Atlas" link). The status is 404 and the type is `text/html`. It is never a raw text download.
