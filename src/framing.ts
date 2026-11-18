import * as THREE from "three";
import { TILE_BOTTOM, TILE_HALF_WIDTH } from "./models";

// Pure camera framing: where an orthographic camera looks and how much it shows, for a set of points.

export interface Frame {
  /** World point the camera looks at: the centre of the points' screen-space bounding box. */
  readonly center: THREE.Vector3;
  /** Visible height in world units; the visible width is this times the aspect ratio. */
  readonly viewHeight: number;
}

export interface FrameOptions {
  /** Multiplier on the tight fit; 1.2 leaves 10% free on each side of the limiting axis. */
  readonly margin: number;
  /** Floor on the view height, so a single small node is not blown up to fill the stage. */
  readonly minHeight: number;
}

/**
 * Frames `points` for a camera whose screen axes are `right` and `up` (unit vectors).
 * Projects every point onto both axes, centres on the box they span and sizes the view
 * so the box fits at the given aspect ratio (width / height).
 */
export function frameFor(
  points: readonly THREE.Vector3[],
  right: THREE.Vector3,
  up: THREE.Vector3,
  aspect: number,
  options: FrameOptions,
): Frame {
  if (points.length === 0) return { center: new THREE.Vector3(), viewHeight: options.minHeight };
  let minR = Infinity;
  let maxR = -Infinity;
  let minU = Infinity;
  let maxU = -Infinity;
  for (const p of points) {
    const r = p.dot(right);
    const u = p.dot(up);
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
  }
  // Keep the depth of the points' average so the centre stays inside the scene along the view axis.
  const average = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(points.length);
  const center = average
    .addScaledVector(right, (minR + maxR) / 2 - average.dot(right))
    .addScaledVector(up, (minU + maxU) / 2 - average.dot(up));
  const tight = Math.max(maxU - minU, (maxR - minR) / Math.max(aspect, 1e-6));
  return { center, viewHeight: Math.max(tight * options.margin, options.minHeight) };
}

/** Half the width of a node's tile, outline included. */
const TILE_HALF = TILE_HALF_WIDTH + 0.05;
/** Height of the top of the tallest prop above its base, focus bob included. */
const PROP_TOP = 1.6;

/** Points that bound one node on screen from any azimuth: all four tile corners and the prop top. */
export function nodeBounds(base: THREE.Vector3): THREE.Vector3[] {
  const corners = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const;
  return [
    ...corners.map(([dx, dz]) => base.clone().add(new THREE.Vector3(dx * TILE_HALF, TILE_BOTTOM, dz * TILE_HALF))),
    base.clone().setY(PROP_TOP),
  ];
}
