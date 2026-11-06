"use client";

import { useRef, useState } from "react";
import { useDeepLabSegmentation } from "../../hooks/useDeepLabSegmentation";

export default function DeepLabSegmentationPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const { status, legend, segmentImage } = useDeepLabSegmentation({ base: "pascal", quantizationBytes: 2 });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = async () => {
      imageRef.current = image;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) { URL.revokeObjectURL(url); return; }
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      setBusy(true);
      try {
        const result = await segmentImage(image);
        ctx.drawImage(result.maskCanvas, 0, 0, canvas.width, canvas.height);
      } catch (error) {
        console.error("Erro na segmentação:", error);
      } finally {
        setBusy(false);
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => { URL.revokeObjectURL(url); };
    image.src = url;
  };

  return (
    <main style={{ fontFamily: "Arial, sans-serif", textAlign: "center", padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Segmentação Semântica com DeepLab</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} disabled={busy} />
      <div role="status" style={{ marginTop: 10, fontWeight: "bold" }}>{busy ? "A processar imagem..." : status}</div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {Object.entries(legend).filter(([name]) => name !== "background").map(([name, [r, g, b]]) => (
          <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", border: "1px solid #ccc", borderRadius: 12, fontSize: 14 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: `rgb(${r}, ${g}, ${b})` }} />
            {name}
          </span>
        ))}
      </div>
      <canvas ref={canvasRef} style={{ marginTop: 20, maxWidth: "100%", height: "auto", display: "block", marginInline: "auto" }} />
    </main>
  );
}
