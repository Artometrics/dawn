'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const readPath = () => window.location.pathname.replace(/\/+$/, '');
const readServerPath = () => '';

/** Says where a mistyped or retired address went. Reads the address in the browser; the static 404 file is shared. */
export function NotFoundHint() {
  const path = useSyncExternalStore(subscribe, readPath, readServerPath);
  return path ? <p className="dw-note">Nothing is published at <code>{path}</code>.</p> : null;
}
