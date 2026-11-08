# Dawn changes to the OpenMausBot subset

Upstream: https://github.com/milind-soni/OpenMausBot
Commit: `97b4b57e11910676c7c89e70e888a5aab3378e23`
License: Apache-2.0 (`LICENSE` in this directory)
Package version at that commit: 0.1.149

`server/runtime/envelope.ts` imported `server/peer-provenance.ts` and
`server/provenance-label.ts`. Those files import the desktop host
(`shared/wire.ts` and the roster). Dawn points the envelope at `server/notes.ts`
instead. The functions themselves are the upstream text. Nothing else in
`server/runtime` was edited.

`enterprise/` is not part of this subset.
