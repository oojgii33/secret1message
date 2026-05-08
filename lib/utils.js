function charTo6bit(ch) {
  ch = ch.toUpperCase();
  if (ch === " ") return 0;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 64;
  if (ch >= "0" && ch <= "9") return 27 + parseInt(ch);
  return 0;
}

function bit6ToChar(v) {
  if (v === 0) return " ";
  if (v >= 1 && v <= 26) return String.fromCharCode(v + 64);
  if (v >= 27 && v <= 36) return String(v - 27);
  return "?";
}

export function textToGroups(text) {
  return text
    .toUpperCase()
    .split("")
    .map((ch) => ({
      ch,
      val: charTo6bit(ch),
      bits: charTo6bit(ch).toString(2).padStart(6, "0"),
    }));
}

export function buildEncodedCanvas(img, text) {
  const groups = textToGroups(text);
  const w = img.width,
    h = img.height;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const ctx = src.getContext("2d");
  if (!ctx) throw new Error("Canvas error");
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const encPix = groups.length * 6;
  const changes = [];

  for (let pi = 0; pi < Math.min(encPix, w * h); pi++) {
    const di = pi * 4;
    const origR = d[di];
    const bit = parseInt(groups[Math.floor(pi / 6)].bits[pi % 6]);
    const newR = (origR & 0xfe) | bit;

    if (origR !== newR) {
      changes.push({ index: pi, origR, newR });
    }
    d[di] = newR;
  }

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const outCtx = out.getContext("2d");
  if (outCtx) outCtx.putImageData(imgData, 0, 0);
  return { canvas: out, pixelData: d, changes };
}

export function decodeFromCanvas(img) {
  const w = img.width,
    h = img.height;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const ctx = src.getContext("2d");
  if (!ctx) throw new Error("Canvas error");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  let text = "";
  const allGroups = [];
  for (let gi = 0; gi < Math.floor((w * h) / 6); gi++) {
    let bits = "";
    for (let bi = 0; bi < 6; bi++) bits += String(d[(gi * 6 + bi) * 4] & 1);
    const val = parseInt(bits, 2);
    const ch = bit6ToChar(val);
    allGroups.push({ ch, val, bits });
    text += ch;
    if (gi > 199) break;
  }
  return { text: text.trim(), groups: allGroups.slice(0, 60) };
}

const GC = [
  "rgba(226,75,74,",
  "rgba(59,139,212,",
  "rgba(29,158,117,",
  "rgba(186,117,23,",
  "rgba(83,74,183,",
  "rgba(212,83,126,",
];

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function renderPreview(
  canvas,
  pixelData,
  imgWidth,
  imgHeight,
  groups,
  scaleVal,
) {
  if (!canvas || !pixelData) return;

  const encPix = groups.length * 6;
  const MAX_CANVAS_SIZE = 4000;

  // Determine how many pixels we can show horizontally and vertically
  // while staying under the memory limit.
  const displayWidth = Math.min(imgWidth, Math.floor(MAX_CANVAS_SIZE / scaleVal));
  const displayHeight = Math.min(imgHeight, Math.floor(MAX_CANVAS_SIZE / scaleVal));

  canvas.width = displayWidth * scaleVal;
  canvas.height = displayHeight * scaleVal;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw the base image (only the visible part)
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = imgWidth;
  tempCanvas.height = imgHeight;
  const tempCtx = tempCanvas.getContext("2d");
  if (tempCtx) {
    const imgData = new ImageData(
      new Uint8ClampedArray(pixelData),
      imgWidth,
      imgHeight,
    );
    tempCtx.putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    // Draw only the top-left portion that fits
    ctx.drawImage(
      tempCanvas,
      0, 0, displayWidth, displayHeight, // Source
      0, 0, canvas.width, canvas.height // Destination
    );
  }

  const showDetails = scaleVal >= 25;
  const showText = scaleVal >= 45;

  if (showDetails) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fs = Math.max(9, Math.floor(scaleVal * 0.22));

    // Overlay details for encoded pixels (only if they are in the visible area)
    for (let pi = 0; pi < encPix; pi++) {
      const x = pi % imgWidth;
      const y = Math.floor(pi / imgWidth);

      // Skip if outside our safe drawing area
      if (x >= displayWidth || y >= displayHeight) continue;

      const px = x * scaleVal;
      const py = y * scaleVal;

      const idx = pi * 4;
      const red = pixelData[idx],
        g = pixelData[idx + 1],
        b = pixelData[idx + 2];
      const lsb = red & 1;
      const gi = Math.floor(pi / 6),
        bi = pi % 6;
      const gc = GC[gi % GC.length];

      // Subtle overlay for encoded pixels
      ctx.fillStyle = lsb === 1 ? gc + "0.2)" : gc + "0.08)";
      ctx.fillRect(px, py, scaleVal, scaleVal);

      // Draw the "inner pixel" box
      ctx.fillStyle = `rgb(${red},${g},${b})`;
      const pad = Math.max(1, Math.floor(scaleVal * 0.05));
      roundedRect(ctx, px + pad, py + pad, scaleVal - pad * 2, scaleVal - pad * 2, Math.max(1, pad * 1.5));
      ctx.fill();

      if (showText) {
        const lum = 0.2126 * red + 0.7152 * g + 0.0722 * b;
        ctx.fillStyle = lum > 128 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)";
        ctx.font = `${fs}px monospace`;

        ctx.fillText(
          `${red & 0xfe}+${lsb}`,
          px + scaleVal / 2,
          py + scaleVal / 2 - fs * 0.65,
        );
        ctx.fillText(`=${red}`, px + scaleVal / 2, py + scaleVal / 2 + fs * 0.1);

        ctx.fillStyle = lum > 128 ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
        ctx.font = `${Math.max(8, fs - 1)}px monospace`;
        ctx.fillText(`b${bi}`, px + scaleVal / 2, py + scaleVal / 2 + fs * 0.88);
      }

      ctx.strokeStyle = gc + "0.4)";
      ctx.lineWidth = Math.max(1, scaleVal * 0.02);
      ctx.strokeRect(px, py, scaleVal, scaleVal);

      if (showText && bi === 5 && x >= 5) {
        ctx.strokeStyle = gc + "0.8)";
        ctx.lineWidth = Math.max(1.5, scaleVal * 0.04);
        ctx.strokeRect(
          (x - 5) * scaleVal + 1,
          py + 1,
          scaleVal * 6 - 2,
          scaleVal - 2,
        );
        const lum = 0.2126 * red + 0.7152 * g + 0.0722 * b;
        ctx.fillStyle = lum > 128 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)";
        ctx.fillText(
          `'${groups[gi]?.ch || ""}'`,
          (x - 5) * scaleVal + scaleVal * 3,
          py + scaleVal / 2,
        );
      }
    }
  }
}
