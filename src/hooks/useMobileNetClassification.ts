"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import * as mobilenet from "@tensorflow-models/mobilenet";

export type MobileNetPrediction = {
  className: string;
  probability: number;
};

export function useMobileNetClassification() {
  const modelRef = useRef<mobilenet.MobileNet | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const [status, setStatus] = useState("Carregando modelo...");
  const [predictions, setPredictions] = useState<MobileNetPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    async function loadModel() {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const model = await mobilenet.load();
        if (cancelled) return;
        modelRef.current = model;
        setStatus("Modelo carregado. Escolha uma imagem para classificar.");
      } catch (error) {
        console.error("Erro ao carregar MobileNet:", error);
        if (!cancelled) setStatus("Erro ao carregar o modelo MobileNet.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadModel();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      requestRef.current++;
      modelRef.current = null;
    };
  }, []);

  const classify = useCallback(async (image: HTMLImageElement) => {
    const model = modelRef.current;
    if (!model) {
      setStatus("O modelo ainda não terminou de carregar.");
      return;
    }
    const request = ++requestRef.current;
    setStatus("Classificando imagem...");
    setPredictions([]);
    try {
      const results = await model.classify(image);
      if (!mountedRef.current || request !== requestRef.current) return;
      setPredictions(results);
      setStatus("Classificação concluída.");
    } catch (error) {
      console.error("Erro na classificação:", error);
      if (mountedRef.current && request === requestRef.current) {
        setStatus("Erro ao processar a classificação.");
      }
    }
  }, []);

  const reset = useCallback(() => {
    requestRef.current++;
    setPredictions([]);
    setStatus(modelRef.current
      ? "Modelo carregado. Escolha uma imagem para classificar."
      : "Carregando modelo...");
  }, []);

  return { status, predictions, loading, classify, reset, ready: !!modelRef.current };
}
