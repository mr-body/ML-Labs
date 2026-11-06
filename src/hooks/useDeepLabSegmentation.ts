"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import * as deeplab from "@tensorflow-models/deeplab";

export type UseDeepLabOptions = {
  enabled?: boolean;
  base?: "pascal" | "cityscapes" | "ade20k";
  quantizationBytes?: 1 | 2 | 4;
};

export function useDeepLabSegmentation(options: UseDeepLabOptions = {}) {
  const { enabled = true, base = "pascal", quantizationBytes = 2 } = options;
  const [status, setStatus] = useState("A carregar modelo DeepLab...");
  const [legend, setLegend] = useState<Record<string, [number, number, number]>>({});
  const modelRef = useRef<deeplab.SemanticSegmentation | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!enabled) { setStatus("Segmentação desativada."); return; }
    let cancelled = false;
    let loaded: deeplab.SemanticSegmentation | null = null;
    const generation = ++generationRef.current;
    async function init() {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const model = await deeplab.load({ base, quantizationBytes });
        loaded = model;
        if (cancelled) { await model.dispose(); return; }
        modelRef.current = model;
        setStatus("Modelo carregado. Escolha uma imagem para segmentar.");
      } catch (error) {
        console.error("Erro ao carregar DeepLab:", error);
        if (!cancelled) setStatus(error instanceof Error ? `Erro: ${error.message}` : "Erro ao carregar o modelo DeepLab.");
      }
    }
    void init();
    return () => {
      cancelled = true;
      if (modelRef.current === loaded) modelRef.current = null;
      if (loaded) void loaded.dispose();
      if (generationRef.current === generation) generationRef.current++;
    };
  }, [enabled, base, quantizationBytes]);

  const segmentImage = useCallback(async (image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) => {
    const model = modelRef.current;
    if (!model) throw new Error("O modelo DeepLab ainda não está pronto.");
    setStatus("A segmentar imagem...");
    setLegend({});
    try {
      const result = await model.segment(image);
      const { legend: found, width, height, segmentationMap } = result;
      const overlay = new Uint8ClampedArray(segmentationMap);
      const background = found.background;
      for (let i = 0; i < overlay.length; i += 4) {
        const isBackground = background !== undefined &&
          overlay[i] === background[0] && overlay[i + 1] === background[1] && overlay[i + 2] === background[2];
        overlay[i + 3] = isBackground ? 0 : 150;
      }
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const ctx = maskCanvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível criar o canvas da máscara.");
      ctx.putImageData(new ImageData(overlay, width, height), 0, 0);
      setLegend(found);
      setStatus("Segmentação concluída.");
      return { maskCanvas, legend: found, width, height };
    } catch (error) {
      setStatus(error instanceof Error ? `Erro: ${error.message}` : "Erro na segmentação.");
      throw error;
    }
  }, []);

  return { status, legend, setLegend, segmentImage, ready: !!modelRef.current };
}
