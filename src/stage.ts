import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { frameFor, nodeBounds } from "./framing";
import { pairSlots, type Slot } from "./reuse";
import { pipeRoute, snap, type Point } from "./route";
import {
  buildFence,
  buildFocusGlow,
  buildPipeCollar,
  buildPipeFlange,
  buildPipeJunction,
  buildProp,
  buildTile,
  FENCE_TOP,
  PLATE_TOP,
  tintTile,
  TILE_BOTTOM,
  TILE_HALF_WIDTH,
  type Palette,
  type Tile,
} from "./models";
import type { Flow, FlowKind, Lesson, NodeSpec, Step, Tone } from "./types";

// The isometric 3D stage: one lesson's nodes on a grid, dropping in and out per step, with
// packets travelling along the step's flows. The camera glides to frame the nodes each step shows.

// Room between tiles for the pipes: a tile's diamond is ~3.7 screen units wide.
const SPACING_X = 1.75;
const SPACING_Y = 1.8;
const AZIMUTH = Math.PI / 4;
const ELEVATION = THREE.MathUtils.degToRad(33);
/** Seconds for the camera to cover ~63% of the way to a new step's framing. */
const CAMERA_LAG = 0.35;
/** Seconds for a flow's pipe to draw from source to target. */
const DRAW_SECONDS = 0.6;
/** Seconds before a step's first flow starts, so the nodes have landed. */
const SCRIPT_LEAD = 0.35;
/** Seconds an intent bubble is read before its pipe starts drawing. */
const INTENT_SECONDS = 1.5;
/** Seconds a reaction bubble is read before the next flow starts. */
const REACTION_SECONDS = 1.4;
/** World units per second the cargo pill travels; a trip takes between the two bounds below. */
const CARGO_SPEED = 3;
const TRIP_MIN = 1;
const TRIP_MAX = 2.4;
/** Gap between a prop's top and its bubble's tail tip. */
const BUBBLE_GAP = 0.08;
/** Height above the base that a bubble reaches, for framing. */
const BUBBLE_TOP = 3.6;
/** Pipes run at half the plinth's height, plugging into the middle of its side faces. */
const PIPE_Y = TILE_BOTTOM / 2;
const PIPE_RADIUS = 0.17;
const ELBOW_RADIUS = 0.45;
/** How far a T-joint arm extends from the grid intersection, and where the glass tube stops inside its collar. */
const JUNCTION_ARM = 0.31;
const JUNCTION_TRIM = 0.28;
const JUNCTION_TURN_RADIUS = 0.2;
/**
 * Where two pipes cross without joining, the one drawn later bridges over the other: elbows up,
 * across, and down, `BRIDGE_RISE` above the pipe and `BRIDGE_HALF_SPAN` either side of the crossing.
 */
const BRIDGE_RISE = 0.55;
const BRIDGE_HALF_SPAN = 0.5;
/** The bridge's elbows are tighter than the floor's, so each upright leg shows between its collars. */
const BRIDGE_ELBOW_RADIUS = 0.18;
/** How far from a tile's side face the glass tube starts, tucked inside the flange socket. */
const FLANGE_TRIM = 0.08;
const FRAME_OPTIONS = { margin: 1.22, minHeight: 7 } as const;
/** CSS pixels per world unit for a node's name printed on its plate (styled by `.plate-name`). */
const NAME_PX_PER_UNIT = 100;
/** Where the name sits: the strip along the plate's +x edge, in front of the prop. */
const NAME_X = 0.8;
/** Seconds for a node to cover ~63% of the way to where a new step places it. */
const MOVE_LAG = 0.22;
/** Fences run along the screen's axes on the floor: `FENCE_U` to the right, `FENCE_V` toward the camera. */
const FENCE_U = new THREE.Vector3(Math.cos(AZIMUTH), 0, -Math.sin(AZIMUTH));
const FENCE_V = new THREE.Vector3(Math.sin(AZIMUTH), 0, Math.cos(AZIMUTH));
/** How far a tile's diamond reaches along either fence axis. */
const TILE_REACH = TILE_HALF_WIDTH * Math.SQRT2;
/** Free floor between a fenced tile's corner and the wall. */
const FENCE_PAD = 0.7;
/** Seconds after a step starts before its fences rise, so the nodes have mostly arrived. */
const FENCE_DELAY = 0.45;
/** Seconds for a reused block to swap its prop and name: the old one shrinks, then the new one grows. */
const MORPH_SECONDS = 0.7;

interface NodeView {
  /** What the block shows now; a block reused by the next lesson takes that lesson's spec. */
  spec: NodeSpec;
  readonly root: THREE.Group;
  prop: THREE.Group;
  /** The prop being swapped out during a morph, shrinking into the plate. */
  outgoing: THREE.Group | null;
  /** Progress of the prop and name swap, 0 to 1; 1 when the block is settled. */
  morph: number;
  /** Whether `prop` is new and still has to grow in during the morph. */
  growing: boolean;
  readonly tile: Tile;
  readonly glow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** The node's name, printed flat on the front of the tile's top plate. */
  readonly name: HTMLElement;
  /** Where the node stands on the current step; its root glides here. */
  readonly base: THREE.Vector3;
  readonly phase: number;
  scale: number;
  velocity: number;
  target: number;
  delay: number;
  focus: boolean;
  lift: number;
}

interface FenceLayout {
  readonly center: THREE.Vector3;
  readonly halfU: number;
  readonly halfV: number;
}

interface FenceView {
  readonly root: THREE.Group;
  readonly layout: FenceLayout;
  /** 0 = sunk into the floor, 1 = standing. */
  rise: number;
  target: number;
  delay: number;
}

/** The pen that walls in `bases` (tile centres), measured along the fence axes. */
function fenceLayout(bases: readonly THREE.Vector3[]): FenceLayout {
  const us = bases.map((b) => b.dot(FENCE_U));
  const vs = bases.map((b) => b.dot(FENCE_V));
  const reach = TILE_REACH + FENCE_PAD;
  const [minU, maxU, minV, maxV] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const center = new THREE.Vector3()
    .addScaledVector(FENCE_U, (minU + maxU) / 2)
    .addScaledVector(FENCE_V, (minV + maxV) / 2);
  return { center, halfU: (maxU - minU) / 2 + reach, halfV: (maxV - minV) / 2 + reach };
}

/** The pen's corners at the floor and at the post tops, for framing. */
function fenceCorners({ center, halfU, halfV }: FenceLayout): THREE.Vector3[] {
  const corners = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ].map(([su = 0, sv = 0]) => center.clone().addScaledVector(FENCE_U, su * halfU).addScaledVector(FENCE_V, sv * halfV));
  return corners.flatMap((c) => [c.clone().setY(TILE_BOTTOM), c.clone().setY(FENCE_TOP)]);
}

/**
 * Every pipe piece carries a key made from its geometry and colour. A step whose pipes share pieces
 * with the step before takes those pieces over as they stand, fully drawn, and draws only the new ones.
 */
interface PipeRunView {
  readonly key: string;
  readonly shells: readonly THREE.Mesh<THREE.TubeGeometry>[];
  /** Collar rings clamping the run's elbows. */
  readonly collars: readonly THREE.Object3D[];
  readonly uStart: number;
  readonly uEnd: number;
  /** Taken over from the previous step: shown whole, not drawn again. */
  readonly settled: boolean;
}

