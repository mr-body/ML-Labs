"use client";

import { useRef } from "react";
import { useBlazeFaceDetection } from "../../hooks/useBlazeFaceDetection";

const WIDTH = 640;
const HEIGHT = 480;

export default function FaceDetectionPage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const { status } = useBlazeFaceDetection({ videoRef, canvasRef });

    return (
        <div style={{ position: "relative", width: `${WIDTH}px`, height: `${HEIGHT}px`, margin: "0 auto" }}>
            <div
                style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    background: "rgba(0,0,0,0.6)",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    zIndex: 10,
                }}
            >
                {status}
            </div>
            {/* Vídeo oculto: o canvas desenha o frame + as caixas */}
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
