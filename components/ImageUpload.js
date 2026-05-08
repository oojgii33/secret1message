import React, { useState, useRef } from "react";

function DropZone({ label, onFile }) {
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

export default function ImageUpload({ label, onFile }) {
  return (
    <div className="space-y-4">
      <DropZone label={label} onFile={onFile} />
    </div>
  );
}