interface PipeFittingView {
  readonly key: string;
  readonly root: THREE.Object3D;
  readonly uAt: number;
  readonly settled: boolean;
}

/** The pieces of the outgoing step's pipes, by key, for the next step to take over. */
interface PipePool {
  readonly runs: Map<string, PipeRunView>;
  readonly fittings: Map<string, PipeFittingView>;
  readonly flows: Map<string, FlowView>;
}

interface FlowView {
  /** The flow's kind and route; a flow with the same key on the next step keeps its packets and cargo. */
  readonly key: string;
  /** Stage time the pipe starts drawing; a flow taken over keeps its own, so it stays drawn. */
  readonly born: number;
  /** Seconds for the cargo pill to ride the pipe end to end once the pipe is drawn. */
  readonly trip: number;
  /** Seconds into the step's script when this flow's pipe starts; null for a flow kept from the step before. */
  readonly cue: number | null;
  readonly kind: FlowKind;
  readonly path: THREE.CurvePath<THREE.Vector3>;
  /** The pipe's layers (ink outline, inner wall, glass); each sub-run draws in between fittings. */
  readonly runs: readonly PipeRunView[];
  /** Flanges at tile walls and T-joints where pipes merge or branch. */
  readonly fittings: readonly PipeFittingView[];
  readonly packets: readonly THREE.Mesh[];
  readonly offset: number;
  /** A pill naming what the pipe carries, riding along it; a DOM element drawn by the label renderer. */
  readonly cargo: CSS2DObject;
}

type BubbleKind = "intent" | "reaction";

/** One line of a step's script: `node` says `text`, `at` seconds after the script starts. */
interface Beat {
  readonly node: string;
  readonly text: string;
  readonly at: number;
  readonly kind: BubbleKind;
}

/** A speech bubble on a node's prop, shown from `at` until `until` seconds into the step's script. */
interface BubbleView {
  readonly object: CSS2DObject;
  readonly node: string;
  readonly at: number;
  readonly until: number;
}

/** Height of a prop's top above its seat, measured on a fresh copy so a prop mid-morph measures whole. */
function propTop(spec: NodeSpec, palette: Palette): number {
  const probe = buildProp(spec.kind, spec.tone ?? "neutral", palette);
  const top = new THREE.Box3().setFromObject(probe).max.y;
  disposeTree(probe);
  return top;
}

/** A flow as `buildFlow` leaves it; a fresh one is new on this step and still has to be timed. */
interface BuiltFlow {
  readonly view: FlowView;
  readonly fresh: boolean;
}

export function paletteFromCss(el: HTMLElement): Palette {
  const css = getComputedStyle(el);
  const color = (name: string): THREE.Color => new THREE.Color(css.getPropertyValue(name).trim() || "#ff00ff");
  const tones: Record<Tone, THREE.Color> = {
    neutral: color("--prop-neutral"),
    green: color("--prop-green"),
    violet: color("--prop-violet"),
    orange: color("--prop-orange"),
    rust: color("--prop-rust"),
    blue: color("--prop-blue"),
  };
  return {
    paper: color("--paper"),
    card: color("--prop-card"),
    line: color("--grid"),
    edge: color("--edge"),
    ink: color("--ink"),
    focus: color("--prop-focus"),
    glow: color("--green-3"),
    tones,
    packets: { request: color("--rust"), response: color("--green-3"), handshake: color("--violet-ink") },
  };
}

/** A screen-grid position to the floor seen from 45°, snapped onto the floor grid's lines. */
function toWorld([sx, sy]: readonly [number, number]): THREE.Vector3 {
  const x = sx * SPACING_X;
  const y = sy * SPACING_Y;
  return new THREE.Vector3(snap((x + y) / Math.SQRT2), 0, snap((y - x) / Math.SQRT2));
}

interface ElbowJoint {
  readonly enter: THREE.Vector3;
  readonly enterDir: THREE.Vector3;
  readonly leave: THREE.Vector3;
  readonly leaveDir: THREE.Vector3;
}

function pointKey(x: number, z: number): string {
  return `${x.toFixed(2)},${z.toFixed(2)}`;
}

/** Floor axis a grid-aligned pipe runs along. */
type Axis = "x" | "z";

function axisOf(dx: number): Axis {
  return Math.abs(dx) > 1e-6 ? "x" : "z";
}

/** Crossings by vertex key, each with the axis of the pipe that arches over the other. */
type Bridges = ReadonlyMap<string, Axis>;

/** The polyline with a bridge (up, across, down) at every crossing in `bridges` this pipe runs over. */
function withBridges(points: readonly THREE.Vector3[], bridges: Bridges): THREE.Vector3[] {
  return points.flatMap((corner, i) => {
    const before = points[i - 1];
    const after = points[i + 1];
    if (!before || !after) return [corner];
    const dir = corner.clone().sub(before).normalize();
    const straight = dir.dot(after.clone().sub(corner).normalize()) > 0.99;
    if (!straight || bridges.get(pointKey(corner.x, corner.z)) !== axisOf(dir.x)) return [corner];
    const half = Math.min(BRIDGE_HALF_SPAN, corner.distanceTo(before) * 0.5, corner.distanceTo(after) * 0.5);
    const foot = corner.clone().addScaledVector(dir, -half);
    const land = corner.clone().addScaledVector(dir, half);
    return [foot, foot.clone().setY(foot.y + BRIDGE_RISE), land.clone().setY(land.y + BRIDGE_RISE), land];
  });
}

/**
 * A polyline of world points as straight runs joined by rounded elbows, plus the collar poses at
 * each bend. At a crossing in `bridges` the pipe along the bridging axis bridges over the other.
 */
function pipePath(
  polyline: readonly THREE.Vector3[],
  junctionKeys: ReadonlySet<string>,
  bridges: Bridges,
): { path: THREE.CurvePath<THREE.Vector3>; elbows: ElbowJoint[] } {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const elbows: ElbowJoint[] = [];
  const points = withBridges(polyline, bridges);
  let from = points[0];
  if (!from) return { path, elbows };
  for (let i = 1; i < points.length; i++) {
    const corner = points[i];
    const after = points[i + 1];
    if (!corner) break;
    if (!after) {
      if (from.distanceTo(corner) > 1e-4) path.add(new THREE.LineCurve3(from, corner));
      break;
    }
    const inDir = corner.clone().sub(from).normalize();
    const outDir = after.clone().sub(corner).normalize();
    if (inDir.dot(outDir) > 0.99) {
      continue;
    }
    const isJunction = junctionKeys.has(pointKey(corner.x, corner.z));
    const upright = Math.abs(inDir.y) > 0.5 || Math.abs(outDir.y) > 0.5;
    const maxR = isJunction ? JUNCTION_TURN_RADIUS : upright ? BRIDGE_ELBOW_RADIUS : ELBOW_RADIUS;
    const r = Math.min(maxR, corner.distanceTo(from) * 0.48, corner.distanceTo(after) * 0.48);
    const enter = corner.clone().addScaledVector(inDir, -r);
    const leave = corner.clone().addScaledVector(outDir, r);
    if (from.distanceTo(enter) > 1e-4) path.add(new THREE.LineCurve3(from, enter));
    path.add(new THREE.QuadraticBezierCurve3(enter, corner, leave));
    if (!isJunction) {
      elbows.push({ enter, enterDir: inDir, leave, leaveDir: outDir });
    }
    from = leave;
  }
  return { path, elbows };
}

