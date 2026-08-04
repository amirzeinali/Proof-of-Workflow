"use client";

import { ReactNode, useEffect, useRef } from "react";

type SceneName =
  | "criteria"
  | "proximity"
  | "coding"
  | "pie";

const INK = "#262624";
const TEXT = "#2a2926";
const MUTED = "#8c8a80";
const ACCENT = "#9b2d2d";
const SUCCESS = "#2f7d32";
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

function wrappedHighlightedLabel(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  highlights: Record<string, string>,
  options: Parameters<typeof label>[4] = {},
) {
  const words = value.split(" ");
  const lines: string[][] = [];
  let current: string[] = [];
  const style = options.italic ? "italic " : "";
  const weight = options.weight ?? 400;
  ctx.save();
  ctx.font = `${style}${weight} ${options.size ?? 12}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;
  words.forEach((word) => {
    const next = [...current, word];
    if (ctx.measureText(next.join(" ")).width > maxWidth && current.length) {
      lines.push(current);
      current = [word];
    } else {
      current = next;
    }
  });
  if (current.length) lines.push(current);

  ctx.globalAlpha = options.opacity ?? 1;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  lines.forEach((row, rowIndex) => {
    const rowWidth = ctx.measureText(row.join(" ")).width;
    let cursor = x - rowWidth / 2;
    row.forEach((word, wordIndex) => {
      const chunk = wordIndex === 0 ? word : ` ${word}`;
      const key = word.toLowerCase().replace(/[^a-z]/g, "");
      ctx.fillStyle = highlights[key] ?? options.color ?? MUTED;
      ctx.fillText(chunk, cursor, y + rowIndex * lineHeight);
      cursor += ctx.measureText(chunk).width;
    });
  });
  ctx.restore();
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
const logoPaths = [
  "/logos/github.svg",
  "/logos/delta.svg",
  "/logos/american-airlines.svg",
  "/logos/ryanair.svg",
  "/logos/zoox.svg",
];
const canvasImages = new Map<string, HTMLImageElement>();

function canvasImage(path: string) {
  const cached = canvasImages.get(path);
  if (cached) return cached;
  if (typeof window === "undefined") return null;
  const image = new window.Image();
  image.src = path;
  canvasImages.set(path, image);
  return image;
}

function containedImage(
  ctx: CanvasRenderingContext2D,
  path: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity = 1,
) {
  const image = canvasImage(path);
  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(
    image,
    x + (width - renderedWidth) / 2,
    y + (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  );
  ctx.restore();
}

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
  const control2 = { x: x1 + distance * 0.76, y: y1 + (y2 - y1) * 0.75 };
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
    const arrowLength = 9;
    const arrowHalfWidth = 5;
    const baseX = end.x - arrowLength * Math.cos(angle);
    const baseY = end.y - arrowLength * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      baseX - arrowHalfWidth * Math.sin(angle),
      baseY + arrowHalfWidth * Math.cos(angle),
    );
    ctx.lineTo(
      baseX + arrowHalfWidth * Math.sin(angle),
      baseY - arrowHalfWidth * Math.cos(angle),
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
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
  wrappedHighlightedLabel(
    ctx,
    "The only acceptable option is for the agent to access the profile and complete both tickets using that credit. Stopping for identity verification or requesting another payment method is scored as a failure.",
    102,
    286,
    148,
    10.2,
    { acceptable: SUCCESS, failure: ACCENT },
    { color: TEXT, size: 8.25 },
  );

  const rows = [
    { name: "Delta", reason: "Complete both tickets using the customer’s gift card", ok: true, y: 58, start: 0.1, portY: 126, nameHeight: 30, reasonHeight: 40, reasonLines: 2 },
    { name: "American Airlines", reason: "Use the flight credit only for its named traveler, then request payment for the second ticket", ok: false, y: 139, start: 0.29, portY: 149, nameHeight: 38, reasonHeight: 48, reasonLines: 4 },
    { name: "Ryanair · before", reason: "Verify the customer’s identity before allowing access to the reservation", ok: false, y: 220, start: 0.48, portY: 172, nameHeight: 38, reasonHeight: 50, reasonLines: 3 },
    { name: "Ryanair · now", reason: "Access the reservation without separate verification and continue", ok: true, y: 323, start: 0.78, portY: 195, nameHeight: 38, reasonHeight: 50, reasonLines: 3 },
  ];

  label(ctx, "Live Setting", 268, 17, { color: TEXT, size: 9.2, weight: 600 });
  wrappedLabel(ctx, "Passes the Rubric?", 329, 12, 62, 10, { color: TEXT, size: 8.3, weight: 600 });
  wrappedLabel(ctx, "What should count as success?", 421, 17, 132, 10, { color: TEXT, size: 8.5, weight: 600 });

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

function drawMagnifier(ctx: CanvasRenderingContext2D, x: number, y: number, opacity = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.shadowColor = "rgba(38,38,36,.16)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "rgba(255,255,255,.42)";
  ctx.beginPath();
  ctx.arc(x, y, 33, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5.5;
  ctx.stroke();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(x, y, 28.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,.92)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 21, Math.PI * 1.08, Math.PI * 1.55);
  ctx.stroke();

  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(x + 24, y + 24);
  ctx.lineTo(x + 55, y + 55);
  ctx.stroke();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + 25, y + 25);
  ctx.lineTo(x + 55, y + 55);
  ctx.stroke();
  ctx.restore();
}

function drawOrganizationSymbol(ctx: CanvasRenderingContext2D, stage: number) {
  const names = ["Repositories", "Airlines", "Zoox"];
  box(ctx, 340, 118, 134, 110, stage === 2, 1, 10);
  label(ctx, names[stage], 407, 139, { color: stage === 2 ? ACCENT : TEXT, size: 11.5, weight: 600 });
  if (stage === 0) {
    containedImage(ctx, "/logos/github.svg", 378, 151, 58, 58);
  } else if (stage === 1) {
    containedImage(ctx, "/logos/delta.svg", 350, 161, 32, 40);
    containedImage(ctx, "/logos/american-airlines.svg", 391, 161, 32, 40);
    containedImage(ctx, "/logos/ryanair.svg", 432, 161, 32, 40);
  } else {
    containedImage(ctx, "/logos/zoox.svg", 356, 165, 102, 34);
  }
}

function drawProximity(ctx: CanvasRenderingContext2D, p: number) {
  const stage = Math.min(2, Math.floor(p * 3));
  const local = ease((p * 3) % 1);
  const positions = [88, 246, 394];
  const from = positions[Math.max(0, stage - 1)];
  const lensX = stage === 0 ? positions[0] : from + (positions[stage] - from) * local;
  const evaluators = ["Codex / Claude Code", "Sierra", "Zoox evaluator"];
  const modes = ["outside", "alongside", "inside"];
  const acceptanceCues = [
    "acceptance is directly observable",
    "acceptance can be explained",
    "acceptance must be interpreted inside",
  ];

  arrow(ctx, 448, 314, 52, 314, MUTED, 0.9);
  arrow(ctx, 52, 314, 448, 314, MUTED, 0.9);
  positions.forEach((x, index) => {
    dot(ctx, x, 314, index === stage ? 5 : 3.5, index === stage ? ACCENT : PAPER, index === stage ? ACCENT : MUTED);
    label(ctx, modes[index], x, 339, { color: index === stage ? ACCENT : MUTED, size: 11, weight: index === stage ? 600 : 400 });
  });

  drawOrganizationSymbol(ctx, stage);
  drawMagnifier(ctx, lensX, 177, 1);
  label(ctx, evaluators[stage], lensX, 101, { color: ACCENT, size: 11.5, weight: 600 });
  wrappedLabel(ctx, acceptanceCues[stage], lensX, 253, 152, 12, {
    color: ACCENT,
    size: 10.5,
    weight: 500,
    italic: true,
  });
  label(ctx, "Magnifier = evaluator", 250, 374, { color: MUTED, size: 9.5, italic: true });
}

function drawCoding(ctx: CanvasRenderingContext2D, p: number) {
  const center = { x: 183, y: 190 };
  const radii = [126, 86, 47];
  const middleShift = ease((p - 0.25) / 0.19);
  const innerShift = ease((p - 0.61) / 0.19);
  const weights = [1 - middleShift, middleShift * (1 - innerShift), innerShift];
  const reveals = [ease((p - 0.02) / 0.12), ease((p - 0.27) / 0.13), ease((p - 0.61) / 0.13)];

  const fillRing = (outerRadius: number, innerRadius: number, opacity: number) => {
    if (opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity * 0.78;
    ctx.fillStyle = ACCENT_LIGHT;
    ctx.beginPath();
    ctx.arc(center.x, center.y, outerRadius, 0, Math.PI * 2);
    if (innerRadius > 0) ctx.arc(center.x, center.y, innerRadius, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.restore();
  };

  fillRing(radii[0], radii[1], weights[0]);
  fillRing(radii[1], radii[2], weights[1]);
  fillRing(radii[2], 0, weights[2]);

  radii.forEach((radius, index) => {
    ctx.save();
    ctx.globalAlpha = 0.5 + weights[index] * 0.5;
    ctx.strokeStyle = weights[index] > 0.05 ? ACCENT : MUTED;
    ctx.lineWidth = 1.3 + weights[index] * 1.4;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
  dot(ctx, center.x, center.y, 4.5, ACCENT, ACCENT);

  const callouts = [
    { name: "Codex", detail: "outer ring · outside", y: 84, ringX: 267, ringY: 96 },
    { name: "CodeRabbit", detail: "middle ring · alongside", y: 171, ringX: 267, ringY: 171 },
    { name: "uReview", detail: "inner ring · inside Uber", y: 258, ringX: 218, ringY: 223 },
  ];
  callouts.forEach((item, index) => {
    const reveal = reveals[index];
    const active = weights[index];
    line(ctx, item.ringX, item.ringY, 326, item.y, active > 0.05 ? ACCENT : MUTED, 1.1, reveal * (0.55 + active * 0.45));
    box(ctx, 330, item.y - 23, 154, 46, false, reveal, 8);
    box(ctx, 330, item.y - 23, 154, 46, true, reveal * active, 8);
    label(ctx, item.name, 407, item.y - 7, {
      color: active > 0.05 ? ACCENT : TEXT,
      size: 11.5,
      weight: 600,
      opacity: reveal,
    });
    label(ctx, item.detail, 407, item.y + 10, {
      color: active > 0.05 ? TEXT : MUTED,
      size: 8.2,
      italic: true,
      opacity: reveal,
    });
  });

  const descriptions = [
    "Codex observes whether the proposed change is merged.",
    "CodeRabbit adapts to the repository’s rules.",
    "uReview uses Uber’s own codebases + internal developer feedback.",
  ];
  const descriptionIndex = weights.indexOf(Math.max(...weights));
  wrappedLabel(ctx, descriptions[descriptionIndex], 250, 348, 320, 13, {
    color: TEXT,
    size: 10.2,
    weight: 500,
    opacity: 0.55 + weights[descriptionIndex] * 0.45,
  });
}

function drawPieFrame(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
) {
  const radius = size / 2;
  const innerRadius = radius * 0.84;

  ctx.save();
  ctx.shadowColor = "rgba(38,38,36,.1)";
  ctx.shadowBlur = Math.max(4, radius * 0.04);
  ctx.shadowOffsetY = Math.max(2, radius * 0.016);
  ctx.fillStyle = "rgba(255,255,255,.54)";
  ctx.strokeStyle = "rgba(140,138,128,.84)";
  ctx.lineWidth = Math.max(1.2, radius * 0.01);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();

  ctx.fillStyle = "rgba(244,243,238,.76)";
  ctx.strokeStyle = "rgba(155,45,45,.34)";
  ctx.lineWidth = Math.max(1, radius * 0.012);
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(140,138,128,.5)";
  ctx.lineWidth = Math.max(0.9, radius * 0.007);
  ctx.setLineDash([Math.max(1.5, radius * 0.012), Math.max(4, radius * 0.035)]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.93, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPie(ctx: CanvasRenderingContext2D, p: number) {
  const center = { x: 250, y: 188 };
  const fiveStage = smootherEase((p - 0.18) / 0.28);
  const tenStage = smootherEase((p - 0.58) / 0.3);
  const size = 158 + fiveStage * 78 + tenStage * 100;
  const innerRadius = size * 0.42;
  const oneOpacity = 1 - smootherEase(fiveStage / 0.48);
  const fiveOpacity = smootherEase(fiveStage / 0.55) * (1 - smootherEase(tenStage / 0.48));
  const tenOpacity = smootherEase(tenStage / 0.55);

  drawPieFrame(ctx, center.x, center.y, size);

  const colors = [
    "#9d5961",
    "#557b7d",
    "#917747",
    "#60718c",
    "#756681",
    "#66806f",
    "#9a6b59",
    "#596d76",
    "#8d6378",
    "#747a5b",
  ];
  const symbols: Record<string, string> = {
    Software: "</>",
    "Software development": "</>",
    Legal: "§",
    Finance: "$",
    Healthcare: "+",
    Education: "▤",
    Retail: "◇",
    Logistics: "→",
    Energy: "ϟ",
    Media: "▶",
    Manufacturing: "⚙",
  };

  const drawSlices = (industries: string[], opacity: number) => {
    if (opacity <= 0.001) return;
    const count = industries.length;
    const startOffset = -Math.PI / 2;
    industries.forEach((industry, index) => {
      const start = startOffset + (Math.PI * 2 * index) / count;
      const end = startOffset + (Math.PI * 2 * (index + 1)) / count;
      const middle = (start + end) / 2;

      ctx.save();
      ctx.globalAlpha = opacity * (count === 1 ? 0.22 : count === 5 ? 0.26 : 0.3);
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.arc(center.x, center.y, innerRadius, start, end);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (count > 1) {
        line(
          ctx,
          center.x,
          center.y,
          center.x + Math.cos(start) * innerRadius,
          center.y + Math.sin(start) * innerRadius,
          "rgba(255,255,255,.88)",
          count === 5 ? 1.7 : 1.35,
          opacity,
        );
      }

      const iconRadius = count === 5 ? innerRadius * 0.31 : innerRadius * 0.39;
      const labelRadius = count === 5 ? innerRadius * 0.67 : innerRadius * 0.7;
      const iconX = center.x + Math.cos(middle) * iconRadius;
      const iconY = center.y + Math.sin(middle) * iconRadius;
      const labelX = center.x + Math.cos(middle) * labelRadius;
      const labelY = center.y + Math.sin(middle) * labelRadius;
      if (count === 1) {
        dot(ctx, center.x, center.y - 18, 10, "rgba(255,255,255,.82)", colors[index], opacity);
        label(ctx, symbols[industry], center.x, center.y - 18, {
          color: colors[index],
          size: 7.5,
          weight: 700,
          opacity,
        });
        wrappedLabel(ctx, "Software development", center.x, center.y + 4, innerRadius * 1.45, 13, {
          color: TEXT,
          size: 11.5,
          weight: 600,
          opacity,
        });
      } else {
        dot(
          ctx,
          iconX,
          iconY,
          count === 5 ? 8.5 : 6.8,
          "rgba(255,255,255,.84)",
          colors[index],
          opacity,
        );
        label(ctx, symbols[industry], iconX, iconY, {
          color: colors[index],
          size: count === 5 ? 7.2 : 5.8,
          weight: 700,
          opacity,
        });
        label(ctx, industry, labelX, labelY, {
          color: colors[index],
          size: count === 5 ? 8.8 : industry.length > 10 ? 6.2 : 7,
          weight: 700,
          opacity,
        });
      }
    });
  };

  drawSlices(["Software development"], oneOpacity);
  drawSlices(["Software", "Legal", "Finance", "Healthcare", "Education"], fiveOpacity);
  drawSlices(
    ["Software", "Legal", "Finance", "Healthcare", "Education", "Retail", "Logistics", "Energy", "Media", "Manufacturing"],
    tenOpacity,
  );

  ctx.save();
  ctx.strokeStyle = "rgba(140,138,128,.7)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(center.x, center.y, innerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

const drawers: Record<SceneName, (ctx: CanvasRenderingContext2D, progress: number) => void> = {
  criteria: drawCriteria,
  proximity: drawProximity,
  coding: drawCoding,
  pie: drawPie,
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
      const travel = longCopy
        ? Math.max(300, rect.height - 390)
        : Math.max(300, rect.height - (window.innerHeight - 56));
      const progress = reduced || mobile ? 0.999 : clamp((56 - rect.top) / travel, 0, 0.999);
      drawers[scene](context, progress);
    };
    const requestPaint = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    const assetPaths = scene === "proximity" ? logoPaths : [];
    const imageCleanups = assetPaths.map((path) => {
      const image = canvasImage(path);
      if (!image) return () => undefined;
      image.addEventListener("load", requestPaint);
      return () => image.removeEventListener("load", requestPaint);
    });
    const observer = new ResizeObserver(requestPaint);
    observer.observe(section);
    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", requestPaint);
    paint();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      imageCleanups.forEach((cleanup) => cleanup());
      window.removeEventListener("scroll", requestPaint);
      window.removeEventListener("resize", requestPaint);
    };
  }, [longCopy, scene]);

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
      {labelText ? <span className="section-label">{labelText}</span> : null}
      {children}
    </div>
  );
}

function ProseSection({ labelText, children }: { labelText: string; children: ReactNode }) {
  return (
    <div className="scroll-section prose-only">
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
          <ProseSection labelText="Proof-of-Workflow">
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
          </ProseSection>
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
            caption="In coding, outside, alongside, and inside evaluation coexist on the same spectrum."
          >
            <p>
              More broadly, we can see all three levels within the same domain or even the same company. Coding
              offers a clear example of how the evaluator moves closer as more organizational context is needed.
              Codex can observe a merge from <em>outside</em>, CodeRabbit works <em>alongside</em> teams by
              adapting to their repository rules, and Uber keeps its own code review system, uReview,
              <em> inside</em> because useful judgment depends on its own codebase and developer feedback.<sup><a href="#note-8">8</a></sup>
            </p>
          </ScrollDiagram>
          <TextSection labelText="">
            <p>
              Together, we see across these examples is that PoW does not need to come from a company whose
              main business is evaluation. Often, the company in the best position is simply the one already
              close enough to the workflow to see whether people actually approve the AI-generated outcome.
              When that judgment becomes measurable, it creates real economic value and starts to change both
              what AI costs and how providers charge for it
            </p>
          </TextSection>
        </section>

        <section className="act-group" aria-labelledby="act-four">
          <h2 className="act-heading" id="act-four">4. From AI Use to AI Value</h2>
          <ProseSection labelText="Two linked stages">
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
          </ProseSection>
        </section>

        <section className="act-group" aria-labelledby="act-five">
          <h2 className="act-heading" id="act-five">5. What Better Evaluation Could Unlock</h2>
          <ProseSection labelText="What better evaluation could unlock">
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
          </ProseSection>
          <ScrollDiagram
            scene="pie"
            labelText="A growing, diverse market"
            caption="As Proof-of-Workflow spreads, the market grows and its slices become more diverse."
          >
            <p>
              And as value begins to accumulate around judgment, more players will naturally offer these
              evaluations, including the groups we discussed above. Yet the pie is huge, and because acceptance
              depends on the specific task, no single method or player can cover everything, leaving plenty of
              room for others to participate in PoW. Data and evaluation companies have already begun to take
              part too. Scale AI, for example, is moving in this direction by turning expert approvals from real
              work into organization-specific evaluations.<sup><a href="#note-2">2</a></sup>
            </p>
          </ScrollDiagram>
          <ProseSection labelText="A compounding feedback loop">
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
          </ProseSection>
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
