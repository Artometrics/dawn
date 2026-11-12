'use client';

import { AtlasApp } from '@/features/atlas/components/atlas-app';

/** The Atlas map, filling the space under the shell's top bar. */
export function AtlasScreen() {
  return (
    <div className="as-fill">
      <AtlasApp framed="shell" />
    </div>
  );
}
