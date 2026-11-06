"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import * as blazeface from "@tensorflow-models/blazeface";

export type FaceLandmarkName =
  | "rightEye"
  | "leftEye"
  | "nose"
  | "mouth"
  | "rightEar"
  | "leftEar";

// Ordem devolvida pelo BlazeFace (direita/esquerda do ponto de vista da pessoa).
const LANDMARK_NAMES: FaceLandmarkName[] = [
  "rightEye",
  "leftEye",
  "nose",
  "mouth",
  "rightEar",
  "leftEar",
];

export type FaceLandmark = {
  name: FaceLandmarkName;
  x: number;
  y: number;
};

/** Um rosto detectado. Todas as coordenadas estão em pixels do canvas. */
export type FacePrediction = {
  /** Canto superior esquerdo da caixa [x, y] (já espelhado, se `mirror`). */
  topLeft: [number, number];
  /** Canto inferior direito da caixa [x, y]. */
  bottomRight: [number, number];
  width: number;
  height: number;
  /** Confiança do modelo (0–1). */
  probability: number;
  /** Olhos, nariz, boca e orelhas. */
  landmarks: FaceLandmark[];
};

export type UseBlazeFaceDetectionOptions = {
  /** Liga/desliga a câmera e a detecção. Padrão: true. */
  enabled?: boolean;
  /** Máximo de rostos detectados. Padrão: 10. */
  maxFaces?: number;
  /** Confiança mínima (0–1) para aceitar um rosto. Padrão: 0.75. */
  scoreThreshold?: number;
  /** Espelha vídeo e coordenadas (modo selfie). Padrão: false. */
  mirror?: boolean;
  /**
   * Se true, o hook desenha vídeo + caixas no canvas.
   * Se false, não toca no canvas (use `predictions` para desenhar do seu jeito).
   * Padrão: true.
   */
  draw?: boolean;
  /** Desenha olhos, nariz, boca e orelhas. Padrão: false. */
  showLandmarks?: boolean;
  /** Texto acima de cada caixa. Padrão: "Rosto". */
  label?: string;
};

type UseBlazeFaceDetectionParams = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
} & UseBlazeFaceDetectionOptions;

const DEFAULTS: Required<UseBlazeFaceDetectionOptions> = {
  enabled: true,
  maxFaces: 10,
  scoreThreshold: 0.75,
  mirror: false,
  draw: true,
  showLandmarks: false,
  label: "Rosto",
};

const DISABLED_RESULT = {
  status: "Detecção desativada.",
  predictions: [] as FacePrediction[],
};

