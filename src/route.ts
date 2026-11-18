// Pure pipe routing on the floor grid, like plumbing: every leg runs along a grid line and every
// bend is a right angle at a grid intersection. Points are (x, y) on the floor plane; tile centres
// are expected on grid lines (see `snap`).

export type Point = readonly [number, number];

/** Floor grid spacing in world units; pipes and tile centres sit on these lines. */
export const GRID = 0.5;

/** Room an elbow needs beyond a tile's edge, so a bend never sits flush against a tile. */
const ELBOW_ROOM = 0.5;
/** A leg between two bends must hold both elbows, or the bends fold over each other. */
const MIN_INNER_LEG = 2 * ELBOW_ROOM;
/** How far off a face's centre a pipe may plug in, keeping clear of the face's rounded corners. */
const OFF_CENTRE = 0.5;

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

/** Does the polyline pass through any of the squares (centre, half-width) it must avoid? */
function crosses(route: readonly Point[], obstacles: readonly Point[], half: number, radius: number): boolean {
  for (let i = 1; i < route.length; i++) {
    const [x1, y1] = route[i - 1] ?? [0, 0];
    const [x2, y2] = route[i] ?? [0, 0];
    const minX = Math.min(x1, x2) - radius;
    const maxX = Math.max(x1, x2) + radius;
    const minY = Math.min(y1, y2) - radius;
    const maxY = Math.max(y1, y2) + radius;
    for (const [ox, oy] of obstacles) {
      if (maxX > ox - half && minX < ox + half && maxY > oy - half && minY < oy + half) return true;
    }
  }
  return false;
}

/** Are the legs between bends long enough to hold their elbows? */
function bendsFit(route: readonly Point[]): boolean {
  for (let i = 2; i < route.length - 1; i++) {
    const [x1, y1] = route[i - 1] ?? [0, 0];
    const [x2, y2] = route[i] ?? [0, 0];
    if (Math.abs(x2 - x1) + Math.abs(y2 - y1) < MIN_INNER_LEG) return false;
  }
  return true;
}

/**
 * Polyline for a pipe between tile centres `from` and `to`, steering clear of the tiles at
 * `obstacles`. `exit` is the distance from a tile's centre to its side face (where the pipe plugs
 * in) and the half-width of every tile. Candidates in order of preference: straight (off the faces'
 * centres when the tiles are nearly aligned), one bend (row first, then column first), a Z jogging
 * halfway (along each axis); the first whose bends fit and that crosses no other tile wins, else the
 * first candidate whose bends fit.
 */
export function pipeRoute(from: Point, to: Point, exit: number, obstacles: readonly Point[], radius: number): Point[] {
  const [ax, ay] = from;
  const [bx, by] = to;
  const dx = bx - ax;
  const dy = by - ay;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const clear = exit + ELBOW_ROOM;
  const midX = Math.floor((ax + bx) / (2 * GRID)) * GRID;
  const midY = Math.floor((ay + by) / (2 * GRID)) * GRID;

  const candidates: Point[][] = [];
  if (Math.abs(dy) <= OFF_CENTRE && dx !== 0) candidates.push([[ax + sx * exit, midY], [bx - sx * exit, midY]]);
  if (Math.abs(dx) <= OFF_CENTRE && dy !== 0) candidates.push([[midX, ay + sy * exit], [midX, by - sy * exit]]);
  if (dx !== 0 && dy !== 0) {
    if (Math.abs(dx) >= clear && Math.abs(dy) >= clear) {
      candidates.push([[ax + sx * exit, ay], [bx, ay], [bx, by - sy * exit]]);
      candidates.push([[ax, ay + sy * exit], [ax, by], [bx - sx * exit, by]]);
    }
    const zAlongY: Point[] = [[ax, ay + sy * exit], [ax, midY], [bx, midY], [bx, by - sy * exit]];
    const zAlongX: Point[] = [[ax + sx * exit, ay], [midX, ay], [midX, by], [bx - sx * exit, by]];
    candidates.push(...(Math.abs(dy) > Math.abs(dx) ? [zAlongY, zAlongX] : [zAlongX, zAlongY]));
  }
  const fitting = candidates.filter(bendsFit);
  return fitting.find((c) => !crosses(c, obstacles, exit, radius)) ?? fitting[0] ?? candidates[0] ?? [from, to];
}
