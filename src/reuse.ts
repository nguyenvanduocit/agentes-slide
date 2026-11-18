import type { NodeKind } from "./types";

// Pure pairing of the nodes on stage with the next lesson's nodes, so the stage can move and morph
// the blocks it already has instead of dropping every block and building the next lesson from scratch.

export interface Slot {
  readonly id: string;
  readonly kind: NodeKind;
  /** Floor position in world units. */
  readonly x: number;
  readonly z: number;
}

/** Index into the old slots → index into the new slots. */
export type Pairing = ReadonlyMap<number, number>;

/**
 * Pairs old slots with new ones in three passes, each greedy by distance: the same node (id and
 * kind), then the same kind, then any kind (the stage morphs the prop). Unpaired slots on either
 * side are left out: old ones leave the stage, new ones enter it.
 */
export function pairSlots(old: readonly Slot[], next: readonly Slot[]): Pairing {
  const pairs = new Map<number, number>();
  const taken = new Set<number>();
  const passes: readonly ((a: Slot, b: Slot) => boolean)[] = [
    (a, b) => a.id === b.id && a.kind === b.kind,
    (a, b) => a.kind === b.kind,
    () => true,
  ];
  for (const fits of passes) {
    const candidates: { from: number; to: number; distance: number }[] = [];
    old.forEach((a, from) => {
      if (pairs.has(from)) return;
      next.forEach((b, to) => {
        if (!taken.has(to) && fits(a, b)) candidates.push({ from, to, distance: Math.hypot(a.x - b.x, a.z - b.z) });
      });
    });
    candidates.sort((p, q) => p.distance - q.distance);
    for (const { from, to } of candidates) {
      if (pairs.has(from) || taken.has(to)) continue;
      pairs.set(from, to);
      taken.add(to);
    }
  }
  return pairs;
}
