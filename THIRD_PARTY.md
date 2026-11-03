# Third-party notes for Dawn Agents

Dawn Agents is original code. The projects below were read for architecture only. No source from them is copied into this repo.

## open-webui/open-webui

https://github.com/open-webui/open-webui

License: a custom license (GitHub SPDX `NOASSERTION`), Copyright (c) 2023- Open WebUI Inc. It allows redistribution only with its conditions, including a branding clause that restricts removing the Open WebUI name. Because that license is not a plain permissive grant, Dawn does not copy Open WebUI source, prompts, or interface text.

What we used from the idea, not the code: a chat desk can route one conversation to more than one model provider, and the provider choice stays on the server.

## All-Hands-AI/OpenHands

https://github.com/All-Hands-AI/OpenHands

License: MIT.

What we used from the idea, not the code: the agent runtime is separate from the computer that runs commands. The computer is reached through a narrow action/result interface. Risky actions wait for a person. Dawn's `ComputerProvider` is that seam. The Hetzner worker and the optional Mac worker are two implementations. A cloud VM can be a third later. No OpenHands files are included.

## argilla-io/argilla

https://github.com/argilla-io/argilla

License: Apache-2.0.

What we used from the idea, not the code: a dataset is a list of records with review status, a person can prefer one answer over another, and export is JSONL with the training fields plus provenance. Dawn's Data Studio records, review queue (approve / fix / reject), A/B pairs, and SFT/DPO exports follow that shape. No Argilla files are included.

Records carry `ownerId`, `consent`, `license`, and `provenance` so a later multi-user version does not have to invent those fields. v1 has a single owner.

## Already in this repo

Other notices, including AI Town (MIT) and Stanford Generative Agents, stay in `THIRD_PARTY_NOTICES.md`.

## Kyle's own sites

Style Recipes (https://recipes-510519.web.app) and the studio letter (https://newsletter-510519.web.app) are ported as behavior and, for recipes, as Kyle's palette, type, and layout data. Those sites are left deployed. Their source was not in the public Artometrics GitHub org, so the port follows the live Style Recipes assets and the letter's public behavior (double opt-in, explicit send, Resend-style transport).
