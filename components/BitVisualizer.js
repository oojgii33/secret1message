import React from "react";

function GroupCard({ ch, bits, val, isMetadata }) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md border min-w-11 ${
        isMetadata
          ? "border-amber-500/50 bg-amber-500/10"
          : "border-zinc-700 bg-zinc-800"
      }`}
    >
      <span
        className={`text-base font-mono font-medium ${
          isMetadata ? "text-amber-400" : "text-white"
        }`}
      >
        {isMetadata ? "len" : ch === " " ? "_" : ch}
      </span>
      <span className="text-[11px] font-mono tracking-wide">
        {bits.split("").map((b, i) => (
          <span
            key={i}
            className={
              isMetadata
                ? b === "1"
                  ? "text-amber-300"
                  : "text-amber-900"
                : b === "1"
                  ? "text-red-400"
                  : "text-zinc-500"
            }
          >
            {b}
          </span>
        ))}
      </span>
      <span
        className={`text-[10px] ${
          isMetadata ? "text-amber-600" : "text-zinc-500"
        }`}
      >
        {val}
      </span>
    </div>
  );
}

export default function BitVisualizer({ groups, changes }) {
  if (groups.length === 0) return null;

  const filteredGroups = groups.filter((g) => !g.isMetadata);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-2">
          6 пиксел → 1 үсэг
        </p>
        <div className="flex flex-wrap gap-2">
          {filteredGroups.map((g, i) => (
            <GroupCard
              key={i}
              ch={g.ch}
              bits={g.bits}
              val={g.val}
              isMetadata={g.isMetadata}
            />
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg p-3 font-mono text-[11px] text-zinc-400 leading-relaxed border border-zinc-800">
        <div className="mb-1 flex flex-wrap gap-2">
          {filteredGroups.map((g, i) => (
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
        {changes && changes.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center">
            <span className="mr-2">Өөрчлөгдсөн:</span>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {changes.slice(0, 60).map((c, i) => (
                <span key={i} className="text-red-400">
                  p{c.index + 1}:{c.origR}→{c.newR}
                </span>
              ))}
              {changes.length > 60 && (
                <span className="opacity-50">... нийт {changes.length}</span>
              )}
            </div>
          </div>
        )}
        {changes && changes.length === 0 && groups.length > 0 && (
          <div className="mt-1 text-zinc-600">
            Өөрчлөлт байхгүй (анхны LSB-үүд зөв байсан)
          </div>
        )}
      </div>
    </div>
  );
}