function easeOutCubic(t: number): number {
  return 1 - (1 - Math.min(Math.max(t, 0), 1)) ** 3;
}

/** Ease out with a small overshoot, for a prop popping into place. */
function easeOutBack(t: number): number {
  const u = Math.min(Math.max(t, 0), 1) - 1;
  const k = 1.7;
  return 1 + (k + 1) * u ** 3 + k * u ** 2;
}

function nodeKey(spec: NodeSpec): string {
  return `${spec.kind}/${spec.tone ?? "neutral"}`;
}

/** Screen axes of the camera at its resting angle, for framing. */
function restAxes(): { right: THREE.Vector3; up: THREE.Vector3 } {
  const probe = new THREE.OrthographicCamera();
  probe.position.set(
    Math.cos(ELEVATION) * Math.sin(AZIMUTH),
    Math.sin(ELEVATION),
    Math.cos(ELEVATION) * Math.cos(AZIMUTH),
  );
  probe.lookAt(0, 0, 0);
  probe.updateMatrixWorld();
  return {
    right: new THREE.Vector3().setFromMatrixColumn(probe.matrixWorld, 0),
    up: new THREE.Vector3().setFromMatrixColumn(probe.matrixWorld, 1),
  };
}

function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    const materials: unknown[] = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of materials) if (m instanceof THREE.Material) m.dispose();
  });
}

export class Stage {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labels = new CSS2DRenderer();
  private readonly names = new CSS3DRenderer();
  private readonly scene = new THREE.Scene();
  private readonly world = new THREE.Group();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private readonly axes = restAxes();
  /** Where the camera looks now, and where it is gliding to. */
  private readonly target = new THREE.Vector3();
  private readonly goalTarget = new THREE.Vector3();
  private readonly clock = new THREE.Clock();
  private readonly nodes = new Map<string, NodeView>();
  /** Blocks the current lesson no longer uses, shrinking away before they are disposed. */
  private leaving: NodeView[] = [];
  private flows: FlowView[] = [];
  private bubbles: BubbleView[] = [];
  /**
   * Seconds into the step's script. It runs up to just before the next bubble and holds there until
   * `advance`; after the last bubble it plays out and stays.
   */
  private scriptClock = 0;
  private scriptLimit = Infinity;
  /** When each of the step's bubbles comes up, and which one is showing. */
  private beatTimes: number[] = [];
  private beat = 0;
  private fences: FenceView[] = [];
  private floor: THREE.Object3D[] = [];
  private palette: Palette;
  private lesson: Lesson | null = null;
  private step: Step | null = null;
  private viewHeight = 10;
  private goalHeight = 10;
  /** Stage time: seconds the stage has run unpaused; flows and bubbles play against it. */
  private time = 0;
  private paused = false;
  /** Screen pixels on the stage's left kept free of nodes, for the caption card over it. */
  private insetLeft = 0;

  constructor(private readonly host: HTMLElement) {
    this.palette = paletteFromCss(host);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.names.domElement.className = "stage-labels";
    this.labels.domElement.className = "stage-labels";
    // Bubbles sit above every cargo pill through CSS, so the renderer must not set z-index by depth.
    this.labels.sortObjects = false;
    host.append(this.renderer.domElement, this.names.domElement, this.labels.domElement);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb9ab98, 2.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-6, 14, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.radius = 4;
    this.scene.add(sun, this.world);
    this.buildFloor();

    new ResizeObserver(() => {
      this.resize();
    }).observe(host);
    this.resize();
    this.renderer.setAnimationLoop(() => {
      this.frame();
    });
  }

  /** Rebuilds the current lesson in new colors, keeping the step and skipping the intro. */
  setPalette(palette: Palette, step: Step | undefined): void {
    this.palette = palette;
    this.buildFloor();
    if (this.lesson && step) {
      this.load(this.lesson, step, false);
    }
  }

  /**
   * Shows a lesson. With `intro` and blocks already on stage, the blocks are reused: each glides to
   * its place in the new lesson and morphs into its new prop; only the surplus leaves or enters.
   */
  load(lesson: Lesson, step: Step, intro = true): void {
    this.lesson = lesson;
    if (intro && this.nodes.size > 0) {
      this.reuseNodes(lesson, step);
      this.apply(step, true);
      return;
    }
    this.clearNodes();
    for (const spec of lesson.nodes) this.nodes.set(spec.id, this.buildNode(spec));
    this.apply(step, intro);
    this.frameStep(true);
  }

  apply(step: Step, stagger = true): void {
    const shown = new Set(step.show);
    const focus = new Set(step.focus ?? []);
    let order = 0;
    for (const view of this.nodes.values()) {
      const visible = shown.has(view.spec.id);
      view.base.copy(toWorld(step.moves?.[view.spec.id] ?? view.spec.at));
      // A node already standing glides to its new place; one appearing lands straight on it.
      if (!stagger || view.scale < 0.01) view.root.position.setX(view.base.x).setZ(view.base.z);
      if (visible && view.target === 0) {
        view.delay = stagger ? 0.12 + order * 0.07 : 0;
        order += 1;
      }
      if (!stagger && visible) view.scale = 1;
      view.target = visible ? 1 : 0;
      view.focus = focus.has(view.spec.id);
    }
    this.setFlows(step.flows ?? [], stagger);
    this.setFences(step.fences ?? [], stagger);
    this.step = step;
    this.frameStep(!stagger);
  }

  replay(step: Step): void {
    this.setFlows([], true);
    for (const view of this.nodes.values()) {
      view.scale = 0;
      view.velocity = 0;
      view.target = 0;
    }
    this.apply(step, true);
  }

  /** Brings up the step's next bubble; false when the last one is already up, so the caller moves on. */
  advance(): boolean {
    const at = this.beatTimes[this.beat + 1];
    if (at === undefined) return false;
    this.beat += 1;
    this.scriptClock = Math.max(this.scriptClock, at);
    this.scriptLimit = this.holdBefore(this.beat + 1);
    return true;
  }

  /** Goes back to the step's previous bubble; false on the first one, so the caller steps back. */
  back(): boolean {
    const at = this.beatTimes[this.beat - 1];
    if (at === undefined) return false;
    this.beat -= 1;
    this.scriptClock = at;
    this.scriptLimit = this.holdBefore(this.beat + 1);
    return true;
  }

