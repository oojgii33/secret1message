"use client";
import React, { useState, useRef, useEffect } from "react";
import Header from "../components/Header";
import ModeTabs from "../components/ModeTabs";
import ImageUpload from "../components/ImageUpload";
import EncoderControls from "../components/EncoderControls";
import BitVisualizer from "../components/BitVisualizer";
import PreviewSection from "../components/PreviewSection";
import {
  textToGroups,
  buildEncodedCanvas,
  decodeFromCanvas,
  renderPreview,
} from "../lib/utils";

export default function SteganoEncoder() {
  const [tab, setTab] = useState("encode");

  // Encode state
  const [encImg, setEncImg] = useState(null);
  const [encLabel, setEncLabel] = useState("Зураг оруулах (PNG)");
  const [secretText, setSecretText] = useState("HELLO WORLD");
  const [scale, setScale] = useState(1);
  const [encCanvas, setEncCanvas] = useState(null);
  const [encPixelData, setEncPixelData] = useState(null);
  const [changes, setChanges] = useState([]);
  const previewRef = useRef(null);

  // Decode state
  const [decLabel, setDecLabel] = useState("Нуусан зураг оруулах (PNG)");
  const [decodedText, setDecodedText] = useState("");
  const [decGroups, setDecGroups] = useState([]);
  const [decStat, setDecStat] = useState("");

  const groups = textToGroups(secretText);

  // Reactive preview rendering
  useEffect(() => {
    if (encPixelData && encImg && previewRef.current) {
      renderPreview(
        previewRef.current,
        encPixelData,
        encImg.width,
        encImg.height,
        groups,
        scale,
      );
    }
  }, [encPixelData, encImg, groups, scale]);

  function handleEncFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setEncImg(img);
      setEncLabel(`✓ ${file.name} (${img.width}×${img.height})`);
      const {
        canvas,
        pixelData,
        changes: ch,
      } = buildEncodedCanvas(img, secretText);
      setEncCanvas(canvas);
      setEncPixelData(pixelData);
      setChanges(ch);
    };
    img.src = url;
  }

  function handleTextChange(val) {
    const upper = val.toUpperCase();
    setSecretText(upper);
    if (encImg) {
      const {
        canvas,
        pixelData,
        changes: ch,
      } = buildEncodedCanvas(encImg, upper);
      setEncCanvas(canvas);
      setEncPixelData(pixelData);
      setChanges(ch);
    }
  }

  function handleScaleChange(val) {
    setScale(val);
  }

  function downloadEncoded() {
    if (!encCanvas) return;
    const a = document.createElement("a");
    a.href = encCanvas.toDataURL("image/png");
    a.download = "steg_encoded.png";
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-screen-xl mx-auto space-y-6">
        <Header />
        <ModeTabs tab={tab} setTab={setTab} />

        {tab === "encode" ? (
          <div className="space-y-4">
            <ImageUpload label={encLabel} onFile={handleEncFile} />
            <EncoderControls
              secretText={secretText}
              setSecretText={setSecretText}
              scale={scale}
              setScale={setScale}
              onTextChange={handleTextChange}
              onScaleChange={handleScaleChange}
            />
            <BitVisualizer groups={groups} changes={changes} />
            <PreviewSection
              encImg={encImg}
              previewRef={previewRef}
              groups={groups}
              encCanvas={encCanvas}
              onDownload={downloadEncoded}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <ImageUpload label={decLabel} onFile={handleDecFile} />

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

                <BitVisualizer groups={decGroups} />

                {decStat && (
                  <p className="text-[12px] text-zinc-500">{decStat}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
