"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

export type UseCocoSsdDetectionOptions = {
  enabled?: boolean;
  maxObjects?: number;
  minScore?: number;
  mirror?: boolean;
  draw?: boolean;
};

type Params = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
} & UseCocoSsdDetectionOptions;

const DEFAULTS: Required<UseCocoSsdDetectionOptions> = {
  enabled: true, maxObjects: 20, minScore: 0.5, mirror: false, draw: true,
};

export function useCocoSsdDetection({ videoRef, canvasRef, ...options }: Params) {
  const [status, setStatus] = useState("A carregar o modelo COCO-SSD...");
  const [predictions, setPredictions] = useState<cocoSsd.DetectedObject[]>([]);
  const optsRef = useRef({ ...DEFAULTS, ...options });
  useEffect(() => { optsRef.current = { ...DEFAULTS, ...options }; });

  const enabled = options.enabled ?? DEFAULTS.enabled;
  const maxObjects = options.maxObjects ?? DEFAULTS.maxObjects;

  useEffect(() => {
    if (!enabled) { setStatus("Deteção desativada."); setPredictions([]); return; }
    let cancelled = false;
    let frame = 0;
    let stream: MediaStream | null = null;
    let model: cocoSsd.ObjectDetection | null = null;
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

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
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

        model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (cancelled) { model.dispose(); model = null; return; }
        updateStatus("Modelo carregado. A detetar objetos...");

        const loop = async () => {
          if (cancelled || !model) return;
          try {
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const opts = optsRef.current;
              const canvas = canvasRef.current;
              const ctx = opts.draw && canvas ? canvas.getContext("2d") : null;
              const W = canvas?.width || video.videoWidth;
              const H = canvas?.height || video.videoHeight;
              const found = await model.detect(video, opts.maxObjects, opts.minScore);
              if (cancelled) return;
              if (ctx) {
                ctx.clearRect(0, 0, W, H);
                ctx.save();
                if (opts.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
                ctx.drawImage(video, 0, 0, W, H);
                found.forEach(item => {
                  const [x, y, w, h] = item.bbox;
                  ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
                  ctx.fillStyle = "#00e5ff"; ctx.font = "16px Arial";
                  ctx.fillText(`${item.class} (${Math.round(item.score * 100)}%)`, x, y > 20 ? y - 5 : y + 18);
                });
                ctx.restore();
              }
              setPredictions(found);
              updateStatus(found.length ? `${found.length} objeto(s) detetado(s).` : "Nenhum objeto detetado.");
            }
          } catch (error) {
            if (!cancelled) updateStatus(error instanceof Error ? `Erro: ${error.message}` : "Erro na deteção.");
          }
          if (!cancelled) frame = requestAnimationFrame(loop);
        };
        void loop();
      } catch (error) {
        console.error("Erro COCO-SSD:", error);
        updateStatus(error instanceof Error ? `Erro: ${error.message}` : "Erro ao iniciar a deteção.");
      }
    }
    void init();
    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach(t => t.stop());
      model?.dispose();
    };
  }, [enabled, maxObjects, videoRef, canvasRef]);

  if (!enabled) return { status: "Deteção desativada.", predictions: [] as cocoSsd.DetectedObject[] };
  return { status, predictions };
}