  /** The bubble showing (1-based, 0 when the step has none) and how many the step has. */
  beats(): { readonly shown: number; readonly total: number } {
    const total = this.beatTimes.length;
    return { shown: total === 0 ? 0 : this.beat + 1, total };
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /** Keeps `px` screen pixels on the stage's left free of nodes; the camera reframes to the rest. */
  setInsetLeft(px: number): void {
    if (Math.abs(px - this.insetLeft) < 1) return;
    this.insetLeft = px;
    this.frameStep(false);
  }

  private buildFloor(): void {
    for (const o of this.floor) this.scene.remove(o);
    const grid = new THREE.GridHelper(80, 160, this.palette.line, this.palette.line);
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    for (const m of gridMaterials) {
      m.transparent = true;
      m.opacity = 0.55;
    }
    grid.position.y = TILE_BOTTOM - 0.01;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.13 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = TILE_BOTTOM;
    shadow.receiveShadow = true;
    this.floor = [grid, shadow];
    this.scene.add(grid, shadow);
  }

  private buildNode(spec: NodeSpec): NodeView {
    const root = new THREE.Group();
    const base = toWorld(spec.at);
    root.position.copy(base);
    const tile = buildTile(this.palette);
    const prop = this.buildSeatedProp(spec);
    const name = document.createElement("div");
    name.className = "plate-name";
    name.textContent = spec.label;
    const print = new CSS3DObject(name);
    // Lie flat on the plate and run along its +x edge (toward -z), so on screen the name slants up
    // to the right with the tile, like lettering painted on it.
    print.rotation.set(-Math.PI / 2, Math.PI / 2, 0, "YXZ");
    print.scale.setScalar(1 / NAME_PX_PER_UNIT);
    print.position.set(NAME_X, PLATE_TOP + 0.01, 0);
    const glow = buildFocusGlow(this.palette);
    root.add(glow, tile.group, prop, print);
    root.scale.setScalar(0);
    root.visible = false;
    this.world.add(root);
    return {
      spec,
      root,
      prop,
      outgoing: null,
      morph: 1,
      growing: false,
      tile,
      glow,
      name,
      base,
      phase: Math.random() * Math.PI * 2,
      scale: 0,
      velocity: 0,
      target: 0,
      delay: 0,
      focus: false,
      lift: 0,
    };
  }

  private buildSeatedProp(spec: NodeSpec): THREE.Group {
    return buildProp(spec.kind, spec.tone ?? "neutral", this.palette);
  }

  /**
   * Hands the blocks standing on stage to the new lesson's nodes shown on `step`, pairing each with
   * the nearest node of the same id, then the same kind, then any kind. Unpaired blocks leave;
   * nodes left without a block get a new one.
   */
  private reuseNodes(lesson: Lesson, step: Step): void {
    const shown = new Set(step.show);
    const standing = [...this.nodes.values()].filter((v) => v.target === 1);
    const entering = lesson.nodes.filter((spec) => shown.has(spec.id));
    const slotOf = (spec: NodeSpec, at: THREE.Vector3): Slot => ({ id: spec.id, kind: spec.kind, x: at.x, z: at.z });
    const pairs = pairSlots(
      standing.map((v) => slotOf(v.spec, v.base)),
      entering.map((spec) => slotOf(spec, toWorld(step.moves?.[spec.id] ?? spec.at))),
    );
    const reused = new Map<string, NodeView>();
    for (const [from, to] of pairs) {
      const view = standing[from];
      const spec = entering[to];
      if (!view || !spec) continue;
      this.respec(view, spec);
      reused.set(spec.id, view);
    }
    const kept = new Set(reused.values());
    for (const view of this.nodes.values()) if (!kept.has(view)) this.retire(view);
    this.nodes.clear();
    for (const spec of lesson.nodes) this.nodes.set(spec.id, reused.get(spec.id) ?? this.buildNode(spec));
  }

  /** Points a block at a new spec, starting a morph when its prop or name changes. */
  private respec(view: NodeView, spec: NodeSpec): void {
    const swapProp = nodeKey(view.spec) !== nodeKey(spec);
    const rename = view.spec.label !== spec.label;
    view.spec = spec;
    if (swapProp) {
      if (view.outgoing) this.dropProp(view, view.outgoing);
      view.outgoing = view.growing ? null : view.prop;
      if (view.growing) this.dropProp(view, view.prop);
      view.prop = this.buildSeatedProp(spec);
      view.prop.scale.setScalar(0.001);
      view.root.add(view.prop);
      view.growing = true;
    }
    if (swapProp || rename) view.morph = 0;
  }

  private dropProp(view: NodeView, prop: THREE.Group): void {
    view.root.remove(prop);
    disposeTree(prop);
  }

  /** Takes a block off stage: at once if it is not showing, otherwise once it has shrunk away. */
  private retire(view: NodeView): void {
    if (view.scale < 0.01) {
      this.disposeNode(view);
      return;
    }
    view.target = 0;
    view.delay = 0;
    view.focus = false;
    this.leaving.push(view);
  }

  private disposeNode(view: NodeView): void {
    view.name.remove();
    this.world.remove(view.root);
    disposeTree(view.root);
  }

  private clearNodes(): void {
    for (const view of [...this.nodes.values(), ...this.leaving]) this.disposeNode(view);
    this.nodes.clear();
    this.leaving = [];
    this.setFlows([], false);
    for (const fence of this.fences) this.removeFence(fence);
    this.fences = [];
  }

  /** Sinks the current fences and raises one pen around each group of node ids. */
  private setFences(groups: readonly (readonly string[])[], stagger: boolean): void {
    for (const fence of this.fences) fence.target = 0;
    for (const ids of groups) {
      const bases = ids.flatMap((id) => {
        const view = this.nodes.get(id);
        return view ? [view.base] : [];
      });
      if (bases.length === 0) continue;
      const layout = fenceLayout(bases);
      const root = buildFence(layout.halfU, layout.halfV, this.palette);
      root.position.copy(layout.center).setY(TILE_BOTTOM);
      root.rotation.y = AZIMUTH;
      const rise = stagger ? 0 : 1;
      root.scale.y = Math.max(rise, 0.001);
      root.visible = rise > 0;
      this.world.add(root);
      this.fences.push({ root, layout, rise, target: 1, delay: stagger ? FENCE_DELAY : 0 });
    }
  }

  private removeFence(fence: FenceView): void {
    this.world.remove(fence.root);
    disposeTree(fence.root);
  }

  /**
   * Builds the step's pipes and plays its new flows one after another: the sender's intent bubble,
   * the pipe drawing, the cargo's trip, the receiver's reaction bubble. It plays once and then stands
   * still, so a still stage means the step is over. With `play` false it has already played: every
   * pipe stands drawn and the last bubble is up.
   */
  private setFlows(flows: readonly Flow[], play: boolean): void {
    const pool: PipePool = { runs: new Map(), fittings: new Map(), flows: new Map() };
    for (const f of this.flows) {
      pool.flows.set(f.key, f);
      for (const r of f.runs) pool.runs.set(r.key, r);
      for (const fit of f.fittings) pool.fittings.set(fit.key, fit);
    }

    // Route every flow on the floor grid first so we can find shared segments and T-junctions.
    // A pair of nodes is always routed in the same order, so flows both ways between them run
    // through one pipe: the way back is the same route reversed.
    const routed = flows.flatMap((flow, index) => {
      const from = this.nodes.get(flow.from);
      const to = this.nodes.get(flow.to);
      if (!from || !to) return [];
      const obstacles = [...this.nodes.values()]
        .filter((v) => v !== from && v !== to)
        .map((v) => [v.base.x, v.base.z] as const);
      const back = flow.from > flow.to;
      const [a, b] = back ? [to, from] : [from, to];
      const pts = pipeRoute([a.base.x, a.base.z], [b.base.x, b.base.z], TILE_HALF_WIDTH, obstacles, PIPE_RADIUS + 0.05);
      return [{ flow, pts: back ? pts.reverse() : pts, index }];
    });

    // Split any segment where another route's vertex or perpendicular segment lands on it.
    const splitPts: Point[] = [];
    for (const r of routed) for (const p of r.pts) splitPts.push(p);
    for (let i = 0; i < routed.length; i++) {
      for (let j = i + 1; j < routed.length; j++) {
        const aPts = routed[i]?.pts ?? [];
        const bPts = routed[j]?.pts ?? [];
        for (let a = 1; a < aPts.length; a++) {
          const [x1, z1] = aPts[a - 1] ?? [0, 0];
          const [x2, z2] = aPts[a] ?? [0, 0];
          for (let b = 1; b < bPts.length; b++) {
            const [x3, z3] = bPts[b - 1] ?? [0, 0];
            const [x4, z4] = bPts[b] ?? [0, 0];
            if (x1 === x2 && z3 === z4) {
              if (x1 >= Math.min(x3, x4) && x1 <= Math.max(x3, x4) && z3 >= Math.min(z1, z2) && z3 <= Math.max(z1, z2)) {
                splitPts.push([x1, z3]);
              }
            } else if (z1 === z2 && x3 === x4) {
              if (x3 >= Math.min(x1, x2) && x3 <= Math.max(x1, x2) && z1 >= Math.min(z3, z4) && z1 <= Math.max(z3, z4)) {
                splitPts.push([x3, z1]);
              }
            }
          }
        }
      }
    }

    const subdivided = routed.map((item) => {
      const first = item.pts[0];
      if (!first) return item;
      const out: Point[] = [first];
      for (let i = 1; i < item.pts.length; i++) {
        const [x1, z1] = item.pts[i - 1] ?? [0, 0];
        const [x2, z2] = item.pts[i] ?? [0, 0];
        const mids = splitPts.filter(([px, pz]) => {
          if (x1 === x2 && Math.abs(px - x1) < 1e-5) {
            return pz > Math.min(z1, z2) + 1e-5 && pz < Math.max(z1, z2) - 1e-5;
          }
          if (z1 === z2 && Math.abs(pz - z1) < 1e-5) {
            return px > Math.min(x1, x2) + 1e-5 && px < Math.max(x1, x2) - 1e-5;
          }
          return false;
        });
        mids.sort((p, q) => Math.hypot(p[0] - x1, p[1] - z1) - Math.hypot(q[0] - x1, q[1] - z1));
        for (const m of mids) {
          const prev = out[out.length - 1] ?? [0, 0];
          if (Math.hypot(m[0] - prev[0], m[1] - prev[1]) > 1e-5) out.push(m);
        }
        const end = item.pts[i];
        if (end) out.push(end);
      }
      return { ...item, pts: out };
    });

    // Count distinct incident directions at every grid vertex; >= 3 directions means a T- or cross-joint.
    const vertexDirs = new Map<string, Map<string, THREE.Vector3>>();
    const vertexCoords = new Map<string, Point>();
    const addIncident = (from: Point, to: Point): void => {
      const k = pointKey(from[0], from[1]);
      vertexCoords.set(k, from);
      let map = vertexDirs.get(k);
      if (!map) {
        map = new Map();
        vertexDirs.set(k, map);
      }
      const dx = Math.sign(to[0] - from[0]);
      const dz = Math.sign(to[1] - from[1]);
      if (dx !== 0 || dz !== 0) {
        map.set(`${String(dx)},${String(dz)}`, new THREE.Vector3(dx, 0, dz).normalize());
      }
    };
    for (const r of subdivided) {
      for (let i = 1; i < r.pts.length; i++) {
        const p0 = r.pts[i - 1];
        const p1 = r.pts[i];
        if (p0 && p1) {
          addIncident(p0, p1);
          addIncident(p1, p0);
        }
      }
    }
    // A four-way vertex that every route passes straight through is two pipes crossing, not a joint.
    const turnKeys = new Set<string>();
    for (const r of subdivided) {
      r.pts.forEach((p, i) => {
        const prev = r.pts[i - 1];
        const next = r.pts[i + 1];
        const straight = prev && next && (prev[0] === next[0] || prev[1] === next[1]);
        if (!straight) turnKeys.add(pointKey(p[0], p[1]));
      });
    }
    const junctionKeys = new Set<string>();
    const crossings = new Set<string>();
    for (const [k, dirs] of vertexDirs) {
      if (dirs.size === 4 && !turnKeys.has(k)) crossings.add(k);
      else if (dirs.size >= 3) junctionKeys.add(k);
    }

    // At each crossing, the pipe drawn later arches over: a flow kept from the step before is
    // already drawn, the rest draw in list order. A pipe shared by several flows draws with its first.
    const firstDrawn = new Map<string, number>();
    for (const r of subdivided) {
      const kept = pool.flows.has(`${r.flow.kind}|${r.pts.map(([x, z]) => pointKey(x, z)).join("->")}`);
      const order = kept ? -1 : r.index;
      r.pts.forEach((p, i) => {
        const k = pointKey(p[0], p[1]);
        const next = r.pts[i + 1];
        if (!crossings.has(k) || !next) return;
        const slot = `${k}|${axisOf(next[0] - p[0])}`;
        firstDrawn.set(slot, Math.min(firstDrawn.get(slot) ?? Infinity, order));
      });
    }
    const bridges = new Map<string, Axis>();
    for (const k of crossings) {
      const x = firstDrawn.get(`${k}|x`) ?? Infinity;
      const z = firstDrawn.get(`${k}|z`) ?? Infinity;
      bridges.set(k, x > z ? "x" : "z");
    }

    const builtRuns = new Set<string>();
    const builtFlanges = new Set<string>();
    const builtJunctions = new Set<string>();
    const runColors = new Map<string, THREE.Color[]>();

    for (const { flow, pts } of subdivided) {
      let start = 0;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (!p) continue;
        const k = pointKey(p[0], p[1]);
        if (junctionKeys.has(k) || i === pts.length - 1) {
          const slice = pts.slice(start, i + 1);
          const fk = slice.map(([x, z]) => pointKey(x, z)).join("->");
          const rk = [...slice].reverse().map(([x, z]) => pointKey(x, z)).join("->");
          const canonical = fk < rk ? fk : rk;
          const list = runColors.get(canonical) ?? [];
          list.push(this.palette.packets[flow.kind]);
          runColors.set(canonical, list);
          start = i;
        }
      }
    }

    const built = subdivided.map(({ flow, pts, index }) =>
      this.buildFlow(
        flow,
        pts,
        index,
        junctionKeys,
        bridges,
        vertexDirs,
        vertexCoords,
        builtRuns,
        builtFlanges,
        builtJunctions,
        runColors,
        pool,
      ),
    );
    this.disposePipes(pool);
    this.flows = this.script(
      subdivided.map(({ flow }) => flow),
      built,
      play,
    );
  }

