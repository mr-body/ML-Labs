"use client";

import { useRef } from "react";
import { useFaceMeshDetection } from "../../hooks/useFaceMeshDetection";

const WIDTH = 640;
const HEIGHT = 480;

export default function FaceMeshPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { status, faces } = useFaceMeshDetection({ videoRef, canvasRef });

  return (
    <main style={{ width: "100%", maxWidth: WIDTH, margin: "0 auto", padding: 16, boxSizing: "border-box" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", overflow: "hidden", borderRadius: 12, background: "#000" }}>
        <video ref={videoRef} autoPlay muted playsInline width={WIDTH} height={HEIGHT}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div role="status" style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,.68)", color: "#fff", font: "14px Arial" }}>
          {status}
        </div>
      </div>
      <p style={{ marginTop: 12, fontSize: 14 }}>Rostos detetados: {faces.length}</p>
    </main>
  );
}
