import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { NodeKind, Tone } from "./types";

// Isometric props built from primitives: cel-shaded in three tones, each with an ink outline
// (inverted hull), so they read like a hand-inked illustration.

export interface Palette {
  readonly paper: THREE.Color;
  readonly card: THREE.Color;
  readonly line: THREE.Color;
  readonly edge: THREE.Color;
  readonly ink: THREE.Color;
  readonly focus: THREE.Color;
  /** Saturated colour a focused block diffuses onto the floor around it. */
  readonly glow: THREE.Color;
  readonly tones: Readonly<Record<Tone, THREE.Color>>;
  readonly packets: Readonly<Record<"request" | "response" | "handshake", THREE.Color>>;
}

const OUTLINE = 0.035;
/** World height of the floor: tiles are plinths from here up to y = 0, where props stand. */
export const TILE_BOTTOM = -0.75;
/** Height of the tile's top plate surface, outline included: where props stand. */
const PLATE_Y = -0.03;
const PLATE_HEIGHT = 0.08;
export const PLATE_TOP = PLATE_Y + PLATE_HEIGHT / 2 + OUTLINE;
/** Half the width of a tile's plinth, without its outline. Wide enough to print the node's name on. */
export const TILE_HALF_WIDTH = 1.3;
/** Half the width of the top plate: the plinth less a rim. */
const PLATE_HALF = TILE_HALF_WIDTH - 0.12;
/**
 * How far a prop stands back from the plate's centre along -x, leaving the strip along the plate's
 * +x edge free for the node's name.
 */
const PROP_BACK = 0.55;
/** Rotating a prop by this faces its local +z toward the isometric camera. */
const FACE_CAMERA = Math.PI / 4;

/** Three hard light bands (shadow, mid, lit) shared by every cel-shaded material. */
const toonBands = (() => {
  const texture = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
})();

function solid(color: THREE.Color): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonBands });
}

/** A mesh plus a slightly larger back-face shell drawn in ink, so every prop reads as hand-inked. */
function inked(
  geometry: THREE.BufferGeometry,
  size: readonly [number, number, number],
  material: THREE.Material,
  palette: Palette,
): THREE.Group {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  const hull = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: palette.edge, side: THREE.BackSide }));
  hull.scale.set(1 + (2 * OUTLINE) / size[0], 1 + (2 * OUTLINE) / size[1], 1 + (2 * OUTLINE) / size[2]);
  group.add(hull, mesh);
  return group;
}

function box(w: number, h: number, d: number, color: THREE.Color, palette: Palette, radius = 0.06): THREE.Group {
  const r = Math.min(radius, w / 2.1, h / 2.1, d / 2.1);
  return inked(new RoundedBoxGeometry(w, h, d, 2, r), [w, h, d], solid(color), palette);
}

function cylinder(r: number, h: number, color: THREE.Color, palette: Palette, segments = 32): THREE.Group {
  return inked(new THREE.CylinderGeometry(r, r, h, segments), [2 * r, h, 2 * r], solid(color), palette);
}

function capsule(r: number, length: number, color: THREE.Color, palette: Palette): THREE.Group {
  const h = length + 2 * r;
  return inked(new THREE.CapsuleGeometry(r, length, 8, 24), [2 * r, h, 2 * r], solid(color), palette);
}

function sphere(r: number, color: THREE.Color, palette: Palette): THREE.Group {
  return inked(new THREE.SphereGeometry(r, 28, 20), [2 * r, 2 * r, 2 * r], solid(color), palette);
}

function at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T {
  obj.position.set(x, y, z);
  return obj;
}

function laptop(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(1.05, 0.08, 0.72, p.card, p, 0.03), 0, 0.04, 0.1));
  const hinge = at(new THREE.Group(), 0, 0.08, -0.25);
  hinge.rotation.x = -0.32;
  hinge.add(at(box(1.05, 0.7, 0.05, p.card, p, 0.03), 0, 0.35, 0));
  hinge.add(at(box(0.9, 0.55, 0.02, c, p, 0.01), 0, 0.37, 0.03));
  g.add(hinge);
  g.rotation.y = FACE_CAMERA;
  return g;
}

function server(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    g.add(at(box(0.9, 0.3, 0.7, i === 2 ? c : p.card, p), 0, 0.17 + i * 0.34, 0));
    g.add(at(sphere(0.045, p.tones.green, p), 0.3, 0.17 + i * 0.34, 0.37));
  }
  g.rotation.y = FACE_CAMERA;
  return g;
}