  /** Times the fresh flows one after another and raises their bubbles; flows taken over keep their timing. */
  private script(flows: readonly Flow[], built: readonly BuiltFlow[], play: boolean): FlowView[] {
    for (const bubble of this.bubbles) {
      bubble.object.removeFromParent();
      bubble.object.element.remove();
    }
    const beats: Beat[] = [];
    const starts = new Map<FlowView, number>();
    let cursor = SCRIPT_LEAD;
    built.forEach(({ view, fresh }, i) => {
      const flow = flows[i];
      if (!fresh || !flow) return;
      if (flow.intent) {
        beats.push({ node: flow.from, text: flow.intent, at: cursor, kind: "intent" });
        cursor += INTENT_SECONDS;
      }
      starts.set(view, cursor);
      cursor += DRAW_SECONDS + view.trip;
      if (flow.reaction) {
        beats.push({ node: flow.to, text: flow.reaction, at: cursor, kind: "reaction" });
        cursor += REACTION_SECONDS;
      }
    });
    // A script that is not played has already run: every pipe drawn, the last bubble up.
    this.beatTimes = beats.map((beat) => beat.at);
    this.beat = play ? 0 : Math.max(0, beats.length - 1);
    this.scriptClock = play ? 0 : cursor;
    this.scriptLimit = this.holdBefore(this.beat + 1);
    this.bubbles = beats.flatMap((beat, i) => {
      const node = this.nodes.get(beat.node);
      if (!node) return [];
      const until = beats[i + 1]?.at ?? Infinity;
      return [this.buildBubble(node, beat, `${String(i + 1)}/${String(beats.length)}`, until)];
    });
    return built.map(({ view }) => {
      const start = starts.get(view);
      return { ...view, cue: start ?? null };
    });
  }

