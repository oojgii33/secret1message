import React from "react";

export default function PreviewSection({
  encImg,
  previewRef,
  groups,
  encCanvas,
  onDownload,
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-2">
          Томруулсан харагдац
        </p>
        {!encImg && (
          <div className="flex items-center justify-center h-16 text-zinc-500 text-sm border border-zinc-800 rounded-lg">
            Зураг оруулсны дараа харагдана
          </div>
        )}
        <div className="overflow-auto rounded-lg bg-zinc-900/50 border border-zinc-800 flex justify-center">
          <canvas
            ref={previewRef}
            style={{
              imageRendering: "pixelated",
              display: encImg ? "block" : "none",
              maxWidth: "100%",
              height: "auto",
            }}
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
          onClick={onDownload}
          disabled={!encCanvas}
          className="px-4 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white"
        >
          Нуусан зураг татах (.png)
        </button>
      </div>
    </div>
  );
}