function agent(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(0.82, 0.68, 0.72, c, p, 0.16), 0, 0.36, 0));
  g.add(at(box(0.12, 0.16, 0.04, p.ink, p, 0.02), -0.17, 0.42, 0.37));
  g.add(at(box(0.12, 0.16, 0.04, p.ink, p, 0.02), 0.17, 0.42, 0.37));
  g.add(at(cylinder(0.03, 0.22, p.ink, p, 8), 0, 0.82, 0));
  g.add(at(sphere(0.08, p.tones.orange, p), 0, 0.95, 0));
  g.rotation.y = FACE_CAMERA;
  return g;
}

function person(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(capsule(0.27, 0.18, c, p), 0, 0.3, 0));
  g.add(at(sphere(0.22, p.card, p), 0, 0.8, 0));
  for (const x of [-0.08, 0.08]) g.add(at(sphere(0.028, p.ink, p), x, 0.83, 0.2));
  g.rotation.y = FACE_CAMERA;
  return g;
}

function chat(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(1.15, 0.7, 0.22, c, p, 0.14), 0, 0.55, 0));
  g.add(at(box(0.22, 0.22, 0.2, c, p, 0.04), -0.32, 0.18, 0));
  for (const x of [-0.25, 0, 0.25]) g.add(at(sphere(0.06, p.ink, p), x, 0.55, 0.13));
  g.rotation.y = FACE_CAMERA;
  return g;
}

function repo(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(0.9, 0.22, 0.8, p.card, p), 0, 0.11, 0));
  g.add(at(box(0.9, 0.22, 0.8, c, p), 0, 0.35, 0));
  g.add(at(box(0.9, 0.22, 0.8, p.card, p), 0, 0.59, 0));
  g.add(at(sphere(0.07, p.ink, p), -0.2, 0.72, 0.15));
  g.add(at(sphere(0.07, p.tones.green, p), 0.2, 0.72, -0.15));
  return g;
}

function gate(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(0.16, 0.95, 0.16, p.card, p, 0.03), -0.42, 0.48, 0));
  g.add(at(box(0.16, 0.95, 0.16, p.card, p, 0.03), 0.42, 0.48, 0));
  g.add(at(box(1.1, 0.2, 0.22, c, p, 0.04), 0, 1.02, 0));
  g.add(at(box(0.84, 0.08, 0.08, c, p, 0.02), 0, 0.5, 0));
  g.rotation.y = FACE_CAMERA;
  return g;
}

function clock(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  const face = at(cylinder(0.48, 0.14, c, p, 32), 0, 0.6, 0);
  face.rotation.x = Math.PI / 2;
  g.add(face);
  g.add(at(box(0.06, 0.32, 0.04, p.ink, p, 0.01), 0, 0.72, 0.09));
  const minute = at(box(0.26, 0.05, 0.04, p.ink, p, 0.01), 0.11, 0.6, 0.09);
  g.add(minute);
  g.add(at(box(0.5, 0.1, 0.3, p.card, p, 0.03), 0, 0.05, 0));
  g.rotation.y = FACE_CAMERA;
  return g;
}

function board(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(1.2, 0.8, 0.06, p.card, p, 0.03), 0, 0.62, 0));
  const notes: readonly [number, number, THREE.Color][] = [
    [-0.35, 0.78, c],
    [0, 0.78, p.tones.violet],
    [0.35, 0.78, p.tones.green],
    [-0.35, 0.48, p.tones.blue],
    [0.35, 0.48, c],
  ];
  for (const [x, y, col] of notes) g.add(at(box(0.22, 0.2, 0.04, col, p, 0.01), x, y, 0.05));
  g.add(at(box(0.08, 0.24, 0.08, p.card, p, 0.02), 0, 0.12, 0));
  g.rotation.y = FACE_CAMERA;
  return g;
}

function book(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  const colors = [c, p.tones.orange, p.tones.blue];
  colors.forEach((col, i) => {
    const b = at(box(0.85 - i * 0.08, 0.16, 0.62, col, p, 0.03), 0, 0.09 + i * 0.18, 0);
    b.rotation.y = i * 0.18;
    g.add(b);
  });
  return g;
}

function rocket(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cylinder(0.24, 0.8, p.card, p), 0, 0.55, 0));
  g.add(
    at(inked(new THREE.ConeGeometry(0.24, 0.38, 24), [0.48, 0.38, 0.48], solid(c), p), 0, 1.14, 0),
  );
  for (let i = 0; i < 3; i++) {
    const fin = at(box(0.06, 0.3, 0.26, c, p, 0.02), 0, 0.28, 0);
    fin.rotation.y = (i * Math.PI * 2) / 3;
    fin.translateZ(0.26);
    g.add(fin);
  }
  g.add(at(sphere(0.09, p.tones.blue, p), 0, 0.7, 0.21));
  return g;
}

