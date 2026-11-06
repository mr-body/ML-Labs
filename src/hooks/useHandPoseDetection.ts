"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import {
  FINGERS,
  describeHand,
  drawHand,
  ema,
  getFingerStates,
  SIDE_STYLE,
  type FingerKey,
  type HandData,
  type Point,
  type Side,
} from "./handPose.utils";

export type {
  FingerKey,
  FingerStates,
  HandData,
  Point,
  Side,
} from "./handPose.utils";

export type UseHandPoseDetectionOptions = {
  /** Liga/desliga a câmera e a detecção. Padrão: true. */
  enabled?: boolean;
  /** Máximo de mãos detectadas. Padrão: 2. */
  maxHands?: number;
  /** "full" = mais preciso, "lite" = mais leve. Padrão: "full". */
  modelType?: "lite" | "full";
  /** Confiança mínima (0–1) para aceitar uma mão. Padrão: 0.6. */
  minScore?: number;
  /** Suavização entre frames: 0 = muito suave, 1 = sem suavização. Padrão: 0.5. */
  smoothing?: number;
  /**
   * O modelo assume imagem espelhada (selfie). Como enviamos o frame cru,
   * a lateralidade vem invertida e por isso trocamos. Padrão: true.
   */
  swapHandedness?: boolean;
  /** Espelha vídeo e pontos (modo selfie). Padrão: true. */
  mirror?: boolean;
  /**
   * Se true, o hook desenha vídeo + esqueleto no canvas.
   * Se false, não toca no canvas (use `hands` para desenhar do seu jeito).
   * Padrão: true.
   */
  draw?: boolean;
};

type UseHandPoseDetectionParams = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
} & UseHandPoseDetectionOptions;

const DEFAULTS: Required<UseHandPoseDetectionOptions> = {
  enabled: true,
  maxHands: 2,
  modelType: "full",
  minScore: 0.6,
  smoothing: 0.5,
  swapHandedness: true,
  mirror: true,
  draw: true,
};

const DISABLED_RESULT = {
  status: "Detecção desativada.",
  lines: [] as string[],
  hands: [] as HandData[],
};

type Tracked = {
  kp: Point[];
  kp3d: Point[];
  states?: HandData["fingers"];
};

export function useHandPoseDetection({
  videoRef,
  canvasRef,
  ...options
}: UseHandPoseDetectionParams) {
  const [status, setStatus] = useState("Carregando modelo...");
  const [lines, setLines] = useState<string[]>([]);
  const [hands, setHands] = useState<HandData[]>([]);

  // Opções "ao vivo": mudar não reinicia a câmera nem o modelo.
  const optsRef = useRef({ ...DEFAULTS, ...options });
  useEffect(() => {
    optsRef.current = { ...DEFAULTS, ...options };
  });

  // Só estas opções exigem recarregar o modelo.
  const enabled = options.enabled ?? DEFAULTS.enabled;
  const maxHands = options.maxHands ?? DEFAULTS.maxHands;
  const modelType = options.modelType ?? DEFAULTS.modelType;

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId = 0;
    let activeStream: MediaStream | null = null;
    let detector: handPoseDetection.HandDetector | null = null;
    let cancelled = false;

    // Estado entre frames (sem re-render), rastreado por lateralidade.
    let tracked: Record<string, Tracked> = {};
    let lastStatus = "";
    let lastLines = "";
    let missedFrames = 0;

    const updateStatus = (s: string) => {
      if (s !== lastStatus) {
        lastStatus = s;
        setStatus(s);
      }
    };
    const updateLines = (l: string[]) => {
      const key = l.join("|");
      if (key !== lastLines) {
        lastLines = key;
        setLines(l);
      }
    };
    const updateHands = (list: HandData[]) =>
      setHands((prev) => (prev.length === 0 && list.length === 0 ? prev : list));

    async function init() {
      try {
        await tf.setBackend("webgl");
        await tf.ready();

        const video = videoRef.current;
        if (!video) return;

        const canvas = canvasRef.current;
        const idealW = canvas?.width || 640;
        const idealH = canvas?.height || 480;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: idealW },
            height: { ideal: idealH },
            frameRate: { ideal: 30 },
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

        detector = await handPoseDetection.createDetector(
          handPoseDetection.SupportedModels.MediaPipeHands,
          { runtime: "tfjs", modelType, maxHands }
        );
        if (cancelled) {
          detector.dispose();
          detector = null;
          return;
        }
        updateStatus("Modelo carregado. Mostre uma ou as duas mãos.");

        const loop = async () => {
          if (cancelled || !detector) return;

          try {
            if (video.readyState === 4) {
              const o = optsRef.current;
              const cvs = canvasRef.current;
              const ctx = o.draw && cvs ? cvs.getContext("2d") : null;
              const W = cvs?.width || video.videoWidth || 640;
              const H = cvs?.height || video.videoHeight || 480;
              const sx = W / (video.videoWidth || W);
              const sy = H / (video.videoHeight || H);

              const detected = (
                await detector.estimateHands(video, { flipHorizontal: false })
              ).filter((h) => (h.score ?? 1) >= o.minScore);
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

              if (detected.length > 0) {
                missedFrames = 0;
                const next: Record<string, Tracked> = {};
                const list: HandData[] = [];

                detected.forEach((hand, i) => {
                  let side = hand.handedness as Side;
                  if (o.swapHandedness) side = side === "Left" ? "Right" : "Left";

                  // Chave estável por lateralidade (evita trocar de mão entre frames)
                  let key: string = side;
                  if (next[key]) key = `${side}-${i}`;

                  const rawKp: Point[] = hand.keypoints.map((k) => [k.x * sx, k.y * sy, 0]);
                  const rawKp3d: Point[] = (hand.keypoints3D ?? hand.keypoints).map((k) => [
                    k.x,
                    k.y,
                    k.z ?? 0,
                  ]);

                  const prev = tracked[key];
                  const kp = ema(prev?.kp, rawKp, o.smoothing);
                  const kp3d = ema(prev?.kp3d, rawKp3d, o.smoothing);
                  const fingers = getFingerStates(kp3d, prev?.states);
                  next[key] = { kp, kp3d, states: fingers };

                  const openFingers = (Object.keys(fingers) as FingerKey[]).filter(
                    (k) => fingers[k]
                  );

                  list.push({
                    side,
                    label: SIDE_STYLE[side].label,
                    score: hand.score ?? 1,
                    keypoints: kp.map((p) => [o.mirror ? W - p[0] : p[0], p[1], 0]),
                    keypoints3D: kp3d,
                    fingers,
                    openFingers,
                    openCount: openFingers.length,
                  });
                });

                tracked = next;
                if (ctx) list.forEach((h) => drawHand(ctx, h, W, H));

                const total = list.reduce((s, h) => s + h.openCount, 0);
                updateStatus(
                  `Detectada(s) ${list.length} mão(s) • Total de dedos abertos: ${total}`
                );
                updateLines(list.map(describeHand));
                updateHands(list);
              } else {
                // Tolerância a falhas pontuais (evita piscar)
                missedFrames++;
                if (missedFrames > 5) {
                  tracked = {};
                  updateStatus("Nenhuma mão detectada.");
                  updateLines([]);
                  updateHands([]);
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
      if (detector) detector.dispose();
    };
    // videoRef/canvasRef são estáveis; só reinicia se o modelo mudar.
  }, [enabled, maxHands, modelType, videoRef, canvasRef]);

  if (!enabled) return DISABLED_RESULT;
  return { status, lines, hands };
}

export { FINGERS };
