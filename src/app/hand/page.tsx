"use client";

import { useRef } from "react";
import { useHandPoseDetection } from "../../hooks/useHandPoseDetection";

const WIDTH = 640;
const HEIGHT = 480;

export default function HandDetectionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { status, lines, hands } = useHandPoseDetection({ videoRef, canvasRef });

  console.log(hands)

  return (
    <div style={{ position: "relative", width: `${WIDTH}px`, height: `${HEIGHT}px` }}>
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          background: "rgba(0, 0, 0, 0.6)",
          color: "#fff",
          padding: "6px 12px",
          borderRadius: "5px",
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          zIndex: 10,
        }}
      >
        <div>{status}</div>
        {lines.map((l, i) => (
          <div key={i} style={{ marginTop: 4 }}>
            {l}
          </div>
        ))}
      </div>
      {/* Vídeo oculto: o canvas desenha o frame espelhado + landmarks */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width={WIDTH}
        height={HEIGHT}
        style={{ position: "absolute", top: 0, left: 0, opacity: 0, pointerEvents: "none" }}
      />
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        style={{ position: "absolute", top: 0, left: 0 }}
      />
    </div>
  );
}