  /** Where the script waits for the viewer: just before bubble `index` comes up; never past the last. */
  private holdBefore(index: number): number {
    const at = this.beatTimes[index];
    return at === undefined ? Infinity : at - 0.001;
  }

  /** A numbered speech bubble riding `node`'s prop, its tail tip just above the prop's top. */
  /** `count` reads like "2/3": this bubble's turn out of the step's, so the viewer knows how many remain. */
  private buildBubble(node: NodeView, beat: Beat, count: string, until: number): BubbleView {
    const anchor = document.createElement("div");
    anchor.className = "bubble-anchor";
    const bubble = document.createElement("div");
    bubble.className = `bubble ${beat.kind}`;
    const badge = document.createElement("b");
    badge.className = "bubble-number";
    badge.textContent = count;
    bubble.append(badge, beat.text);
    anchor.append(bubble);
    const object = new CSS2DObject(anchor);
    object.center.set(0.5, 1);
    object.position.set(0, propTop(node.spec, this.palette) + BUBBLE_GAP, 0);
    node.prop.add(object);
    return { object, node: beat.node, at: beat.at, until };
  }

  /** Removes the pipe pieces no flow took over. */
  private disposePipes(pool: PipePool): void {
    const drop = (o: THREE.Object3D): void => {
      this.world.remove(o);
      disposeTree(o);
    };
    for (const r of pool.runs.values()) for (const o of [...r.shells, ...r.collars]) drop(o);
    for (const fit of pool.fittings.values()) drop(fit.root);
    for (const f of pool.flows.values()) {
      for (const o of f.packets) drop(o);
      this.world.remove(f.cargo);
      f.cargo.element.remove();
    }
  }

  /** A closed pipe from tile to tile with fittings at every joint and packets travelling inside it. */
  private buildFlow(
    { kind, carries }: Flow,
    pts: readonly Point[],
    index: number,
    junctionKeys: ReadonlySet<string>,
    bridges: Bridges,
    vertexDirs: ReadonlyMap<string, ReadonlyMap<string, THREE.Vector3>>,
    vertexCoords: ReadonlyMap<string, Point>,
    builtRuns: Set<string>,
    builtFlanges: Set<string>,
    builtJunctions: Set<string>,
    runColors: ReadonlyMap<string, readonly THREE.Color[]>,
    pool: PipePool,
  ): BuiltFlow {
    const worldPts = pts.map(([x, z]) => new THREE.Vector3(x, PIPE_Y, z));
    const { path } = pipePath(worldPts, junctionKeys, bridges);
    const color = this.palette.packets[kind];
    const up = new THREE.Vector3(0, 1, 0);

    // Cumulative arc-length fraction at each polyline vertex so sub-runs and fittings draw in sequence.
    const vertexLengths: number[] = [0];
    for (let i = 1; i < worldPts.length; i++) {
      const prev = worldPts[i - 1];
      const curr = worldPts[i];
      vertexLengths.push((vertexLengths[i - 1] ?? 0) + (prev && curr ? prev.distanceTo(curr) : 0));
    }
    const totalLinear = Math.max(1e-4, vertexLengths[vertexLengths.length - 1] ?? 1);
    const uAtVertex = (idx: number): number => THREE.MathUtils.clamp((vertexLengths[idx] ?? 0) / totalLinear, 0, 1);

    // Split the polyline at any T-junction into independent sub-runs between fittings.
    const runs: PipeRunView[] = [];
    const fittings: PipeFittingView[] = [];

    const addTubeRun = (startIdx: number, endIdx: number): void => {
      const slice = pts.slice(startIdx, endIdx + 1);
      if (slice.length < 2) return;
      const forwardKey = slice.map(([x, z]) => pointKey(x, z)).join("->");
      const reverseKey = [...slice]
        .reverse()
        .map(([x, z]) => pointKey(x, z))
        .join("->");
      const canonical = forwardKey < reverseKey ? forwardKey : reverseKey;
      if (builtRuns.has(canonical)) return;
      builtRuns.add(canonical);

      const subWorld = slice.map(([x, z]) => new THREE.Vector3(x, PIPE_Y, z));
      const first = subWorld[0];
      const second = subWorld[1];
      const last = subWorld[subWorld.length - 1];
      const beforeLast = subWorld[subWorld.length - 2];
      if (!first || !second || !last || !beforeLast) return;

      const startKey = pointKey(first.x, first.z);
      const endKey = pointKey(last.x, last.z);
      const trimStart = junctionKeys.has(startKey) ? JUNCTION_TRIM : FLANGE_TRIM;
      const trimEnd = junctionKeys.has(endKey) ? JUNCTION_TRIM : FLANGE_TRIM;

      const startDir = second.clone().sub(first).normalize();
      const endDir = beforeLast.clone().sub(last).normalize();
      subWorld[0] = first.clone().addScaledVector(startDir, Math.min(trimStart, first.distanceTo(second) * 0.45));
      subWorld[subWorld.length - 1] = last
        .clone()
        .addScaledVector(endDir, Math.min(trimEnd, last.distanceTo(beforeLast) * 0.45));

      const { path: subPath, elbows } = pipePath(subWorld, new Set(), bridges);
      const len = subPath.getLength();
      if (len < 1e-3) return;
      const segments = Math.max(16, Math.round(len * 14));

      // Three layers: an ink shell (back faces, a little larger) for the outline, a light tinted
      // inner wall (back faces), and a thin glass front wall the packets show through.
      const sharedColors = runColors.get(canonical) ?? [color];
      const runColor = sharedColors[0]?.clone() ?? color.clone();
      for (let c = 1; c < sharedColors.length; c++) {
        const nextColor = sharedColors[c];
        if (nextColor) runColor.lerp(nextColor, 1 / (c + 1));
      }
      const uStart = uAtVertex(startIdx);
      const uEnd = Math.max(uStart + 0.05, uAtVertex(endIdx));
      const arches = slice
        .map(([x, z]) => bridges.get(pointKey(x, z)) ?? "")
        .join("");
      const key = `${canonical}|${runColor.getHexString()}|${String(trimStart)}|${String(trimEnd)}|${arches}`;
      const kept = pool.runs.get(key);
      if (kept) {
        pool.runs.delete(key);
        runs.push({ ...kept, uStart, uEnd, settled: true });
        return;
      }
      const tube = (radius: number, material: THREE.Material): THREE.Mesh<THREE.TubeGeometry> =>
        new THREE.Mesh(new THREE.TubeGeometry(subPath, segments, radius, 16, false), material);
      const ink = tube(PIPE_RADIUS + 0.03, new THREE.MeshBasicMaterial({ color: this.palette.edge, side: THREE.BackSide }));
      const wall = tube(
        PIPE_RADIUS,
        new THREE.MeshToonMaterial({ color: runColor.clone().lerp(this.palette.paper, 0.78), side: THREE.BackSide }),
      );
      const glass = tube(
        PIPE_RADIUS,
        new THREE.MeshToonMaterial({
          color: runColor.clone().lerp(this.palette.paper, 0.6),
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        }),
      );
      const shells = [ink, wall, glass];
      for (const m of shells) m.geometry.setDrawRange(0, 0);
      const collars: THREE.Object3D[] = [];
      runs.push({ key, shells, collars, uStart, uEnd, settled: false });
      this.world.add(...shells);

      // Collar rings clamping the entrance and exit of every 90° elbow on this sub-run.
      for (const elbow of elbows) {
        for (const [pos, dir] of [
          [elbow.enter, elbow.enterDir],
          [elbow.leave, elbow.leaveDir],
        ] as const) {
          const collar = buildPipeCollar(PIPE_RADIUS, this.palette);
          collar.position.copy(pos);
          collar.quaternion.setFromUnitVectors(up, dir);
          collar.scale.setScalar(0);
          collars.push(collar);
          this.world.add(collar);
        }
      }
    };

    let runStart = 0;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (!p) continue;
      const k = pointKey(p[0], p[1]);
      const isEnd = i === pts.length - 1;
      if (junctionKeys.has(k) || isEnd) {
        addTubeRun(runStart, i);
        runStart = i;
      }
      if (junctionKeys.has(k) && !builtJunctions.has(k)) {
        builtJunctions.add(k);
        const dirMap = vertexDirs.get(k);
        const dirs = [...(dirMap?.values() ?? [])];
        const key = `junction|${k}|${[...(dirMap?.keys() ?? [])].sort().join(" ")}`;
        if (!this.takeFitting(pool, key, uAtVertex(i), fittings)) {
          const coord = vertexCoords.get(k) ?? p;
          const junction = buildPipeJunction(PIPE_RADIUS, dirs, JUNCTION_ARM, this.palette);
          junction.position.set(coord[0], PIPE_Y, coord[1]);
          junction.scale.setScalar(0);
          fittings.push({ key, root: junction, uAt: uAtVertex(i), settled: false });
          this.world.add(junction);
        }
      }
    }

