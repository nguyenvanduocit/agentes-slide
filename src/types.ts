// The deck's content model. Everything a slide shows is data in content.ts;
// the stage (3D) and the shell (DOM) only render it.

export type NodeKind =
  | "laptop"
  | "server"
  | "agent"
  | "person"
  | "chat"
  | "repo"
  | "gate"
  | "clock"
  | "board"
  | "book"
  | "rocket"
  | "meeting"
  | "warn"
  | "wallet"
  | "cloud";

export type Tone = "neutral" | "green" | "violet" | "orange" | "rust" | "blue";

/** `at` is a screen-space grid position: x grows to the right, y grows down. */
export interface NodeSpec {
  readonly id: string;
  readonly kind: NodeKind;
  readonly at: readonly [number, number];
  readonly label: string;
  readonly tone?: Tone;
}

export type FlowKind = "request" | "response" | "handshake";

export interface Flow {
  readonly from: string;
  readonly to: string;
  readonly kind: FlowKind;
  /** What travels through the pipe, shown on it: "báo lỗi", "diff", "bản tóm tắt". */
  readonly carries: string;
  /** What the sender means to do, in a speech bubble over it just before the flow starts. */
  readonly intent?: string;
  /** What the receiver thinks or does once the cargo arrives, in a speech bubble over it. */
  readonly reaction?: string;
}

export type StepTag = "VẤN ĐỀ" | "Ý TƯỞNG" | "CÁCH LÀM" | "RỦI RO" | "KẾT QUẢ" | "TÓM TẮT";

export interface Step {
  /** Short name shown on the next-step button. */
  readonly short: string;
  readonly tag: StepTag;
  readonly title: string;
  /** Paragraphs. `code` in backticks and **bold** are rendered. */
  readonly body: readonly string[];
  readonly key?: string;
  /** Node ids visible on this step. */
  readonly show: readonly string[];
  /** Node ids highlighted on this step. */
  readonly focus?: readonly string[];
  /** Played in order, one after another: intent bubble, pipe, cargo arrives, reaction bubble. */
  readonly flows?: readonly Flow[];
  /** Node id → where the node stands on this step, in place of its lesson position; nodes glide there. */
  readonly moves?: Readonly<Record<string, readonly [number, number]>>;
  /** Groups of node ids; each group is walled in by its own fence on this step. */
  readonly fences?: readonly (readonly string[])[];
}

export interface Lesson {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly minutes: number;
  readonly level: string;
  readonly nodes: readonly NodeSpec[];
  readonly steps: readonly Step[];
}

export interface Chapter {
  readonly title: string;
  readonly lessons: readonly Lesson[];
}
