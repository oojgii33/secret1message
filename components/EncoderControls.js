import React from "react";

export default function EncoderControls({
  secretText,
  setSecretText,
  scale,
  setScale,
  onTextChange,
  onScaleChange,
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
          Нуух текст (A–Z, 0–9, зай)
        </label>
        <input
          type="text"
          value={secretText}
          onChange={(e) => onTextChange(e.target.value)}
          maxLength={40}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-green-500 outline-none"
          placeholder="WRITE YOUR MESSAGE HERE"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
          Пиксел хэмжээ: {scale}px
        </label>
        <input
          type="range"
          min={4}
          max={240}
          step={2}
          value={scale}
          onChange={(e) => onScaleChange(Number(e.target.value))}
          className="accent-green-500 mt-2"
        />
      </div>
    </div>
  );
}