    // Stepped wall flanges where the pipe plugs into the source and target tiles.
    const endpoints: readonly [Point | undefined, Point | undefined, number][] = [
      [pts[0], pts[1], 0],
      [pts[pts.length - 1], pts[pts.length - 2], 0.9],
    ];
    for (const [wallPt, nextPt, uAt] of endpoints) {
      if (!wallPt || !nextPt) continue;
      const k = pointKey(wallPt[0], wallPt[1]);
      if (builtFlanges.has(k)) continue;
      builtFlanges.add(k);
      const outward = new THREE.Vector3(nextPt[0] - wallPt[0], 0, nextPt[1] - wallPt[1]).normalize();
      const key = `flange|${k}|${outward.x.toFixed(2)},${outward.z.toFixed(2)}`;
      if (this.takeFitting(pool, key, uAt, fittings)) continue;
      const flange = buildPipeFlange(PIPE_RADIUS, this.palette);
      flange.position.set(wallPt[0], PIPE_Y, wallPt[1]);
      flange.quaternion.setFromUnitVectors(up, outward);
      flange.scale.setScalar(0);
      fittings.push({ key, root: flange, uAt, settled: false });
      this.world.add(flange);
    }

    // The same kind of flow along the same route keeps its packets where they are and its cargo pill.
    const key = `${kind}|${pts.map(([x, z]) => pointKey(x, z)).join("->")}`;
    const kept = pool.flows.get(key);
    if (kept) {
      pool.flows.delete(key);
      kept.cargo.element.textContent = carries;
      return { view: { ...kept, path, runs, fittings }, fresh: false };
    }

    const count = Math.max(2, Math.round(path.getLength() / 0.9));
    const packets = Array.from({ length: count }, () => {
      const pill = new THREE.Mesh(
        new THREE.CapsuleGeometry(PIPE_RADIUS * 0.5, 0.16, 6, 12),
        new THREE.MeshBasicMaterial({ color }),
      );
      pill.scale.setScalar(0);
      return pill;
    });

    const label = document.createElement("div");
    label.className = `cargo ${kind}`;
    label.textContent = carries;
    label.style.opacity = "0";
    const cargo = new CSS2DObject(label);

