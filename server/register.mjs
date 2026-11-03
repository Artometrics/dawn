import { register } from 'node:module';

// Lets the gateway and node:test import extensionless TypeScript.
register('./resolver.mjs', import.meta.url);
