"use client";

import { ReactNode, useEffect, useRef } from "react";

type SceneName = "system" | "loop" | "memory" | "parallel" | "stability";

const INK = "#262624";
const TEXT = "#2a2926";
const MUTED = "#8c8a80";
const ACCENT = "#9b2d2d";
const ACCENT_LIGHT = "rgba(155,45,45,.16)";
const PAPER = "#f4f3ee";

const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = MUTED,
  width = 1.4,
  opacity = 1,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius = 4,
  fill = PAPER,
  stroke = INK,
  opacity = 1,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function label(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  options: {
    color?: string;
    size?: number;
    align?: CanvasTextAlign;
    italic?: boolean;
    weight?: number;
    opacity?: number;
  } = {},
) {
  ctx.save();
  ctx.globalAlpha = options.opacity ?? 1;
  ctx.fillStyle = options.color ?? MUTED;
  ctx.textAlign = options.align ?? "center";
  ctx.textBaseline = "middle";
  const style = options.italic ? "italic " : "";
  const weight = options.weight ?? 400;
  ctx.font = `${style}${weight} ${options.size ?? 13}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText(value, x, y);
  ctx.restore();
}

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  textValue: string,
  active = false,
  opacity = 1,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = active ? ACCENT_LIGHT : "rgba(255,255,255,.64)";
  ctx.strokeStyle = active ? ACCENT : INK;
  ctx.lineWidth = active ? 2 : 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  label(ctx, textValue, x + width / 2, y + height / 2 + 1, {
    color: active ? ACCENT : TEXT,
    size: 13,
    weight: active ? 600 : 400,
    opacity,
  });
}

function drawSystem(ctx: CanvasRenderingContext2D, p: number) {
  label(ctx, "same request", 250, 27, { italic: true, size: 12 });
  dot(ctx, 145, 52, 5);
  dot(ctx, 355, 52, 5);
  label(ctx, "one-shot answer", 145, 92, { size: 12 });
  label(ctx, "working system", 355, 92, { size: 12 });

  const count = Math.max(1, Math.ceil(p * 7));
  const left = [
    [145, 135],
    [137, 163],
    [151, 191],
  ];
  left.forEach(([x, y], index) => {
    const visible = p > index * 0.11 ? 1 : 0;
    line(ctx, 145, 57, x, y - 5, MUTED, 0.8, visible * 0.5);
    dot(ctx, x, y, 4, PAPER, INK, visible);
  });

  const right = [
    [306, 134],
    [350, 122],
    [397, 139],
    [314, 174],
    [364, 166],
    [409, 187],
    [337, 205],
  ];
  right.forEach(([x, y], index) => {
    const visible = index < count ? 1 : 0;
    line(ctx, 355, 57, x, y - 5, MUTED, 0.8, visible * 0.5);
    dot(ctx, x, y, 4, PAPER, INK, visible);
  });

  const axisY = 318;
  line(ctx, 58, axisY, 454, axisY, MUTED, 1.2);
  label(ctx, "fragile", 58, 338, { size: 11, align: "left" });
  label(ctx, "reliable", 454, 338, { size: 11, align: "right" });
  const threshold = 366;
  line(ctx, threshold, axisY - 12, threshold, axisY + 12, ACCENT, 2);
  label(ctx, "holds up", threshold, axisY - 20, {
    color: ACCENT,
    italic: true,
    size: 11,
  });

  const project = (x: number) => 82 + ((x - 120) / 320) * 346;
  [...left, ...right].forEach(([x, y], index) => {
    const sideIndex = index < left.length ? index : index - left.length;
    const visible = index < left.length ? p > sideIndex * 0.11 : sideIndex < count;
    if (!visible || p < 0.48) return;
    const q = index < left.length ? 112 + sideIndex * 18 : project(x);
    line(ctx, x, y + 5, q, axisY - 3, MUTED, 0.7, 0.42);
    const best = index === left.length + 5 && p > 0.82;
    dot(ctx, q, axisY, best ? 5 : 2.6, best ? ACCENT : MUTED, best ? ACCENT : MUTED);
    if (best) label(ctx, "best", q, axisY + 26, { color: ACCENT, size: 11, weight: 600 });
  });
}

function drawLoop(ctx: CanvasRenderingContext2D, p: number) {
  const stages = [
    { name: "observe", x: 250, y: 72 },
    { name: "plan", x: 388, y: 190 },
    { name: "act", x: 250, y: 308 },
    { name: "inspect", x: 112, y: 190 },
  ];
  const active = Math.min(3, Math.floor(p * 4));
  ctx.save();
  ctx.strokeStyle = MUTED;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(250, 190, 116, -Math.PI / 2, Math.PI * 1.5 * clamp(p + 0.08));
  ctx.stroke();
  ctx.restore();

  stages.forEach((stage, index) => {
    const visible = p >= index * 0.13 || index === 0;
    box(ctx, stage.x - 46, stage.y - 21, 92, 42, stage.name, index === active, visible ? 1 : 0.14);
  });

  dot(ctx, 250, 190, 38, "rgba(255,255,255,.7)", INK);
  label(ctx, "feedback", 250, 184, { color: TEXT, size: 14, weight: 600 });
  label(ctx, "changes the next move", 250, 204, { size: 10 });

  if (p > 0.72) {
    const a = (p * 5 - 0.5) * Math.PI * 2;
    const x = 250 + Math.cos(a) * 116;
    const y = 190 + Math.sin(a) * 116;
    dot(ctx, x, y, 5, ACCENT, ACCENT);
  }
}

function drawMemory(ctx: CanvasRenderingContext2D, p: number) {
  label(ctx, "everything that happened", 120, 48, { italic: true, size: 12 });
  label(ctx, "what changes the future", 391, 48, { italic: true, size: 12 });
  const events = Array.from({ length: 14 }, (_, index) => ({
    x: 58 + (index % 4) * 38 + Math.sin(index * 2.1) * 8,
    y: 94 + Math.floor(index / 4) * 50 + (index % 2) * 8,
    keep: [1, 4, 7, 10, 12].includes(index),
  }));
  events.forEach((event, index) => {
    const visible = p > index / 20;
    if (!visible) return;
    dot(ctx, event.x, event.y, 4, event.keep ? ACCENT_LIGHT : PAPER, event.keep ? ACCENT : MUTED);
  });

  line(ctx, 238, 72, 238, 304, MUTED, 1.2);
  label(ctx, "filter", 238, 326, { italic: true, size: 11 });
  const slots = [110, 153, 196, 239, 282];
  const kept = events.filter((event) => event.keep);
  box(ctx, 338, 84, 120, 218, "", p > 0.72, clamp((p - 0.45) / 0.2));
  kept.forEach((event, index) => {
    const travel = clamp((p - 0.34 - index * 0.06) / 0.32);
    if (travel <= 0) return;
    const targetX = 350;
    const targetY = slots[index];
    const x = event.x + (targetX - event.x) * travel;
    const y = event.y + (targetY - event.y) * travel;
    line(ctx, event.x, event.y, x, y, ACCENT, 0.8, 0.35);
    dot(ctx, x, y, 4.5, ACCENT, ACCENT);
  });
  label(ctx, "working memory", 398, 324, { color: p > 0.72 ? ACCENT : MUTED, size: 12 });
}

function drawParallel(ctx: CanvasRenderingContext2D, p: number) {
  box(ctx, 194, 38, 112, 44, "question", false);
  const workers = [
    { x: 58, y: 172, name: "research" },
    { x: 194, y: 172, name: "reason" },
    { x: 330, y: 172, name: "challenge" },
  ];
  workers.forEach((worker, index) => {
    const visible = clamp((p - 0.12 - index * 0.07) / 0.12);
    line(ctx, 250, 82, worker.x + 56, worker.y, MUTED, 1.1, visible);
    box(ctx, worker.x, worker.y, 112, 44, worker.name, p > 0.42 && p < 0.7, visible);
  });
  box(ctx, 194, 304, 112, 44, "decision", p > 0.78, clamp((p - 0.52) / 0.16));
  workers.forEach((worker, index) => {
    const visible = clamp((p - 0.46 - index * 0.04) / 0.2);
    line(ctx, worker.x + 56, worker.y + 44, 250, 304, MUTED, 1.1, visible);
    if (visible > 0) {
      const x = worker.x + 56 + (250 - (worker.x + 56)) * visible;
      const y = worker.y + 44 + (304 - (worker.y + 44)) * visible;
      dot(ctx, x, y, 4, ACCENT, ACCENT);
    }
  });
  label(ctx, "independent work fans out; judgment comes back together", 250, 380, {
    italic: true,
    size: 11,
    opacity: clamp((p - 0.75) / 0.2),
  });
}

function drawStability(ctx: CanvasRenderingContext2D, p: number) {
  const left = 62;
  const bottom = 326;
  const width = 390;
  const height = 244;
  line(ctx, left, bottom, left + width, bottom, MUTED, 1.3);
  line(ctx, left, bottom, left, bottom - height, MUTED, 1.3);
  label(ctx, "iterations →", left + width / 2, 350, { size: 11 });
  label(ctx, "error", 33, bottom - height / 2, { size: 11 });
  const targetY = 270;
  ctx.save();
  ctx.setLineDash([4, 5]);
  line(ctx, left, targetY, left + width, targetY, MUTED, 1, 0.7);
  ctx.restore();
  label(ctx, "safe range", left + width, targetY - 12, { align: "right", italic: true, size: 11 });

  const drawCurve = (stable: boolean, color: string, opacity: number) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = stable ? 2.2 : 1.2;
    ctx.beginPath();
    const points = 90;
    const shown = Math.max(2, Math.floor(points * p));
    for (let i = 0; i < shown; i += 1) {
      const t = i / (points - 1);
      const x = left + t * width;
      const wave = stable
        ? Math.sin(t * 28) * 82 * Math.exp(-t * 4.4)
        : Math.sin(t * 22) * 70 + Math.sin(t * 55) * 24;
      const y = targetY - 3 - wave;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  };
  drawCurve(false, MUTED, 0.5);
  drawCurve(true, ACCENT, 1);
  label(ctx, "unchecked", 448, 112, { color: MUTED, size: 11, align: "right", opacity: p > 0.82 ? 1 : 0 });
  label(ctx, "self-correcting", 448, 242, { color: ACCENT, size: 11, align: "right", weight: 600, opacity: p > 0.82 ? 1 : 0 });
}

const drawers: Record<SceneName, (ctx: CanvasRenderingContext2D, p: number) => void> = {
  system: drawSystem,
  loop: drawLoop,
  memory: drawMemory,
  parallel: drawParallel,
  stability: drawStability,
};

function ScrollDiagram({
  scene,
  labelText,
  caption,
  children,
}: {
  scene: SceneName;
  labelText: string;
  caption: string;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(500 * ratio);
      const pixelHeight = Math.round(400 * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, 500, 400);
      context.lineCap = "round";
      context.lineJoin = "round";
      const rect = section.getBoundingClientRect();
      const mobile = window.innerWidth <= 900;
      const travel = Math.max(280, rect.height - 390);
      const progress = reduced || mobile ? 0.999 : clamp((56 - rect.top) / travel, 0, 0.999);
      drawers[scene](context, progress);
    };

    const requestPaint = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    const observer = new ResizeObserver(requestPaint);
    observer.observe(section);
    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", requestPaint);
    paint();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", requestPaint);
      window.removeEventListener("resize", requestPaint);
    };
  }, [scene]);

  return (
    <div className="scroll-section has-scene" ref={sectionRef}>
      <div className="section-inner">
        <div className="section-copy">
          <span className="section-label">{labelText}</span>
          {children}
        </div>
        <div className="section-viz">
          <canvas
            className="diagram-canvas"
            ref={canvasRef}
            role="img"
            aria-label={caption}
          />
          <p className="viz-caption">{caption}</p>
        </div>
      </div>
    </div>
  );
}

function TextSection({ labelText, children }: { labelText: string; children: ReactNode }) {
  return (
    <div className="scroll-section text-only">
      <span className="section-label">{labelText}</span>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <main className="wrapper">
      <article className="post">
        <header className="scroll-header">
          <h1>The Quiet Work of Reliable AI</h1>
          <p className="post-subtitle">Why dependable systems are built from loops, not leaps</p>
          <p className="post-meta">
            A field note · <time dateTime="2026-08-04">August 2026</time>
          </p>
        </header>

        <p className="mobile-notice">
          The diagrams are scroll-driven on larger screens and shown in their complete state here.
        </p>

        <section className="act-group" aria-labelledby="act-one">
          <h2 className="act-heading" id="act-one">The myth of the perfect prompt</h2>
          <ScrollDiagram
            scene="system"
            labelText="§ 1.1 — A system, not a sentence"
            caption="The same request. One path ends; the other learns."
          >
            <p>
              We like to imagine that reliability begins with the right sentence: a prompt so precise that
              the model has no room to wander. But a prompt can only describe the first move. It cannot see
              the result, notice what went wrong, or decide what should happen next.
            </p>
            <p>
              A dependable workflow treats the first answer as evidence, not closure. It observes the output,
              checks it against the goal, and uses what it learns to shape the next attempt. The intelligence
              is not in any single leap. It is in the loop that keeps making smaller, better-informed moves.
            </p>
          </ScrollDiagram>
          <TextSection labelText="§ 1.2 — Reliability compounds">
            <p>
              One-shot systems hide uncertainty behind a polished response. Working systems expose it. They
              separate what is known from what is assumed, keep risky actions reversible, and stop when the
              evidence no longer supports the plan.
            </p>
            <p>
              Each pass may look modest. Together, the passes compound: context gets cleaner, errors get
              cheaper, and confidence is earned by inspection rather than tone.
            </p>
          </TextSection>
        </section>

        <section className="act-group" aria-labelledby="act-two">
          <h2 className="act-heading" id="act-two">Build the loop</h2>
          <ScrollDiagram
            scene="loop"
            labelText="§ 2.1 — Observe, plan, act, inspect"
            caption="A useful loop changes its next move with every pass."
          >
            <p>
              The smallest useful operating cycle has four verbs. Observe the current state. Plan a bounded
              move. Act where the change is safe. Inspect the new state before continuing. Skip any one of
              them and the loop loses its grip on reality.
            </p>
            <p>
              Observation prevents stale assumptions. Planning keeps effort pointed at the goal. Action
              creates evidence. Inspection closes the gap between intention and result. The cycle is simple;
              following it consistently is the hard part.
            </p>
          </ScrollDiagram>
          <TextSection labelText="§ 2.2 — Prefer reversible progress">
            <p>
              Large changes feel efficient because they compress many decisions into one. They also compress
              many failure modes into one. Smaller moves preserve optionality: we can inspect, correct, or
              back out before a weak assumption spreads through the whole system.
            </p>
            <blockquote>
              The best next action is often not the boldest one. It is the one that teaches us the most while
              putting the least at risk.
            </blockquote>
          </TextSection>
        </section>

        <section className="act-group" aria-labelledby="act-three">
          <h2 className="act-heading" id="act-three">Memory without mythology</h2>
          <ScrollDiagram
            scene="memory"
            labelText="§ 3.1 — Keep what changes the future"
            caption="Memory is a filter, not a warehouse."
          >
            <p>
              More context is not the same as better memory. A transcript records everything: false starts,
              temporary constraints, repeated explanations, and decisions that were later reversed. Carry it
              all forward and the signal disappears inside its own history.
            </p>
            <p>
              Useful memory is selective. It keeps durable facts, unresolved decisions, user preferences, and
              the reasons behind important choices. Everything else can remain in the record without steering
              the next move.
            </p>
          </ScrollDiagram>
        </section>

        <section className="act-group" aria-labelledby="act-four">
          <h2 className="act-heading" id="act-four">Coordination at scale</h2>
          <ScrollDiagram
            scene="parallel"
            labelText="§ 4.1 — Parallel when independent"
            caption="Independent work fans out; judgment comes back together."
          >
            <p>
              Parallel work is valuable when the branches can genuinely proceed alone: one path gathers
              evidence, another develops an approach, and a third tries to disprove it. Running dependent
              steps at the same time only creates a race between incomplete assumptions.
            </p>
            <p>
              The branches must converge. Their purpose is not to produce more text but to create different
              evidence for one decision. Good coordination knows when to fan out, what each branch owns, and
              where synthesis must happen.
            </p>
          </ScrollDiagram>
          <TextSection labelText="§ 4.2 — Synchronize on decisions">
            <p>
              Coordination becomes expensive when every participant shares every detail. A better boundary is
              the decision: communicate the result, the evidence that supports it, and any uncertainty that
              changes downstream work. Let the rest stay local.
            </p>
          </TextSection>
        </section>

        <section className="act-group" aria-labelledby="act-five">
          <h2 className="act-heading" id="act-five">The operating principle</h2>
          <ScrollDiagram
            scene="stability"
            labelText="§ 5.1 — Calm systems correct themselves"
            caption="Feedback turns repeated motion into convergence."
          >
            <p>
              A reliable system is not one that never drifts. It is one that notices drift early and has a
              practiced way back. The difference is visible over time: unchecked work oscillates around the
              goal, while inspected work narrows its error with every pass.
            </p>
            <p>
              This is the quiet work behind dependable AI. Observe before assuming. Move in ways that can be
              reversed. Keep only the memory that shapes the future. Parallelize independent thought, then
              bring judgment back to one place. Reliability is not a personality trait. It is an architecture.
            </p>
          </ScrollDiagram>
        </section>

        <footer className="post-footer">
          <span>Field note 01</span>
          <span>Built to be revised</span>
        </footer>
      </article>
    </main>
  );
}