    this.world.add(...packets, cargo);
    const trip = THREE.MathUtils.clamp(path.getLength() / CARGO_SPEED, TRIP_MIN, TRIP_MAX);
    // Timed by `script` once every flow of the step is built.
    const view = { key, born: this.time, trip, cue: null, kind, path, runs, fittings, packets, offset: index * 0.17, cargo };
    return { view, fresh: true };
  }

  /** Moves a fitting with this key from the pool into `fittings`, shown whole; false if there is none. */
  private takeFitting(pool: PipePool, key: string, uAt: number, fittings: PipeFittingView[]): boolean {
    const kept = pool.fittings.get(key);
    if (!kept) return false;
    pool.fittings.delete(key);
    fittings.push({ ...kept, uAt, settled: true });
    return true;
  }

  /** Aims the camera at the nodes the current step shows; `snap` jumps there instead of gliding. */
  private frameStep(snap: boolean): void {
    const shown = new Set(this.step?.show ?? []);
    const bases = [...this.nodes.values()].filter((v) => shown.has(v.spec.id)).map((v) => v.base);
    if (bases.length === 0) return;
    const pens = this.fences.filter((f) => f.target === 1).flatMap((f) => fenceCorners(f.layout));
    const speakers = new Set(this.bubbles.map((b) => b.node));
    const bubbleTops = [...speakers].flatMap((id) => {
      const view = this.nodes.get(id);
      return view ? [view.base.clone().setY(BUBBLE_TOP)] : [];
    });
    const { clientWidth: w, clientHeight: h } = this.host;
    const inset = Math.min(this.insetLeft, w * 0.6);
    const frame = frameFor(
      [...bases.flatMap(nodeBounds), ...pens, ...bubbleTops],
      this.axes.right,
      this.axes.up,
      h > 0 ? (w - inset) / h : 1,
      FRAME_OPTIONS,
    );
    // Centre the nodes in the free part of the stage, right of the inset.
    const unitsPerPx = h > 0 ? frame.viewHeight / h : 0;
    this.goalTarget.copy(frame.center).addScaledVector(this.axes.right, (-inset / 2) * unitsPerPx);
    this.goalHeight = frame.viewHeight;
    if (snap) {
      this.target.copy(this.goalTarget);
      this.viewHeight = this.goalHeight;
      this.updateFrustum();
    }
  }

  private aspect(): number {
    const { clientWidth: w, clientHeight: h } = this.host;
    return h > 0 ? w / h : 1;
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.host;
    this.renderer.setSize(w, h);
    this.names.setSize(w, h);
    this.labels.setSize(w, h);
    this.frameStep(true);
    this.updateFrustum();
  }

  private updateFrustum(): void {
    const half = this.viewHeight / 2;
    const aspect = this.aspect();
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
  }

  private placeCamera(azimuth: number, elevation: number): void {
    const r = 40;
    this.camera.position.set(
      this.target.x + r * Math.cos(elevation) * Math.sin(azimuth),
      this.target.y + r * Math.sin(elevation),
      this.target.z + r * Math.cos(elevation) * Math.cos(azimuth),
    );
    this.camera.lookAt(this.target);
  }

  /** One frame of a block: glide, spring in or out, focus bob and glow, and any prop morph. */
  private animateNode(view: NodeView, dt: number, move: number): void {
    view.root.position.x += (view.base.x - view.root.position.x) * move;
    view.root.position.z += (view.base.z - view.root.position.z) * move;
    if (view.delay > 0) {
      view.delay -= dt;
    } else {
      view.velocity += (view.target - view.scale) * 170 * dt;
      view.velocity *= Math.exp(-13 * dt);
      view.scale += view.velocity * dt;
    }
    const s = Math.max(0, view.scale);
    view.root.scale.setScalar(s);
    view.root.visible = s > 0.01;
    // Drop in from above while appearing; the spring's overshoot reads as a small landing bounce.
    view.root.position.y = view.base.y + Math.max(0, 1 - s) * 0.9;
    view.lift += ((view.focus ? 1 : 0) - view.lift) * Math.min(1, dt * 6);
    const bob = view.lift * (0.12 + Math.sin(this.time * 2.6 + view.phase) * 0.07);
    view.prop.position.y = bob;
    if (view.outgoing) view.outgoing.position.y = bob;
    this.morphNode(view, dt);
    // Focus: the block takes on the focus colour and spills a soft, breathing light onto the floor
    // around its footprint.
    const breath = 0.5 + 0.5 * Math.sin(this.time * 2.2 + view.phase);
    tintTile(view.tile, this.palette, view.lift);
    view.glow.material.opacity = view.lift * (0.6 + 0.3 * breath);
    view.glow.scale.setScalar(0.96 + 0.06 * breath);
    view.glow.visible = view.lift > 0.01;
  }

  /** First half: the old prop shrinks into the plate and the name fades. Second half: the new ones grow in. */
  private morphNode(view: NodeView, dt: number): void {
    if (view.morph >= 1) return;
    view.morph = Math.min(1, view.morph + dt / MORPH_SECONDS);
    const half = view.morph < 0.5;
    if (view.outgoing) {
      view.outgoing.scale.setScalar(Math.max(1 - easeOutCubic(view.morph * 2), 0.001));
      if (!half) {
        this.dropProp(view, view.outgoing);
        view.outgoing = null;
      }
    }
    if (view.growing) {
      view.prop.scale.setScalar(Math.max(easeOutBack(view.morph * 2 - 1), 0.001));
      if (view.morph >= 1) view.growing = false;
    }
    if (!half && view.name.textContent !== view.spec.label) view.name.textContent = view.spec.label;
    view.name.style.opacity = view.morph >= 1 ? "" : String(Math.abs(1 - 2 * view.morph));
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    if (!this.paused) this.time += dt;

    // Camera: glide toward the step's framing at a fixed isometric angle.
    const glide = 1 - Math.exp(-dt / CAMERA_LAG);
    this.target.lerp(this.goalTarget, glide);
    this.viewHeight += (this.goalHeight - this.viewHeight) * glide;
    this.updateFrustum();
    this.placeCamera(AZIMUTH, ELEVATION);

    const move = 1 - Math.exp(-dt / MOVE_LAG);
    for (const view of this.nodes.values()) this.animateNode(view, dt, move);
    for (const view of this.leaving) this.animateNode(view, dt, move);
    const gone = this.leaving.filter((v) => v.scale < 0.01 && v.velocity <= 0);
    for (const view of gone) this.disposeNode(view);
    if (gone.length > 0) this.leaving = this.leaving.filter((v) => !gone.includes(v));

    // Fences: walls rise out of the floor once the nodes have moved in, and sink when the step ends.
    for (const fence of this.fences) {
      if (fence.delay > 0) {
        fence.delay -= dt;
        continue;
      }
      fence.rise += (fence.target - fence.rise) * Math.min(1, dt * 6);
      fence.root.scale.y = Math.max(easeOutCubic(fence.rise), 0.001);
      fence.root.visible = fence.rise > 0.01;
    }
    const sunk = this.fences.filter((f) => f.target === 0 && f.rise < 0.01);
    for (const fence of sunk) this.removeFence(fence);
    if (sunk.length > 0) this.fences = this.fences.filter((f) => !sunk.includes(f));

    if (!this.paused) this.scriptClock = Math.min(this.scriptClock + dt, this.scriptLimit);
    const pass = this.scriptClock;

    // Flows: each new pipe draws itself from source to target, then its packets start moving inside.
    // Pieces taken over from the step before stay whole.
    const up = new THREE.Vector3(0, 1, 0);
    const popAt = (draw: number, uAt: number): number =>
      THREE.MathUtils.clamp(uAt <= 0.01 ? draw * 4 : (draw - uAt * 0.95) * 10, 0.001, 1);
    for (const flow of this.flows) {
      // A step's own flows run on the script's clock; a flow kept from the step before stays drawn.
      const age = flow.cue === null ? this.time - flow.born : pass - flow.cue;
      const draw = easeOutCubic(age / DRAW_SECONDS);
      const appear = THREE.MathUtils.clamp((age - DRAW_SECONDS) * 3, 0, 1);
      for (const run of flow.runs) {
        const localDraw = run.settled
          ? 1
          : THREE.MathUtils.clamp((draw - run.uStart) / Math.max(0.05, run.uEnd - run.uStart), 0, 1);
        for (const shell of run.shells) {
          const indices = shell.geometry.index?.count ?? 0;
          shell.geometry.setDrawRange(0, Math.floor((indices * localDraw) / 6) * 6);
        }
        // Elbow collars pop on as the pipe reaches them, as do flanges and T-joints below.
        const collarScale = run.settled ? 1 : popAt(draw, (run.uStart + run.uEnd) / 2);
        for (const collar of run.collars) collar.scale.setScalar(collarScale);
      }
      for (const fit of flow.fittings) fit.root.scale.setScalar(fit.settled ? 1 : popAt(draw, fit.uAt));
      // Packets flow through every drawn pipe. The cargo pill rides once, in its flow's turn, fading
      // at each end; a flow kept from the step before has no turn, so no pill.
      const trip = flow.cue === null ? -1 : (pass - flow.cue - DRAW_SECONDS) / flow.trip;
      const v = THREE.MathUtils.clamp(trip, 0, 1);
      const riding = trip >= 0 && trip <= 1 ? Math.min(1, v * 6, (1 - v) * 6) : 0;
      flow.packets.forEach((packet, i) => {
        let u = (this.time * 0.32 + flow.offset + i / flow.packets.length) % 1;
        // A handshake goes both ways: every other packet travels back.
        if (flow.kind === "handshake" && i % 2 === 1) u = 1 - u;
        packet.position.copy(flow.path.getPointAt(u));
        packet.quaternion.setFromUnitVectors(up, flow.path.getTangentAt(u));
        const edgeFade = Math.min(1, u * 10, (1 - u) * 10);
        packet.scale.setScalar(Math.max(appear * edgeFade, 0.001));
      });
      flow.cargo.position.copy(flow.path.getPointAt(v));
      flow.cargo.element.style.opacity = String(appear * riding);
    }

    // Bubbles: each line of the script shows until the next one starts, the last one until the pass ends.
    for (const bubble of this.bubbles) {
      const on = pass >= bubble.at && pass < bubble.until;
      bubble.object.element.classList.toggle("is-on", on);
    }

    this.renderer.render(this.scene, this.camera);
    this.names.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}
