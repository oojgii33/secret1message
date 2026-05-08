import React from "react";

export default function ModeTabs({ tab, setTab }) {
  return (
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
  );
}
