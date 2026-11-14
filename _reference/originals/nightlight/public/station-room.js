/** Hollow radio-cabin collision. Sizes come from TUNING.station. */

export const STATION_BODY = 0.26;

export function stationLayout(S) {
  const hx = S.width / 2;
  const hz = S.depth / 2;
  const t = S.wall;
  const H = S.height;
  // Door and window stay on the original local spots (hinge -1.9, window centre 1.6, 1.9).
  const door = {
    x0: -1.9,
    x1: -0.9,
    y1: 2.1,
    hingeX: -1.9,
    hingeZ: 2.54,
    leaf: 1,
    thick: 0.08,
    z0: 0.01,
    z1: 0.09,
  };
  // Smaller than the exterior frame (1.46 x 1.12) so the frame still covers the cut from outside.
  const hole = { x0: 1.06, x1: 2.14, y0: 1.5, y1: 2.3 };
  const deskD = 0.64;
  const desk = {
    x: 1.55,
    z: hz - t - 0.04 - deskD / 2,
    w: 1.42,
    d: deskD,
    top: 0.78,
  };
  const radio = { x: 1.78, z: desk.z - 0.04, y: desk.top + 0.1, w: 0.44, h: 0.2, d: 0.24 };
  const book = { x: 1.1, z: desk.z + 0.02, y: desk.top + 0.028, w: 0.4, h: 0.06, d: 0.26, rot: -0.35 };
  const chair = { x: 1.02, z: desk.z - deskD / 2 - 0.5, w: 0.42, d: 0.42, seat: 0.46, back: 0.48 };
  const stove = { x: -2.32, z: -1.48, w: 0.66, d: 0.52, h: 0.48 };
  const walls = [
    { minX: -hx, maxX: hx, minZ: -hz, maxZ: -hz + t },
    { minX: -hx, maxX: -hx + t, minZ: -hz, maxZ: hz },
    { minX: hx - t, maxX: hx, minZ: -hz, maxZ: hz },
    { minX: -hx, maxX: door.x0, minZ: hz - t, maxZ: hz },
    { minX: door.x1, maxX: hx, minZ: hz - t, maxZ: hz },
  ];
  const furniture = [
    {
      minX: desk.x - desk.w / 2,
      maxX: desk.x + desk.w / 2,
      minZ: desk.z - desk.d / 2,
      maxZ: desk.z + desk.d / 2,
    },
    {
      minX: chair.x - chair.w / 2,
      maxX: chair.x + chair.w / 2,
      minZ: chair.z - chair.d / 2 - 0.04,
      maxZ: chair.z + chair.d / 2,
    },
    {
      minX: stove.x - stove.w / 2,
      maxX: stove.x + stove.w / 2,
      minZ: stove.z - stove.d / 2,
      maxZ: stove.z + stove.d / 2,
    },
  ];
  return { hx, hz, t, H, door, hole, desk, radio, book, chair, stove, walls, furniture, floorTop: 0.06 };
}

export function shellPieces(L, S) {
  const { hx, hz, t, H, door, hole } = L;
  const zc = hz - t / 2;
  const pieces = [];
  const front = (w, h, x, y) => pieces.push({ w, h, d: t, x, y, z: zc });
  front(door.x0 + hx, H, (-hx + door.x0) / 2, H / 2);
  front(door.x1 - door.x0, H - door.y1, (door.x0 + door.x1) / 2, (door.y1 + H) / 2);
  front(hole.x0 - door.x1, H, (door.x1 + hole.x0) / 2, H / 2);
  front(hole.x1 - hole.x0, hole.y0, (hole.x0 + hole.x1) / 2, hole.y0 / 2);
  front(hole.x1 - hole.x0, H - hole.y1, (hole.x0 + hole.x1) / 2, (hole.y1 + H) / 2);
  front(hx - hole.x1, H, (hole.x1 + hx) / 2, H / 2);
  const sideD = S.depth - 2 * t - 0.02;
  pieces.push({ w: t, h: H, d: sideD, x: -hx + t / 2, y: H / 2, z: 0 });
  pieces.push({ w: t, h: H, d: sideD, x: hx - t / 2, y: H / 2, z: 0 });
  pieces.push({ w: S.width, h: H, d: t, x: 0, y: H / 2, z: -hz + t / 2 });
  return pieces;
}

export function floorPiece(L, S) {
  const { hx, hz, t } = L;
  const z0 = -hz + t + 0.02;
  const z1 = hz - 0.03;
  return { w: S.width - 2 * t - 0.04, h: L.floorTop, d: z1 - z0, x: 0, y: L.floorTop / 2, z: (z0 + z1) / 2 };
}

/** Inside the hollow room, not the porch and not inside a wall. */
export function inStationRoom(lx, lz, S) {
  const hx = S.width / 2;
  const hz = S.depth / 2;
  const t = S.wall;
  return Math.abs(lx) < hx - t - 0.02 && lz > -hz + t + 0.02 && lz < hz - t - 0.02;
}

/** Interior plus the front porch, so the path corridor can reach the door. */
export function inStationWalk(lx, lz, S) {
  const hx = S.width / 2;
  const hz = S.depth / 2;
  const interior = Math.abs(lx) <= hx - 0.02 && lz >= -hz + 0.02 && lz <= hz - 0.02;
  const porch = Math.abs(lx) <= 4.2 && lz >= 1.7 && lz <= 5.1;
  return interior || porch;
}

function hits(lx, lz, r, b) {
  const cx = Math.min(b.maxX, Math.max(b.minX, lx));
  const cz = Math.min(b.maxZ, Math.max(b.minZ, lz));
  const dx = lx - cx;
  const dz = lz - cz;
  return dx * dx + dz * dz < r * r;
}

export function doorBlocks(lx, lz, radius, angle, door) {
  const dx = lx - door.hingeX;
  const dz = lz - door.hingeZ;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dlx = dx * c - dz * s;
  const dlz = dx * s + dz * c;
  return hits(dlx, dlz, radius, { minX: 0, maxX: door.leaf, minZ: door.z0, maxZ: door.z1 });
}

export function stationBlocked(lx, lz, doorAngle, layout, radius = STATION_BODY) {
  for (const b of layout.walls) if (hits(lx, lz, radius, b)) return true;
  for (const b of layout.furniture) if (hits(lx, lz, radius, b)) return true;
  if (doorBlocks(lx, lz, radius, doorAngle, layout.door)) return true;
  return false;
}
