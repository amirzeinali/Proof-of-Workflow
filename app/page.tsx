"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

type SceneName =
  | "criteria"
  | "acceptance"
  | "proximity"
  | "coding"
  | "meter"
  | "pie"
  | "compounding";

const INK = "#0b1f3a";
const TEXT = "#20344f";
const MUTED = "#6f7f93";
const ACCENT = "#1558d6";
const SUCCESS = "#16843f";
const ACCENT_LIGHT = "rgba(21,88,214,.14)";
const PAPER = "#ffffff";
const WHITE = "rgba(255,255,255,.88)";

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
const assetPath = (path: string) => {
  if (typeof document === "undefined") return path;
  return new URL(path.replace(/^\//, ""), document.baseURI).pathname;
};
const logoPaths = [
  assetPath("/logos/github.svg"),
  assetPath("/logos/delta.svg"),
  assetPath("/logos/american-airlines.svg"),
  assetPath("/logos/ryanair.svg"),
  assetPath("/logos/zoox.svg"),
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

type CanvasPoint = { x: number; y: number };

function flowArrow(
  ctx: CanvasRenderingContext2D,
  start: CanvasPoint,
  control1: CanvasPoint,
  control2: CanvasPoint,
  end: CanvasPoint,
  color: string,
  opacity = 1,
  progress = 1,
  width = 1.4,
) {
  const amount = smootherEase(progress);
  if (amount <= 0 || opacity <= 0) return;
  const pointAt = (t: number) => {
    const inverse = 1 - t;
    return {
      x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * control1.x + 3 * inverse * t ** 2 * control2.x + t ** 3 * end.x,
      y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * control1.y + 3 * inverse * t ** 2 * control2.y + t ** 3 * end.y,
    };
  };

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  const segments = 42;
  for (let index = 1; index <= segments; index += 1) {
    const point = pointAt(amount * (index / segments));
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();

  if (amount > 0.93) {
    const tip = pointAt(amount);
    const previous = pointAt(Math.max(0, amount - 0.035));
    const angle = Math.atan2(tip.y - previous.y, tip.x - previous.x);
    const arrowLength = 8;
    line(
      ctx,
      tip.x,
      tip.y,
      tip.x - arrowLength * Math.cos(angle - 0.55),
      tip.y - arrowLength * Math.sin(angle - 0.55),
      color,
      width,
      opacity,
    );
    line(
      ctx,
      tip.x,
      tip.y,
      tip.x - arrowLength * Math.cos(angle + 0.55),
      tip.y - arrowLength * Math.sin(angle + 0.55),
      color,
      width,
      opacity,
    );
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
  ctx.fillStyle = "rgba(111,127,147,.14)";
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
    { name: "Ryanair before", reason: "Verify the customer’s identity before allowing access to the reservation", ok: false, y: 220, start: 0.48, portY: 172, nameHeight: 38, reasonHeight: 50, reasonLines: 3 },
    { name: "Ryanair now", reason: "Access the reservation without separate verification and continue", ok: true, y: 323, start: 0.78, portY: 195, nameHeight: 38, reasonHeight: 50, reasonLines: 3 },
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
    if (row.name.startsWith("Ryanair ")) {
      const qualifier = row.name.replace("Ryanair ", "");
      label(ctx, "Ryanair", 268, y - 5, { color: TEXT, size: 9.2, weight: 600, opacity: rowOpacity });
      label(ctx, qualifier, 268, y + 5, { color: TEXT, size: 8.4, weight: 600, opacity: rowOpacity });
    } else {
      wrappedLabel(ctx, row.name, 268, y - (row.nameHeight > 30 ? 5 : 0), 64, 10, {
        color: TEXT,
        size: row.name === "American Airlines" ? 8.3 : 9.2,
        weight: 600,
        opacity: rowOpacity,
      });
    }

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
      label(ctx, "Policy Outdated", 268, y + 35, {
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
  ctx.shadowColor = "rgba(11,31,58,.16)";
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
  if (stage === 2) {
    box(ctx, 326, 118, 162, 110, true, 1, 10);
    label(ctx, names[stage], 445, 139, { color: ACCENT, size: 11.5, weight: 600 });
    containedImage(ctx, logoPaths[4], 414, 157, 62, 42);
    return;
  }
  box(ctx, 340, 118, 134, 110, stage === 2, 1, 10);
  label(ctx, names[stage], 407, 139, { color: stage === 2 ? ACCENT : TEXT, size: 11.5, weight: 600 });
  if (stage === 0) {
    containedImage(ctx, logoPaths[0], 378, 151, 58, 58);
  } else if (stage === 1) {
    containedImage(ctx, logoPaths[1], 350, 161, 32, 40);
    containedImage(ctx, logoPaths[2], 391, 161, 32, 40);
    containedImage(ctx, logoPaths[3], 432, 161, 32, 40);
  }
}

function drawProximity(ctx: CanvasRenderingContext2D, p: number) {
  const stage = Math.min(2, Math.floor(p * 3));
  const local = ease((p * 3) % 1);
  const spectrumPositions = [88, 246, 394];
  const lensPositions = [88, 246, 370];
  const from = lensPositions[Math.max(0, stage - 1)];
  const lensX = stage === 0 ? lensPositions[0] : from + (lensPositions[stage] - from) * local;
  const evaluators = ["Codex / Claude Code", "Sierra", "Zoox Evaluator"];
  const modes = ["Outside", "Alongside", "Inside"];
  const acceptanceCues = [
    "Acceptance is directly observable",
    "Acceptance can be explained",
    "Acceptance must be interpreted inside",
  ];

  arrow(ctx, 448, 314, 52, 314, MUTED, 0.9);
  arrow(ctx, 52, 314, 448, 314, MUTED, 0.9);
  spectrumPositions.forEach((x, index) => {
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
  label(ctx, "Magnifier = Evaluator", 250, 374, { color: MUTED, size: 9.5, italic: true });
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
    { name: "Codex", detail: "Outside", y: 84, ringX: 267, ringY: 96 },
    { name: "CodeRabbit", detail: "Alongside", y: 171, ringX: 267, ringY: 171 },
    { name: "uReview", detail: "Inside Uber", y: 258, ringX: 218, ringY: 223 },
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
  const scallops = 30;
  const points = 240;

  ctx.save();
  ctx.shadowColor = "rgba(11,31,58,.1)";
  ctx.shadowBlur = Math.max(4, radius * 0.04);
  ctx.shadowOffsetY = Math.max(2, radius * 0.016);
  ctx.fillStyle = "rgba(187,145,96,.16)";
  ctx.strokeStyle = "rgba(145,105,66,.62)";
  ctx.lineWidth = Math.max(1.2, radius * 0.01);
  ctx.beginPath();
  for (let index = 0; index <= points; index += 1) {
    const angle = (Math.PI * 2 * index) / points - Math.PI / 2;
    const flutedRadius = radius + Math.sin(angle * scallops) * radius * 0.018;
    const x = centerX + Math.cos(angle) * flutedRadius;
    const y = centerY + Math.sin(angle) * flutedRadius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.strokeStyle = "rgba(21,88,214,.34)";
  ctx.lineWidth = Math.max(1, radius * 0.012);
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(145,105,66,.46)";
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
        wrappedLabel(ctx, "Software Development", center.x, center.y + 4, innerRadius * 1.45, 13, {
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
  ctx.strokeStyle = "rgba(111,127,147,.7)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(center.x, center.y, innerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawAcceptance(ctx: CanvasRenderingContext2D, p: number) {
  const grow = smootherEase((p - 0.03) / 0.42);
  const compress = smootherEase((p - 0.5) / 0.27);
  const accept = smootherEase((p - 0.76) / 0.19);
  const core = { x: 108, y: 218 };
  const aperture = { x: 400, y: 201 };
  const registerX = 282;

  label(ctx, "The Living Rubric", core.x, 78, { color: TEXT, size: 11, weight: 600 });
  label(ctx, "Organization", aperture.x, 88, { color: TEXT, size: 11, weight: 600 });

  const nodes = [
    { label: "Cost", angle: -Math.PI / 2, labelX: 108, labelY: 119, width: 58, color: "#557b7d", delay: 0 },
    { label: "Latency", angle: -Math.PI / 4, labelX: 199, labelY: 145, width: 62, color: "#60718c", delay: 0.04 },
    { label: "Energy", angle: 0, labelX: 225, labelY: 218, width: 58, color: "#917747", delay: 0.08 },
    { label: "Privacy", angle: Math.PI / 4, labelX: 201, labelY: 293, width: 60, color: "#756681", delay: 0.12 },
    { label: "Safety", angle: Math.PI / 2, labelX: 108, labelY: 326, width: 56, color: "#9a6b59", delay: 0.16 },
    { label: "Policy", angle: (Math.PI * 3) / 4, labelX: 37, labelY: 294, width: 56, color: "#66806f", delay: 0.2 },
    { label: "Auditability", angle: Math.PI, labelX: 43, labelY: 239, width: 76, color: "#596d76", delay: 0.24 },
    { label: "Grounding", angle: (Math.PI * 5) / 4, labelX: 38, labelY: 145, width: 74, color: "#9d5961", delay: 0.28 },
  ];

  nodes.forEach((node, index) => {
    const reveal = smootherEase((grow - node.delay) / 0.52);
    const orbitRadius = 83;
    const orbitX = core.x + Math.cos(node.angle) * orbitRadius;
    const orbitY = core.y + Math.sin(node.angle) * orbitRadius;
    const targetX = registerX;
    const targetY = 88 + index * 32.5;
    const nodeX = orbitX + (targetX - orbitX) * compress;
    const nodeY = orbitY + (targetY - orbitY) * compress;
    const anchorX = core.x + Math.cos(node.angle) * 31;
    const anchorY = core.y + Math.sin(node.angle) * 31;
    const spokeAmount = reveal * (1 - smootherEase(compress / 0.72));
    line(
      ctx,
      anchorX,
      anchorY,
      anchorX + (orbitX - anchorX) * spokeAmount,
      anchorY + (orbitY - anchorY) * spokeAmount,
      node.color,
      1.25,
      reveal * (1 - compress),
    );
    dot(
      ctx,
      nodeX,
      nodeY,
      6,
      "rgba(255,255,255,.84)",
      node.color,
      reveal * (1 - compress * 0.28),
    );
    wrappedLabel(ctx, node.label, node.labelX, node.labelY, node.width, 8.5, {
      color: node.color,
      size: 7.3,
      weight: 600,
      opacity: reveal * (1 - smootherEase(compress / 0.48)),
    });
  });

  const finalSnapshot = smootherEase((compress - 0.58) / 0.34);
  nodes.forEach((node, index) => {
    const targetY = 88 + index * 32.5;
    const angle = Math.atan2(targetY - core.y, registerX - core.x);
    line(
      ctx,
      core.x + Math.cos(angle) * 31,
      core.y + Math.sin(angle) * 31,
      registerX - 7,
      targetY,
      node.color,
      1.05,
      finalSnapshot * 0.5,
    );
  });

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "rgba(255,255,255,.82)";
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(core.x, core.y, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  label(ctx, "AI Work", core.x, core.y - 4, { color: ACCENT, size: 11.5, weight: 700 });
  label(ctx, "In Context", core.x, core.y + 11, { color: MUTED, size: 7.8, italic: true });

  line(ctx, registerX, 78, registerX, 326, MUTED, 1.5, compress * 0.8);
  nodes.forEach((node, index) => {
    label(ctx, node.label, registerX + 11, 88 + index * 32.5, {
      align: "left",
      color: node.color,
      size: 7.2,
      weight: 600,
      opacity: finalSnapshot,
    });
  });
  flowArrow(
    ctx,
    { x: registerX, y: aperture.y },
    { x: registerX + 26, y: aperture.y },
    { x: aperture.x - 63, y: aperture.y },
    { x: aperture.x - 55, y: aperture.y },
    ACCENT,
    compress * 0.82,
    compress,
    1.7,
  );

  const gateGap = 25 - compress * 13;
  ctx.save();
  ctx.globalAlpha = 0.84;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(aperture.x - gateGap, 151);
  ctx.bezierCurveTo(aperture.x - 48, 169, aperture.x - 48, 233, aperture.x - gateGap, 251);
  ctx.moveTo(aperture.x + gateGap, 151);
  ctx.bezierCurveTo(aperture.x + 48, 169, aperture.x + 48, 233, aperture.x + gateGap, 251);
  ctx.stroke();
  ctx.restore();

  dot(ctx, aperture.x, 124, 6, PAPER, TEXT, 0.9);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = TEXT;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(aperture.x, 141, 13, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
  ctx.restore();
  label(ctx, "Judgment", aperture.x, aperture.y, {
    color: ACCENT,
    size: 10,
    weight: 700,
  });

  const outputX = 476;
  const outputY = aperture.y;
  flowArrow(
    ctx,
    { x: aperture.x + 42, y: aperture.y },
    { x: 447, y: aperture.y },
    { x: 449, y: aperture.y },
    { x: outputX - 24, y: aperture.y },
    SUCCESS,
    accept,
    accept,
    2,
  );

  dot(ctx, outputX, outputY, 21, "rgba(47,125,50,.08)", SUCCESS, accept);
  if (accept > 0.02) {
    ctx.save();
    ctx.globalAlpha = accept;
    ctx.strokeStyle = SUCCESS;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(outputX - 11, outputY);
    ctx.lineTo(outputX - 2, outputY + 9);
    ctx.lineTo(outputX + 14, outputY - 9);
    ctx.stroke();
    ctx.restore();
  }
  label(ctx, "Accepted", outputX, outputY + 39, {
    color: SUCCESS,
    size: 9.5,
    weight: 650,
    opacity: accept,
  });
}

function drawMeter(ctx: CanvasRenderingContext2D, p: number) {
  const activity = smootherEase(p / 0.31);
  const burdens = smootherEase((p - 0.16) / 0.27);
  const flip = smootherEase((p - 0.43) / 0.24);
  const pricing = smootherEase((p - 0.7) / 0.21);
  const meterX = 86;
  const meterY = 28;
  const meterWidth = 328;
  const meterHeight = 196;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.74)";
  ctx.strokeStyle = MUTED;
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.roundRect(meterX, meterY, meterWidth, meterHeight, 15);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  [
    [meterX + 14, meterY + 14],
    [meterX + meterWidth - 14, meterY + 14],
    [meterX + 14, meterY + meterHeight - 14],
    [meterX + meterWidth - 14, meterY + meterHeight - 14],
  ].forEach(([x, y]) => dot(ctx, x, y, 2.5, PAPER, MUTED, 0.65));

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.94)";
  ctx.strokeStyle = "rgba(111,127,147,.72)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(119, 50, 262, 91, 9);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const faceScale = Math.max(0.035, Math.abs(Math.cos(Math.PI * flip)));
  const showAccepted = flip >= 0.5;
  ctx.save();
  ctx.translate(250, 95);
  ctx.scale(1, faceScale);
  if (showAccepted) {
    label(ctx, "ACCEPTED WORK", 0, -8, { color: SUCCESS, size: 17, weight: 700 });
    ctx.strokeStyle = SUCCESS;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-11, 17);
    ctx.lineTo(-3, 25);
    ctx.lineTo(13, 8);
    ctx.stroke();
    label(ctx, "The workflow was approved", 0, 36, { color: TEXT, size: 8.8, weight: 600 });
  } else {
    const total = Math.round(740 + activity * 5860 + burdens * 2240);
    label(ctx, "AI ACTIVITY", 0, -27, { color: ACCENT, size: 9.5, weight: 700 });
    ctx.fillStyle = TEXT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '700 29px "SFMono-Regular", Consolas, monospace';
    ctx.fillText(String(total).padStart(6, "0"), 0, 7);
    label(ctx, "Tokens Used", 0, 31, { color: MUTED, size: 9.5, weight: 600 });
  }
  ctx.restore();

  const usageOpacity = 1 - smootherEase((flip - 0.02) / 0.58);
  const barStart = 126;
  const barEnd = 374;
  const activityFill = clamp(0.2 + activity * 0.38 + burdens * 0.34);
  const retryX = barStart + (barEnd - barStart) * 0.4;
  const correctionX = barStart + (barEnd - barStart) * 0.72;
  const retryReached = smootherEase((activityFill - 0.36) / 0.11) * usageOpacity;
  const correctionReached = smootherEase((activityFill - 0.67) / 0.11) * usageOpacity;

  label(ctx, "Retry", retryX, 173, {
    color: ACCENT,
    size: 8.7,
    weight: 600,
    opacity: retryReached,
  });
  label(ctx, "Expert Correction", correctionX, 173, {
    color: ACCENT,
    size: 8.7,
    weight: 600,
    opacity: correctionReached,
  });
  line(ctx, retryX, 179, retryX, 191, ACCENT, 1, retryReached);
  line(ctx, correctionX, 179, correctionX, 191, ACCENT, 1, correctionReached);
  dot(ctx, retryX, 197, 3.5, PAPER, ACCENT, retryReached);
  dot(ctx, correctionX, 197, 3.5, PAPER, ACCENT, correctionReached);

  line(ctx, barStart, 197, barEnd, 197, "rgba(111,127,147,.58)", 3, usageOpacity);
  line(ctx, barStart, 197, barStart + (barEnd - barStart) * activityFill, 197, ACCENT, 3.4, usageOpacity);
  for (let index = 0; index <= 8; index += 1) {
    const x = barStart + ((barEnd - barStart) * index) / 8;
    line(ctx, x, 191, x, 203, MUTED, 0.8, 0.7 * usageOpacity);
  }
  dot(ctx, barStart + (barEnd - barStart) * activityFill, 197, 5.5, PAPER, ACCENT, usageOpacity);

  const acceptedUnit = smootherEase((flip - 0.5) / 0.42);
  line(ctx, 129, 154, 371, 154, "rgba(111,127,147,.34)", 1, acceptedUnit);
  label(ctx, "COST UNIT", 144, 171, {
    color: MUTED,
    size: 8.3,
    align: "left",
    weight: 700,
    opacity: acceptedUnit,
  });
  label(ctx, "Accepted Workflow", 356, 171, {
    color: SUCCESS,
    size: 9.5,
    align: "right",
    weight: 700,
    opacity: acceptedUnit,
  });
  label(ctx, "PRICE UNIT", 144, 197, {
    color: MUTED,
    size: 8.3,
    align: "left",
    weight: 700,
    opacity: pricing,
  });
  dot(ctx, 250, 197, 8.5, "rgba(47,125,50,.08)", SUCCESS, pricing);
  label(ctx, "$", 250, 197, {
    color: SUCCESS,
    size: 9.5,
    weight: 800,
    opacity: pricing,
  });
  label(ctx, "Dollars / Accepted Workflow", 267, 197, {
    color: SUCCESS,
    size: 8.4,
    align: "left",
    weight: 700,
    opacity: pricing,
  });
}

function drawCompanyTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  opacity: number,
  scale = 1,
) {
  const width = 21 * scale;
  const height = 14 * scale;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "rgba(255,255,255,.76)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 2.5 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - width * 0.32, y - height * 0.18, width * 0.64, height * 0.12, 1);
  ctx.fill();
  ctx.restore();
}

function drawBrainIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  opacity: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "rgba(255,255,255,.76)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.075;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(0, -0.42);
  ctx.bezierCurveTo(-0.12, -0.56, -0.34, -0.53, -0.38, -0.34);
  ctx.bezierCurveTo(-0.58, -0.32, -0.6, -0.08, -0.47, 0.04);
  ctx.bezierCurveTo(-0.54, 0.24, -0.3, 0.45, -0.08, 0.35);
  ctx.bezierCurveTo(0.06, 0.52, 0.31, 0.45, 0.34, 0.25);
  ctx.bezierCurveTo(0.56, 0.19, 0.57, -0.09, 0.4, -0.2);
  ctx.bezierCurveTo(0.47, -0.41, 0.2, -0.53, 0, -0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -0.38);
  ctx.bezierCurveTo(-0.08, -0.23, 0.09, -0.12, 0, 0.03);
  ctx.bezierCurveTo(-0.08, 0.17, 0.08, 0.25, 0.02, 0.38);
  ctx.moveTo(-0.3, -0.25);
  ctx.bezierCurveTo(-0.12, -0.3, -0.12, -0.12, -0.22, -0.03);
  ctx.bezierCurveTo(-0.34, 0.07, -0.23, 0.2, -0.1, 0.18);
  ctx.moveTo(0.18, -0.28);
  ctx.bezierCurveTo(0.34, -0.23, 0.31, -0.05, 0.17, -0.02);
  ctx.bezierCurveTo(0.05, 0.02, 0.13, 0.2, 0.28, 0.18);
  ctx.stroke();
  ctx.restore();
}

function drawSmiley(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "rgba(255,255,255,.78)";
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, radius * 0.12);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - radius * 0.34, y - radius * 0.18, radius * 0.09, 0, Math.PI * 2);
  ctx.arc(x + radius * 0.34, y - radius * 0.18, radius * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + radius * 0.02, radius * 0.48, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawCompounding(ctx: CanvasRenderingContext2D, p: number) {
  const cycleValue = Math.min(3.999, p * 4);
  const cycle = Math.floor(cycleValue);
  const local = cycleValue - cycle;
  const arrival = (at: number) => smootherEase((local - at) / 0.1);
  const organizationsBase = [3, 6, 12, 32];
  const organizationsAdded = [3, 6, 20, 53];
  const intelligenceBase = [2, 3, 7, 22];
  const intelligenceAdded = [1, 4, 15, 53];
  const utilityBase = [2, 4, 12, 37];
  const utilityAdded = [2, 8, 25, 63];
  const intelligenceCount = intelligenceBase[cycle] + intelligenceAdded[cycle] * arrival(0.27);
  const organizationCount = organizationsBase[cycle] + organizationsAdded[cycle] * arrival(0.5);
  const utilityCount = utilityBase[cycle] + utilityAdded[cycle] * arrival(0.72);

  const pathState = (start: number, end: number) => {
    const duration = end - start;
    const progress = smootherEase((local - start) / (duration * 0.76));
    const fade = 1 - smootherEase((local - (end - duration * 0.2)) / (duration * 0.2));
    return { progress, opacity: progress * fade };
  };
  const intoPow = pathState(0.03, 0.15);
  const intoIntelligence = pathState(0.13, 0.29);
  const backToOrganizations = pathState(0.31, 0.52);
  const intoUtility = pathState(0.54, 0.74);

  const orgToPow = [
    { x: 198, y: 112 },
    { x: 162, y: 124 },
    { x: 136, y: 148 },
    { x: 119, y: 177 },
  ] as const;
  const powToBrain = [
    { x: 116, y: 230 },
    { x: 139, y: 269 },
    { x: 173, y: 292 },
    { x: 205, y: 303 },
  ] as const;
  const brainToOrg = [
    { x: 278, y: 258 },
    { x: 326, y: 224 },
    { x: 326, y: 157 },
    { x: 282, y: 124 },
  ] as const;
  const orgToUtility = [
    { x: 309, y: 91 },
    { x: 365, y: 75 },
    { x: 426, y: 111 },
    { x: 425, y: 156 },
  ] as const;

  [orgToPow, powToBrain, brainToOrg, orgToUtility].forEach((path) =>
    flowArrow(ctx, path[0], path[1], path[2], path[3], MUTED, 0.42, 1, 1.15),
  );
  flowArrow(ctx, orgToPow[0], orgToPow[1], orgToPow[2], orgToPow[3], ACCENT, intoPow.opacity, intoPow.progress, 2.4);
  flowArrow(ctx, powToBrain[0], powToBrain[1], powToBrain[2], powToBrain[3], ACCENT, intoIntelligence.opacity, intoIntelligence.progress, 2.4);
  flowArrow(ctx, brainToOrg[0], brainToOrg[1], brainToOrg[2], brainToOrg[3], ACCENT, backToOrganizations.opacity, backToOrganizations.progress, 2.4);
  flowArrow(ctx, orgToUtility[0], orgToUtility[1], orgToUtility[2], orgToUtility[3], SUCCESS, intoUtility.opacity, intoUtility.progress, 2.4);

  const organizationColors = ["#9d5961", "#557b7d", "#917747", "#60718c", "#756681", "#66806f"];
  const cloudPoint = (index: number, total: number, radiusX: number, radiusY: number, phase: number) => {
    const distance = Math.sqrt((index + 1) / total);
    const angle = index * 2.399963 + phase;
    return {
      x: Math.cos(angle) * radiusX * distance,
      y: Math.sin(angle) * radiusY * distance,
    };
  };
  Array.from({ length: 85 }).forEach((_, index) => {
    const reveal = smootherEase(clamp(organizationCount - index));
    const point = cloudPoint(index, 85, 68, 57, 0.35);
    drawCompanyTile(
      ctx,
      250 + point.x,
      85 + point.y,
      organizationColors[index % organizationColors.length],
      reveal * (index < 14 ? 1 : 0.82),
      index < 3 ? 1.02 : Math.max(0.42, 0.78 - index * 0.004),
    );
  });

  const brainColors = ["#557b7d", "#9a6b59", "#756681", "#66806f"];
  Array.from({ length: 75 }).forEach((_, index) => {
    const reveal = smootherEase(clamp(intelligenceCount - index));
    const point = cloudPoint(index, 75, 70, 55, 1.15);
    drawBrainIcon(
      ctx,
      260 + point.x,
      310 + point.y,
      index < 2 ? 31 : Math.max(9, 18 - index * 0.1),
      brainColors[index % brainColors.length],
      reveal * (index < 11 ? 1 : 0.78),
    );
  });

  const smileColors = ["#66806f", "#917747", "#557b7d", "#9d5961", "#756681"];
  Array.from({ length: 100 }).forEach((_, index) => {
    const reveal = smootherEase(clamp(utilityCount - index));
    const point = cloudPoint(index, 100, 70, 61, 2.1);
    drawSmiley(
      ctx,
      421 + point.x,
      207 + point.y,
      index < 2 ? 12 : Math.max(4.2, 8 - index * 0.03),
      smileColors[index % smileColors.length],
      reveal * (index < 16 ? 1 : 0.76),
    );
  });

  const powActivity = Math.max(intoPow.opacity, intoIntelligence.opacity, backToOrganizations.opacity * 0.55);
  const powCenter = { x: 92, y: 204 };
  const outerRadius = 35 + powActivity * 2;
  const innerRadius = 27 + powActivity;
  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = "rgba(21,88,214,.13)";
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2.7 + powActivity * 0.8;
  ctx.shadowColor = "rgba(21,88,214,.48)";
  ctx.shadowBlur = 9 + powActivity * 9;
  ctx.beginPath();
  for (let index = 0; index < 32; index += 1) {
    const angle = -Math.PI / 2 + (index / 32) * Math.PI * 2;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = powCenter.x + Math.cos(angle) * radius;
    const y = powCenter.y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(21,88,214,.42)";
  ctx.shadowBlur = 8 + powActivity * 7;
  ctx.beginPath();
  ctx.arc(powCenter.x, powCenter.y, 24 + powActivity * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  label(ctx, "PoW", powCenter.x, powCenter.y, { color: ACCENT, size: 15, weight: 800 });

  label(ctx, "Organizations", 250, 20, { color: TEXT, size: 11, weight: 600 });
  label(ctx, "Utility", 421, 286, { color: TEXT, size: 11, weight: 600 });
  label(ctx, "Intelligence", 260, 385, { color: TEXT, size: 11, weight: 600 });
}

const drawers: Record<SceneName, (ctx: CanvasRenderingContext2D, progress: number) => void> = {
  criteria: drawCriteria,
  acceptance: drawAcceptance,
  proximity: drawProximity,
  coding: drawCoding,
  meter: drawMeter,
  pie: drawPie,
  compounding: drawCompounding,
};

function ScrollDiagram({
  scene,
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
    let manualProgress = 0;

    const paint = () => {
      frame = 0;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const logicalHeight = scene === "meter" ? 250 : 400;
      if (canvas.width !== Math.round(500 * ratio) || canvas.height !== Math.round(logicalHeight * ratio)) {
        canvas.width = Math.round(500 * ratio);
        canvas.height = Math.round(logicalHeight * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, 500, logicalHeight);
      context.lineCap = "round";
      context.lineJoin = "round";
      const rect = section.getBoundingClientRect();
      const mobile = window.innerWidth <= 900;
      const travel = Math.max(300, rect.height - 390);
      const progress = reduced || mobile
        ? 0.999
        : longCopy
          ? clamp((56 - rect.top) / travel, 0, 0.999)
          : manualProgress;
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
    const onWheel = (event: WheelEvent) => {
      if (reduced || longCopy || window.innerWidth <= 900 || event.deltaY === 0) return;
      const visualization = section.querySelector<HTMLElement>(".section-viz");
      const rect = visualization?.getBoundingClientRect() ?? section.getBoundingClientRect();
      const fullyVisible = rect.top >= 54 && rect.bottom <= window.innerHeight + 2;
      if (!fullyVisible) return;
      const complete = manualProgress >= 0.985;
      const empty = manualProgress <= 0.015;
      const trigger = section.querySelector<HTMLElement>("[data-diagram-trigger]");
      const triggerReady = !trigger || trigger.getBoundingClientRect().bottom <= window.innerHeight - 40;
      if (event.deltaY > 0 && empty && !triggerReady) return;
      const movingForward = event.deltaY > 0 && !complete;
      const movingBackward = event.deltaY < 0 && !empty;
      if (!movingForward && !movingBackward) return;
      event.preventDefault();
      const budget = scene === "criteria"
        ? 900
        : scene === "acceptance" || scene === "meter" || scene === "compounding"
          ? 760
          : 620;
      const nextProgress = clamp(manualProgress + event.deltaY / budget, 0, 0.999);
      manualProgress = nextProgress >= 0.985 ? 0.999 : nextProgress <= 0.015 ? 0 : nextProgress;
      requestPaint();
    };
    const observer = new ResizeObserver(requestPaint);
    observer.observe(section);
    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", requestPaint);
    window.addEventListener("wheel", onWheel, { passive: false });
    paint();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      imageCleanups.forEach((cleanup) => cleanup());
      window.removeEventListener("scroll", requestPaint);
      window.removeEventListener("resize", requestPaint);
      window.removeEventListener("wheel", onWheel);
    };
  }, [longCopy, scene]);

  return (
    <div className={`scroll-section has-scene scene-${scene}${longCopy ? " long-copy" : ""}`} ref={sectionRef}>
      <div className="section-inner">
        <div className="section-copy">
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

function TextSection({ children }: { labelText: string; children: ReactNode }) {
  return (
    <div className="scroll-section text-only">
      {children}
    </div>
  );
}

function ProseSection({ children }: { labelText: string; children: ReactNode }) {
  return (
    <div className="scroll-section prose-only">
      {children}
    </div>
  );
}

const contents = [
  { id: "act-one", number: "1", label: "When Work Changes, Evaluation Must Too" },
  { id: "act-two", number: "2", label: "A Better Way to Judge AI Work" },
  { id: "act-three", number: "3", label: "How Close the Evaluator Must Be to the Organization" },
  { id: "act-four", number: "4", label: "From AI Use to AI Value" },
  { id: "act-five", number: "5", label: "What Better Evaluation Could Unlock" },
];

function SectionTable() {
  const [activeId, setActiveId] = useState(contents[0].id);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const marker = Math.min(180, window.innerHeight * 0.28);
      let current = contents[0].id;
      contents.forEach(({ id }) => {
        const heading = document.getElementById(id);
        if (heading && heading.getBoundingClientRect().top <= marker) current = id;
      });
      setActiveId(current);
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <nav className="contents-table" aria-label="Table of contents">
      <span className="contents-title">Contents</span>
      <ol>
        {contents.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={activeId === item.id ? "is-active" : undefined}>
              <span>{item.number}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function Home() {
  return (
    <main className="wrapper">
      <article className="post">
        <header className="scroll-header">
          <h1>Proof-of-Workflow</h1>
          <p className="post-subtitle">AI Evaluation Based on Real Workflows</p>
          <div className="author-block">
            <p className="post-authors">
              Amir Zeinali<sup>1,2</sup>, Shayan Talaei<sup>2</sup>, Avanika Narayan<sup>1</sup>, and Jon Saad-Falcon<sup>1,2</sup>
            </p>
            <p className="post-affiliations"><sup>1</sup> Hazy Research&nbsp;&nbsp; <sup>2</sup> Scaling Intelligence Lab</p>
            <p className="post-reading-time">8 min read</p>
          </div>
        </header>

        <aside className="tldr" aria-labelledby="tldr-title">
          <span className="section-label" id="tldr-title">TL;DR</span>
          <p>
            Fixed benchmarks are becoming less useful for evaluating AI. This is because they measure
            performance against fixed criteria, even though each organization has different criteria that
            change with the needs of their work. Evaluation should therefore prove that the AI’s work holds
            up in the real workflow and is accepted by the people responsible for that work. Approaches built
            around this kind of acceptance already show up in different forms, but they have rarely been
            discussed as one group.
          </p>
          <p>
            In this blog, we bring these acceptance-based approaches to evaluating AI together under one name,
            <strong> Proof-of-Workflow</strong>, or <strong>PoW</strong>. We cover 1) why AI evaluation is moving
            away from fixed benchmarks, 2) why PoW offers a better way to judge AI work, 3) who is best placed
            to run these evaluations, 4) how PoW changes AI economics, and 5) where PoW could lead.
          </p>
        </aside>

        <SectionTable />

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
              fix real software issues; <a href="https://www.mercor.com/apex/apex-agents-leaderboard/">APEX-Agents</a> covers tasks in investment banking, consulting, and law; <a href="https://arxiv.org/abs/2605.16679">χ-Bench</a> tests healthcare tasks; and <a href="https://taubench.com/">τ-bench</a> evaluates customer-service agents. But every
              benchmark still applies the same fixed criteria to everyone, even though criteria for real
              workflows 1) differ across organizations and 2) change over time.
            </p>
            <p>
              To see why this matters, let’s consider a <a href="https://github.com/sierra-research/tau2-bench/blob/main/data/tau2/domains/airline/tasks.json#L444-L543">simple airline customer-support task</a> from the τ²-bench.
            </p>
          </ScrollDiagram>
          <TextSection labelText="The benchmark’s rubric is not universal">
            <p>
              As you can see in the diagram, a benchmark’s rubric only shows what works for the airline it was
              designed around; it’s not a universal definition of success. The agent could pass that test and
              still break the rules of the airline using it, expose its customer data, or approve the invalid
              transaction. Airlines also make different tradeoffs around payment rules, cost, and latency, so a
              faster but more expensive process may be fine for one airline and not for another. Within each
              airline, the rules keep changing too, which means even an internal benchmark can become outdated,
              as the Ryanair example shows.<sup><a href="#note-1">1</a></sup>
            </p>
          </TextSection>
        </section>

        <section className="act-group" aria-labelledby="act-two">
          <h2 className="act-heading" id="act-two">2. A Better Way to Judge AI Work</h2>
          <ScrollDiagram
            scene="acceptance"
            labelText="Proof-of-Workflow"
            caption="Changing workflow context becomes one acceptance decision."
          >
            <p>
              <a href="https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/">Academic studies</a> and <a href="https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/">industry reports</a> have also identified the same gap between benchmark criteria and real approval criteria in practice. As a result, organizations increasingly pair benchmark scores with evaluation approaches that use live measures such as <a href="https://arxiv.org/abs/2512.04123">A/B tests and user feedback</a>. In our view, the most direct and useful of these approaches is to evaluate whether an organization actually accepts AI-generated work in its real workflow. We refer to such approaches collectively as <strong>Proof-of-Workflow.</strong>
            </p>
            <p>
              We think PoW works better here for two main reasons:
            </p>
            <ul className="pow-list">
              <li>
                <strong>First, PoW leaves the final call to the people responsible for the work.</strong> A benchmark is only a stand-in for their judgment and can capture only a simplified version of what a practical result should look like. The organization using the output sees the whole situation, including current rules and practical tradeoffs that may never fit into a rubric. The final approval tells us whether the work met all those requirements at once.
              </li>
              <li data-diagram-trigger>
                <strong>Second, since PoW tests AI on the organization’s real work,</strong> the evaluation uses the same data and tools the AI would use on the job instead of arbitrary tasks in a fixed test setup. This allows us to test AI in the setting where real value is created.
              </li>
            </ul>
            <p>Now that we know what PoW measures, the next step is to figure out who should actually evaluate the work.</p>
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
              We answer this by looking at how close the evaluator must be to the organization’s people, rules,
              and private context to understand the approval decision. We trace how the answer changes across
              three cases.
            </p>
            <h3 className="case-heading">Case 1. The Evaluator Is <em>Outside</em> the Organization</h3>
            <p>
              In some workflows, the expert’s decision is clearly recorded in a structured event, so an outside
              evaluator can tell whether the work was accepted without having much context about the
              organization. With <a href="https://developers.openai.com/codex/third-party/github">Codex</a> and <a href="https://docs.anthropic.com/en/docs/claude-code/github-actions">Claude Code</a>, for example, an outside evaluator can see whether a proposed code change was reviewed and <strong>merged</strong> into the codebase. This gives the evaluator a clear answer without requiring an evaluator inside every company.
            </p>
            <p>
              Even in this setting, however, the organization still makes the final call, and the evaluator
              needs access to the work and its outcome but does not have to understand every company-specific
              reason behind the acceptance decision. If the outcome alone does not explain why the work was
              accepted, the evaluator has to move closer.
            </p>
            <h3 className="case-heading">Case 2. The Evaluator Is <em>Alongside</em> the Organization</h3>
            <p>
              In the middle case, an outside evaluator can judge the work, but only after learning enough about
              the field and the organization. The company has to explain how it decides whether the work is good
              enough, usually by working closely with the evaluator.
            </p>
            <p>
              We can see this with <a href="https://sierra.ai/product">Sierra</a>, an AI customer support platform. In our airline example, Sierra would need to learn the airline’s current fare rules and privacy requirements, along with what it counts as a successful resolution. Those details differ across airlines, but the basic customer-support workflow is similar enough for Sierra to use the same evaluation process across customers and adjust it to each airline.
            </p>
            <p>
              We also see the same approach in other workflows. <a href="https://support.ramp.com/use-policy-agent-for-approvals">Ramp</a> can know if a company lets an AI expense recommendation stand. <a href="https://www.harvey.ai/blog/ai-contract-lifecycle-management">Harvey</a> can see whether a lawyer approves an AI-generated draft, and <a href="https://www.openevidence.com/announcements/45-rwandan-clinicians-are-helping-shape-medical-ai-for-low-resource-settings">OpenEvidence</a> can measure whether clinicians find an AI answer useful in the care decision they make. In each case, the organization can explain its needs clearly enough for the platform to judge the outcome properly.
            </p>
            <p>
              Yet an outside evaluator can only help when the organization can clearly explain the context and
              what good enough looks like. Some workflows push past that limit.
            </p>
            <h3 className="case-heading">Case 3. The Evaluator Is <em>Inside</em> the Organization</h3>
            <p>
              At the closest level, the evaluator needs so much company knowledge that explaining what acceptance
              means would be almost as hard as doing the evaluation internally. So the evaluation has to stay
              inside the company. The workflow is also too specific for an outside platform to learn the process
              and reuse it across companies.
            </p>
            <p>
              <a href="https://zoox.com/journal/edge-case-testing-zoox">Zoox</a> fits this case. As its engineers improve the AI driving system, they have to compare each change with what its vehicles have seen in the real world and on its private track. They then judge whether the full system is safe enough for the exact place and conditions where it will operate. An outside provider can understand some tests, but it would need too much of Zoox’s testing history and knowledge of its vehicles to understand whether each result shows a real improvement and whether the change is ready to use. So Zoox keeps the final PoW evaluation inside the company.
            </p>
          </ScrollDiagram>

          <ScrollDiagram
            scene="coding"
            labelText="Coding across the same spectrum"
            caption="In coding, outside, alongside, and inside evaluation coexist on the same spectrum."
          >
            <p>
              However, we should not treat these three levels as alternatives; they can all appear in the same
              field or even within the same company. Take coding, for example.
            </p>
            <ul className="pow-list">
              <li><a href="https://developers.openai.com/codex/third-party/github">Codex</a> can observe from outside whether a change was merged.</li>
              <li><a href="https://docs.coderabbit.ai/configuration/path-instructions">CodeRabbit</a>, an AI code-review tool, works alongside teams by adapting its reviews to each repository’s rules.</li>
              <li>Uber keeps <a href="https://www.uber.com/us/en/blog/ureview/">uReview</a>, its own AI code-review system, inside because judging its comments depends on Uber’s codebase and feedback from its developers.</li>
            </ul>
          </ScrollDiagram>
          <TextSection labelText="">
            <p>
              Finally, what stays the same across all three cases is that PoW is usually carried out by the
              company whose product is already close enough to the workflow to see whether the organization
              accepts the AI’s work, even if evaluation is not its main business (as we saw in the examples
              above). Measuring that acceptance starts to change what AI costs and how providers charge for it.
            </p>
          </TextSection>
        </section>

        <section className="act-group" aria-labelledby="act-four">
          <h2 className="act-heading" id="act-four">4. From AI Use to AI Value</h2>
          <ScrollDiagram
            scene="meter"
            labelText="Two linked stages"
            caption="The unit changes from activity to accepted work."
          >
            <p>
              To see how PoW reshapes AI economics, we can break the shift into two connected steps. It first
              changes how we measure cost, and once accepted work becomes the unit of cost, providers can use the
              same unit for pricing. Let’s take a closer look at each stage:
            </p>
            <h3 className="case-heading">1. Cost shifts from AI activity to accepted work</h3>
            <p>
              We often count tokens consumed or sessions started because they help us know how much AI was used.
              But that leaves out whether the result turned out useful. A cheap model can end up costing more
              after retries and expert fixes, and a more expensive model may cost less overall if it clears the
              production bar in fewer attempts. People in the industry are already thinking about cost this way.
              Satya Nadella has discussed optimizing the <a href="https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q4">cost-to-outcome</a> frontier in real-world settings, and Sarah Friar, OpenAI’s CFO, has described the metric as <a href="https://openai.com/index/a-scorecard-for-the-ai-age/">cost per successful task</a>. PoW follows the same logic by defining success as acceptance in the real workflow, which leads to measuring <strong>cost per accepted workflow.</strong>
            </p>
            <h3 className="case-heading">2. Pricing follows the same unit</h3>
            <p data-diagram-trigger>
              Subsequently, when accepted work becomes the unit of cost, providers can also use it as the basis
              for pricing. Back to customer support, <a href="https://sierra.ai/blog/outcome-based-pricing-for-ai-agents">Sierra</a> already applies this logic by charging when its agents achieve business outcomes agreed upon with the customer. The same pricing approach is appearing elsewhere in <a href="https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes">customer support</a> and in fields such as <a href="https://www.eudia.com/blog/the-roi-of-an-ai-native-law-firm">legal services,</a> <a href="https://swordhealth.com/value/fair-pricing">healthcare</a>, and <a href="https://www.riskified.com/chargeback-guarantee/">finance</a>, where payment may depend on recovered compensation, measurable clinical improvement, or approved transactions. What stays consistent is the shift from AI activity toward work that meets the customer’s needs.
            </p>
          </ScrollDiagram>
        </section>

        <section className="act-group" aria-labelledby="act-five">
          <h2 className="act-heading" id="act-five">5. What Better Evaluation Could Unlock</h2>
          <ProseSection labelText="What better evaluation could unlock">
            <p>
              Outcome-based pricing is only the first visible consequence of a broader shift toward PoW. The
              idea of moving beyond static benchmarks and evaluating AI in real workflows, however, is not new,
              as <a href="https://agents.cs.princeton.edu/"><em>AI Agents That Matter</em></a> argued in 2024.
              But what has changed is the timing. Even two years ago, PoW would have been premature because
              models still struggled to complete serious workflows, even under controlled conditions of static
              benchmarks. Today, AI can attempt and <a href="https://hai.stanford.edu/ai-index/2026-ai-index-report/technical-performance">increasingly complete those tasks end to end</a>, so we are beginning to use it for professional work.
            </p>
            <p>
              In turn, the same capability shift creates the next bottleneck. As AI produces more work,
              organizations face the harder task of deciding which outputs are reliable enough to use.
              {" "}<a href="https://arxiv.org/abs/2607.01904">Production research</a> suggests that the ability to
              judge all this work reliably is becoming a scarce resource, an idea <a href="https://outlierspath.com/2026/03/23/ai-adoption-vs-ai-advantage/">Alfred Lin</a> has also discussed.<sup><a href="#note-2">2</a></sup> And this scarcity is, in fact, what makes reliable evaluation, including PoW, increasingly valuable.
            </p>
          </ProseSection>
          <ScrollDiagram
            scene="pie"
            labelText="A growing, diverse market"
            caption="Pie (market) grows."
          >
            <p>
              And as value begins to accumulate around judgment, more players will naturally offer these
              evaluations, including the groups we discussed above. Yet the pie is huge, and because acceptance
              depends on the specific task, no single method or evaluator can cover everything, leaving plenty of
              slices for others. Data and evaluation companies have already begun to take part too. <a href="https://scale.com/blog/dialect">Scale AI</a>, for example, is moving in this direction by turning expert approvals from real work into organization-specific evaluations.<sup><a href="#note-3">3</a></sup>
            </p>
          </ScrollDiagram>
          <ScrollDiagram
            scene="compounding"
            labelText="A compounding feedback loop"
            caption="PoW compounds utility."
          >
            <p>
              No matter who runs PoW, however, its immediate promise is practical. A clearer bar gives vendors something real to improve against and gives teams more confidence to hand nuanced work to AI. Each decision about whether the work was good enough feeds the next version. Better evaluation leads to better systems, and better systems earn the chance to take on harder work. Together, they create a strong positive feedback loop.
            </p>
            <p data-diagram-trigger>
              As that loop spreads across companies and industries, the stakes get much bigger. More AI capability turns into useful output, and work that used to be too costly or too slow becomes worth doing. Across the wider economy, those gains could add up to higher productivity and stronger GDP growth. Because the loop stays grounded in human judgment, it could also accelerate recursive self-improvement without losing sight of what people value. That makes the shift positive-sum, turning more AI capability into more utility for everyone.
            </p>
            <p>
              And as AI takes on more of the world’s work, we will keep coming back to one question. <strong>Did the work count?</strong>
            </p>
          </ScrollDiagram>
          <ol className="source-notes">
            <li id="note-1">The Ryanair row is a booking-channel change, not a blanket reversal: <a href="https://corporate.ryanair.com/news/ryanair-launches-new-parntership-with-leading-ota-on-the-beach/">customers booking through unauthorized OTAs</a> still have to verify, while customers using Approved OTA partners do not. Booking.com, KAYAK, Priceline, and Agoda entered that program through Ryanair&apos;s <a href="https://corporate.ryanair.com/news/ryanair-booking-holdings-sign-partnership-agreement/">August 2025 Booking Holdings agreement</a>. <a href="https://www.delta.com/us/en/gift-cards/overview">Delta</a> allows gift cards within one transaction regardless of the number of tickets; <a href="https://www.aa.com/web/i18n/customer-service/payment-options/travel-credit.html">American</a> limits Flight Credit to the named passenger.</li>
            <li id="note-2">A <a href="https://arxiv.org/abs/2607.01904">July 2026 Stanford-CMU study</a> followed 802 developers and 196,212 pull requests. Throughput reached 2.09x the pre-mandate baseline, while per-reviewer load roughly doubled and automated review overtook human review.</li>
            <li id="note-3">Scale&apos;s <a href="https://scale.com/blog/dialect">Dialect</a> captures expert edits, approvals, overrides, and outcomes from real usage, then uses them for enterprise-specific evaluation and learning. In PoW terms, the organization&apos;s own judgment becomes both the test and the feedback signal.</li>
          </ol>
        </section>
      </article>
    </main>
  );
}
