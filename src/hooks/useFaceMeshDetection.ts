"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import * as faceLandmarks from "@tensorflow-models/face-landmarks-detection";

export type UseFaceMeshDetectionOptions = {
  enabled?: boolean;
  maxFaces?: number;
  refineLandmarks?: boolean;
  mirror?: boolean;
  draw?: boolean;
};
type Params = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
} & UseFaceMeshDetectionOptions;

const DEFAULTS: Required<UseFaceMeshDetectionOptions> = {
  enabled: true, maxFaces: 1, refineLandmarks: true, mirror: false, draw: true,
};

export function useFaceMeshDetection({ videoRef, canvasRef, ...options }: Params) {
  const [status, setStatus] = useState("A iniciar FaceMesh...");
  const [faces, setFaces] = useState<faceLandmarks.Face[]>([]);
  const optsRef = useRef({ ...DEFAULTS, ...options });
  useEffect(() => { optsRef.current = { ...DEFAULTS, ...options }; });

  const enabled = options.enabled ?? DEFAULTS.enabled;
  const maxFaces = options.maxFaces ?? DEFAULTS.maxFaces;
  const refineLandmarks = options.refineLandmarks ?? DEFAULTS.refineLandmarks;

  useEffect(() => {
    if (!enabled) { setStatus("Deteção desativada."); setFaces([]); return; }
    let cancelled = false;
    let frame = 0;
    let stream: MediaStream | null = null;
    let detector: faceLandmarks.FaceLandmarksDetector | null = null;
    let lastStatus = "";
    const updateStatus = (value: string) => {
      if (value !== lastStatus) { lastStatus = value; setStatus(value); }
    };

    async function init() {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const video = videoRef.current;
        if (!video) return;
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Este navegador não suporta acesso à câmara.");
        updateStatus("A aguardar permissão da câmara...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        video.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
          if (video.readyState >= 1) resolve();
          else {
            video.onloadedmetadata = () => resolve();
            video.onerror = () => reject(new Error("Não foi possível carregar o vídeo."));
          }
        });
        await video.play();
        video.width = video.videoWidth || 640;
        video.height = video.videoHeight || 480;
        const canvas = canvasRef.current;
        if (canvas) { canvas.width = video.width; canvas.height = video.height; }

        updateStatus("A carregar o modelo facial...");
        detector = await faceLandmarks.createDetector(faceLandmarks.SupportedModels.MediaPipeFaceMesh, {
          runtime: "tfjs", maxFaces, refineLandmarks,
        });
        if (cancelled) { detector.dispose(); detector = null; return; }
        updateStatus("Modelo pronto. Posicione o rosto diante da câmara.");

        const loop = async () => {
          if (cancelled || !detector) return;
          try {
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const opts = optsRef.current;
              const canvas = canvasRef.current;
              const ctx = opts.draw && canvas ? canvas.getContext("2d") : null;
              const W = canvas?.width || video.videoWidth;
              const H = canvas?.height || video.videoHeight;
              const detected = await detector.estimateFaces(video, { flipHorizontal: false, staticImageMode: false });
              if (cancelled) return;
              if (ctx) {
                ctx.clearRect(0, 0, W, H);
                ctx.save();
                if (opts.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
                ctx.drawImage(video, 0, 0, W, H);
                ctx.fillStyle = "#00ff88";
                ctx.strokeStyle = "rgba(0,255,136,.5)";
                ctx.lineWidth = 1;
                detected.forEach(face => {
                  face.keypoints.forEach(point => {
                    ctx.beginPath(); ctx.arc(point.x, point.y, 1.4, 0, Math.PI * 2); ctx.fill();
                  });
                });
                ctx.restore();
              }
              setFaces(detected);
              updateStatus(detected.length
                ? `${detected.length} rosto(s) detetado(s) · ${detected[0].keypoints.length} pontos`
                : "Nenhum rosto detetado.");
            }
          } catch (error) {
            if (!cancelled) updateStatus(error instanceof Error ? `Erro na deteção: ${error.message}` : "Erro desconhecido na deteção.");
          }
          if (!cancelled) frame = requestAnimationFrame(loop);
        };
        void loop();
      } catch (error) {
        console.error("Erro FaceMesh:", error);
        updateStatus(error instanceof Error ? `Erro: ${error.message}` : "Não foi possível iniciar a deteção facial.");
      }
    }
    void init();
    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach(t => t.stop());
      detector?.dispose();
    };
  }, [enabled, maxFaces, refineLandmarks, videoRef, canvasRef]);

  if (!enabled) return { status: "Deteção desativada.", faces: [] as faceLandmarks.Face[] };
  return { status, faces };
}
