"use client";

import { ReactNode, useEffect, useRef } from "react";

type SceneName =
  | "criteria"
  | "acceptance"
  | "proximity"
  | "coding"
  | "economics"
  | "future";

const INK = "#262624";
const TEXT = "#2a2926";
const MUTED = "#8c8a80";
const ACCENT = "#9b2d2d";
const ACCENT_LIGHT = "rgba(155,45,45,.16)";
const PAPER = "#f4f3ee";
const WHITE = "rgba(255,255,255,.68)";

const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));

const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

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

function wrappedLabel(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 14,
  options: Parameters<typeof label>[4] = {},
) {
  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";
  ctx.save();
  ctx.font = `${options.italic ? "italic " : ""}${options.weight ?? 400} ${options.size ?? 12}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else current = next;
  });
  if (current) lines.push(current);
  ctx.restore();
  lines.forEach((row, index) => label(ctx, row, x, y + index * lineHeight, options));
}

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  active = false,
  opacity = 1,
  radius = 8,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = active ? ACCENT_LIGHT : WHITE;
  ctx.strokeStyle = active ? ACCENT : MUTED;
  ctx.lineWidth = active ? 1.8 : 1.1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function check(ctx: CanvasRenderingContext2D, x: number, y: number, ok: boolean, opacity = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = ok ? ACCENT : MUTED;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (ok) {
    ctx.moveTo(x - 7, y);
    ctx.lineTo(x - 1, y + 6);
    ctx.lineTo(x + 9, y - 8);
  } else {
    ctx.moveTo(x - 6, y - 6);
    ctx.lineTo(x + 6, y + 6);
    ctx.moveTo(x + 6, y - 6);
    ctx.lineTo(x - 6, y + 6);
  }
  ctx.stroke();
  ctx.restore();
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color = MUTED, opacity = 1) {
  line(ctx, x1, y1, x2, y2, color, 1.4, opacity);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  line(ctx, x2, y2, x2 - 8 * Math.cos(angle - 0.55), y2 - 8 * Math.sin(angle - 0.55), color, 1.4, opacity);
  line(ctx, x2, y2, x2 - 8 * Math.cos(angle + 0.55), y2 - 8 * Math.sin(angle + 0.55), color, 1.4, opacity);
}

function drawCriteria(ctx: CanvasRenderingContext2D, p: number) {
  label(ctx, "one request, different definitions of success", 250, 20, {
    color: TEXT,
    size: 13,
    weight: 600,
  });
  box(ctx, 30, 42, 440, 66, p < 0.2, 1);
  label(ctx, "benchmark task", 48, 62, { color: ACCENT, size: 11, weight: 600, align: "left" });
  wrappedLabel(ctx, "Rebook two travelers and pay with one stored travel credit", 48, 82, 395, 13, {
    color: TEXT,
    size: 11,
    align: "left",
  });

  const rows = [
    { name: "Delta", rule: "use the customer’s gift card", ok: true },
    { name: "American", rule: "credit only for its named traveler", ok: false },
    { name: "Ryanair · before", rule: "verify identity before access", ok: false },
    { name: "Ryanair · now", rule: "access without separate verification", ok: true },
  ];
  label(ctx, "live setting", 43, 129, { size: 10, align: "left", italic: true });
  label(ctx, "what counts as success?", 204, 129, { size: 10, align: "left", italic: true });
  label(ctx, "fixed test", 454, 129, { size: 10, align: "right", italic: true });
  rows.forEach((row, index) => {
    const reveal = ease((p - 0.08 - index * 0.13) / 0.18);
    const y = 143 + index * 57;
    box(ctx, 30, y, 440, 47, index === 3 && p > 0.72, reveal, 4);
    label(ctx, row.name, 43, y + 23, { color: TEXT, size: 11, weight: 600, align: "left", opacity: reveal });
    wrappedLabel(ctx, row.rule, 184, y + 18, 210, 12, { color: MUTED, size: 10, align: "left", opacity: reveal });
    check(ctx, 446, y + 23, row.ok, reveal);
  });
  label(ctx, "the benchmark’s answer stays fixed; the workflow’s answer does not", 250, 384, {
    color: ACCENT,
    size: 11,
    italic: true,
    opacity: ease((p - 0.72) / 0.2),
  });
}

function drawAcceptance(ctx: CanvasRenderingContext2D, p: number) {
  const split = ease((p - 0.08) / 0.3);
  label(ctx, "fixed benchmark", 130, 35, { color: TEXT, size: 13, weight: 600 });
  label(ctx, "Proof-of-Workflow", 374, 35, { color: ACCENT, size: 13, weight: 600 });

  box(ctx, 40, 62, 180, 250, false, 1);
  ["same task", "same rubric", "same test setup"].forEach((item, index) => {
    box(ctx, 65, 91 + index * 62, 130, 38, false, 1);
    label(ctx, item, 130, 110 + index * 62, { color: index === 1 ? ACCENT : MUTED, size: 11 });
  });
  arrow(ctx, 130, 270, 130, 335, MUTED, 1);
  label(ctx, "score", 130, 355, { color: TEXT, size: 12, weight: 600 });

  box(ctx, 280, 62, 180, 250, p > 0.48, split || 0.08);
  ["real work", "current rules", "people responsible"].forEach((item, index) => {
    box(ctx, 305, 91 + index * 62, 130, 38, index === 2 && p > 0.55, split || 0.08);
    label(ctx, item, 370, 110 + index * 62, { color: index === 2 ? ACCENT : MUTED, size: 11, opacity: split || 0.08 });
  });
  arrow(ctx, 370, 270, 370, 335, ACCENT, split);
  label(ctx, "accepted", 370, 355, { color: ACCENT, size: 12, weight: 600, opacity: split });

  const travel = ease((p - 0.72) / 0.22);
  if (travel > 0) {
    dot(ctx, 130 + 240 * travel, 355, 5, ACCENT, ACCENT);
    label(ctx, "value moves from a proxy to the real decision", 250, 386, {
      color: ACCENT,
      size: 11,
      italic: true,
      opacity: travel,
    });
  }
}

function drawMagnifier(ctx: CanvasRenderingContext2D, x: number, y: number, opacity = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.stroke();
  line(ctx, x + 24, y + 24, x + 56, y + 56, ACCENT, 5, opacity);
  ctx.restore();
}

function drawProximity(ctx: CanvasRenderingContext2D, p: number) {
  const stage = Math.min(2, Math.floor(p * 3));
  const local = ease((p * 3) % 1);
  const positions = [85, 235, 385];
  const from = positions[Math.max(0, stage - 1)];
  const lensX = stage === 0 ? positions[0] : from + (positions[stage] - from) * local;
  const companies = ["Customer repo", "Airline", "Zoox"];
  const evaluators = ["Codex / Claude Code", "Sierra", "Zoox evaluator"];
  const modes = ["outside", "alongside", "inside"];

  line(ctx, 65, 342, 438, 342, MUTED, 1.2);
  positions.forEach((x, index) => {
    line(ctx, x, 335, x, 350, index === stage ? ACCENT : MUTED, index === stage ? 2 : 1);
    label(ctx, modes[index], x, 370, { color: index === stage ? ACCENT : MUTED, size: 11, weight: index === stage ? 600 : 400 });
  });

  box(ctx, 312, 54, 148, 245, stage === 2, 1, 10);
  label(ctx, companies[stage], 386, 78, { color: stage === 2 ? ACCENT : TEXT, size: 15, weight: 600 });
  label(ctx, "people", 386, 126, { size: 11 });
  label(ctx, "rules", 386, 176, { size: 11 });
  label(ctx, "private context", 386, 226, { size: 11 });
  [126, 176, 226].forEach((y, index) => {
    const visible = stage === 0 ? index === 0 : stage === 1 ? index < 2 : true;
    dot(ctx, 340, y, 4, visible ? ACCENT_LIGHT : PAPER, visible ? ACCENT : MUTED, visible ? 1 : 0.28);
    line(ctx, 349, y, 425, y, visible ? ACCENT : MUTED, 0.9, visible ? 0.55 : 0.2);
  });

  drawMagnifier(ctx, lensX, 185, 1);
  label(ctx, evaluators[stage], lensX, 116, { color: ACCENT, size: 12, weight: 600 });
  wrappedLabel(
    ctx,
    stage === 0 ? "sees the accepted result" : stage === 1 ? "learns the organization’s bar" : "interprets proprietary context",
    lensX,
    271,
    145,
    13,
    { color: TEXT, size: 10 },
  );
}

function drawCoding(ctx: CanvasRenderingContext2D, p: number) {
  const items = [
    { name: "Codex", mode: "outside", detail: "observes whether the change merged", x: 32 },
    { name: "CodeRabbit", mode: "alongside", detail: "adapts to repository rules", x: 184 },
    { name: "uReview", mode: "inside Uber", detail: "uses codebase + developer feedback", x: 336 },
  ];
  line(ctx, 70, 235, 430, 235, MUTED, 1.2);
  arrow(ctx, 82, 235, 420, 235, MUTED, 0.75);
  items.forEach((item, index) => {
    const reveal = ease((p - index * 0.2) / 0.24);
    const active = p >= index * 0.3 && p < (index + 1) * 0.34;
    box(ctx, item.x, 91, 132, 110, active || index === 2 && p > 0.72, reveal, 8);
    label(ctx, item.name, item.x + 66, 119, { color: active ? ACCENT : TEXT, size: 14, weight: 600, opacity: reveal });
    label(ctx, item.mode, item.x + 66, 143, { color: active ? ACCENT : MUTED, italic: true, size: 10, opacity: reveal });
    wrappedLabel(ctx, item.detail, item.x + 66, 169, 108, 12, { color: TEXT, size: 9.5, opacity: reveal });
    dot(ctx, item.x + 66, 235, active ? 6 : 4, active ? ACCENT : PAPER, active ? ACCENT : MUTED, reveal);
    const context = index + 1;
    for (let ring = 0; ring < context; ring += 1) {
      ctx.save();
      ctx.globalAlpha = reveal * (0.48 - ring * 0.08);
      ctx.strokeStyle = index === 2 ? ACCENT : MUTED;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(item.x + 66, 304, 13 + ring * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
  label(ctx, "more organizational context →", 250, 374, { color: ACCENT, size: 11, italic: true, opacity: ease((p - 0.7) / 0.2) });
}

function drawEconomics(ctx: CanvasRenderingContext2D, p: number) {
  label(ctx, "what we count", 130, 30, { color: TEXT, size: 13, weight: 600 });
  label(ctx, "what we value", 370, 30, { color: ACCENT, size: 13, weight: 600 });
  box(ctx, 40, 57, 180, 240, false, 1);
  label(ctx, "AI activity", 130, 84, { color: TEXT, size: 14, weight: 600 });
  [0.48, 0.74, 0.9, 0.62].forEach((amount, index) => {
    const y = 121 + index * 36;
    label(ctx, index === 0 ? "tokens" : `retry ${index}`, 61, y, { size: 10, align: "left" });
    line(ctx, 110, y, 195, y, "#d8d5cd", 7, 1);
    line(ctx, 110, y, 110 + 85 * amount, y, index === 0 ? ACCENT : MUTED, 7, 1);
  });
  label(ctx, "$ activity", 130, 273, { color: MUTED, size: 12, weight: 600 });

  const reveal = ease((p - 0.22) / 0.32);
  box(ctx, 280, 57, 180, 240, p > 0.55, reveal || 0.06);
  label(ctx, "accepted workflow", 370, 84, { color: ACCENT, size: 14, weight: 600, opacity: reveal });
  ["AI attempt", "expert review", "accepted work"].forEach((item, index) => {
    const y = 126 + index * 54;
    box(ctx, 312, y - 16, 116, 32, index === 2, reveal, 5);
    label(ctx, item, 370, y, { color: index === 2 ? ACCENT : TEXT, size: 10, weight: index === 2 ? 600 : 400, opacity: reveal });
    if (index < 2) arrow(ctx, 370, y + 17, 370, y + 35, index === 1 ? ACCENT : MUTED, reveal);
  });
  label(ctx, "$ accepted outcome", 370, 273, { color: ACCENT, size: 12, weight: 600, opacity: reveal });

  const shift = ease((p - 0.65) / 0.25);
  arrow(ctx, 224, 327, 276, 327, ACCENT, shift);
  label(ctx, "cost and pricing move to the same unit", 250, 362, { color: ACCENT, size: 11, italic: true, opacity: shift });
}

function drawFuture(ctx: CanvasRenderingContext2D, p: number) {
  const nodes = [
    { name: "AI capability", x: 250, y: 59 },
    { name: "real work", x: 410, y: 148 },
    { name: "acceptance", x: 371, y: 307 },
    { name: "evaluation data", x: 129, y: 307 },
    { name: "better target", x: 90, y: 148 },
  ];
  nodes.forEach((node, index) => {
    const reveal = ease((p - index * 0.12) / 0.18);
    if (index > 0) {
      const prev = nodes[index - 1];
      arrow(ctx, prev.x, prev.y, node.x, node.y, index >= 2 ? ACCENT : MUTED, reveal * 0.75);
    }
    box(ctx, node.x - 55, node.y - 19, 110, 38, index === 2 || index === 3, reveal, 20);
    label(ctx, node.name, node.x, node.y, { color: index === 2 || index === 3 ? ACCENT : TEXT, size: 10.5, weight: index === 2 ? 600 : 400, opacity: reveal });
  });
  const close = ease((p - 0.62) / 0.2);
  arrow(ctx, nodes[4].x, nodes[4].y, nodes[0].x, nodes[0].y, ACCENT, close);
  dot(ctx, 250, 190, 48, WHITE, ACCENT, ease((p - 0.68) / 0.16));
  label(ctx, "Did the work", 250, 183, { color: TEXT, size: 13, weight: 600, opacity: ease((p - 0.7) / 0.14) });
  label(ctx, "count?", 250, 204, { color: ACCENT, size: 15, weight: 600, opacity: ease((p - 0.74) / 0.14) });
  label(ctx, "real acceptance keeps the improvement loop tied to utility", 250, 382, { color: ACCENT, size: 11, italic: true, opacity: ease((p - 0.82) / 0.14) });
}

const drawers: Record<SceneName, (ctx: CanvasRenderingContext2D, progress: number) => void> = {
  criteria: drawCriteria,
  acceptance: drawAcceptance,
  proximity: drawProximity,
  coding: drawCoding,
  economics: drawEconomics,
  future: drawFuture,
};

function ScrollDiagram({
  scene,
  labelText,
  caption,
  children,
  longCopy = false,
}: {
  scene: SceneName;
  labelText: string;
  caption: string;
  children: ReactNode;
  longCopy?: boolean;
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
      if (canvas.width !== Math.round(500 * ratio) || canvas.height !== Math.round(400 * ratio)) {
        canvas.width = Math.round(500 * ratio);
        canvas.height = Math.round(400 * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, 500, 400);
      context.lineCap = "round";
      context.lineJoin = "round";
      const rect = section.getBoundingClientRect();
      const mobile = window.innerWidth <= 900;
      const travel = Math.max(300, rect.height - 390);
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
    <div className={`scroll-section has-scene${longCopy ? " long-copy" : ""}`} ref={sectionRef}>
      <div className="section-inner">
        <div className="section-copy">
          <span className="section-label">{labelText}</span>
          {children}
        </div>
        <div className="section-viz">
          <canvas className="diagram-canvas" ref={canvasRef} role="img" aria-label={caption} />
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
          <h1>Proof-of-Workflow</h1>
          <p className="post-subtitle">AI evaluation based on real workflows</p>
          <p className="post-meta">A research note · <time dateTime="2026-08-04">August 2026</time></p>
        </header>

        <aside className="tldr" aria-labelledby="tldr-title">
          <span className="section-label" id="tldr-title">TL;DR</span>
          <p>
            Fixed benchmarks are becoming less useful for evaluating AI because they test fixed criteria,
            while every organization has different criteria that change with its work. Evaluation should
            instead prove that an AI-generated outcome meets those criteria inside the workflow as it
            actually operates—and is <strong>accepted</strong> by the people responsible for the work.
          </p>
          <p>
            We use <strong>Proof-of-Workflow</strong>, or <strong>PoW</strong>, as an umbrella term for these
            acceptance-based evaluation approaches. This essay explains why the shift is happening, why PoW
            is a better measure, who is best positioned to run it, how it changes AI economics, and what it
            could unlock.
          </p>
        </aside>

        <p className="mobile-notice">The diagrams are scroll-driven on larger screens and shown complete here.</p>

        <section className="act-group" aria-labelledby="act-one">
          <h2 className="act-heading" id="act-one">When work changes, evaluation must too</h2>
          <ScrollDiagram
            scene="criteria"
            labelText="§ 1.1 — One request, four definitions of success"
            caption="A fixed rubric can pass the wrong workflow—and fail the right one."
          >
            <p>
              Benchmarks are getting much better at testing AI on end-to-end professional tasks.
              <a href="https://www.swebench.com/original.html"> SWE-bench</a> asks agents to fix real software
              issues, <a href="https://www.mercor.com/apex/apex-agents-leaderboard/">APEX-Agents</a> covers
              investment banking, consulting, and law, <a href="https://arxiv.org/abs/2605.16679">χ-Bench</a>
              tests healthcare, and <a href="https://taubench.com/">τ-bench</a> evaluates customer-service agents.
            </p>
            <p>
              Yet every benchmark applies the same criteria to everyone. Real workflow criteria differ across
              organizations and change over time. Consider an
              <a href="https://github.com/sierra-research/tau2-bench/blob/main/data/tau2/domains/airline/tasks.json#L444-L543"> airline support task</a>:
              rebook two travelers and pay with one stored travel credit.
            </p>
          </ScrollDiagram>
          <TextSection labelText="§ 1.2 — The rubric is not the workflow">
            <p>
              The benchmark’s rubric only captures what works for the airline it was designed around. The
              same agent behavior might be correct for Delta, misuse a named credit at American Airlines, or
              violate Ryanair’s current identity rules. An agent can pass the test and still break company
              policy, expose customer data, or approve an invalid transaction.
            </p>
            <p>
              Airlines also make different tradeoffs around payment rules, cost, and latency. Even an internal
              benchmark can become outdated as those rules change. A fixed score is evidence, but it is not a
              universal definition of success.
            </p>
          </TextSection>
        </section>

        <section className="act-group" aria-labelledby="act-two">
          <h2 className="act-heading" id="act-two">A better way to judge AI work</h2>
          <ScrollDiagram
            scene="acceptance"
            labelText="§ 2.1 — From a proxy score to real acceptance"
            caption="Proof-of-Workflow asks whether the work cleared the real production bar."
          >
            <p>
              <a href="https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/">Academic studies</a> and
              <a href="https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/"> industry reports</a> identify the same gap between benchmark criteria and practical approval. Organizations increasingly pair scores with live measures such as A/B tests and user feedback.
            </p>
            <p>
              The most direct measure is whether an organization actually accepts AI-generated work in its
              real workflow. We refer to these approaches collectively as <strong>Proof-of-Workflow</strong>.
            </p>
            <div className="choice-box">
              <h3>People responsible for the work decide what counts</h3>
              <p>The organization sees current rules and tradeoffs that cannot fit inside a simplified rubric.</p>
            </div>
            <div className="choice-box">
              <h3>The test uses the real data and tools</h3>
              <p>Performance is measured in the setting where value is actually created, not an arbitrary test setup.</p>
            </div>
          </ScrollDiagram>
        </section>

        <section className="act-group" aria-labelledby="act-three">
          <h2 className="act-heading" id="act-three">How close the evaluator must be</h2>
          <ScrollDiagram
            scene="proximity"
            labelText="§ 3.1 — Outside, alongside, or inside"
            caption="The evaluator moves closer as acceptance depends on more organizational context."
            longCopy
          >
            <p>
              The right evaluator depends on how close it must be to the organization’s people, rules, and
              private context to understand the approval decision reliably.
            </p>
            <h3 className="case-heading">Case 1 · Outside the organization</h3>
            <p>
              Some workflows record acceptance through a clear event an outside evaluator can interpret with
              limited company context. Codex and Claude Code can observe whether a proposed code change was
              reviewed and merged. The organization still decides; the evaluator sees the result.
            </p>
            <p>
              Outside does not mean disconnected. The evaluator still needs access to the work and its final
              outcome. It simply does not need to reconstruct every company-specific reason behind the decision.
            </p>
            <h3 className="case-heading">Case 2 · Alongside the organization</h3>
            <p>
              When the acceptance bar is company-specific but explainable, an outside evaluator can work in
              close collaboration. Sierra can learn an airline’s fare rules, privacy requirements, and
              definition of resolution while reusing a common evaluation process across customers.
            </p>
            <p>
              The same pattern appears elsewhere: Ramp can observe whether an expense recommendation stands,
              Harvey whether lawyers approve a draft, and Abridge whether clinicians sign a note.
            </p>
            <h3 className="case-heading">Case 3 · Inside the organization</h3>
            <p>
              Some acceptance decisions require so much internal context that an outside evaluator cannot
              interpret them reliably. Zoox is a clear example: test results only become meaningful through
              proprietary vehicle design, safety standards, and operating conditions. The final PoW evaluation
              belongs inside Zoox.
            </p>
          </ScrollDiagram>

          <ScrollDiagram
            scene="coding"
            labelText="§ 3.2 — The coding spectrum"
            caption="Coding shows all three evaluator positions inside one domain."
          >
            <p>
              Coding makes the proximity spectrum concrete. Codex can observe a merge from outside.
              CodeRabbit works alongside teams by adapting to repository rules. Uber keeps its own review
              system, <strong>uReview</strong>, inside because useful judgment depends on its codebase and
              developer feedback.
            </p>
            <p>
              PoW therefore does not need to come from a company whose main business is evaluation. The best
              evaluator is often simply the one already close enough to the workflow to see whether people
              actually approve the AI-generated outcome.
            </p>
          </ScrollDiagram>
        </section>

        <section className="act-group" aria-labelledby="act-four">
          <h2 className="act-heading" id="act-four">From AI use to AI value</h2>
          <ScrollDiagram
            scene="economics"
            labelText="§ 4.1 — Cost and pricing follow accepted work"
            caption="The economic unit shifts from AI activity to accepted workflows."
            longCopy
          >
            <p>
              Proof-of-Workflow reshapes AI economics in two linked stages. First it changes how we measure
              cost. Once accepted work becomes that unit of measurement, it can become the basis for pricing.
            </p>
            <h3 className="case-heading">Cost shifts from activity to accepted work</h3>
            <p>
              Tokens tell us how much AI was used, not whether the work was good enough to use. Cheap inference
              can become expensive after retries and expert corrections, while a more expensive model may lower
              total cost if it clears the production bar in fewer attempts.
            </p>
            <p>
              Satya Nadella has argued for optimizing the
              <a href="https://www.itpro.com/technology/artificial-intelligence/we-are-now-seeing-mai-models-outperform-general-purpose-frontier-models-microsoft-ceo-satya-nadella-touts-in-house-models-to-cut-spiralling-ai-costs-and-reduce-growing-reliance-on-frontier-labs"> cost-to-outcome frontier</a>, while OpenAI CFO Sarah Friar frames the metric as
              <a href="https://openai.com/index/a-scorecard-for-the-ai-age/"> cost per successful task</a>.
              PoW defines success as acceptance in the real workflow: cost per accepted workflow.
            </p>
            <h3 className="case-heading">Pricing follows the same unit</h3>
            <p>
              Sierra already charges when its agents achieve business outcomes agreed with the customer. The
              same commercial logic is appearing in
              <a href="https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes"> customer support</a>,
              <a href="https://www.eudia.com/blog/the-roi-of-an-ai-native-law-firm"> legal services</a>,
              <a href="https://swordhealth.com/value/fair-pricing"> healthcare</a>, and
              <a href="https://www.riskified.com/chargeback-guarantee/"> finance</a>. Pricing moves away from AI
              activity and toward work that meets the customer’s needs.
            </p>
          </ScrollDiagram>
        </section>

        <section className="act-group" aria-labelledby="act-five">
          <h2 className="act-heading" id="act-five">What better evaluation could unlock</h2>
          <ScrollDiagram
            scene="future"
            labelText="§ 5.1 — Judgment closes the improvement loop"
            caption="Every acceptance decision gives the next system a better target."
            longCopy
          >
            <p>
              Evaluating AI in real workflows is not a new idea;
              <a href="https://agents.cs.princeton.edu/"> AI Agents That Matter</a> argued for it in 2024. What
              changed is the timing. AI can now attempt serious professional workflows end to end, creating a
              new bottleneck: deciding which outputs are reliable enough to use.
            </p>
            <p>
              <a href="https://arxiv.org/abs/2607.01904">Production research</a> suggests that reliable judgment
              is becoming scarce—an idea Alfred Lin has also
              <a href="https://outlierspath.com/2026/03/23/ai-adoption-vs-ai-advantage/"> discussed</a>. That
              scarcity makes evaluation, including PoW, increasingly valuable.
            </p>
            <p>
              No single method or player can cover every acceptance decision. Data and evaluation companies are
              entering too: Scale AI is turning expert approvals from real work into organization-specific
              evaluations through <a href="https://scale.com/blog/dialect">Dialect</a>.
            </p>
            <p>
              As enterprises make standards clearer, vendors can improve systems against human judgment and
              organizations can hand more nuanced work to AI with greater confidence. Because those decisions
              come from real work, the feedback loop can keep up with work that is varied and fast-changing.
            </p>
            <p>
              As that loop spreads across industries, the gains can compound. Proof-of-Workflow can ground
              recursive improvement in actual utility—turning more AI capability into more useful work.
            </p>
          </ScrollDiagram>
          <p className="final-question">As AI takes on more of the world’s work, one question will matter most: <em>Did the work count?</em></p>
        </section>

        <footer className="post-footer">
          <span>Proof-of-Workflow</span>
          <span>Acceptance is the measure</span>
        </footer>
      </article>
    </main>
  );
}
