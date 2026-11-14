# Carrie — restore notes

## Drive

- Folder: https://drive.google.com/drive/folders/1W4tnGH_653YJboRw-yIUf28LRnO2l475
- Use the **a734540** snapshots (current at delete time), not the earlier `carrie.bundle` / `carrie-working-tree.zip` (those stopped at `8835e4f` and lack the noindex PR):
  - `carrie-a734540.bundle` (78,013 bytes, id `1O6s0sP2Zu6SeXZCC4sClAwLi6CSZyl1C`) SHA256 `49d29e7ac8ddba296d66fa7f1bc944c3753bd2af31018746a0d87cc5e69730b7`
  - `carrie-working-tree-a734540.zip` (53,950 bytes, id `1S4duAANJ41mrPPNEub4RdWE1UZEq9K6K`) SHA256 `2383bb0088413a8bd7fa83fb81727fd407d3b5d1b75f95709220da5ddced2cfb`
  - sidecar `carrie-a734540.SHA256` (id `1mZui-ZJLJiGA9AZkEqCsj5jJ8r3heO7i`) — `sha256sum -c` passed on the re-download.

## Git

- Tip: `a734540001ded6fdd4e9c14a8f71822e9c1f7b2b` on `main`.
- History in the bundle: `5715938` initial PageMatch + PawCert; `8835e4f` Literary Tarot / Gutenberg / CliffNotes / PawCert studio; `a734540` noindex.
- This folder is that working tree (no `.git`).

## Omitted

Nothing over 5 MB. `.git` and `node_modules` excluded. Pets and portal source are included for completeness; do not ship them on Dawn.

## Secrets

No env files. The default Amazon tag `carrie-20` is an affiliate tag, not a secret, but treat it as a business identifier and ask before putting buy links on a Dawn desk.