function meeting(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(1.25, 0.85, 0.08, p.card, p, 0.04), 0, 0.66, 0));
  const tiles: readonly THREE.Color[] = [p.tones.blue, c, p.tones.green, p.tones.violet];
  tiles.forEach((col, i) => {
    g.add(at(box(0.5, 0.3, 0.03, col, p, 0.02), i % 2 === 0 ? -0.28 : 0.28, i < 2 ? 0.84 : 0.48, 0.06));
  });
  g.add(at(box(0.1, 0.24, 0.1, p.card, p, 0.02), 0, 0.12, 0));
  g.rotation.y = FACE_CAMERA;
  return g;
}

function warn(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  const prism = at(inked(new THREE.CylinderGeometry(0.62, 0.62, 0.2, 3), [1.24, 0.2, 1.24], solid(c), p), 0, 0.55, 0);
  prism.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  const holder = new THREE.Group();
  holder.add(prism);
  holder.add(at(box(0.1, 0.32, 0.06, p.ink, p, 0.02), 0, 0.55, 0.12));
  holder.add(at(box(0.1, 0.09, 0.06, p.ink, p, 0.02), 0, 0.3, 0.12));
  holder.rotation.y = FACE_CAMERA;
  g.add(holder);
  return g;
}

function wallet(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  const stacks: readonly [number, number, number][] = [
    [-0.25, 0, 4],
    [0.22, -0.15, 3],
    [0.05, 0.28, 2],
  ];
  for (const [x, z, n] of stacks) {
    for (let i = 0; i < n; i++) g.add(at(cylinder(0.2, 0.09, i % 2 === 0 ? c : p.card, p), x, 0.05 + i * 0.1, z));
  }
  return g;
}

function cloud(c: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(sphere(0.32, c, p), -0.25, 0.4, 0));
  g.add(at(sphere(0.4, c, p), 0.1, 0.5, 0));
  g.add(at(sphere(0.28, c, p), 0.42, 0.36, 0));
  return g;
}

const builders: Readonly<Record<NodeKind, (c: THREE.Color, p: Palette) => THREE.Group>> = {
  laptop,
  server,
  agent,
  person,
  chat,
  repo,
  gate,
  clock,
  board,
  book,
  rocket,
  meeting,
  warn,
  wallet,
  cloud,
};

/**
 * A prop seated on its tile: whatever its shape, its lowest point (outline included) rests on the
 * plate's top surface, standing PROP_BACK off the plate's centre toward -x. Raise the returned group's y to
 * lift the prop off the plate.
 */
export function buildProp(kind: NodeKind, tone: Tone, palette: Palette): THREE.Group {
  const prop = builders[kind](palette.tones[tone], palette);
  prop.updateMatrixWorld(true);
  prop.position.y = PLATE_TOP - new THREE.Box3().setFromObject(prop).min.y;
  const seat = new THREE.Group();
  seat.add(prop);
  seat.position.x = -PROP_BACK;
  return seat;
}

/** Darkening of the plinth's sides against its top plate. */
const SLAB_SHADE = 0.86;

export interface Tile {
  readonly group: THREE.Group;
  /** The top plate's material; the stage tints it toward the focus colour. */
  readonly plate: THREE.MeshToonMaterial;
}

/** The tile every prop stands on: a tall plinth (pipes plug into its sides) with a lighter plate on top. */
export function buildTile(palette: Palette): Tile {
  const group = new THREE.Group();
  const width = TILE_HALF_WIDTH * 2;
  const height = -0.06 - TILE_BOTTOM;
  const slab = solid(palette.card.clone().multiplyScalar(SLAB_SHADE));
  const slabMesh = inked(new RoundedBoxGeometry(width, height, width, 3, 0.08), [width, height, width], slab, palette);
  slabMesh.position.y = TILE_BOTTOM + height / 2;
  const plate = solid(palette.card.clone());
  const plateMesh = inked(
    new RoundedBoxGeometry(PLATE_HALF * 2, PLATE_HEIGHT, PLATE_HALF * 2, 3, 0.04),
    [PLATE_HALF * 2, PLATE_HEIGHT, PLATE_HALF * 2],
    plate,
    palette,
  );
  plateMesh.position.y = PLATE_Y;
  group.add(slabMesh, plateMesh);
  group.traverse((o) => {
    o.receiveShadow = true;
  });
  return { group, plate };
}

/** Tints a tile's top plate toward the focus colour, `t` in [0, 1]; the plinth sides stay neutral. */
export function tintTile(tile: Tile, palette: Palette, t: number): void {
  tile.plate.color.copy(palette.card).lerp(palette.focus, t);
}

