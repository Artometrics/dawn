'use client';

import { useEffect, useState } from 'react';

/** Says where a mistyped or retired address went. Reads the address in the browser; the static 404 file is shared. */
export function NotFoundHint() {
  const [path, setPath] = useState('');
  useEffect(() => setPath(window.location.pathname.replace(/\/+$/, '')), []);
  if (path === '/chats') {
    return (
      <p className="dw-alert" role="status">
        <b>There is no Chats page.</b> Bot threads open from the town map and from the Agents list. They need the desk to be connected before a bot can answer.
      </p>
    );
  }
  return path ? <p className="dw-note">Nothing is published at <code>{path}</code>.</p> : null;
}
