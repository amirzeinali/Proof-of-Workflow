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

const smootherEase = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
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

type EmojiSprite = {
  canvas: HTMLCanvasElement;
  left: number;
  top: number;
  width: number;
  height: number;
};

const emojiSprites = new Map<string, EmojiSprite>();

function emojiSprite(glyph: string) {
  const cached = emojiSprites.get(glyph);
  if (cached) return cached;

  const scale = 2;
  const size = 72;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.font = `${18 * scale}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(glyph, size / 2, size / 2);

  const pixels = context.getImageData(0, 0, size, size).data;
  let left = size;
  let right = -1;
  let top = size;
  let bottom = -1;
  for (let pixel = 0; pixel < pixels.length; pixel += 4) {
    if (pixels[pixel + 3] === 0) continue;
    const index = pixel / 4;
    const pixelX = index % size;
    const pixelY = Math.floor(index / size);
    left = Math.min(left, pixelX);
    right = Math.max(right, pixelX);
    top = Math.min(top, pixelY);
    bottom = Math.max(bottom, pixelY);
  }
  if (right < left || bottom < top) return null;

  const sprite = { canvas, left, top, width: right - left + 1, height: bottom - top + 1 };
  emojiSprites.set(glyph, sprite);
  return sprite;
}

function statusEmoji(ctx: CanvasRenderingContext2D, x: number, y: number, ok: boolean, opacity = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  const glyph = ok ? "✅" : "❌";
  const sprite = emojiSprite(glyph);
  if (sprite) {
    const width = sprite.width / 2;
    const height = sprite.height / 2;
    ctx.drawImage(
      sprite.canvas,
      sprite.left,
      sprite.top,
      sprite.width,
      sprite.height,
      x - width / 2,
      y - height / 2,
      width,
      height,
    );
  }
  ctx.restore();
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color = MUTED, opacity = 1) {
  line(ctx, x1, y1, x2, y2, color, 1.4, opacity);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  line(ctx, x2, y2, x2 - 8 * Math.cos(angle - 0.55), y2 - 8 * Math.sin(angle - 0.55), color, 1.4, opacity);
  line(ctx, x2, y2, x2 - 8 * Math.cos(angle + 0.55), y2 - 8 * Math.sin(angle + 0.55), color, 1.4, opacity);
}

function curvedArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  progress: number,
  color = MUTED,
  opacity = 1,
) {
  const amount = smootherEase(progress);
  if (amount <= 0) return;
  const distance = x2 - x1;
  const control1 = { x: x1 + distance * 0.4, y: y1 };
  const control2 = { x: x1 + distance * 0.76, y: y2 };
  const pointAt = (t: number) => {
    const inverse = 1 - t;
    return {
      x: inverse ** 3 * x1 + 3 * inverse ** 2 * t * control1.x + 3 * inverse * t ** 2 * control2.x + t ** 3 * x2,
      y: inverse ** 3 * y1 + 3 * inverse ** 2 * t * control1.y + 3 * inverse * t ** 2 * control2.y + t ** 3 * y2,
    };
  };
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const segments = 36;
  for (let index = 1; index <= segments; index += 1) {
    const t = amount * (index / segments);
    const point = pointAt(t);
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  if (amount > 0.96) {
    const end = pointAt(amount);
    const previous = pointAt(Math.max(0, amount - 0.035));
    const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
    const arrowLength = 8;
    const spread = 0.55;
    ctx.beginPath();
    ctx.moveTo(
      end.x - arrowLength * Math.cos(angle - spread),
      end.y - arrowLength * Math.sin(angle - spread),
    );
    ctx.lineTo(end.x, end.y);
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle + spread),
      end.y - arrowLength * Math.sin(angle + spread),
    );
    ctx.stroke();
  }
  ctx.restore();
}

function shadeOutdated(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity: number,
) {
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = opacity * 0.46;
  ctx.fillStyle = "rgba(140,138,128,.14)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 7);
  ctx.clip();
  ctx.strokeStyle = MUTED;
  ctx.lineWidth = 0.8;
  for (let offset = -height; offset < width + height; offset += 12) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + height);
    ctx.lineTo(x + offset + height, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCriteria(ctx: CanvasRenderingContext2D, p: number) {
  box(ctx, 14, 112, 176, 98, p < 0.12, 1, 8);
  label(ctx, "Benchmark Task", 102, 129, { color: ACCENT, size: 10.5, weight: 600 });
  wrappedLabel(ctx, "A customer asks the agent to repeat a booking for two travelers, retrieve personal information from her profile, and pay with one stored travel credit.", 102, 150, 148, 10.8, {
    color: TEXT,
    size: 8.7,
  });

  box(ctx, 14, 250, 176, 106, false, 1, 8);
  label(ctx, "Expected Benchmark Rubric", 102, 267, { color: ACCENT, size: 9.7, weight: 600 });
  wrappedLabel(ctx, "The only acceptable option is for the agent to access the profile and complete both tickets using that credit. Stopping for identity verification or requesting another payment method is scored as a failure.", 102, 286, 148, 10.2, {
    color: TEXT,
    size: 8.25,
  });

  const rows = [
    { name: "Delta", reason: "Complete both tickets using the customer’s gift card", ok: true, y: 58, start: 0.1, portY: 126, nameHeight: 30, reasonHeight: 40, reasonLines: 2 },
    { name: "American Airlines", reason: "Use the flight credit only for its named traveler, then request payment for the second ticket", ok: false, y: 139, start: 0.29, portY: 149, nameHeight: 38, reasonHeight: 48, reasonLines: 4 },
    { name: "Ryanair · before", reason: "Verify the customer’s identity before allowing access to the reservation", ok: false, y: 220, start: 0.48, portY: 172, nameHeight: 38, reasonHeight: 50, reasonLines: 3 },
    { name: "Ryanair · now", reason: "Access the reservation without separate verification and continue", ok: true, y: 323, start: 0.78, portY: 195, nameHeight: 38, reasonHeight: 50, reasonLines: 3 },
  ];

  label(ctx, "Live Setting", 268, 17, { color: TEXT, size: 9.2, weight: 600 });
  wrappedLabel(ctx, "Passes the Rubric?", 329, 12, 62, 10, { color: TEXT, size: 8.3, weight: 600 });
  wrappedLabel(ctx, "What should count as success?", 421, 12, 132, 10, { color: TEXT, size: 8.5, weight: 600 });

  rows.forEach((row, index) => {
    const arrowReveal = smootherEase((p - row.start) / 0.12);
    const reveal = smootherEase((p - row.start - 0.035) / 0.13);
    const nextStart = index < rows.length - 1 ? rows[index + 1].start : 1.2;
    const recede = smootherEase((p - nextStart + 0.015) / 0.11);
    const active = reveal * (1 - recede);
    const y = row.y + (1 - reveal) * 9;
    const outdated = index === 2 ? smootherEase((p - 0.67) / 0.12) : 0;
    const rowOpacity = reveal * (index === 2 ? 1 - outdated * 0.48 : 1);

    curvedArrow(ctx, 190, row.portY, 226, y, arrowReveal, MUTED, Math.max(0.28, rowOpacity));
    curvedArrow(ctx, 190, row.portY, 226, y, arrowReveal, ACCENT, active * 0.95);

    box(ctx, 230, y - row.nameHeight / 2, 76, row.nameHeight, false, rowOpacity, 7);
    box(ctx, 230, y - row.nameHeight / 2, 76, row.nameHeight, true, active * (1 - outdated), 7);
    wrappedLabel(ctx, row.name, 268, y - (row.nameHeight > 30 ? 5 : 0), 64, 10, {
      color: TEXT,
      size: row.name === "American Airlines" ? 8.3 : 9.2,
      weight: 600,
      opacity: rowOpacity,
    });

    box(ctx, 312, y - 15, 34, 30, false, rowOpacity, 7);
    statusEmoji(ctx, 329, y, row.ok, rowOpacity);

    box(ctx, 352, y - row.reasonHeight / 2, 138, row.reasonHeight, false, rowOpacity, 7);
    wrappedLabel(ctx, row.reason, 421, y - ((row.reasonLines - 1) * 10.4) / 2, 120, 10.4, {
      color: TEXT,
      size: 8.35,
      opacity: rowOpacity,
    });

    if (index === 2) {
      shadeOutdated(ctx, 226, y - 29, 267, 58, outdated * reveal);
      label(ctx, "Policy outdated", 268, y + 35, {
        color: ACCENT,
        size: 9.2,
        weight: 600,
        opacity: outdated * reveal,
      });
    }
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
    <div className={`scroll-section has-scene scene-${scene}${longCopy ? " long-copy" : ""}`} ref={sectionRef}>
      <div className="section-inner">
        <div className="section-copy">
          {labelText ? <span className="section-label">{labelText}</span> : null}
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
          <p className="post-subtitle">AI Evaluation Based on Real Workflows</p>
        </header>

        <aside className="tldr" aria-labelledby="tldr-title">
          <span className="section-label" id="tldr-title">TL;DR</span>
          <p>
            Fixed benchmarks are becoming less useful for evaluating AI. This is because they measure
            performance against fixed criteria, even though each organization has different criteria that
            change with the needs of their work. Evaluation should therefore <u>prove</u> that an
            AI-generated outcome meets those criteria within the <u>workflow</u> as it actually operates and is
            thus <strong>accepted</strong> by the people who are responsible for the work.
          </p>
          <p>
            In this blog post, we use <strong>Proof-of-Workflow</strong>, or <strong>PoW</strong>, as an umbrella
            term for acceptance-based evaluation approaches already taking different forms in practice but
            rarely grouped together. We explain 1) why this shift is happening, 2) why PoW is a better measure,
            3) who is best positioned to run these evaluations, 4) how PoW changes the economics of AI, and
            finally 5) what the future could look like with PoW.
          </p>
        </aside>

        <p className="mobile-notice">The diagrams are scroll-driven on larger screens and shown complete here.</p>

        <section className="act-group" aria-labelledby="act-one">
          <h2 className="act-heading" id="act-one">1. When Work Changes, Evaluation Must Too</h2>
          <ScrollDiagram
            scene="criteria"
            labelText=""
            caption="One task, different definitions of success."
          >
            <p>
              Benchmarks are getting much better at testing AI on end-to-end professional tasks across
              different fields. <a href="https://www.swebench.com/original.html">SWE-bench</a> asks agents to
              fix real software issues, <a href="https://www.mercor.com/apex/apex-agents-leaderboard/">APEX-Agents</a> covers tasks in investment banking, consulting, and law,
              <a href="https://arxiv.org/abs/2605.16679"> χ-Bench</a> tests healthcare tasks, and
              <a href="https://taubench.com/"> τ-bench</a> evaluates customer-service agents. But every
              benchmark still applies the same fixed criteria to everyone, even though criteria for real
              workflows 1) differ across organizations and 2) change over time.
            </p>
            <p>
              To see why this matters, let’s consider a
              <a href="https://github.com/sierra-research/tau2-bench/blob/main/data/tau2/domains/airline/tasks.json#L444-L543"> simple airline customer-support task</a> from the τ²-bench.
            </p>
          </ScrollDiagram>
          <TextSection labelText="The benchmark’s rubric is not universal">
            <p>
              You can see in the diagram that a benchmark&apos;s rubric only shows what works for one airline for
              the airline it was designed around; it’s not a universal definition of success. The agent could
              pass that test and still break the rules of the airline using it, expose its customer data, or
              approve the invalid transaction. Airlines also make different tradeoffs around payment rules,
              cost, and latency, so a faster but expensive process may be fine for one airline and not for
              another. Within each airline, the rules keep changing too, which means even an internal benchmark
              can become outdated, as the Ryanair example shows.<sup><a href="#note-3">3</a></sup>
            </p>
          </TextSection>
        </section>

        <section className="act-group" aria-labelledby="act-two">
          <h2 className="act-heading" id="act-two">2. A Better Way to Judge AI Work</h2>
          <ScrollDiagram
            scene="acceptance"
            labelText="Proof-of-Workflow"
            caption="Evaluate whether an organization actually accepts AI-generated work in its real workflow."
            longCopy
          >
            <p>
              <a href="https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/">Academic studies</a> and
              <a href="https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/"> industry reports</a> have also identified the same gap between benchmark criteria and real approval criteria in practice. As a result, organizations increasingly pair benchmark scores with evaluation approaches that use live measures such as A/B tests and user feedback.<sup><a href="#note-1">1</a></sup> Among these approaches, the most direct, and <em>in our belief</em> the most useful, is to evaluate whether an organization actually accepts AI-generated work in its real workflow. We refer to such approaches collectively as <strong>Proof-of-Workflow</strong>.
            </p>
            <p>
              We think PoW works better here for two main reasons:
            </p>
            <ol className="pow-list">
              <li>
                <strong>First, PoW lets the people responsible for the work decide what counts as good instead
                of using a benchmark as a stand-in for their judgment.</strong> While a benchmark can only have
                a simplified version of what a practical result should look like, the organization using the
                output sees the entire situation, including current rules and practical tradeoffs that may
                never fit into a rubric. By asking whether the organization approved the work, PoW brings all
                of the requirements into one decision.
              </li>
              <li>
                <strong>Second, since PoW tests AI on the organization’s real work, it uses the same data and
                tools it would use on the job instead of arbitrary tasks in a fixed test setup.</strong> This
                lets us measure performance in the setting where real value is created.
              </li>
            </ol>
            <p>Now that we know what PoW measures, we still need to figure out who should actually evaluate the work.</p>
          </ScrollDiagram>
        </section>

        <section className="act-group" aria-labelledby="act-three">
          <h2 className="act-heading" id="act-three">3. How Close the Evaluator Must Be to the Organization</h2>
          <ScrollDiagram
            scene="proximity"
            labelText="Three cases"
            caption="How close the evaluator must be to the organization."
            longCopy
          >
            <p>
              We try to answer it by looking at how close the evaluator must be to the organization’s people,
              rules, and private context to understand the approval decision reliably. We trace how the answer
              changes across three cases.
            </p>
            <h3 className="case-heading">Case 1. The Evaluator Works <em>Outside</em> the Organization</h3>
            <p>
              Some workflows record acceptance through a clear and structured event that an outside evaluator
              can interpret with limited company context. Codex and Claude Code show this pattern. Since they
              can observe whether a proposed code change was reviewed and merged, they can see whether the
              AI-generated work cleared a real workflow without placing an evaluator inside every company. The
              organization still makes the final decision; the evaluator just sees the results.<sup><a href="#note-4">4</a></sup>
            </p>
            <p>
              Keep in mind that working outside the organization does not mean being disconnected from the
              workflow. The evaluator still needs access to the work and its final outcome but does not need to
              reconstruct every company-specific reason behind the decision. When the outcome alone is no
              longer enough to understand acceptance, the evaluator must move closer.
            </p>
            <h3 className="case-heading">Case 2. The Evaluator Works <em>Alongside</em> the Organization</h3>
            <p>
              In the middle case, the acceptance bar is specific to the organization, but it can still be
              explained to an outside evaluator through close collaboration. Sierra shows this well. Returning
              to our airline example, it would need to learn the airline’s current fare rules, privacy
              requirements, and definition of a successful resolution. Still, the workflows remain similar
              enough across organizations for Sierra to reuse the same basic evaluation process across customers
              while adapting it to each airline’s standards.<sup><a href="#note-5">5</a></sup>
            </p>
            <p>
              A similar pattern appears in other workflows. Ramp can observe whether an expense recommendation
              stands, Harvey whether lawyers approve a draft, and Abridge whether clinicians sign a note. In
              each case, the organization can make enough of its requirements clear for the platform to evaluate
              the outcome meaningfully.<sup><a href="#note-6">6</a></sup>
            </p>
            <p>
              Working alongside the organization is enough only when the acceptance can be clearly explained
              and shared. In some workflows, transferring enough context to an outside evaluator would be nearly
              as difficult as keeping the evaluation inside the company.
            </p>
            <h3 className="case-heading">Case 3. The Evaluator Works <em>Inside</em> the Organization</h3>
            <p>
              At the closest end of the spectrum, understanding acceptance requires so much internal context
              that an outside evaluator cannot interpret it reliably without becoming deeply embedded in the
              organization. The evaluator would need deep internal knowledge to understand what the test results
              actually mean. The workflow is also too specific for an outside platform to learn one general
              evaluation process and reuse it across companies.
            </p>
            <p>
              Zoox provides a neat example of this case. For Zoox, a test result only becomes meaningful when
              viewed through the company’s understanding of its proprietary vehicle design, safety standards,
              and operating conditions. An outside provider may help run parts of the process, but explaining
              enough of the complicated context for it to make the final decision would be impractical. Zoox
              would therefore keep the final PoW evaluation inside the organization.<sup><a href="#note-7">7</a></sup>
            </p>
          </ScrollDiagram>

          <ScrollDiagram
            scene="coding"
            labelText="Coding across the same spectrum"
            caption="Coding offers a clear example of how the evaluator moves closer as more organizational context is needed."
          >
            <p>
              More broadly, we can see all three levels within the same domain or even the same company. Coding
              offers a clear example of how the evaluator moves closer as more organizational context is needed.
              Codex can observe a merge from <em>outside</em>, CodeRabbit works <em>alongside</em> teams by
              adapting to their repository rules, and Uber keeps its own code review system, uReview,
              <em> inside</em> because useful judgment depends on its own codebase and developer feedback.<sup><a href="#note-8">8</a></sup>
            </p>
            <p>
              Together, we see across these examples is that PoW does not need to come from a company whose
              main business is evaluation. Often, the company in the best position is simply the one already
              close enough to the workflow to see whether people actually approve the AI-generated outcome.
              When that judgment becomes measurable, it creates real economic value and starts to change both
              what AI costs and how providers charge for it
            </p>
          </ScrollDiagram>
        </section>

        <section className="act-group" aria-labelledby="act-four">
          <h2 className="act-heading" id="act-four">4. From AI Use to AI Value</h2>
          <ScrollDiagram
            scene="economics"
            labelText="Two linked stages"
            caption="Cost shifts from AI activity to accepted work."
            longCopy
          >
            <p>
              More specifically, it is easier to see how PoW reshapes AI economics when we break the shift into
              two linked stages. First, it changes how we measure cost, and once accepted work becomes the basis
              for that measurement, it becomes the basis for pricing. Let’s take a closer look at each stage:
            </p>
            <h3 className="case-heading">1. Cost shifts from AI activity to accepted work</h3>
            <p>
              The first stage begins with a mismatch between what we count and what we actually value. Tokens
              consumed can help us know how much AI was used, but not whether the resulting work was good enough
              to use. Cheap inference can become expensive after retries and expert corrections, while a more
              expensive model may lower the total cost if it clears the production bar in fewer attempts. Satya
              Nadella has argued for optimizing the
              <a href="https://www.itpro.com/technology/artificial-intelligence/we-are-now-seeing-mai-models-outperform-general-purpose-frontier-models-microsoft-ceo-satya-nadella-touts-in-house-models-to-cut-spiralling-ai-costs-and-reduce-growing-reliance-on-frontier-labs"> cost-to-outcome frontier</a>, while OpenAI CFO Sarah Friar frames the metric as
              <a href="https://openai.com/index/a-scorecard-for-the-ai-age/"> cost per successful task</a>. PoW
              follows the same logic by defining success as acceptance in the real workflow, which leads to
              measuring cost per accepted workflow
            </p>
            <h3 className="case-heading">2. Pricing follows the same unit</h3>
            <p>
              Subsequently, when accepted work becomes the unit of cost, providers can also use it as the basis
              for pricing. Back to customer support, Sierra already applies this logic by charging when its
              agents achieve business outcomes agreed upon with the customer.<sup><a href="#note-9">9</a></sup> The same commercial logic is
              appearing elsewhere in
              <a href="https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes"> customer support</a>, and in fields such
              <a href="https://www.eudia.com/blog/the-roi-of-an-ai-native-law-firm"> legal services</a>,
              <a href="https://swordhealth.com/value/fair-pricing"> healthcare</a>, and
              <a href="https://www.riskified.com/chargeback-guarantee/"> finance</a>, where payment may depend on
              recovered compensation, measurable clinical improvement, or approved transactions. Across these
              examples, the direction is consistent. Pricing is shifting away from AI activity and toward work
              that meets the customer’s needs.
            </p>
          </ScrollDiagram>
        </section>

        <section className="act-group" aria-labelledby="act-five">
          <h2 className="act-heading" id="act-five">5. What Better Evaluation Could Unlock</h2>
          <ScrollDiagram
            scene="future"
            labelText="What better evaluation could unlock"
            caption="Each acceptance decision gives the next version a better target."
            longCopy
          >
            <p>
              Outcome-based pricing is only the first visible consequence of a broader shift toward PoW. The
              idea of moving beyond static benchmarks and evaluating AI in real workflows, however, is not new,
              as <a href="https://agents.cs.princeton.edu/"><em>AI Agents That Matter</em></a> argued in 2024.
              But what has changed is the timing. Even two years ago, PoW would have been premature because
              models still struggled to complete serious workflows, even under controlled benchmark conditions
              of static benchmarks. Today, AI can attempt and increasingly complete those tasks end to end, so
              we are beginning to use it for professional work.
            </p>
            <p>
              In turn, the same capability shift creates the next bottleneck. As AI produces more work,
              organizations face the harder task of deciding which outputs are reliable enough to use.
              <a href="https://arxiv.org/abs/2607.01904"> Production research</a> suggests that the ability to
              judge all this work reliably is becoming a scarce resource,
              <a href="https://outlierspath.com/2026/03/23/ai-adoption-vs-ai-advantage/"> an idea</a> Alfred Lin
              has also discussed. And this scarcity is, in fact, what makes reliable evaluation, including PoW,
              increasingly valuable.
            </p>
            <p>
              And as value begins to accumulate around judgment, more players will naturally offer these
              evaluations, including the groups we discussed above. Yet the pie is huge, and because acceptance
              depends on the specific task, no single method or player can cover everything, leaving plenty of
              room for others to participate in PoW. Data and evaluation companies have already begun to take
              part too. Scale AI, for example, is moving in this direction by turning expert approvals from real
              work into organization-specific evaluations.<sup><a href="#note-2">2</a></sup>
            </p>
            <p>
              No matter who runs PoW, its larger value is that it connects fast-growing AI capability to work
              people actually need. As enterprises make their standards clearer, vendors can test and improve
              systems against human judgment, and organizations can hand more nuanced work to AI with greater
              confidence. Each acceptance decision gives the next version a better target. Because those
              decisions come from real work, the feedback loop can keep up with how 1) varied and 2)
              fast-changing that work is. As the loop spreads across industries and then across the wider
              economy, the gains can compound. At that scale, PoW could help ground and accelerate recursive
              self-improvement, making the shift deeply positive-sum and turning more AI capability into more
              utility for everyone.
            </p>
          </ScrollDiagram>
          <p className="final-question">Finally, as AI takes on more of the world’s work, one question will matter most. <em>Did the work count?</em></p>
          <ol className="source-notes">
            <li id="note-1">Measuring Agents in Production: <a href="https://arxiv.org/abs/2512.04123">https://arxiv.org/abs/2512.04123</a></li>
            <li id="note-2"><a href="https://scale.com/blog/dialect">https://scale.com/blog/dialect</a></li>
            <li id="note-3"><a href="https://github.com/sierra-research/tau2-bench/blob/main/data/tau2/domains/airline/tasks.json#L444-L543">Sierra Research, τ²-bench airline task and policy data</a></li>
            <li id="note-4"><a href="https://openai.com/index/introducing-codex/">OpenAI, Introducing Codex</a>; <a href="https://code.claude.com/docs/en/github-actions">Anthropic, Claude Code GitHub Actions</a></li>
            <li id="note-5"><a href="https://github.com/sierra-research/tau2-bench">Sierra Research, τ²-bench</a></li>
            <li id="note-6"><a href="https://support.ramp.com/policy-agent-overview/">Ramp, Policy Agent</a>; <a href="https://www.harvey.ai/blog/ai-for-legal-drafting">Harvey, AI for legal drafting</a>; <a href="https://www.abridge.com/press-release/highmark-health-ahn-abridge-prior-authorization">Abridge, real-time clinical notes</a></li>
            <li id="note-7"><a href="https://zoox.com/common/files/zoox-safety-report-volume-3-0-published-2024.pdf">Zoox, Operational Safety</a></li>
            <li id="note-8"><a href="https://docs.coderabbit.ai/knowledge-base/learnings">CodeRabbit, Learnings</a>; <a href="https://www.uber.com/us/en/blog/ureview/">Uber, uReview</a></li>
            <li id="note-9"><a href="https://sierra.ai/product">Sierra, Product overview and outcome-based pricing</a></li>
          </ol>
        </section>
      </article>
    </main>
  );
}