/**
 * Light around a tile's footprint: a square the tile's size, blurred outward. Drawn once and shared
 * by every glow; the plane it maps onto is GLOW_SPAN wide, the tile TILE_HALF_WIDTH * 2.
 */
const GLOW_SPAN = TILE_HALF_WIDTH * 4;
let glowTexture: THREE.CanvasTexture | null = null;
function glowMap(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const size = 256;
  const tile = (size * TILE_HALF_WIDTH * 2) / GLOW_SPAN;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.filter = `blur(${String(size * 0.07)}px)`;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect((size - tile) / 2, (size - tile) / 2, tile, tile, size * 0.05);
    ctx.fill();
  }
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

/** Coloured light spilling onto the floor around a tile; the stage fades it in for focused nodes. */
export function buildFocusGlow(palette: Palette): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(GLOW_SPAN, GLOW_SPAN),
    new THREE.MeshBasicMaterial({ color: palette.glow, map: glowMap(), transparent: true, opacity: 0, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = TILE_BOTTOM + 0.01;
  glow.visible = false;
  return glow;
}

const WALL_THICKNESS = 0.18;
/** Wall tops stand a little above the tile plates, so a pen reads as walled without hiding the props. */
const WALL_HEIGHT = 0.3 - TILE_BOTTOM;
const POST_WIDTH = 0.34;
const POST_HEIGHT = WALL_HEIGHT + 0.22;
/** World height of a fence's highest point, its post tops. */
export const FENCE_TOP = TILE_BOTTOM + POST_HEIGHT;

/**
 * A walled pen, `halfX` by `halfZ` around its origin, standing on the floor: four low walls with a
 * post at each corner. The origin sits on the floor so scaling y raises the walls out of it.
 */
export function buildFence(halfX: number, halfZ: number, palette: Palette): THREE.Group {
  const g = new THREE.Group();
  const wall = palette.tones.neutral;
  for (const z of [-halfZ, halfZ]) {
    g.add(at(box(halfX * 2, WALL_HEIGHT, WALL_THICKNESS, wall, palette, 0.05), 0, WALL_HEIGHT / 2, z));
  }
  for (const x of [-halfX, halfX]) {
    g.add(at(box(WALL_THICKNESS, WALL_HEIGHT, halfZ * 2, wall, palette, 0.05), x, WALL_HEIGHT / 2, 0));
  }
  for (const x of [-halfX, halfX]) {
    for (const z of [-halfZ, halfZ]) {
      g.add(at(box(POST_WIDTH, POST_HEIGHT, POST_WIDTH, palette.tones.rust, palette, 0.06), x, POST_HEIGHT / 2, z));
    }
  }
  g.traverse((o) => {
    o.receiveShadow = true;
  });
  return g;
}

/**
 * Stepped wall socket where a pipe plugs into a tile's side face. Local +y points outward from the
 * tile wall along the pipe, so the base plate sits flush against the wall and the collar sleeves
 * the pipe's end.
 */
export function buildPipeFlange(radius: number, palette: Palette): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cylinder(radius * 1.48, 0.06, palette.card, palette, 24), 0, 0.03, 0));
  g.add(at(cylinder(radius * 1.22, 0.1, palette.card, palette, 24), 0, 0.08, 0));
  return g;
}

/** Coupling ring clamping the end of an elbow bend; local +y runs along the pipe's tangent. */
export function buildPipeCollar(radius: number, palette: Palette): THREE.Group {
  return cylinder(radius * 1.24, 0.08, palette.card, palette, 24);
}

/**
 * Multi-way pipe fitting (T-joint or cross-joint) at a grid intersection where pipes merge or
 * branch. Each arm in `dirs` (unit vectors in the XZ plane) gets a solid sleeve and a raised collar
 * ring at `arm` distance from the centre, where the glass pipe segments terminate.
 */
export function buildPipeJunction(
  radius: number,
  dirs: readonly THREE.Vector3[],
  arm: number,
  palette: Palette,
): THREE.Group {
  const g = new THREE.Group();
  const up = new THREE.Vector3(0, 1, 0);
  g.add(sphere(radius * 1.2, palette.card, palette));
  const sleeveLen = Math.max(0.08, arm - 0.04);
  for (const d of dirs) {
    const sleeve = cylinder(radius * 1.12, sleeveLen, palette.card, palette, 24);
    sleeve.quaternion.setFromUnitVectors(up, d);
    sleeve.position.copy(d).multiplyScalar(sleeveLen / 2);
    const ring = cylinder(radius * 1.26, 0.08, palette.card, palette, 24);
    ring.quaternion.setFromUnitVectors(up, d);
    ring.position.copy(d).multiplyScalar(arm - 0.03);
    g.add(sleeve, ring);
  }
  return g;
}
