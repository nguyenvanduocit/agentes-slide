import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/latin-700.css";
import "./styles.css";
import { chapters, deckTitle } from "./content";
import { icon } from "./icons";
import { flatLessons, fromHash, next, prev, toHash, type Position } from "./nav";
import { paletteFromCss, Stage } from "./stage";
import type { Lesson, Step, StepTag } from "./types";

// The shell: renders the deck's chrome around the 3D stage and owns navigation state.

const lessons = flatLessons(chapters);

interface State {
  at: Position;
  paused: boolean;
  /** The reader closed the summary modal on the current step. */
  recapClosed: boolean;
}

const state: State = {
  at: fromHash(lessons, location.hash),
  paused: false,
  recapClosed: false,
};

const tagClass: Readonly<Record<StepTag, string>> = {
  "VẤN ĐỀ": "tag-problem",
  "Ý TƯỞNG": "tag-idea",
  "CÁCH LÀM": "tag-how",
  "RỦI RO": "tag-risk",
  "KẾT QUẢ": "tag-result",
  "TÓM TẮT": "tag-recap",
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Escapes, then renders `code` and **bold**. */
function rich(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function required<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
  const found = root.querySelector(selector);
  if (!(found instanceof type)) throw new Error(`missing element ${selector}`);
  return found;
}

function current(): { lesson: Lesson; step: Step } {
  const lesson = lessons[state.at.lesson] ?? lessons[0];
  const step = lesson?.steps[state.at.step] ?? lesson?.steps[0];
  if (!lesson || !step) throw new Error("deck has no steps");
  return { lesson, step };
}

// ---- Skeleton -------------------------------------------------------------

const app = required(document, "#app", HTMLDivElement);
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#">${icon("logo", 22)}<span>${escapeHtml(deckTitle)}</span></a>
    <div class="lesson-head"></div>
    <div class="top-actions">
      <button class="icon-btn" data-action="fullscreen" title="Toàn màn hình (F)">${icon("expand", 16)}</button>
      <button class="icon-btn" data-action="theme" title="Đổi giao diện sáng/tối"></button>
    </div>
  </header>
  <div class="layout">
    <aside class="sidebar">
      <div class="chapters"></div>
    </aside>
    <main class="center">
      <div class="stage-card card">
        <div class="stage-actions">
          <button class="btn" data-action="replay">${icon("replay")}Phát lại</button>
          <button class="btn" data-action="pause"></button>
        </div>
        <div class="stage"></div>
        <section class="caption card"></section>
        <div class="recap" hidden></div>
      </div>
    </main>
  </div>
`;

const ui = {
  theme: required(app, '[data-action="theme"]', HTMLButtonElement),
  pause: required(app, '[data-action="pause"]', HTMLButtonElement),
  chapters: required(app, ".chapters", HTMLDivElement),
  head: required(app, ".lesson-head", HTMLDivElement),
  stage: required(app, ".stage", HTMLDivElement),
  caption: required(app, ".caption", HTMLElement),
  recap: required(app, ".recap", HTMLDivElement),
};

const stage = new Stage(ui.stage);

// The caption card floats over the stage's left side; the camera keeps the nodes clear of it.
new ResizeObserver(() => {
  stage.setInsetLeft(ui.caption.offsetLeft + ui.caption.offsetWidth);
}).observe(ui.caption);

// ---- Rendering --------------------------------------------------------------

function renderSidebar(): void {
  let index = 0;
  ui.chapters.innerHTML = chapters
    .map((chapter, ci) => {
      const items = chapter.lessons
        .map((lesson) => {
          const li = index++;
          const active = li === state.at.lesson ? " is-active" : "";
          return `<a class="lesson-link${active}" href="${toHash(lessons, { lesson: li, step: 0 })}">${escapeHtml(lesson.title)}</a>`;
        })
        .join("");
      return `
        <div class="chapter">
          <div class="chapter-head">${pad(ci + 1)}. ${escapeHtml(chapter.title)}</div>
          ${items}
        </div>`;
    })
    .join("");
}

function renderHead(lesson: Lesson): void {
  ui.head.innerHTML = `
    <div class="title-row">
      <h1>${escapeHtml(lesson.title)}</h1>
      <div class="chips">
        <span class="chip chip-orange">${icon("clock", 12)}${String(lesson.minutes)} phút</span>
        <span class="chip chip-green">${icon("signal", 12)}${escapeHtml(lesson.level)}</span>
        <span class="chip chip-violet">${icon("list", 12)}${String(lesson.steps.length)} bước</span>
      </div>
    </div>
    <p class="subtitle">${escapeHtml(lesson.subtitle)}</p>`;
}

/** Lùi / Tiếp. While the step still has bubbles to show, Tiếp brings up the next one. */
function navButtons(lesson: Lesson): string {
  const { shown, total } = stage.beats();
  const following = next(lessons, state.at);
  const atEnd = shown >= total && following.lesson === state.at.lesson && following.step === state.at.step;
  const nextLabel =
    shown < total
      ? `Tiếp (${String(shown + 1)}/${String(total)})`
      : atEnd
        ? "Hết"
        : following.lesson !== state.at.lesson
          ? `Bài tiếp: ${lessons[following.lesson]?.title ?? ""}`
          : `Tiếp: ${lesson.steps[following.step]?.short ?? ""}`;
  const atStart = shown <= 1 && state.at.lesson === 0 && state.at.step === 0;
  return `
      <button class="btn" data-action="prev"${atStart ? " disabled" : ""}>${icon("arrowLeft")}Lùi</button>
      <button class="btn btn-primary" data-action="next"${atEnd ? " disabled" : ""}><span>${escapeHtml(nextLabel)}</span>${icon("arrowRight")}</button>`;
}

function renderNav(): void {
  const nav = ui.caption.querySelector(".step-nav");
  if (nav) nav.innerHTML = navButtons(current().lesson);
}

function renderCaption(lesson: Lesson, step: Step): void {
  ui.caption.innerHTML = `
    <div class="step-top">
      <span class="step-count">BƯỚC ${String(state.at.step + 1)} / ${String(lesson.steps.length)}</span>
      <span class="tag ${tagClass[step.tag]}">${step.tag}</span>
    </div>
    <div class="step-body" data-key="${escapeHtml(`${lesson.slug}-${String(state.at.step)}`)}">
      <h2>${escapeHtml(step.title)}</h2>
      ${step.body.map((p) => `<p>${rich(p)}</p>`).join("")}
    </div>
    <div class="step-nav">${navButtons(lesson)}
    </div>`;
}

function recapOpen(step: Step): boolean {
  return step.tag === "TÓM TẮT" && !state.recapClosed;
}

/** A summary step opens as a modal over the stage: its text, then the key idea of every step, its own last. */
function renderRecap(lesson: Lesson, step: Step): void {
  const open = recapOpen(step);
  ui.recap.hidden = !open;
  if (!open) return;
  const points = lesson.steps.flatMap((s) => (s.key ? [s.key] : []));
  ui.recap.innerHTML = `
    <div class="recap-card card" role="dialog" aria-modal="true" aria-labelledby="recap-title">
      <button class="icon-btn recap-close" data-action="close-recap" title="Đóng (Esc)">${icon("close", 16)}</button>
      <span class="tag ${tagClass[step.tag]}">${step.tag}</span>
      <h2 id="recap-title">${escapeHtml(step.title)}</h2>
      ${step.body.map((p) => `<p>${rich(p)}</p>`).join("")}
      ${points.length > 0 ? `<ol class="recap-points">${points.map((k) => `<li>${rich(k)}</li>`).join("")}</ol>` : ""}
    </div>`;
}

function closeRecap(): void {
  state.recapClosed = true;
  morph(() => {
    ui.recap.hidden = true;
  });
}

/** Runs a DOM update as a view transition: the caption card and the recap card share one name in CSS, so the browser morphs one into the other. */
function morph(update: () => void): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) update();
  else document.startViewTransition(update);
}

function renderChrome(): void {
  const dark = document.documentElement.dataset.theme === "dark";
  ui.theme.innerHTML = icon(dark ? "sun" : "moon", 16);
  ui.pause.innerHTML = state.paused ? `${icon("play")}Chạy tiếp` : `${icon("pause")}Tạm dừng`;
}

function render(): void {
  const { lesson, step } = current();
  renderSidebar();
  renderHead(lesson);
  renderCaption(lesson, step);
  renderRecap(lesson, step);
  renderChrome();
}

// ---- Navigation ---------------------------------------------------------------

function goTo(at: Position, replaceHash = true): void {
  const lessonChanged = at.lesson !== state.at.lesson;
  const wasOpen = !ui.recap.hidden;
  state.at = at;
  state.recapClosed = false;
  const { lesson, step } = current();
  if (lessonChanged) stage.load(lesson, step);
  else stage.apply(step);
  if (replaceHash) history.replaceState(null, "", toHash(lessons, at));
  if (wasOpen === recapOpen(step)) render();
  else morph(render);
}

function toggleTheme(): void {
  const root = document.documentElement;
  const dark = root.dataset.theme !== "dark";
  if (dark) root.dataset.theme = "dark";
  else delete root.dataset.theme;
  try {
    localStorage.setItem("agp:theme", dark ? "dark" : "light");
  } catch {
    // Private mode: the theme just isn't remembered.
  }
  stage.setPalette(paletteFromCss(ui.stage), current().step);
  renderChrome();
}

/** Next: the step's next bubble, or the next step once its last bubble is up. */
function forward(): void {
  if (stage.advance()) renderNav();
  else goTo(next(lessons, state.at));
}

/** Back: the step's previous bubble, or the previous step from its first one. */
function backward(): void {
  if (stage.back()) renderNav();
  else goTo(prev(lessons, state.at));
}

function replay(): void {
  stage.replay(current().step);
  renderNav();
}

function togglePause(): void {
  state.paused = !state.paused;
  stage.setPaused(state.paused);
  renderChrome();
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
}

app.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const target = event.target.closest("[data-action]");
  if (!(target instanceof HTMLElement)) return;
  const { action } = target.dataset;
  if (action === "next") forward();
  else if (action === "prev") backward();
  else if (action === "replay") replay();
  else if (action === "pause") togglePause();
  else if (action === "theme") toggleTheme();
  else if (action === "fullscreen") toggleFullscreen();
  else if (action === "close-recap") closeRecap();
});

window.addEventListener("hashchange", () => {
  goTo(fromHash(lessons, location.hash), false);
});

window.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === "arrowright" || key === "pagedown") forward();
  else if (key === "arrowleft" || key === "pageup") backward();
  else if (key === "r") replay();
  else if (key === " ") togglePause();
  else if (key === "f") toggleFullscreen();
  else if (key === "escape" && !ui.recap.hidden) closeRecap();
  else return;
  event.preventDefault();
});

// ---- Start ------------------------------------------------------------------------

{
  const { lesson, step } = current();
  stage.load(lesson, step);
}
history.replaceState(null, "", toHash(lessons, state.at));
render();
