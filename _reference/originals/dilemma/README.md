# Dawn

Dawn is a web-first strategy society simulator built with React, Phaser, TypeScript, and Zustand.

Classic prisoner’s dilemma agents roam a shared world, collide, choose to cooperate or defect, and update the standings live in the browser.

## Stack

- React + Vite + TypeScript
- Phaser 3 for the game world
- Zustand for shared simulation state
- Netlify for deployment

## Local development

```bash
cd web
npm install
npm run dev
```

## Production build

```bash
cd web
npm run build
```

## Deploy

Netlify is configured via the root `netlify.toml` to build from `web/` and publish `web/dist`.