const drawFace = (
  ctx: CanvasRenderingContext2D,
  face: FacePrediction,
  label: string,
  showLandmarks: boolean
) => {
  const [x, y] = face.topLeft;

  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, face.width, face.height);

  ctx.font = "16px Arial";
  ctx.fillStyle = "#00ff00";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, x, y > 20 ? y - 5 : y + 20);

  if (showLandmarks) {
    ctx.fillStyle = "#ff3d00";
    face.landmarks.forEach((l) => {
      ctx.beginPath();
      ctx.arc(l.x, l.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
};

export function useBlazeFaceDetection({
  videoRef,
  canvasRef,
  ...options
}: UseBlazeFaceDetectionParams) {
  const [status, setStatus] = useState("Carregando modelo...");
  const [predictions, setPredictions] = useState<FacePrediction[]>([]);

  // Opções "ao vivo": mudar não reinicia a câmera nem o modelo.
  const optsRef = useRef({ ...DEFAULTS, ...options });
  useEffect(() => {
    optsRef.current = { ...DEFAULTS, ...options };
  });

  // Só estas opções exigem recarregar o modelo.
  const enabled = options.enabled ?? DEFAULTS.enabled;
  const maxFaces = options.maxFaces ?? DEFAULTS.maxFaces;
  const scoreThreshold = options.scoreThreshold ?? DEFAULTS.scoreThreshold;

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId = 0;
    let activeStream: MediaStream | null = null;
    let model: blazeface.BlazeFaceModel | null = null;
    let cancelled = false;

    let lastStatus = "";
    let missedFrames = 0;

    const updateStatus = (s: string) => {
      if (s !== lastStatus) {
        lastStatus = s;
        setStatus(s);
      }
    };
    const updatePredictions = (list: FacePrediction[]) =>
      setPredictions((prev) => (prev.length === 0 && list.length === 0 ? prev : list));

    async function init() {
      try {
        await tf.setBackend("webgl");
        await tf.ready();

        const video = videoRef.current;
        if (!video) return;

        const canvas = canvasRef.current;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: canvas?.width || 640 },
            height: { ideal: canvas?.height || 480 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = stream;
        video.srcObject = stream;

        await new Promise<void>((resolve) => {
          if (video.readyState >= 1) resolve();
          else video.onloadedmetadata = () => resolve();
        });
        await video.play();

        model = await blazeface.load({ maxFaces, scoreThreshold });
        if (cancelled) {
          model = null;
          return;
        }
        updateStatus("Modelo carregado. Detectando...");

        const loop = async () => {
          if (cancelled || !model) return;

          try {
            if (video.readyState === 4) {
              const o = optsRef.current;
              const cvs = canvasRef.current;
              const ctx = o.draw && cvs ? cvs.getContext("2d") : null;
              const W = cvs?.width || video.videoWidth || 640;
              const H = cvs?.height || video.videoHeight || 480;
              const sx = W / (video.videoWidth || W);
              const sy = H / (video.videoHeight || H);

              const faces = await model.estimateFaces(video, false);
              if (cancelled) return;

              // Vídeo (espelhado ou não)
              if (ctx) {
                ctx.clearRect(0, 0, W, H);
                ctx.save();
                if (o.mirror) {
                  ctx.translate(W, 0);
                  ctx.scale(-1, 1);
                }
                ctx.drawImage(video, 0, 0, W, H);
                ctx.restore();
              }

              if (faces.length > 0) {
                missedFrames = 0;

                const mapX = (x: number) => (o.mirror ? W - x * sx : x * sx);

                const list: FacePrediction[] = faces.map((face) => {
                  const tl = face.topLeft as [number, number];
                  const br = face.bottomRight as [number, number];

                  const x1 = mapX(tl[0]);
                  const x2 = mapX(br[0]);
                  const left = Math.min(x1, x2);
                  const right = Math.max(x1, x2);
                  const top = tl[1] * sy;
                  const bottom = br[1] * sy;

                  const p = face.probability as unknown;
                  const probability =
                    typeof p === "number" ? p : Array.isArray(p) ? Number(p[0]) : 1;

                  const landmarks = (face.landmarks as number[][]).map((pt, i) => ({
                    name: LANDMARK_NAMES[i],
                    x: mapX(pt[0]),
                    y: pt[1] * sy,
                  }));

                  return {
                    topLeft: [left, top],
                    bottomRight: [right, bottom],
                    width: right - left,
                    height: bottom - top,
                    probability,
                    landmarks,
                  };
                });

                if (ctx) list.forEach((f) => drawFace(ctx, f, o.label, o.showLandmarks));

                updateStatus(`Detectado(s) ${list.length} rosto(s)`);
                updatePredictions(list);
              } else {
                // Tolerância a falhas pontuais (evita piscar o texto)
                missedFrames++;
                if (missedFrames > 5) {
                  updateStatus("Nenhum rosto detectado.");
                  updatePredictions([]);
                }
              }
            }
          } catch (err) {
            if (!cancelled) console.error("Erro na detecção:", err);
          }

          if (!cancelled) animationFrameId = requestAnimationFrame(loop);
        };

        loop();
      } catch (err) {
        console.error("Erro ao inicializar:", err);
        updateStatus("Erro ao carregar a câmera ou modelo.");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
      model = null;
    };
    // videoRef/canvasRef são estáveis; só reinicia se o modelo mudar.
  }, [enabled, maxFaces, scoreThreshold, videoRef, canvasRef]);

  if (!enabled) return DISABLED_RESULT;
  return { status, predictions };
}
