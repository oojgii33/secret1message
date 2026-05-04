"use client";
import React, { useState, useRef, useCallback } from "react";
function charTo6bit(ch) {
  ch = ch.toUpperCase();
  if (ch === " ") return 0;
  // A-Z letters: 1-26
  if (ch >= "A" && ch <= "Z") {
    return ch.charCodeAt(0) - 64;
  }
  // 0-9 numbers: 27-36
  if (ch >= "0" && ch <= "9") {
    return 27 + parseInt(ch);
  }
  return 0; // Default for unsupported characters
}
function bit6ToChar(v) {
  if (v === 0) return " ";
  if (v >= 1 && v <= 26) return String.fromCharCode(v + 64);
  if (v >= 27 && v <= 36) return String(v - 27); // 0-9 numbers
  return "?";
}
function textToGroups(text) {
  return text
    .toUpperCase()
    .split("")
    .map((ch) => ({
      ch,
      val: charTo6bit(ch),
      bits: charTo6bit(ch).toString(2).padStart(6, "0"),
    }));
}
function buildEncodedCanvas(img, text) {
  const groups = textToGroups(text);
  const w = img.width;
  const h = img.height;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const ctx = src.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const totalPix = w * h;
  const encPix = groups.length * 6;
  const changes = [];
  for (let pi = 0; pi < totalPix; pi++) {
    const di = pi * 4;
    const origR = d[di];
    const maskedR = origR & 0xfe;
    let newR = maskedR;
    if (pi < encPix) {
      const gi = Math.floor(pi / 6);
      const bi = pi % 6;
      const bit = parseInt(groups[gi].bits[bi]);
      newR = maskedR | bit;
    }
    if (origR !== newR) changes.push({ origR, newR });
    d[di] = newR;
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Failed to get output canvas context");
  outCtx.putImageData(imgData, 0, 0);
  return { canvas: out, changes };
}
function decodeFromCanvas(img) {
  const w = img.width;
  const h = img.height;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const ctx = src.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  const maxGroups = Math.floor((w * h) / 6);
  let text = "";
  const allGroups = [];
  for (let gi = 0; gi < maxGroups; gi++) {
    let bits = "";
    for (let bi = 0; bi < 6; bi++) {
      bits += String(d[(gi * 6 + bi) * 4] & 1);
    }
    const val = parseInt(bits, 2);
    const ch = bit6ToChar(val);
    allGroups.push({ ch, val, bits });
    // Remove space character as terminator to allow spaces in text
    text += ch;
    if (gi > 199) break;
  }
  return { text: text.trim(), groups: allGroups.slice(0, 60) };
}
function GroupCard(props) {
  const ch = props.ch;
  const bits = props.bits;
  const val = props.val;
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md border border-zinc-700 bg-zinc-800 min-w-[44px]">
      <span className="text-base font-mono font-medium text-white">
        {ch === " " ? "_" : ch}
      </span>
      <span className="text-[11px] font-mono tracking-wide">
        {bits.split("").map((b, i) => (
          <span
            key={i}
            className={b === "1" ? "text-red-400" : "text-zinc-500"}
          >
            {b}
          </span>
        ))}
      </span>
      <span className="text-[10px] text-zinc-500">{val}</span>
    </div>
  );
}
function DropZone(props) {
  const label = props.label;
  const onFile = props.onFile;
  const [over, setOver] = useState(false);
  const ref = useRef(null);
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer text-sm transition-colors ${
        over
          ? "border-blue-400 bg-blue-950/30 text-blue-300"
          : "border-zinc-600 text-zinc-400 hover:border-zinc-500"
      }`}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {label}
    </div>
  );
}
export default function SteganoEncoder() {
  const [tab, setTab] = useState("encode");
  // Encode state
  const [encImg, setEncImg] = useState(null);
  const [encLabel, setEncLabel] = useState("Зураг оруулах (PNG)");
  const [secretText, setSecretText] = useState("HELLO");
  const [scale, setScale] = useState(44);
  const [encCanvas, setEncCanvas] = useState(null);
  const [changes, setChanges] = useState([]);
  const previewRef = useRef(null);
  // Decode state
  const [decLabel, setDecLabel] = useState("Нуусан зураг оруулах (PNG)");
  const [decodedText, setDecodedText] = useState("");
  const [decGroups, setDecGroups] = useState([]);
  const [decStat, setDecStat] = useState("");
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
  const renderPreview = useCallback((enc, groups, scaleVal) => {
    if (!previewRef.current) return;
    const MAX_C = 18;
    const sw = Math.min(enc.width, MAX_C);
    const rowsNeeded = Math.ceil((groups.length * 6) / sw);
    const sh = Math.min(enc.height, Math.max(rowsNeeded + 1, 2), 16);
    const d = enc
      .getContext("2d")
      .getImageData(0, 0, enc.width, enc.height).data;
    const cv = previewRef.current;
    cv.width = sw * scaleVal;
    cv.height = sh * scaleVal;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fs = Math.max(9, Math.floor(scaleVal * 0.22));
    const encPix = groups.length * 6;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const pi = y * enc.width + x;
        const idx = pi * 4;
        const red = d[idx],
          g = d[idx + 1],
          b = d[idx + 2];
        const lsb = red & 1;
        const isEnc = pi < encPix;
        const gi = Math.floor(pi / 6);
        const bi = pi % 6;
        const px = x * scaleVal,
          py = y * scaleVal;
        const pad = Math.max(2, Math.floor(scaleVal * 0.07));
        const rad = Math.max(2, Math.floor(scaleVal * 0.1));
        const gc = GC[gi % GC.length];
        ctx.fillStyle = isEnc
          ? lsb === 1
            ? gc + "0.2)"
            : gc + "0.07)"
          : "rgba(128,128,128,0.04)";
        ctx.fillRect(px, py, scaleVal, scaleVal);

        ctx.fillStyle = `rgb(${red},${g},${b})`;
        roundedRect(
          ctx,
          px + pad,
          py + pad,
          scaleVal - pad * 2,
          scaleVal - pad * 2,
          rad,
        );
        ctx.fill();
        const lum = 0.2126 * red + 0.7152 * g + 0.0722 * b;
        const tc = lum > 128 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)";
        ctx.fillStyle = tc;
        ctx.font = `${fs}px monospace`;
        if (isEnc) {
          const masked = red & 0xfe;
          ctx.fillText(
            `${masked}+${lsb}`,
            px + scaleVal / 2,
            py + scaleVal / 2 - fs * 0.65,
          );
          ctx.fillText(
            `=${red}`,
            px + scaleVal / 2,
            py + scaleVal / 2 + fs * 0.1,
          );
          ctx.fillStyle =
            lum > 128 ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
          ctx.font = `${Math.max(8, fs - 1)}px monospace`;
          ctx.fillText(
            `b${bi}`,
            px + scaleVal / 2,
            py + scaleVal / 2 + fs * 0.88,
          );
        } else {
          ctx.fillText(`${red}`, px + scaleVal / 2, py + scaleVal / 2);
        }
        ctx.strokeStyle = isEnc ? gc + "0.45)" : "rgba(128,128,128,0.1)";
        ctx.lineWidth = isEnc ? 1.5 : 0.5;
        ctx.strokeRect(px, py, scaleVal, scaleVal);
        if (isEnc && bi === 5) {
          const ch = groups[gi]?.ch ?? "";
          ctx.strokeStyle = gc + "0.8)";
          ctx.lineWidth = 2;
          const gx = Math.floor((x - 5) * scaleVal);
          ctx.strokeRect(gx + 1, py + 1, scaleVal * 6 - 2, scaleVal - 2);
          ctx.fillStyle =
            lum > 128 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)";
          ctx.font = `${Math.max(9, fs)}px monospace`;
          ctx.fillText(
            `'${ch === " " ? "_" : ch}'`,
            gx + scaleVal * 3,
            py + scaleVal / 2,
          );
        }
      }
    }
  }, []);
  function handleEncFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setEncImg(img);
      setEncLabel(`✓ ${file.name} (${img.width}×${img.height})`);
      const { canvas, changes: ch } = buildEncodedCanvas(img, secretText);
      setEncCanvas(canvas);
      setChanges(ch);
      renderPreview(canvas, textToGroups(secretText), scale);
    };
    img.src = url;
  }
  function handleTextChange(val) {
    const upper = val.toUpperCase();
    setSecretText(upper);
    if (encImg) {
      const { canvas, changes: ch } = buildEncodedCanvas(encImg, upper);
      setEncCanvas(canvas);
      setChanges(ch);
      renderPreview(canvas, textToGroups(upper), scale);
    }
  }
  function handleScaleChange(val) {
    setScale(val);
    if (encCanvas) {
      renderPreview(encCanvas, textToGroups(secretText), val);
    }
  }
  function downloadEncoded() {
    if (!encCanvas) return;
    const a = document.createElement("a");
    a.href = encCanvas.toDataURL("image/png");
    a.download = "steg_encoded.png";
    a.click();
  }
  function downloadPreview() {
    if (!previewRef.current) return;
    const a = document.createElement("a");
    a.href = previewRef.current.toDataURL("image/png");
    a.download = "steg_preview.png";
    a.click();
  }
  function handleDecFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setDecLabel(`✓ ${file.name} (${img.width}×${img.height})`);
      const { text, groups } = decodeFromCanvas(img);
      setDecodedText(text || "(хоосон)");
      setDecGroups(groups);
      setDecStat(
        `Зураг: ${img.width}×${img.height} | Уншсан бүлэг: ${groups.length}`,
      );
    };
    img.src = url;
  }
  const groups = textToGroups(secretText);
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 px-100 ">
      <h1 className="text-lg font-mono text-green-400 mb-6 tracking-tight">
        LSB Steganography — 6-bit Alpha Encoder
      </h1>
      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden border border-zinc-700 mb-6">
        {["encode", "decode"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm transition-colors ${
              tab === t
                ? "bg-zinc-800 text-white font-medium"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {t === "encode" ? "Нуух (Encode)" : "Унших (Decode)"}
          </button>
        ))}
      </div>

      {/* Encode Panel */}
      {tab === "encode" && (
        <div className="space-y-4">
          <DropZone label={encLabel} onFile={handleEncFile} />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                Нуух текст (A–Z, 0–9, зай)
              </label>
              <input
                type="text"
                value={secretText}
                onChange={(e) => handleTextChange(e.target.value)}
                maxLength={40}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-green-500 outline-none"
                placeholder="HELLO 123..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                Пиксел хэмжээ: {scale}px
              </label>
              <input
                type="range"
                min={24}
                max={80}
                step={1}
                value={scale}
                onChange={(e) => handleScaleChange(Number(e.target.value))}
                className="accent-green-500 mt-2"
              />
            </div>
          </div>

          {/* Group cards */}
          <div>
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-2">
              6 пиксел → 1 үсэг
            </p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g, i) => (
                <GroupCard key={i} ch={g.ch} bits={g.bits} val={g.val} />
              ))}
            </div>
          </div>

          {/* Diff info */}
          {groups.length > 0 && (
            <div className="bg-zinc-900 rounded-lg p-3 font-mono text-[11px] text-zinc-400 leading-relaxed border border-zinc-800">
              <div className="mb-1 flex flex-wrap gap-2">
                {groups.map((g, i) => (
                  <span key={i} className="mr-3">
                    <span className="text-white font-medium">
                      '{g.ch === " " ? "_" : g.ch}'
                    </span>
                    ={g.bits}
                  </span>
                ))}
              </div>
              <div className="text-zinc-500">
                Бүх пикселийн LSB → 0 (маск), дараа нь нуух бит тохируулна
              </div>
              {changes.length > 0 && (
                <div className="mt-1">
                  Өөрчлөгдсөн:{" "}
                  {changes.slice(0, 16).map((c, i) => (
                    <span key={i} className="text-red-400 mr-1.5">
                      {c.origR}→{c.newR}
                    </span>
                  ))}
                  {changes.length > 16 && (
                    <span className="opacity-50">
                      ... нийт {changes.length}
                    </span>
                  )}
                </div>
              )}
              {changes.length === 0 && groups.length > 0 && (
                <div className="mt-1 text-zinc-600">
                  Өөрчлөлт байхгүй (анхны LSB-үүд зөв байсан)
                </div>
              )}
            </div>
          )}

          {/* Preview canvas */}
          <div>
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-2">
              Томруулсан харагдац
            </p>
            {!encImg && (
              <div className="flex items-center justify-center h-16 text-zinc-500 text-sm border border-zinc-800 rounded-lg">
                Зураг оруулсны дараа харагдана
              </div>
            )}
            <div className="overflow-auto rounded-lg">
              <canvas
                ref={previewRef}
                style={{
                  imageRendering: "pixelated",
                  display: encImg ? "block" : "none",
                }}
                className="rounded-lg border border-zinc-800"
              />
            </div>
            {encImg && (
              <p className="text-[12px] text-zinc-500 mt-1.5">
                Үсэг: {groups.length} | Нуусан пиксел: {groups.length * 6} /{" "}
                {encImg.width * encImg.height} | Зураг: {encImg.width}×
                {encImg.height}
              </p>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={downloadEncoded}
              disabled={!encCanvas}
              className="px-4 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Нуусан зураг татах (.png)
            </button>
            <button
              onClick={downloadPreview}
              disabled={!encCanvas}
              className="px-4 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Харагдац татах (.png)
            </button>
          </div>
        </div>
      )}

      {/* Decode Panel */}
      {tab === "decode" && (
        <div className="space-y-4">
          <DropZone label={decLabel} onFile={handleDecFile} />

          {decodedText && (
            <>
              <div>
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-2">
                  Уншсан текст
                </p>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 font-mono text-xl font-medium tracking-widest text-white">
                  {decodedText}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-2">
                  6-бит бүлгүүд
                </p>
                <div className="flex flex-wrap gap-2">
                  {decGroups.map((g, i) => (
                    <GroupCard key={i} ch={g.ch} bits={g.bits} val={g.val} />
                  ))}
                </div>
              </div>

              {decStat && (
                <p className="text-[12px] text-zinc-500">{decStat}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
